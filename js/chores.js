// chores.js - Chores Management
// Handles daily chore tracking, approval, and rewards

import { getConfig, SHEETS_API_URL } from './config.js';
import { getChores, setChores, getIsUnlocked, getUseGoogleSheets } from './state.js';
import { adjustDailyBP } from './points.js';
import { showPinModal } from './auth.js';
import { getKidByID, showMessage } from './utils.js';
import { savePointsToSheets, setChoreMultiplier, fetchChores, saveDailyStatusToSheets } from './api.js';
import { renderRecentActivity } from './recent-activity.js';
import { closeKidSelector } from './rewards.js';

export function getChoreStatus(kidId, choreId) {
    const today = new Date().toDateString();
    const key = `chore-${kidId}-${choreId}-${today}`;
    return localStorage.getItem(key) || 'incomplete'; // 'incomplete', 'pending', 'approved'
}

// Set chore completion status in localStorage and sync to Google Sheets
export function setChoreStatus(kidId, choreId, status) {
    const today = new Date().toDateString();
    const key = `chore-${kidId}-${choreId}-${today}`;
    localStorage.setItem(key, status);

    // Fire-and-forget sync to Sheets for cross-device visibility
    if (getUseGoogleSheets() && SHEETS_API_URL) {
        saveDailyStatusToSheets('chore', kidId, choreId, status).catch(console.error);
    }
}

// Approve chore completion (awards BP)
export async function approveChore(kidId, choreId, choreName, bp, multiplier = 1) {
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
    setChoreStatus(kidId, choreId, 'approved');

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
        const note = multiplier > 1 ? `Completed chore: ${choreName} (+${bp}×${multiplier} = ${totalBP} BP to bank)` : `Completed chore: ${choreName} (+${totalBP} BP to bank)`;
        await savePointsToSheets(kidId, currentDailyBP, newTotalBP, 'chore-approved', note);
    }

    // Set multiplier to 0 in Sheets to remove chore from the list
    if (getUseGoogleSheets() && SHEETS_API_URL) {
        const CHORES = getChores();
        const isShared = CHORES && CHORES.shared && CHORES.shared.some(c => c.id === choreId);
        const sheetKidId = isShared ? '' : kidId;
        await setChoreMultiplier(choreId, sheetKidId, 0);
        // Refresh chores from Sheets so other devices see the removal too
        const updatedChores = await fetchChores();
        if (updatedChores) setChores(updatedChores);
    }

    renderChores();
    renderRecentActivity(); // Refresh activity feed from Points Log
    const bpMessage = multiplier > 1 ? `${bp}×${multiplier} = ${totalBP} BP` : `${totalBP} BP`;
    showMessage(`✅ Approved! ${kid.name} earned ${bpMessage} (added to bank) for: ${choreName}`);
}

// Reject chore completion
export function rejectChore(kidId, choreId, choreName = 'chore') {
    const CONFIG = getConfig();
    // Check if PIN is required and user is not unlocked
    if (CONFIG.requirePinForEdits && !getIsUnlocked()) {
        showPinModal();
        return;
    }

    const kid = getKidByID(kidId);
    if (!kid) return;

    // Reset to incomplete
    setChoreStatus(kidId, choreId, 'incomplete');
    renderChores();
    showMessage(`❌ Rejected chore for ${kid.name}`);
}

// Reset all chores to incomplete
export function resetAllChores() {
    const CONFIG = getConfig();
    // Check if PIN is required and user is not unlocked
    if (CONFIG.requirePinForEdits && !getIsUnlocked()) {
        showPinModal();
        return;
    }

    const today = new Date().toDateString();
    const keys = Object.keys(localStorage);

    // Remove all chore status keys for today
    keys.forEach(key => {
        if (key.startsWith('chore-') && key.endsWith(today)) {
            localStorage.removeItem(key);
        }
    });

    renderChores();
    showMessage('🔄 All chores reset!');
}

