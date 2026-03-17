// rewards.js - Rewards Management
// Handles reward purchases and prize coin transactions

import { getConfig, SHEETS_API_URL } from './config.js';
import { getRewards, getUseGoogleSheets, setPinContext, resetPinContext } from './state.js';
import { savePointsToSheets } from './api.js';
import { showPinModal } from './auth.js';
import { getKidByID, showMessage } from './utils.js';
import { generateKidCards } from './ui.js';
import { renderRecentActivity } from './recent-activity.js';


// Module-level variables
let selectedReward = null;

export function showKidSelector(rewardId, rewardName, cost, icon) {
    const CONFIG = getConfig();
    selectedReward = { id: rewardId, name: rewardName, cost, icon };

    // Generate kid selection buttons
    let html = '<h2>Who is purchasing?</h2>';
    html += '<div class="kid-selector-grid">';

    Object.values(CONFIG).forEach(kid => {
        if (kid.id) {
            const pcElement = document.getElementById(`${kid.id}-pc`);
            const currentPC = parseInt(pcElement.textContent);
            const canAfford = currentPC >= cost;
            const disabledClass = canAfford ? '' : 'disabled';

            html += `
                <div class="kid-selector-card ${disabledClass}" onclick="confirmPurchase('${kid.id}')">
                    <div class="kid-selector-name">${kid.name}</div>
                    <div class="kid-selector-pc">${currentPC} PC</div>
                    ${canAfford ? '<div class="kid-selector-status">✓</div>' : '<div class="kid-selector-status">Not enough</div>'}
                </div>
            `;
        }
    });

    html += '</div>';

    document.getElementById('kidSelectorContent').innerHTML = html;
    document.getElementById('kidSelectorModal').classList.add('active');
}

// Close kid selector modal
export function closeKidSelector() {
    document.getElementById('kidSelectorModal').classList.remove('active');
    selectedReward = null;
}

// Confirm purchase for selected kid
export async function confirmPurchase(kidId) {
    const kid = getKidByID(kidId);
    if (!kid || !selectedReward) return;

    const pcElement = document.getElementById(`${kidId}-pc`);
    const currentPC = parseInt(pcElement.textContent);

    if (currentPC < selectedReward.cost) {
        showMessage(`${kid.name} needs ${selectedReward.cost} PC but only has ${currentPC} PC!`);
        return;
    }

    // Capture the reward before closing selector (closeKidSelector sets selectedReward to null)
    const reward = selectedReward;

    // Close kid selector first
    closeKidSelector();

    // If kid has a PIN, require kid PIN. Otherwise, allow without PIN.
    if (kid.pin) {
        // Request kid PIN
        showPinModal('kid', kidId, 'purchase', () => performPurchase(kidId, reward));
        return;
    }

    // No kid PIN required, proceed with purchase
    await performPurchase(kidId, reward);
}

// Perform the actual purchase operation
export async function performPurchase(kidId, reward) {
    const CONFIG = getConfig();
    const useGoogleSheets = getUseGoogleSheets();
    const kid = getKidByID(kidId);
    if (!kid || !reward) return;

    const pcElement = document.getElementById(`${kidId}-pc`);
    const currentPC = parseInt(pcElement.textContent);

    // Double-check they can still afford it
    if (currentPC < reward.cost) {
        showMessage(`${kid.name} needs ${reward.cost} PC but only has ${currentPC} PC!`);
        return;
    }

    // Deduct Prize Coins
    const newPC = currentPC - reward.cost;
    pcElement.textContent = newPC;
    localStorage.setItem(`${kidId}-pc`, newPC.toString());

    // Save to Google Sheets if configured
    if (getUseGoogleSheets() && SHEETS_API_URL) {
        const dailyBPElement = document.getElementById(`${kidId}-daily-bp`);
        const totalBPElement = document.getElementById(`${kidId}-total-bp`);
        const currentDailyBP = parseInt(dailyBPElement.textContent);
        const currentTotalBP = parseInt(totalBPElement.textContent);
        await savePointsToSheets(kidId, currentDailyBP, currentTotalBP, newPC, 'reward-purchase', `Purchased: ${reward.name} ${reward.icon} (-${reward.cost} PC)`);
    }

    renderRecentActivity(); // Refresh activity feed from Points Log
    showMessage(`🎉 ${kid.name} purchased ${reward.icon} ${reward.name} for ${reward.cost} PC! Remaining: ${newPC} PC`);
}

// Render rewards section (list format like chores)
export function renderRewards() {
    const REWARDS = getRewards();
    if (!REWARDS || REWARDS.length === 0) {
        document.getElementById('rewardsContainer').innerHTML = '<div style="text-align: center; color: #999; padding: 20px; font-size: 11px;">No rewards configured</div>';
        return;
    }

    const container = document.getElementById('rewardsContainer');
    let html = '<div class="chore-list">';

    REWARDS.forEach(reward => {
        html += `
            <div class="chore-item">
                <div class="chore-info">
                    <span class="chore-name">${reward.name}</span>
                    <span class="chore-bp" style="color: #f59f00;">${reward.cost} PC</span>
                </div>
                <div class="chore-actions">
                    <button class="chore-btn complete-btn" onclick="showKidSelector('${reward.id}', '${reward.name}', ${reward.cost}, '${reward.icon}')">🛒</button>
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

// Update date and time
