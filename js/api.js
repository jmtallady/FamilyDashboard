// api.js - Google Sheets API Integration

import { SHEETS_API_URL, getConfig } from './config.js';
import { getUseGoogleSheets } from './state.js';
import { getKidByID } from './utils.js';

/**
 * Fetch current points from Google Sheets
 */
export async function fetchPointsFromSheets() {
    if (!SHEETS_API_URL) {
        console.log('No Google Sheets API URL configured');
        return null;
    }

    try {
        const url = `${SHEETS_API_URL}?action=getCurrentPoints&t=${Date.now()}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.points) {
            console.log('Fetched points from Google Sheets:', data.points);
            return data.points;
        }

        return null;
    } catch (error) {
        console.error('Error fetching from Google Sheets:', error);
        return null;
    }
}

/**
 * Save points to Google Sheets
 */
export async function savePointsToSheets(kidId, dailyBP, totalBP, prizeCoins, type = 'behavior', note = '') {
    if (!SHEETS_API_URL) {
        console.log('No Google Sheets API URL configured');
        return false;
    }

    try {
        const kid = getKidByID(kidId);
        if (!kid) return false;

        const response = await fetch(SHEETS_API_URL, {
            method: 'POST',
            mode: 'no-cors', // Required for Google Apps Script
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'logPoints',
                kid: kid.name,
                dailyBP: dailyBP,
                totalBP: totalBP,
                prizeCoins: prizeCoins,
                type: type,
                note: note
            })
        });

        console.log('Saved points to Google Sheets:', kidId, dailyBP, 'Daily BP,', totalBP, 'Total BP,', prizeCoins, 'PC');
        return true;
    } catch (error) {
        console.error('Error saving to Google Sheets:', error);
        return false;
    }
}

/**
 * Fetch calendar events from Google Sheets
 */
export async function fetchCalendarEvents() {
    const CONFIG = getConfig();
    if (!CONFIG.calendar || !CONFIG.calendar.enabled || !SHEETS_API_URL) {
        console.log('Calendar not configured or disabled');
        return null;
    }

    try {
        const days = CONFIG.calendar.daysAhead || 7;
        const url = `${SHEETS_API_URL}?action=getCalendarEvents&days=${days}&t=${Date.now()}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.events) {
            console.log('Fetched calendar events:', data.events.length);
            return data.events;
        }

        return null;
    } catch (error) {
        console.error('Error fetching calendar:', error);
        return null;
    }
}

/**
 * Fetch house rules from Google Sheets
 */
export async function fetchHouseRules() {
    const useGoogleSheets = getUseGoogleSheets();
    if (!useGoogleSheets || !SHEETS_API_URL) {
        return null;
    }

    try {
        const url = `${SHEETS_API_URL}?action=getHouseRules&t=${Date.now()}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.rules) {
            console.log('Loaded house rules from Google Sheets');
            return data.rules;
        }

        return null;
    } catch (error) {
        console.error('Error fetching house rules:', error);
        return null;
    }
}

/**
 * Fetch chores from Google Sheets
 */
export async function fetchChores() {
    try {
        const url = `${SHEETS_API_URL}?action=getChores&t=${Date.now()}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.chores) {
            console.log('Loaded chores from Google Sheets');
            return data.chores;
        }

        return null;
    } catch (error) {
        console.error('Error fetching chores:', error);
        return null;
    }
}

/**
 * Fetch rewards from Google Sheets
 */
export async function fetchRewards() {
    try {
        const url = `${SHEETS_API_URL}?action=getRewards&t=${Date.now()}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.rewards) {
            console.log('Loaded rewards from Google Sheets');
            return data.rewards;
        }

        return null;
    } catch (error) {
        console.error('Error fetching rewards:', error);
        return null;
    }
}

/**
 * Fetch activities from Google Sheets
 */
export async function fetchActivities() {
    try {
        const url = `${SHEETS_API_URL}?action=getActivities&t=${Date.now()}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.activities) {
            console.log('Loaded activities from Google Sheets');
            return data.activities;
        }

        return null;
    } catch (error) {
        console.error('Error fetching activities:', error);
        return null;
    }
}

/**
 * Fetch recent activity log entries from Google Sheets
 */
export async function fetchRecentPointsLog() {
    const useGoogleSheets = getUseGoogleSheets();
    if (!useGoogleSheets || !SHEETS_API_URL) {
        return [];
    }

    try {
        const url = `${SHEETS_API_URL}?action=getRecentPointsLog&t=${Date.now()}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.entries) {
            console.log(`Loaded ${data.count} recent entries from Points Log`);
            return data.entries;
        }

        return [];
    } catch (error) {
        console.error('Error fetching recent Points Log:', error);
        return [];
    }
}