// Render chores section (compact view)
export function renderChores() {
    const CONFIG = getConfig();
    const CHORES = getChores();
    if (!CHORES || !CHORES.shared && !CHORES.individual) {
        document.getElementById('choresContainer').innerHTML = '<div style="text-align: center; color: #999;">No chores configured</div>';
        return;
    }

    const container = document.getElementById('choresContainer');
    let html = '<div class="chore-list">';
    let allChores = [];

    // Collect all shared chores first
    if (CHORES.shared && CHORES.shared.length > 0) {
        CHORES.shared.forEach(chore => {
            allChores.push({
                ...chore,
                kidId: null,
                isShared: true,
                displayName: chore.name
            });
        });
    }

    // Collect all individual chores
    Object.values(CONFIG).forEach(kid => {
        if (kid.id && CHORES.individual && CHORES.individual[kid.id]) {
            CHORES.individual[kid.id].forEach(chore => {
                allChores.push({
                    ...chore,
                    kidId: kid.id,
                    kidName: kid.name,
                    isShared: false,
                    displayName: chore.name
                });
            });
        }
    });

    // Render all chores in one compact list
    allChores.forEach(chore => {
        let status = 'incomplete';
        let assignedKidId = chore.kidId;

        // For shared chores, check if any kid completed it
        if (chore.isShared) {
            Object.values(CONFIG).forEach(kid => {
                if (kid.id) {
                    const kidStatus = getChoreStatus(kid.id, chore.id);
                    if (kidStatus === 'approved' || kidStatus === 'pending') {
                        status = kidStatus;
                        assignedKidId = kid.id;
                    }
                }
            });
        } else {
            status = getChoreStatus(chore.kidId, chore.id);
        }

        const statusClass = status === 'approved' ? 'approved' : status === 'pending' ? 'pending' : 'incomplete';
        const statusIcon = status === 'approved' ? '✅' : status === 'pending' ? '⏳' : '⬜';
        const totalBP = chore.bp * (chore.multiplier || 1);
        const bpDisplay = chore.multiplier > 1 ? `+${chore.bp}×${chore.multiplier} (${totalBP} BP)` : `+${chore.bp} BP`;

        html += `
            <div class="chore-item ${statusClass}">
                <div class="chore-info">
                    <span class="chore-status-icon">${statusIcon}</span>
                    <span class="chore-name">${chore.displayName}</span>
                    <span class="chore-bp">${bpDisplay}</span>
                </div>
                <div class="chore-actions">`;

        if (status === 'incomplete') {
            if (chore.isShared) {
                html += `<button class="chore-btn complete-btn" onclick="showChoreKidSelector('${chore.id}', '${chore.name}', ${chore.bp}, ${chore.multiplier || 1})">✓</button>`;
            } else {
                html += `<button class="chore-btn complete-btn" onclick="markChoreCompleteForKid('${chore.kidId}', '${chore.id}')">✓</button>`;
            }
        } else if (status === 'pending') {
            html += `
                <button class="chore-btn approve-btn" onclick="approveChore('${assignedKidId}', '${chore.id}', '${chore.name}', ${chore.bp}, ${chore.multiplier || 1})">✓</button>
                <button class="chore-btn reject-btn" onclick="rejectChore('${assignedKidId}', '${chore.id}', '${chore.name}')">✗</button>`;
        } else {
            html += `<span class="approved-text">Completed!</span>`;
        }

        html += `</div></div>`;
    });

    html += '</div>';
    container.innerHTML = html;

    // Parse emojis in chores section
    if (typeof twemoji !== 'undefined') {
        twemoji.parse(document.getElementById('choresContainer'), {
            folder: 'svg',
            ext: '.svg'
        });
    }
}

// Module-level variables
let selectedChore = null;

// Show kid selector for shared chore completion

export function showChoreKidSelector(choreId, choreName, bp, multiplier) {
    const CONFIG = getConfig();
    selectedChore = { id: choreId, name: choreName, bp, multiplier };

    let html = '<h2>Who completed this chore?</h2>';
    html += '<div class="kid-selector-grid">';

    Object.values(CONFIG).forEach(kid => {
        if (kid.id) {
            html += `
                <div class="kid-selector-card" onclick="selectKidForChore('${kid.id}')">
                    <div class="kid-selector-name">${kid.name}</div>
                </div>
            `;
        }
    });

    html += '</div>';

    document.getElementById('kidSelectorContent').innerHTML = html;
    document.getElementById('kidSelectorModal').classList.add('active');
}

export function selectKidForChore(kidId) {
    if (!selectedChore) return;

    closeKidSelector();
    markChoreCompleteForKid(kidId, selectedChore.id);
    selectedChore = null;
}

export function markChoreCompleteForKid(kidId, choreId) {
    const currentStatus = getChoreStatus(kidId, choreId);

    if (currentStatus === 'approved') {
        showMessage('This chore is already approved!');
        return;
    }

    if (currentStatus === 'pending') {
        showMessage('This chore is waiting for approval!');
        return;
    }

    // Mark as pending
    setChoreStatus(kidId, choreId, 'pending');
    renderChores();

    const kid = getKidByID(kidId);
    showMessage(`${kid.name} marked chore complete! Waiting for parent approval.`);
}

// ====== ACTIVITIES FUNCTIONALITY ======

// Get activity completion status from localStorage (daily tracking, like chores)
