// app.js - Main Application Entry Point

// Import all modules
import { fetchConfig, setConfig, getConfig } from './config.js';
import { setUseGoogleSheets, setChores, setRewards, setActivities, getUseGoogleSheets, getChores, getActivities } from './state.js';
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
import * as ReasonModal from './reason-modal.js';
import * as Menu from './menu.js';
import { fetchChores, fetchRewards, fetchActivities, fetchDailyStatuses } from './api.js';
import * as ParentDash from './parent-dashboard.js';
import * as Checklists from './checklists.js';
import * as ModalTimeout from './modal-timeout.js';

/**
 * Load today's chore/activity statuses from Google Sheets into localStorage
 * This enables cross-device sync: approvals on one device appear on others
 */
async function loadDailyStatusesFromSheets() {
    if (!getUseGoogleSheets()) return;

    const statuses = await fetchDailyStatuses();

    // Clear today's chore/activity statuses before rewriting — Sheets is authoritative.
    // This removes any local-only entries (e.g. from a failed Sheets write) so every
    // device shows exactly what Sheets has.
    const today = new Date().toDateString();
    Object.keys(localStorage)
        .filter(k => (k.startsWith('chore-') || k.startsWith('activity-')) && k.endsWith(today))
        .forEach(k => localStorage.removeItem(k));

    if (!statuses || statuses.length === 0) {
        syncPendingApprovalsFromStatuses([]);
        Checklists.syncChecklistStatusesFromSheets([]);
        return;
    }

    statuses.forEach(s => {
        const key = `${s.type}-${s.kidId}-${s.itemId}-${today}`;
        localStorage.setItem(key, s.status);
    });

    syncPendingApprovalsFromStatuses(statuses);
    Checklists.syncChecklistStatusesFromSheets(statuses);
    console.log(`Synced ${statuses.length} daily statuses from Sheets`);
}

/**
 * Rebuild the pending approvals list from synced daily statuses.
 * Runs on load and every 2 min so parent dashboard stays current across devices.
 */
function syncPendingApprovalsFromStatuses(statuses) {
    const CONFIG = getConfig();
    const CHORES = getChores();
    const ACTIVITIES = getActivities();
    if (!CONFIG || !CHORES || !ACTIVITIES) return;

    // Wipe local pending list and rebuild entirely from Sheets so every device
    // sees the same state — no stale approvals can persist locally.
    ParentDash.clearPendingApprovals();

    statuses.forEach(s => {
        if (s.status !== 'pending') return;

        const kid = Object.values(CONFIG).find(
            k => k.id && k.id.toLowerCase() === (s.kidId || '').toLowerCase()
        );
        if (!kid) return;

        let item = null;
        if (s.type === 'chore') {
            item = (CHORES.shared || []).find(c => c.id === s.itemId);
            if (!item) {
                for (const list of Object.values(CHORES.individual || {})) {
                    item = list.find(c => c.id === s.itemId);
                    if (item) break;
                }
            }
        } else if (s.type === 'activity') {
            item = (ACTIVITIES.shared || []).find(a => a.id === s.itemId);
            if (!item) {
                for (const list of Object.values(ACTIVITIES.individual || {})) {
                    item = list.find(a => a.id === s.itemId);
                    if (item) break;
                }
            }
        }
        if (!item) return;

        ParentDash.addPendingApproval({
            type:       s.type,
            kidId:      kid.id,
            kidName:    kid.name,
            itemId:     s.itemId,
            itemName:   item.name,
            bp:         item.bp,
            multiplier: item.multiplier || 1
        });
    });

    ParentDash.updateParentBadge();
}

/**
 * Periodic refresh of chore/activity statuses from Sheets + re-render
 */
async function refreshDailyStatuses() {
    if (!getUseGoogleSheets()) return;
    await Promise.all([
        loadDailyStatusesFromSheets(),
        Checklists.initializeChecklists(),
    ]);
    Chores.renderChores();
    Activities.renderActivities();
}

/**
 * Periodic refresh of meal library and meal plan from Sheets
 */
async function refreshMeals() {
    if (!getUseGoogleSheets()) return;
    await Menu.initializeMeals();
    Calendar.updateCalendar();
}

/**
 * Manual refresh of all data — triggered by the refresh button
 */
