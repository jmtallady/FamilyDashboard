// activities.js - Activities Management
// Handles daily activity tracking, approval, and rewards

import { getConfig, SHEETS_API_URL } from './config.js';
import { getActivities, setActivities, getIsUnlocked, getUseGoogleSheets } from './state.js';
import { adjustDailyBP } from './points.js';
import { showPinModal } from './auth.js';
import { getKidByID, showMessage } from './utils.js';
import { savePointsToSheets, saveDailyStatusToSheets } from './api.js';
import { renderRecentActivity } from './recent-activity.js';
import { closeKidSelector } from './rewards.js';

export function getActivityStatus(kidId, activityId) {
    const today = new Date().toDateString();
    const key = `activity-${kidId}-${activityId}-${today}`;
    return localStorage.getItem(key) || 'incomplete'; // 'incomplete', 'pending', 'approved'
}

// Set activity completion status in localStorage and sync to Google Sheets
export function setActivityStatus(kidId, activityId, status) {
    const today = new Date().toDateString();
    const key = `activity-${kidId}-${activityId}-${today}`;
    localStorage.setItem(key, status);

    // Fire-and-forget sync to Sheets for cross-device visibility
    if (getUseGoogleSheets() && SHEETS_API_URL) {
        saveDailyStatusToSheets('activity', kidId, activityId, status).catch(console.error);
    }
}

// Module-level variables
let selectedActivity = null;

// Show kid selector for activity completion (always show for both shared and individual)

export function showActivityKidSelector(activityId, activityName, bp, multiplier) {
    const CONFIG = getConfig();
    selectedActivity = { id: activityId, name: activityName, bp, multiplier };

    let html = '<h2>Who completed this activity?</h2>';
    html += '<p style="font-size: 12px; color: #666; margin: -10px 0 15px 0;">Multiple kids can mark complete</p>';
    html += '<div class="kid-selector-grid">';

    Object.values(CONFIG).forEach(kid => {
        if (kid.id) {
            const status = getActivityStatus(kid.id, activityId);
            const canComplete = status === 'incomplete';
            const statusText = status === 'approved' ? '✅ Done' : status === 'pending' ? '⏳ Pending' : 'Available';

            html += `
                <div class="kid-selector-card ${!canComplete ? 'disabled' : ''}" ${canComplete ? `onclick="selectKidForActivity('${kid.id}')"` : ''}>
                    <div class="kid-selector-name">${kid.name}</div>
                    <div class="kid-selector-count" style="font-size: 11px; color: ${canComplete ? '#666' : '#999'};">${statusText}</div>
                </div>
            `;
        }
    });

    html += '</div>';

    document.getElementById('kidSelectorContent').innerHTML = html;
    document.getElementById('kidSelectorModal').classList.add('active');
}

export function selectKidForActivity(kidId) {
    if (!selectedActivity) return;

    closeKidSelector();
    markActivityCompleteForKid(kidId, selectedActivity.id);
    selectedActivity = null;
}

// Mark activity as complete (pending approval)
export function markActivityCompleteForKid(kidId, activityId) {
    const currentStatus = getActivityStatus(kidId, activityId);

    if (currentStatus === 'approved') {
        showMessage('This activity is already approved!');
        return;
    }

    if (currentStatus === 'pending') {
        showMessage('This activity is waiting for approval!');
        return;
    }

    // Mark as pending
    setActivityStatus(kidId, activityId, 'pending');
    renderActivities();

    const kid = getKidByID(kidId);
    showMessage(`${kid.name} marked activity complete! Waiting for parent approval.`);
}

