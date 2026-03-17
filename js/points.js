// points.js - Points Management
// Handles daily BP, total BP, prize coins, and conversions

import { getConfig, SHEETS_API_URL } from './config.js';
import { fetchPointsFromSheets, savePointsToSheets } from './api.js';
import { getKidByID, showMessage } from './utils.js';
import { showPinModal } from './auth.js';
import { generateKidCards } from './ui.js';
import {
    getIsUnlocked,
    setIsUnlocked,
    getUnlockTimeout,
    setUnlockTimeout,
    getUseGoogleSheets,
    setUseGoogleSheets
} from './state.js';

export async function initializePoints() {
    const CONFIG = getConfig();
    const today = new Date().toDateString();
    const lastReset = localStorage.getItem('lastReset');

    // Try to fetch from Google Sheets first
    if (CONFIG.SHEETS_API_URL) {
        const sheetPoints = await fetchPointsFromSheets();

        if (sheetPoints) {
            setUseGoogleSheets(true);
            console.log('Using Google Sheets as data source');

            // Update UI with points from sheet
            Object.values(CONFIG).forEach(kid => {
                if (kid.id) {
                    const kidData = sheetPoints[kid.id.toLowerCase()];
                    const dailyBP = kidData ? kidData.dailyBP : kid.defaultDailyBP;
                    const totalBP = kidData ? kidData.totalBP : kid.defaultTotalBP;
                    const pc = kidData ? kidData.prizeCoins : kid.defaultPrizeCoins;

                    const dailyBPElement = document.getElementById(`${kid.id}-daily-bp`);
                    const totalBPElement = document.getElementById(`${kid.id}-total-bp`);
                    const pcElement = document.getElementById(`${kid.id}-pc`);

                    if (dailyBPElement) dailyBPElement.textContent = dailyBP;
                    if (totalBPElement) totalBPElement.textContent = totalBP;
                    if (pcElement) pcElement.textContent = pc;

                    // Also save to localStorage as backup
                    localStorage.setItem(`${kid.id}-daily-bp`, dailyBP.toString());
                    localStorage.setItem(`${kid.id}-total-bp`, totalBP.toString());
                    localStorage.setItem(`${kid.id}-pc`, pc.toString());
                }
            });

            showMessage('📊 Loaded from Google Sheets');
            return;
        }
    }

    // Fallback to localStorage
    console.log('Using localStorage as data source');
    setUseGoogleSheets(false);

    // Initialize points if not set (first time only)
    Object.values(CONFIG).forEach(kid => {
        if (kid.id) {
            // Only set defaults if nothing exists (first time setup)
            if (!localStorage.getItem(`${kid.id}-daily-bp`)) {
                localStorage.setItem(`${kid.id}-daily-bp`, kid.defaultDailyBP.toString());
            }
            if (!localStorage.getItem(`${kid.id}-total-bp`)) {
                localStorage.setItem(`${kid.id}-total-bp`, kid.defaultTotalBP.toString());
            }
            if (!localStorage.getItem(`${kid.id}-pc`)) {
                localStorage.setItem(`${kid.id}-pc`, kid.defaultPrizeCoins.toString());
            }
        }
    });

    // Load points from localStorage
    Object.values(CONFIG).forEach(kid => {
        if (kid.id) {
            const dailyBP = localStorage.getItem(`${kid.id}-daily-bp`) || kid.defaultDailyBP.toString();
            const totalBP = localStorage.getItem(`${kid.id}-total-bp`) || kid.defaultTotalBP.toString();
            const pc = localStorage.getItem(`${kid.id}-pc`) || kid.defaultPrizeCoins.toString();

            const dailyBPElement = document.getElementById(`${kid.id}-daily-bp`);
            const totalBPElement = document.getElementById(`${kid.id}-total-bp`);
            const pcElement = document.getElementById(`${kid.id}-pc`);

            if (dailyBPElement) dailyBPElement.textContent = dailyBP;
            if (totalBPElement) totalBPElement.textContent = totalBP;
            if (pcElement) pcElement.textContent = pc;
        }
    });

    if (!SHEETS_API_URL) {
        showMessage('💾 Using offline mode');
    }
}