async function refreshAll() {
    const btn = document.getElementById('refreshBtn');
    if (btn) btn.classList.add('spinning');
    try {
        await Promise.all([
            Weather.updateWeather(),
            Calendar.updateCalendar(),
            Points.refreshPointsFromSheets(),
            refreshDailyStatuses(),
            refreshMeals(),
            RecentActivity.renderRecentActivity(),
            Checklists.initializeChecklists(),
        ]);
    } finally {
        if (btn) btn.classList.remove('spinning');
    }
}

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
    ModalTimeout.initModalTimeout();

    // Apply color scheme from config
    Theme.applyColorScheme();

    // Load chores, rewards, and activities in parallel (saves ~4-6s vs sequential)
    const [chores, rewards, activities] = await Promise.all([
        fetchChores(),
        fetchRewards(),
        fetchActivities()
    ]);

    setChores(chores);
    setRewards(rewards);
    setActivities(activities);

    // Initialize dashboard
    UI.generateKidCards();
    await Points.initializePoints();
    UI.updateDateTime();
    Weather.updateWeather();
    Calendar.updateCalendar();
    await Menu.initializeMeals();
    await Checklists.initializeChecklists();

    // Load today's chore/activity statuses from Sheets for cross-device sync
    await loadDailyStatusesFromSheets();

    Chores.renderChores();
    Rewards.renderRewards();
    Activities.renderActivities();
    ParentDash.updateParentBadge();
    await RecentActivity.renderRecentActivity(); // Load and display from Points Log

    // Parse emojis with Twemoji (converts emoji to images)
    if (typeof twemoji !== 'undefined') {
        twemoji.parse(document.body, {
            folder: 'svg',
            ext: '.svg'
        });
    }
}

// Modal open/close helpers for Rewards and Activities
function openRewardsModal()   { document.getElementById('rewardsModal').classList.add('active'); }
function closeRewardsModal()  { document.getElementById('rewardsModal').classList.remove('active'); }
function openActivitiesModal()  { document.getElementById('activitiesModal').classList.add('active'); }
function closeActivitiesModal() { document.getElementById('activitiesModal').classList.remove('active'); }

// ── Dinner Request Modal ──────────────────────────────────────────────────────

let _dinnerKidId   = null;
let _dinnerDateStr = null;

function openDinnerRequestModal() {
    const CONFIG = getConfig();
    _dinnerKidId   = null;
    _dinnerDateStr = null;

    // Build kid picker
    const kidGrid = document.getElementById('dinnerKidPicker');
    kidGrid.innerHTML = Object.values(CONFIG)
        .filter(k => k.id)
        .map(k => `<button class="dinner-kid-btn" onclick="dinnerPickKid('${k.id}','${k.name}')">${k.name}</button>`)
        .join('');

    // Build date chips — today + next 6 days
    const dateGrid = document.getElementById('dinnerDatePicker');
    const today = new Date();
    dateGrid.innerHTML = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const ds = d.toISOString().split('T')[0];
        const label = i === 0 ? 'Tonight' : i === 1 ? 'Tomorrow'
            : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        return `<button class="dinner-date-btn" onclick="dinnerPickDate('${ds}',this)">${label}</button>`;
    }).join('');

    // Populate meal dropdown
    const sel = document.getElementById('dinnerMealSelect');
    sel.innerHTML = '<option value="">Pick from menu…</option>' +
        Menu.getMealsCache()
            .filter(m => m.active !== false)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(m => `<option value="${m.name.replace(/"/g, '&quot;')}">${m.name}</option>`)
            .join('');

    document.getElementById('dinnerCustomMeal').value = '';
    document.getElementById('dinnerReqValidation').textContent = '';
    document.getElementById('dinnerRequestModal').classList.add('active');
}

function closeDinnerRequestModal() {
    document.getElementById('dinnerRequestModal').classList.remove('active');
    _dinnerKidId = null;
    _dinnerDateStr = null;
}

function dinnerPickKid(kidId, kidName) {
    _dinnerKidId = kidId;
    document.querySelectorAll('.dinner-kid-btn').forEach(b => {
        b.classList.toggle('selected', b.textContent === kidName);
    });
}