// Approve activity completion (awards BP)
export async function approveActivity(kidId, activityId, activityName, bp, multiplier = 1) {
    const CONFIG = getConfig();
    const useGoogleSheets = getUseGoogleSheets();
    // Check if PIN is required and user is not unlocked
    if (CONFIG.requirePinForEdits && !getIsUnlocked()) {
        showPinModal();
        return;
    }

    const kid = getKidByID(kidId);
    if (!kid) return;

    // Mark as approved
    setActivityStatus(kidId, activityId, 'approved');

    // Calculate total BP with multiplier
    const totalBP = bp * multiplier;

    // Award BP directly to Total BP (the bank)
    const totalBPElement = document.getElementById(`${kidId}-total-bp`);
    let currentTotalBP = parseInt(totalBPElement.textContent);
    let newTotalBP = currentTotalBP + totalBP;

    // Update UI
    totalBPElement.textContent = newTotalBP;
    localStorage.setItem(`${kidId}-total-bp`, newTotalBP.toString());

    // Save to Google Sheets if configured
    if (getUseGoogleSheets() && SHEETS_API_URL) {
        const dailyBPElement = document.getElementById(`${kidId}-daily-bp`);
        const pcElement = document.getElementById(`${kidId}-pc`);
        const currentDailyBP = parseInt(dailyBPElement.textContent);
        const currentPC = parseInt(pcElement.textContent);
        const note = multiplier > 1 ? `Completed activity: ${activityName} (+${bp}×${multiplier} = ${totalBP} BP to bank)` : `Completed activity: ${activityName} (+${totalBP} BP to bank)`;
        await savePointsToSheets(kidId, currentDailyBP, newTotalBP, currentPC, 'activity-approved', note);
    }

    renderActivities();
    renderRecentActivity(); // Refresh activity feed from Points Log

    const bpMessage = multiplier > 1 ? `${bp}×${multiplier} = ${totalBP} BP` : `${totalBP} BP`;
    showMessage(`✅ ${kid.name} earned ${bpMessage} (added to bank) for "${activityName}"!`);
}

// Reject activity completion
export function rejectActivity(kidId, activityId, activityName = 'activity') {
    const CONFIG = getConfig();
    // Check if PIN is required and user is not unlocked
    if (CONFIG.requirePinForEdits && !getIsUnlocked()) {
        showPinModal();
        return;
    }

    // Reset to incomplete
    setActivityStatus(kidId, activityId, 'incomplete');
    renderActivities();

    const kid = getKidByID(kidId);
    showMessage(`❌ ${kid.name}'s activity was rejected.`);
}