// Refresh points from Google Sheets (for multi-device sync)
export async function refreshPointsFromSheets() {
    const CONFIG = getConfig();
    // Only refresh if using Google Sheets
    if (!getUseGoogleSheets() || !SHEETS_API_URL) {
        return;
    }

    try {
        const sheetPoints = await fetchPointsFromSheets();

        if (sheetPoints) {
            // Update UI with latest points from sheet
            Object.values(CONFIG).forEach(kid => {
                if (kid.id) {
                    const kidData = sheetPoints[kid.id.toLowerCase()];
                    if (kidData) {
                        const dailyBP = kidData.dailyBP;
                        const totalBP = kidData.totalBP;
                        const pc = kidData.prizeCoins;

                        const dailyBPElement = document.getElementById(`${kid.id}-daily-bp`);
                        const totalBPElement = document.getElementById(`${kid.id}-total-bp`);
                        const pcElement = document.getElementById(`${kid.id}-pc`);

                        if (dailyBPElement) dailyBPElement.textContent = dailyBP;
                        if (totalBPElement) totalBPElement.textContent = totalBP;
                        if (pcElement) pcElement.textContent = pc;

                        // Also update localStorage as backup
                        localStorage.setItem(`${kid.id}-daily-bp`, dailyBP.toString());
                        localStorage.setItem(`${kid.id}-total-bp`, totalBP.toString());
                        localStorage.setItem(`${kid.id}-pc`, pc.toString());
                    }
                }
            });

            console.log('🔄 Synced points from Google Sheets');
        }
    } catch (error) {
        console.error('Error refreshing points from Google Sheets:', error);
    }
}

export async function adjustDailyBP(kidId, change) {
    const CONFIG = getConfig();
    // Check if PIN is required and user is not unlocked
    if (CONFIG.requirePinForEdits && !getIsUnlocked()) {
        showPinModal();
        return;
    }

    // Reset the auto-lock timer
    if (getIsUnlocked()) {
        clearTimeout(getUnlockTimeout());
        setUnlockTimeout(setTimeout(() => {
            setIsUnlocked(false);
            document.getElementById('unlockIndicator').classList.remove('active');
            showMessage('Auto-locked for security');
        }, 120000));
    }

    const kid = getKidByID(kidId);
    if (!kid) return;

    // Fetch latest points from Google Sheets FIRST to ensure we have fresh data
    let currentDailyBP, currentTotalBP, currentPC;

    if (getUseGoogleSheets() && CONFIG.SHEETS_API_URL) {
        const sheetPoints = await fetchPointsFromSheets();
        if (sheetPoints && sheetPoints[kidId.toLowerCase()]) {
            const kidData = sheetPoints[kidId.toLowerCase()];
            currentDailyBP = kidData.dailyBP;
            currentTotalBP = kidData.totalBP;
            currentPC = kidData.prizeCoins;
        } else {
            // Fallback to UI values if fetch fails
            currentDailyBP = parseInt(document.getElementById(`${kidId}-daily-bp`).textContent);
            currentTotalBP = parseInt(document.getElementById(`${kidId}-total-bp`).textContent);
            currentPC = parseInt(document.getElementById(`${kidId}-pc`).textContent);
        }
    } else {
        // Use UI values if not using Google Sheets
        currentDailyBP = parseInt(document.getElementById(`${kidId}-daily-bp`).textContent);
        currentTotalBP = parseInt(document.getElementById(`${kidId}-total-bp`).textContent);
        currentPC = parseInt(document.getElementById(`${kidId}-pc`).textContent);
    }

    let newDailyBP = currentDailyBP + change;

    // Don't go below 0
    if (newDailyBP < 0) {
        showMessage(`${kid.name} already at 0 daily points!`);
        return;
    }

    // Update UI
    const dailyBPElement = document.getElementById(`${kidId}-daily-bp`);
    const totalBPElement = document.getElementById(`${kidId}-total-bp`);
    const pcElement = document.getElementById(`${kidId}-pc`);

    dailyBPElement.textContent = newDailyBP;
    totalBPElement.textContent = currentTotalBP;
    pcElement.textContent = currentPC;

    // Save to localStorage (always, as backup)
    localStorage.setItem(`${kidId}-daily-bp`, newDailyBP.toString());
    localStorage.setItem(`${kidId}-total-bp`, currentTotalBP.toString());
    localStorage.setItem(`${kidId}-pc`, currentPC.toString());

    const actionPast = change > 0 ? 'earned' : 'lost';
    showMessage(`${kid.name} ${actionPast} a daily point! Now at ${newDailyBP} today`);

    // Save to Google Sheets with fresh data
    if (getUseGoogleSheets() && CONFIG.SHEETS_API_URL) {
        const note = `${actionPast} daily BP via dashboard`;
        await savePointsToSheets(kidId, newDailyBP, currentTotalBP, currentPC, 'daily-adjust', note);
    }
}