function dinnerPickDate(dateStr, btn) {
    _dinnerDateStr = dateStr;
    document.querySelectorAll('.dinner-date-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
}

function submitDinnerRequest() {
    const validation = document.getElementById('dinnerReqValidation');
    if (!_dinnerKidId)   { validation.textContent = 'Please pick who you are.'; return; }
    if (!_dinnerDateStr) { validation.textContent = 'Please pick a night.'; return; }

    const mealSel    = document.getElementById('dinnerMealSelect').value;
    const mealCustom = document.getElementById('dinnerCustomMeal').value.trim();
    const mealName   = mealCustom || mealSel;
    if (!mealName) { validation.textContent = 'Please pick or type a meal.'; return; }

    const CONFIG   = getConfig();
    const kid      = Object.values(CONFIG).find(k => k.id === _dinnerKidId);
    const kidName  = kid?.name || _dinnerKidId;

    Menu.addDinnerRequest(_dinnerKidId, kidName, mealName, _dinnerDateStr);
    closeDinnerRequestModal();
    // Re-render parent dashboard if it's open so new request appears immediately
    if (document.getElementById('parentDashPanel').classList.contains('open')) {
        ParentDash.renderParentDashboard();
    }
}

// Expose functions to global scope for onclick handlers (backwards compatibility)
// Theme functions
window.toggleDarkMode = Theme.toggleDarkMode;
window.changeColorScheme = Theme.changeColorScheme;

// House Rules functions
window.showHouseRules = HouseRules.showHouseRules;
window.closeHouseRules = HouseRules.closeHouseRules;

// Parent Dashboard functions
window.openParentDashboard = ParentDash.openParentDashboard;
window.closeParentDashboard = ParentDash.closeParentDashboard;
window.renderParentDashboard = ParentDash.renderParentDashboard;
window.parentDashApprove = ParentDash.parentDashApprove;
window.parentDashReject = ParentDash.parentDashReject;
window.toggleChoresAdmin = ParentDash.toggleChoresAdmin;
window.adminAddChore = ParentDash.adminAddChore;
window.adminEditChore = ParentDash.adminEditChore;
window.adminSaveChoreEdit = ParentDash.adminSaveChoreEdit;
window.adminSetMultiplier = ParentDash.adminSetMultiplier;
window.parentDashEndOfDayAll = ParentDash.parentDashEndOfDayAll;
window.toggleEndOfDaySection = ParentDash.toggleEndOfDaySection;

// Reason modal functions
window.showAdjustReason   = ReasonModal.showAdjustReason;
window.selectAdjustReason = ReasonModal.selectAdjustReason;
window.confirmAdjustment  = ReasonModal.confirmAdjustment;
window.closeReasonModal   = ReasonModal.closeReasonModal;
window.stepReasonBP       = ReasonModal.stepReasonBP;

// Points functions
window.adjustDailyBP = Points.adjustDailyBP;
window.endOfDay = Points.endOfDay;
window.endOfDayAll = Points.endOfDayAll;

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
window.selectParentForChore = Chores.selectParentForChore;
window.markChoreCompleteForKid = Chores.markChoreCompleteForKid;
window.markChoreDoneByParent = Chores.markChoreDoneByParent;
window.approveChore = Chores.approveChore;
window.rejectChore = Chores.rejectChore;

// Activities functions
window.selectKidForActivity = Activities.selectKidForActivity;
window.showActivityKidSelectorFromButton = Activities.showActivityKidSelectorFromButton;
window.approveActivityFromButton = Activities.approveActivityFromButton;
window.rejectActivityFromButton = Activities.rejectActivityFromButton;

// Modal open/close
window.openRewardsModal    = openRewardsModal;
window.closeRewardsModal   = closeRewardsModal;
window.openActivitiesModal   = openActivitiesModal;
window.closeActivitiesModal  = closeActivitiesModal;

// Menu / meal planning functions
window.adminToggleMenuSection      = ParentDash.adminToggleMenuSection;
window.adminSetMealForDate         = ParentDash.adminSetMealForDate;
window.adminRandomMealForDate      = ParentDash.adminRandomMealForDate;
window.adminApproveDinnerRequest   = ParentDash.adminApproveDinnerRequest;
window.adminDismissDinnerRequest   = ParentDash.adminDismissDinnerRequest;
window.adminAddMeal                = ParentDash.adminAddMeal;

// Dinner request modal
window.openDinnerRequestModal  = openDinnerRequestModal;
window.closeDinnerRequestModal = closeDinnerRequestModal;
window.dinnerPickKid           = dinnerPickKid;
window.dinnerPickDate          = dinnerPickDate;
window.submitDinnerRequest     = submitDinnerRequest;

// Recent Activity functions
window.undoActivity = RecentActivity.undoActivity;

// Manual refresh
window.refreshAll = refreshAll;

// Shared emoji-mart picker — one instance, moved off-screen when inactive.
// We avoid display:none because web components don't render their shadow DOM
// while hidden, causing the picker to appear blank when first shown.
let _emojiPickerEl = null;
let _emojiPickerVisible = false;
let _activeEmojiInput = null;
let _activeEmojiBtn = null;

function _getOrCreateEmojiPicker() {
    if (_emojiPickerEl) return _emojiPickerEl;
    if (typeof EmojiMart === 'undefined') {
        console.warn('emoji-mart not loaded — emoji picker unavailable');
        return null;
    }
    _emojiPickerEl = new EmojiMart.Picker({
        onEmojiSelect: (emoji) => {
            const native = emoji.native;
            if (_activeEmojiInput) _activeEmojiInput.value = native;
            if (_activeEmojiBtn) {
                _activeEmojiBtn.textContent = native;
                const clr = document.getElementById(_activeEmojiBtn.id + '-clr');
                if (clr) clr.style.display = 'flex';
            }
            _hideEmojiPicker();
        },
    });
    // Park off-screen so shadow DOM initialises without being visible
    Object.assign(_emojiPickerEl.style, {
        position: 'fixed',
        zIndex: '9999',
        top: '-9999px',
        left: '-9999px',
    });
    document.body.appendChild(_emojiPickerEl);
    return _emojiPickerEl;
}

function _hideEmojiPicker() {
    if (_emojiPickerEl) {
        _emojiPickerEl.style.top  = '-9999px';
        _emojiPickerEl.style.left = '-9999px';
    }
    _emojiPickerVisible = false;
    _activeEmojiInput = null;
    _activeEmojiBtn = null;
}

window.toggleEmojiPicker = function(inputId, btnId) {
    const picker = _getOrCreateEmojiPicker();
    if (!picker) return;
    const inp = document.getElementById(inputId);
    const btn = document.getElementById(btnId);
    if (_emojiPickerVisible && _activeEmojiInput === inp) {
        _hideEmojiPicker();
        return;
    }
    _activeEmojiInput = inp;
    _activeEmojiBtn = btn;
    const rect = btn.getBoundingClientRect();
    const pw = 352, ph = 435;
    const left = Math.min(rect.left, window.innerWidth - pw - 8);
    const top = rect.bottom + 4 + ph > window.innerHeight
        ? Math.max(4, rect.top - ph - 4)
        : rect.bottom + 4;
    picker.style.left = left + 'px';
    picker.style.top  = top  + 'px';
    _emojiPickerVisible = true;
};

window.clearEmoji = function(inputId, btnId) {
    const inp = document.getElementById(inputId);
    const btn = document.getElementById(btnId);
    const clr = document.getElementById(btnId + '-clr');
    if (inp) inp.value = '';
    if (btn) btn.textContent = '—';
    if (clr) clr.style.display = 'none';
};

document.addEventListener('click', function(e) {
    if (_emojiPickerVisible &&
        !e.target.closest('em-emoji-picker') &&
        !e.target.closest('.emoji-pick-btn')) {
        _hideEmojiPicker();
    }
});

// Checklists — modal
window.openChecklistModal     = Checklists.openChecklistModal;
window.closeChecklistModal    = Checklists.closeChecklistModal;
window.viewChecklist          = Checklists.viewChecklist;
window.viewChecklistSelector  = Checklists.viewChecklistSelector;
window.toggleCheckItem        = Checklists.toggleCheckItem;
window.resetChecklist         = Checklists.resetChecklist;
// Checklists — admin
window.toggleChecklistsAdmin      = Checklists.toggleChecklistsAdmin;
window.toggleChecklistExpand      = Checklists.toggleChecklistExpand;
window.adminAddChecklist          = Checklists.adminAddChecklist;
window.adminDeleteChecklist       = Checklists.adminDeleteChecklist;
window.adminEditChecklist         = Checklists.adminEditChecklist;
window.adminSaveChecklist         = Checklists.adminSaveChecklist;
window.adminCancelChecklistEdit   = Checklists.adminCancelChecklistEdit;
window.adminAddChecklistItem        = Checklists.adminAddChecklistItem;
window.adminEditChecklistItem       = Checklists.adminEditChecklistItem;
window.adminSaveChecklistItem       = Checklists.adminSaveChecklistItem;
window.adminCancelChecklistItemEdit = Checklists.adminCancelChecklistItemEdit;
window.adminDeleteChecklistItem     = Checklists.adminDeleteChecklistItem;
window.adminMoveChecklistItem       = Checklists.adminMoveChecklistItem;

window.applyModalTimeout = ModalTimeout.applyModalTimeout;
window.getModalTimeoutSettings = ModalTimeout.getModalTimeoutSettings;

window.toggleSettingsSection = ParentDash.toggleSettingsSection;
window.saveModalTimeoutSettings = ParentDash.saveModalTimeoutSettings;

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
setInterval(refreshDailyStatuses, 120000);           // Refresh chore/activity statuses every 2 minutes
setInterval(refreshMeals, 1800000);                  // Refresh meals every 30 minutes
setInterval(Automation.checkForMidnight, 60000);     // Check for midnight every minute
setInterval(Automation.checkFor9pmSave, 60000);      // Check for 9pm save every minute

// Initialize application
initialize();
