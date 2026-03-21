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

/**
 * Build a grouped activity list from the ACTIVITIES data structure.
 * Activities with the same name are merged into a single entry.
 * Each group tracks per-kid BP/activityId for individual activities,
 * or a shared BP for open-to-all activities.
 */
function buildActivityGroups() {
    const CONFIG = getConfig();
    const ACTIVITIES = getActivities();
    const groupsByName = new Map(); // lowercased name -> group

    // Shared activities first (no kid assigned = open to all, same BP)
    if (ACTIVITIES.shared) {
        ACTIVITIES.shared.forEach(activity => {
            const key = activity.name.toLowerCase();
            groupsByName.set(key, {
                name: activity.name,
                isOpenToAll: true,
                activityId: activity.id,
                bp: activity.bp,
                multiplier: activity.multiplier || 1,
                kidEntries: null
            });
        });
    }

    // Individual activities — group by name, collect per-kid BP entries
    Object.values(CONFIG).forEach(kid => {
        if (kid.id && ACTIVITIES.individual && ACTIVITIES.individual[kid.id]) {
            ACTIVITIES.individual[kid.id].forEach(activity => {
                const key = activity.name.toLowerCase();
                if (groupsByName.has(key)) {
                    const group = groupsByName.get(key);
                    // Shared takes precedence; skip individual if shared exists
                    if (!group.isOpenToAll) {
                        group.kidEntries.push({
                            kidId: kid.id,
                            activityId: activity.id,
                            bp: activity.bp,
                            multiplier: activity.multiplier || 1
                        });
                    }
                } else {
                    groupsByName.set(key, {
                        name: activity.name,
                        isOpenToAll: false,
                        activityId: null,
                        bp: null,
                        multiplier: null,
                        kidEntries: [{
                            kidId: kid.id,
                            activityId: activity.id,
                            bp: activity.bp,
                            multiplier: activity.multiplier || 1
                        }]
                    });
                }
            });
        }
    });

    return groupsByName;
}

/**
 * For a given group, return arrays of eligible kids with their status.
 * Each entry: { kid, activityId, bp, multiplier, status }
 */
function getGroupKidStatuses(group) {
    const CONFIG = getConfig();
    const result = [];

    if (group.isOpenToAll) {
        Object.values(CONFIG).forEach(kid => {
            if (kid.id) {
                result.push({
                    kid,
                    activityId: group.activityId,
                    bp: group.bp,
                    multiplier: group.multiplier,
                    status: getActivityStatus(kid.id, group.activityId)
                });
            }
        });
    } else {
        group.kidEntries.forEach(entry => {
            const kid = Object.values(CONFIG).find(k => k.id === entry.kidId);
            if (kid) {
                result.push({
                    kid,
                    activityId: entry.activityId,
                    bp: entry.bp,
                    multiplier: entry.multiplier,
                    status: getActivityStatus(kid.id, entry.activityId)
                });
            }
        });
    }

    return result;
}

// Show kid selector for activity completion
// groupData: the group object from buildActivityGroups
export function showActivityKidSelector(groupData) {
    selectedActivity = groupData;

    let html = '<h2>Who completed this activity?</h2>';
    html += '<p style="font-size: 12px; color: #666; margin: -10px 0 15px 0;">Multiple kids can mark complete</p>';
    html += '<div class="kid-selector-grid">';

    const kidStatuses = getGroupKidStatuses(groupData);

    kidStatuses.forEach(({ kid, activityId, bp, multiplier, status }) => {
        const canComplete = status === 'incomplete';
        const totalBP = bp * multiplier;
        const bpText = multiplier > 1 ? `+${bp}×${multiplier}=${totalBP} BP` : `+${totalBP} BP`;
        const statusText = status === 'approved' ? '✅ Done'
            : status === 'pending' ? '⏳ Pending'
            : bpText;
        const textColor = canComplete ? '#4c6ef5' : '#999';

        html += `
            <div class="kid-selector-card ${!canComplete ? 'disabled' : ''}" ${canComplete ? `onclick="selectKidForActivity('${kid.id}')"` : ''}>
                <div class="kid-selector-name">${kid.name}</div>
                <div class="kid-selector-count" style="font-size: 11px; color: ${textColor};">${statusText}</div>
            </div>
        `;
    });

    html += '</div>';

    document.getElementById('kidSelectorContent').innerHTML = html;
    document.getElementById('kidSelectorModal').classList.add('active');
}