// End of day: Add daily BP to total BP, reset daily to 5
export async function endOfDay(kidId) {
    const CONFIG = getConfig();
    // Check if PIN is required and user is not unlocked
    if (CONFIG.requirePinForEdits && !getIsUnlocked()) {
        showPinModal();
        return;
    }

    // Reset the auto-lock timer
    if (getIsUnlocked()) {
        clearTimeout(getUnlockTimeout());
        setUnlockTimeout(setTimeout(() => {
            setIsUnlocked(false);
            document.getElementById('unlockIndicator').classList.remove('active');
            showMessage('Auto-locked for security');
        }, 120000));
    }

    const kid = getKidByID(kidId);
    if (!kid) return;

    const dailyBPElement = document.getElementById(`${kidId}-daily-bp`);
    const totalBPElement = document.getElementById(`${kidId}-total-bp`);
    let currentDailyBP = parseInt(dailyBPElement.textContent);
    let currentTotalBP = parseInt(totalBPElement.textContent);

    // Add daily BP to total BP
    const newTotalBP = currentTotalBP + currentDailyBP;
    const newDailyBP = kid.defaultDailyBP; // Reset to 5

    // Update UI
    dailyBPElement.textContent = newDailyBP;
    totalBPElement.textContent = newTotalBP;

    // Save to localStorage
    localStorage.setItem(`${kidId}-daily-bp`, newDailyBP.toString());
    localStorage.setItem(`${kidId}-total-bp`, newTotalBP.toString());

    showMessage(`${kid.name}: Added ${currentDailyBP} to bank! Total BP: ${newTotalBP}, Daily reset to ${newDailyBP}`);

    // Save to Google Sheets if configured
    if (getUseGoogleSheets() && CONFIG.SHEETS_API_URL) {
        const pcElement = document.getElementById(`${kidId}-pc`);
        const currentPC = parseInt(pcElement.textContent);
        await savePointsToSheets(kidId, newDailyBP, newTotalBP, currentPC, 'end-of-day', `Added ${currentDailyBP} daily BP to total, reset daily to ${newDailyBP}`);
    }
}

// Cash in total behavior points for prize coins
export async function cashInPoints(kidId) {
    const kid = getKidByID(kidId);
    if (!kid) return;

    // If kid has a PIN, require kid PIN. Otherwise, allow without authentication.
    if (kid.pin) {
        // Request kid PIN
        showPinModal('kid', kidId, 'cash-in', () => performCashIn(kidId));
        return;
    }

    // No kid PIN, proceed with cash-in
    await performCashIn(kidId);
}