// Render activities section (compact view - works like chores with approval)
export function renderActivities() {
    const CONFIG = getConfig();
    const ACTIVITIES = getActivities();
    if (!ACTIVITIES || !ACTIVITIES.shared && !ACTIVITIES.individual) {
        document.getElementById('activitiesContainer').innerHTML = '<div style="text-align: center; color: #999;">No activities configured</div>';
        return;
    }

    const container = document.getElementById('activitiesContainer');
    let html = '<div class="chore-list">';
    let allActivities = [];

    // Collect all shared activities first
    if (ACTIVITIES.shared && ACTIVITIES.shared.length > 0) {
        ACTIVITIES.shared.forEach(activity => {
            allActivities.push({
                ...activity,
                kidId: null,
                isShared: true,
                displayName: activity.name
            });
        });
    }

    // Collect all individual activities
    Object.values(CONFIG).forEach(kid => {
        if (kid.id && ACTIVITIES.individual && ACTIVITIES.individual[kid.id]) {
            ACTIVITIES.individual[kid.id].forEach(activity => {
                allActivities.push({
                    ...activity,
                    kidId: kid.id,
                    kidName: kid.name,
                    isShared: false,
                    displayName: activity.name
                });
            });
        }
    });

    // Render all activities in one compact list
    allActivities.forEach(activity => {
        // Check all kids to see who has this activity pending or approved
        const pendingKids = [];
        const approvedKids = [];

        // Determine which kids to check based on activity type
        const kidsToCheck = [];
        if (activity.isShared) {
            // Shared activity: check all kids
            Object.values(CONFIG).forEach(kid => {
                if (kid.id) kidsToCheck.push(kid);
            });
        } else {
            // Individual activity: only check the assigned kid
            const assignedKid = Object.values(CONFIG).find(k => k.id === activity.kidId);
            if (assignedKid) kidsToCheck.push(assignedKid);
        }

        kidsToCheck.forEach(kid => {
            const kidStatus = getActivityStatus(kid.id, activity.id);
            if (kidStatus === 'pending') {
                pendingKids.push(kid);
            } else if (kidStatus === 'approved') {
                approvedKids.push(kid);
            }
        });

        // Determine incomplete kids (those who haven't started yet)
        const incompleteKids = kidsToCheck.filter(k => getActivityStatus(k.id, activity.id) === 'incomplete');

        // Overall status is for display styling only
        const overallStatus = approvedKids.length > 0 ? 'approved' : pendingKids.length > 0 ? 'pending' : 'incomplete';
        const statusClass = overallStatus === 'approved' ? 'approved' : overallStatus === 'pending' ? 'pending' : 'incomplete';
        const statusIcon = overallStatus === 'approved' ? '✅' : overallStatus === 'pending' ? '⏳' : '⭐';
        const totalBP = activity.bp * (activity.multiplier || 1);
        const bpDisplay = activity.multiplier > 1 ? `+${activity.bp}×${activity.multiplier} (${totalBP} BP)` : `+${activity.bp} BP`;

        html += `
            <div class="chore-item ${statusClass}" style="flex-direction: column; align-items: stretch;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div class="chore-info">
                        <span class="chore-status-icon">${statusIcon}</span>
                        <span class="chore-name">${activity.displayName}</span>
                        <span class="chore-bp">${bpDisplay}</span>
                    </div>
                    <div class="chore-actions" style="display: flex; align-items: center; gap: 4px;">`;

        // Show approved kids as text
        if (approvedKids.length > 0) {
            const names = approvedKids.map(k => k.name).join(', ');
            html += `<span class="approved-text" style="font-size: 11px; margin-right: 4px;">✅ ${names}</span>`;
        }

        // Always show + button if any kids are still incomplete
        if (incompleteKids.length > 0) {
            const btnLabel = overallStatus === 'incomplete' ? '✓' : '+';
            html += `<button class="chore-btn complete-btn" data-activity='${JSON.stringify({id: activity.id, name: activity.name, bp: activity.bp, multiplier: activity.multiplier || 1})}' onclick="showActivityKidSelectorFromButton(this)">${btnLabel}</button>`;
        }

        html += `</div>
                </div>`;

        // Show pending kids on separate lines below
        if (overallStatus === 'pending') {
            html += `<div style="padding-left: 30px; margin-top: 8px;">`;
            pendingKids.forEach(kid => {
                html += `
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                        <span style="font-size: 11px; color: #666; min-width: 60px;">${kid.name}</span>
                        <button class="chore-btn approve-btn" style="padding: 4px 8px; font-size: 16px;" data-activity='${JSON.stringify({kidId: kid.id, activityId: activity.id, activityName: activity.name, bp: activity.bp, multiplier: activity.multiplier || 1})}' onclick="approveActivityFromButton(this)">✓</button>
                        <button class="chore-btn reject-btn" style="padding: 4px 8px; font-size: 16px;" data-activity='${JSON.stringify({kidId: kid.id, activityId: activity.id, activityName: activity.name})}' onclick="rejectActivityFromButton(this)">✗</button>
                    </div>`;
            });
            html += `</div>`;
        }

        html += `</div>`;
    });

    html += '</div>';
    container.innerHTML = html;

    // Parse emojis in activities section
    if (typeof twemoji !== 'undefined') {
        twemoji.parse(document.getElementById('activitiesContainer'), {
            folder: 'svg',
            ext: '.svg'
        });
    }
}

// Helper functions to safely call activity functions from button data attributes
export function showActivityKidSelectorFromButton(button) {
    const data = JSON.parse(button.getAttribute('data-activity'));
    showActivityKidSelector(data.id, data.name, data.bp, data.multiplier);
}

export function approveActivityFromButton(button) {
    const data = JSON.parse(button.getAttribute('data-activity'));
    approveActivity(data.kidId, data.activityId, data.activityName, data.bp, data.multiplier);
}

export function rejectActivityFromButton(button) {
    const data = JSON.parse(button.getAttribute('data-activity'));
    rejectActivity(data.kidId, data.activityId, data.activityName);
}