export function selectKidForActivity(kidId) {
    if (!selectedActivity) return;

    // Look up this kid's specific activityId from the group
    let activityId;
    if (selectedActivity.isOpenToAll) {
        activityId = selectedActivity.activityId;
    } else {
        const entry = selectedActivity.kidEntries.find(e => e.kidId === kidId);
        activityId = entry ? entry.activityId : null;
    }

    if (!activityId) return;

    closeKidSelector();
    markActivityCompleteForKid(kidId, activityId);
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
        const currentDailyBP = parseInt(dailyBPElement.textContent);
        const note = multiplier > 1 ? `Completed activity: ${activityName} (+${bp}×${multiplier} = ${totalBP} BP to bank)` : `Completed activity: ${activityName} (+${totalBP} BP to bank)`;
        await savePointsToSheets(kidId, currentDailyBP, newTotalBP, 'activity-approved', note);
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
    const ACTIVITIES = getActivities();
    if (!ACTIVITIES || (!ACTIVITIES.shared && !ACTIVITIES.individual)) {
        document.getElementById('activitiesContainer').innerHTML = '<div style="text-align: center; color: #999;">No activities configured</div>';
        return;
    }

    const container = document.getElementById('activitiesContainer');
    let html = '<div class="chore-list">';

    const groupsByName = buildActivityGroups();

    // Sort groups alphabetically by activity name
    const sortedGroups = [...groupsByName.values()].sort((a, b) => a.name.localeCompare(b.name));

    sortedGroups.forEach(group => {
        const kidStatuses = getGroupKidStatuses(group);

        const pendingEntries   = kidStatuses.filter(e => e.status === 'pending');
        const approvedEntries  = kidStatuses.filter(e => e.status === 'approved');
        const incompleteEntries = kidStatuses.filter(e => e.status === 'incomplete');

        const overallStatus = incompleteEntries.length === 0 && pendingEntries.length === 0
            ? 'approved'
            : pendingEntries.length > 0 ? 'pending' : 'incomplete';
        const statusClass = overallStatus === 'approved' ? 'approved' : overallStatus === 'pending' ? 'pending' : 'incomplete';
        const statusIcon = overallStatus === 'approved' ? '✅' : overallStatus === 'pending' ? '⏳' : '⭐';

        // Serialize group data for the button (without circular refs)
        const groupDataForButton = {
            name: group.name,
            isOpenToAll: group.isOpenToAll,
            activityId: group.activityId,
            bp: group.bp,
            multiplier: group.multiplier,
            kidEntries: group.kidEntries
        };

        html += `
            <div class="chore-item ${statusClass}" style="flex-direction: column; align-items: stretch;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div class="chore-info">
                        <span class="chore-status-icon">${statusIcon}</span>
                        <span class="chore-name">${group.name}</span>
                    </div>
                    <div class="chore-actions" style="display: flex; align-items: center; gap: 4px;">`;

        // Show approved kids inline
        if (approvedEntries.length > 0) {
            const names = approvedEntries.map(e => e.kid.name).join(', ');
            html += `<span class="approved-text" style="font-size: 11px; margin-right: 4px;">✅ ${names}</span>`;
        }

        // Show ✓ / + button if any kids still need to complete
        if (incompleteEntries.length > 0) {
            const btnLabel = overallStatus === 'incomplete' ? '✓' : '+';
            html += `<button class="chore-btn complete-btn" data-activity='${JSON.stringify(groupDataForButton)}' onclick="showActivityKidSelectorFromButton(this)">${btnLabel}</button>`;
        }

        html += `</div></div>`;

        // Pending kids — show with their BP and approve/reject buttons
        if (pendingEntries.length > 0) {
            html += `<div style="padding-left: 30px; margin-top: 8px;">`;
            pendingEntries.forEach(({ kid, activityId, bp, multiplier }) => {
                const totalBP = bp * multiplier;
                const bpDisplay = multiplier > 1 ? `${bp}×${multiplier}=${totalBP} BP` : `${bp} BP`;
                html += `
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                        <span style="font-size: 11px; color: #666; min-width: 60px;">${kid.name} (+${bpDisplay})</span>
                        <button class="chore-btn approve-btn" style="padding: 4px 8px; font-size: 16px;" data-activity='${JSON.stringify({kidId: kid.id, activityId, activityName: group.name, bp, multiplier})}' onclick="approveActivityFromButton(this)">✓</button>
                        <button class="chore-btn reject-btn" style="padding: 4px 8px; font-size: 16px;" data-activity='${JSON.stringify({kidId: kid.id, activityId, activityName: group.name})}' onclick="rejectActivityFromButton(this)">✗</button>
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
    showActivityKidSelector(data);
}

export function approveActivityFromButton(button) {
    const data = JSON.parse(button.getAttribute('data-activity'));
    approveActivity(data.kidId, data.activityId, data.activityName, data.bp, data.multiplier);
}

export function rejectActivityFromButton(button) {
    const data = JSON.parse(button.getAttribute('data-activity'));
    rejectActivity(data.kidId, data.activityId, data.activityName);
}
