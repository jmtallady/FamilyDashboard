// automation.js - Background Automation Tasks

import { getConfig } from './config.js';
import { getUseGoogleSheets } from './state.js';
import { SHEETS_API_URL } from './config.js';
import { savePointsToSheets } from './api.js';
import { showMessage } from './utils.js';

/**
 * Check for midnight and auto-reset Daily BP
 * Note: This is a backup - server-side triggers handle this in EOD-AUTOMATION-SETUP.md
 */
export async function checkForMidnight() {
    const CONFIG = getConfig();
    const useGoogleSheets = getUseGoogleSheets();
    const now = new Date();
    const lastReset = localStorage.getItem('lastDailyReset');
    const today = now.toDateString();

    if (lastReset !== today && now.getHours() === 0 && now.getMinutes() === 0) {
        // Auto-reset bypasses PIN requirement
        Object.values(CONFIG).forEach(kid => {
            if (kid.id) {
                const dailyBPElement = document.getElementById(`${kid.id}-daily-bp`);
                if (dailyBPElement) {
                    dailyBPElement.textContent = kid.defaultDailyBP; // Reset to 5
                    localStorage.setItem(`${kid.id}-daily-bp`, kid.defaultDailyBP.toString());

                    // Save to Google Sheets if configured
                    if (useGoogleSheets && SHEETS_API_URL) {
                        const totalBPElement = document.getElementById(`${kid.id}-total-bp`);
                        const pcElement = document.getElementById(`${kid.id}-pc`);
                        const currentTotalBP = parseInt(totalBPElement.textContent);
                        const currentPC = parseInt(pcElement.textContent);
                        savePointsToSheets(kid.id, kid.defaultDailyBP, currentTotalBP, currentPC, 'midnight-reset', 'Daily BP reset to 5');
                    }
                }
            }
        });
        localStorage.setItem('lastDailyReset', today);
        showMessage('🌅 New day! Daily BP reset to 5 for everyone.');
    }
}

/**
 * Auto-save to Google Sheets at 9pm Eastern (before Pi shutdown)
 * Note: This is a backup - server-side triggers handle this in EOD-AUTOMATION-SETUP.md
 */
export async function checkFor9pmSave() {
    const CONFIG = getConfig();
    const useGoogleSheets = getUseGoogleSheets();

    // Get current time in Eastern timezone
    const now = new Date();
    const easternTimeString = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
    const easternTime = new Date(easternTimeString);
    const hour = easternTime.getHours();
    const minute = easternTime.getMinutes();

    // Check if it's 9:00 PM Eastern and we haven't saved yet today
    const lastSaveDate = localStorage.getItem('lastAutoSave');
    const todayString = easternTime.toDateString();

    if (hour === 21 && minute === 0 && lastSaveDate !== todayString) {
        console.log('9pm Eastern - Auto-saving to Google Sheets...');

        if (useGoogleSheets && SHEETS_API_URL) {
            // Save current points for all kids
            for (const kid of Object.values(CONFIG)) {
                if (kid.id) {
                    const dailyBP = parseInt(document.getElementById(`${kid.id}-daily-bp`)?.textContent || kid.defaultDailyBP);
                    const totalBP = parseInt(document.getElementById(`${kid.id}-total-bp`)?.textContent || kid.defaultTotalBP);
                    const pc = parseInt(document.getElementById(`${kid.id}-pc`)?.textContent || kid.defaultPrizeCoins);
                    await savePointsToSheets(kid.id, dailyBP, totalBP, pc, 'auto-save', 'End of day auto-save');
                }
            }

            localStorage.setItem('lastAutoSave', todayString);
            showMessage('✅ Auto-saved to Google Sheets');
            console.log('Auto-save complete!');
        }
    }
}
