// app.js - Main Application Entry Point

// Import all modules
import { fetchConfig, setConfig } from './config.js';
import {  setUseGoogleSheets, setChores, setRewards, setActivities } from './state.js';
import * as Theme from './theme.js';
import * as Weather from './weather.js';
import * as Calendar from './calendar.js';
import * as Auth from './auth.js';
import * as UI from './ui.js';
import * as Points from './points.js';
import * as Chores from './chores.js';
import * as Activities from './activities.js';
import * as Rewards from './rewards.js';
import * as HouseRules from './house-rules.js';
import * as RecentActivity from './recent-activity.js';
import * as Automation from './automation.js';
import { fetchChores, fetchRewards, fetchActivities } from './api.js';

/**
 * Main initialization function
 */
async function initialize() {
    // Load dark mode preference first
    Theme.loadDarkMode();

    // Load config first
    const CONFIG = await fetchConfig();

    if (!CONFIG) {
        document.body.innerHTML = '<div style="color: white; text-align: center; padding: 50px; font-size: 20px;">⚠️ Failed to load configuration from Google Sheets.<br><br>Please check your Config sheet setup.</div>';
        return;
    }

    setConfig(CONFIG);
    setUseGoogleSheets(true);

    // Apply color scheme from config
    Theme.applyColorScheme();

    // Load chores, rewards, and activities from separate sheets
    const chores = await fetchChores();
    const rewards = await fetchRewards();
    const activities = await fetchActivities();

    setChores(chores);
    setRewards(rewards);
    setActivities(activities);

    // Initialize dashboard
    UI.generateKidCards();
    await Points.initializePoints();
    UI.updateDateTime();
    Weather.updateWeather();
    Calendar.updateCalendar();
    Chores.renderChores();
    Rewards.renderRewards();
    Activities.renderActivities();
    await RecentActivity.renderRecentActivity(); // Load and display from Points Log

    // Parse emojis with Twemoji (converts emoji to images)
    if (typeof twemoji !== 'undefined') {
        twemoji.parse(document.body, {
            folder: 'svg',
            ext: '.svg'
        });
    }
}

// Expose functions to global scope for onclick handlers (backwards compatibility)
// Theme functions
window.toggleDarkMode = Theme.toggleDarkMode;
window.changeColorScheme = Theme.changeColorScheme;

// House Rules functions
window.showHouseRules = HouseRules.showHouseRules;
window.closeHouseRules = HouseRules.closeHouseRules;

// Points functions
window.adjustDailyBP = Points.adjustDailyBP;
window.endOfDay = Points.endOfDay;
window.endOfDayAll = Points.endOfDayAll;
window.cashInPoints = Points.cashInPoints;

// PIN/Auth functions
window.showPinModal = Auth.showPinModal;
window.closePinModal = Auth.closePinModal;
window.addPinDigit = Auth.addPinDigit;
window.backspacePin = Auth.backspacePin;
window.clearPin = Auth.clearPin;
window.checkPin = Auth.checkPin;
window.lockDashboard = Auth.lockDashboard;

// Chores functions
window.showChoreKidSelector = Chores.showChoreKidSelector;
window.selectKidForChore = Chores.selectKidForChore;
window.markChoreCompleteForKid = Chores.markChoreCompleteForKid;
window.approveChore = Chores.approveChore;
window.rejectChore = Chores.rejectChore;

// Activities functions
window.selectKidForActivity = Activities.selectKidForActivity;
window.showActivityKidSelectorFromButton = Activities.showActivityKidSelectorFromButton;
window.approveActivityFromButton = Activities.approveActivityFromButton;
window.rejectActivityFromButton = Activities.rejectActivityFromButton;

// Rewards functions
window.showKidSelector = Rewards.showKidSelector;
window.closeKidSelector = Rewards.closeKidSelector;
window.confirmPurchase = Rewards.confirmPurchase;

// Set up keyboard event listener for PIN modal
document.addEventListener('keydown', Auth.handlePinKeyboard);

// Set up periodic timers
setInterval(UI.updateDateTime, 1000);               // Update time every second
setInterval(Weather.updateWeather, 600000);          // Update weather every 10 minutes
setInterval(Calendar.updateCalendar, 900000);        // Update calendar every 15 minutes
setInterval(Points.refreshPointsFromSheets, 120000); // Refresh points every 2 minutes
setInterval(Automation.checkForMidnight, 60000);     // Check for midnight every minute
setInterval(Automation.checkFor9pmSave, 60000);      // Check for 9pm save every minute

// Initialize application
initialize();