// Perform the actual cash-in operation
export async function performCashIn(kidId) {
    const CONFIG = getConfig();
    const kid = getKidByID(kidId);
    if (!kid) return;

    const dailyBPElement = document.getElementById(`${kidId}-daily-bp`);
    const totalBPElement = document.getElementById(`${kidId}-total-bp`);
    const pcElement = document.getElementById(`${kidId}-pc`);
    let currentDailyBP = parseInt(dailyBPElement.textContent);
    let currentTotalBP = parseInt(totalBPElement.textContent);
    let currentPC = parseInt(pcElement.textContent);

    // Check if they have enough Total BP to cash in
    if (currentTotalBP < CONFIG.conversionRate.bp) {
        showMessage(`${kid.name} needs ${CONFIG.conversionRate.bp} Total BP to cash in! Currently has ${currentTotalBP} in bank.`);
        return;
    }

    // Perform conversion (subtract from Total BP, add to PC)
    const newTotalBP = currentTotalBP - CONFIG.conversionRate.bp;
    const newPC = currentPC + CONFIG.conversionRate.pc;

    // Update UI
    totalBPElement.textContent = newTotalBP;
    pcElement.textContent = newPC;

    // Save to localStorage
    localStorage.setItem(`${kidId}-total-bp`, newTotalBP.toString());
    localStorage.setItem(`${kidId}-pc`, newPC.toString());

    showMessage(`${kid.name} cashed in ${CONFIG.conversionRate.bp} Total BP for ${CONFIG.conversionRate.pc} PC! Bank: ${newTotalBP} BP, PC: ${newPC}`);

    // Save to Google Sheets if configured
    if (getUseGoogleSheets() && CONFIG.SHEETS_API_URL) {
        await savePointsToSheets(kidId, currentDailyBP, newTotalBP, newPC, 'cash-in', `Converted ${CONFIG.conversionRate.bp} Total BP to ${CONFIG.conversionRate.pc} PC`);
    }
}

// End of day for all kids (add daily BP to total, reset daily to 5)
export async function endOfDayAll() {
    const CONFIG = getConfig();
    // Check if PIN is required and user is not unlocked
    if (CONFIG.requirePinForEdits && !getIsUnlocked()) {
        showPinModal();
        return;
    }

    let summary = [];

    // Process each kid
    for (const kid of Object.values(CONFIG)) {
        if (kid.id) {
            const dailyBPElement = document.getElementById(`${kid.id}-daily-bp`);
            const totalBPElement = document.getElementById(`${kid.id}-total-bp`);
            let currentDailyBP = parseInt(dailyBPElement.textContent);
            let currentTotalBP = parseInt(totalBPElement.textContent);

            // Add daily BP to total BP
            const newTotalBP = currentTotalBP + currentDailyBP;
            const newDailyBP = kid.defaultDailyBP; // Reset to 5

            // Update UI
            dailyBPElement.textContent = newDailyBP;
            totalBPElement.textContent = newTotalBP;

            // Save to localStorage
            localStorage.setItem(`${kid.id}-daily-bp`, newDailyBP.toString());
            localStorage.setItem(`${kid.id}-total-bp`, newTotalBP.toString());

            summary.push(`${kid.name}: +${currentDailyBP} → ${newTotalBP} total`);

            // Save to Google Sheets if configured
            if (getUseGoogleSheets() && CONFIG.SHEETS_API_URL) {
                const pcElement = document.getElementById(`${kid.id}-pc`);
                const currentPC = parseInt(pcElement.textContent);
                await savePointsToSheets(kid.id, newDailyBP, newTotalBP, currentPC, 'end-of-day-all', `Added ${currentDailyBP} daily BP to total, reset daily to ${newDailyBP}`);
            }
        }
    }

    showMessage(`✅ End of day complete! ${summary.join(' | ')}`);
}

// Show status message
