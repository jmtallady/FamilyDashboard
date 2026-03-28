// rewards.js - Rewards Management
// Handles reward purchases using behavior points (Total BP)

import { getConfig, SHEETS_API_URL } from './config.js';
import { getRewards, getUseGoogleSheets, setPinContext, resetPinContext } from './state.js';
import { savePointsToSheets } from './api.js';
import { showPinModal } from './auth.js';
import { getKidByID, showMessage } from './utils.js';
import { generateKidCards } from './ui.js';
import { renderRecentActivity } from './recent-activity.js';


// Module-level variables
let selectedReward = null;

// ── Reward limit helpers ──────────────────────────────────────────────────────

function getPeriodKey(limitType) {
    const now = new Date();
    if (limitType === 'daily') return now.toDateString();
    if (limitType === 'monthly') return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (limitType === 'weekly') {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay()); // Sunday
        return weekStart.toDateString();
    }
    return null;
}

function getRewardUseCount(kidId, rewardId, limitType) {
    const periodKey = getPeriodKey(limitType);
    if (!periodKey) return 0;
    return parseInt(localStorage.getItem(`reward-use-${kidId}-${rewardId}-${limitType}-${periodKey}`) || '0');
}

function incrementRewardUse(kidId, rewardId, limitType) {
    const periodKey = getPeriodKey(limitType);
    if (!periodKey) return;
    const key = `reward-use-${kidId}-${rewardId}-${limitType}-${periodKey}`;
    localStorage.setItem(key, (getRewardUseCount(kidId, rewardId, limitType) + 1).toString());
}

// ── Kid selector ──────────────────────────────────────────────────────────────

export function showKidSelector(rewardId, rewardName, cost, icon) {
    const CONFIG = getConfig();
    const REWARDS_LIST = getRewards();
    const rewardData = REWARDS_LIST ? REWARDS_LIST.find(r => r.id === rewardId) : null;
    selectedReward = {
        id: rewardId, name: rewardName, cost, icon,
        limitType: rewardData?.limitType || null,
        limitCount: rewardData?.limitCount || null
    };

    let html = '<h2>Who is purchasing?</h2>';
    html += '<div class="kid-selector-grid">';

    Object.values(CONFIG).forEach(kid => {
        if (kid.id) {
            const totalBPElement = document.getElementById(`${kid.id}-total-bp`);
            const currentTotalBP = parseInt(totalBPElement.textContent);
            const canAfford = currentTotalBP >= cost;

            let hitLimit = false;
            if (rewardData?.limitType && rewardData?.limitCount) {
                hitLimit = getRewardUseCount(kid.id, rewardId, rewardData.limitType) >= rewardData.limitCount;
            }

            const canPurchase = canAfford && !hitLimit;
            const disabledClass = canPurchase ? '' : 'disabled';
            const statusText = hitLimit ? '🔒 Limit reached' : canAfford ? '✓' : 'Not enough';
            const clickHandler = canPurchase ? `confirmPurchase('${kid.id}')` : '';

            html += `
                <div class="kid-selector-card ${disabledClass}" ${canPurchase ? `onclick="${clickHandler}"` : ''}>
                    <div class="kid-selector-name">${kid.name}</div>
                    <div class="kid-selector-pc">${currentTotalBP} BP</div>
                    <div class="kid-selector-status">${statusText}</div>
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

    const totalBPElement = document.getElementById(`${kidId}-total-bp`);
    const currentTotalBP = parseInt(totalBPElement.textContent);

    if (currentTotalBP < selectedReward.cost) {
        showMessage(`${kid.name} needs ${selectedReward.cost} BP but only has ${currentTotalBP} BP!`);
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

    const totalBPElement = document.getElementById(`${kidId}-total-bp`);
    const currentTotalBP = parseInt(totalBPElement.textContent);

    // Double-check they can still afford it
    if (currentTotalBP < reward.cost) {
        showMessage(`${kid.name} needs ${reward.cost} BP but only has ${currentTotalBP} BP!`);
        return;
    }

    // Check reward limit
    if (reward.limitType && reward.limitCount) {
        const useCount = getRewardUseCount(kidId, reward.id, reward.limitType);
        if (useCount >= reward.limitCount) {
            showMessage(`${kid.name} has reached the ${reward.limitType} limit for ${reward.name}!`);
            return;
        }
    }

    // Deduct from Total BP
    const newTotalBP = currentTotalBP - reward.cost;
    totalBPElement.textContent = newTotalBP;
    localStorage.setItem(`${kidId}-total-bp`, newTotalBP.toString());

    // Increment limit counter
    if (reward.limitType && reward.limitCount) {
        incrementRewardUse(kidId, reward.id, reward.limitType);
    }

    // Save to Google Sheets if configured
    if (getUseGoogleSheets() && SHEETS_API_URL) {
        const dailyBPElement = document.getElementById(`${kidId}-daily-bp`);
        const currentDailyBP = parseInt(dailyBPElement.textContent);
        await savePointsToSheets(kidId, currentDailyBP, newTotalBP, 'reward-purchase', `Purchased: ${reward.name} ${reward.icon} (-${reward.cost} BP)`);
    }

    renderRecentActivity(); // Refresh activity feed from Points Log
    showMessage(`🎉 ${kid.name} purchased ${reward.icon} ${reward.name} for ${reward.cost} BP! Remaining: ${newTotalBP} BP`);
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
        const limitBadge = reward.limitType && reward.limitCount
            ? `<span class="reward-limit-badge">${reward.limitCount}×/${reward.limitType}</span>`
            : '';
        const guidelinesHtml = reward.guidelines
            ? `<div class="reward-guidelines">${reward.guidelines}</div>`
            : '';

        html += `
            <div class="chore-item">
                <div class="chore-info">
                    <div class="reward-details">
                        <div><span class="chore-name">${reward.name}</span>${limitBadge}</div>
                        <div><span class="chore-bp" style="color: #f59f00;">${reward.cost} BP</span></div>
                        ${guidelinesHtml}
                    </div>
                </div>
                <div class="chore-actions">
                    <button class="chore-btn complete-btn" onclick="showKidSelector('${reward.id}', '${reward.name.replace(/'/g, "\\'")}', ${reward.cost}, '${reward.icon}')">🛒</button>
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}
