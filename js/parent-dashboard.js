// parent-dashboard.js - Parent Dashboard (slide-in panel)
// Tracks pending approvals across days and provides a parent control center.
// DB-migration-ready: pending list is a flat array that maps 1:1 to a future DB table.

import { showPinModal } from './auth.js';
import { getIsUnlocked } from './state.js';
import { getChores, setChores } from './state.js';
import { getConfig } from './config.js';
import { showMessage, parseEmoji } from './utils.js';
import { approveChore, rejectChore } from './chores.js';
import { approveActivity, rejectActivity } from './activities.js';
import { addChoreToSheets, updateChoreInSheets, setChoreMultiplier, fetchAllChores,
         fetchAllActivities, addActivityToSheets, updateActivityInSheets, setActivityMultiplier,
         fetchRewards, addRewardToSheets, updateRewardInSheets, deleteRewardFromSheets,
         fetchHouseRules, addHouseRuleToSheets, updateHouseRuleInSheets, deleteHouseRuleFromSheets,
         saveConfigValue, deleteConfigKey } from './api.js';
import { endOfDayAll } from './points.js';
import { renderMenuSectionHtml, toggleMenuSection, toggleMealLibrary, getMealForDate, setMealForDate,
         getRandomMeal, addMealToCache, approveDinnerRequest, dismissDinnerRequest } from './menu.js';
import { renderChecklistsAdminSectionHtml, getChecklists, addItemToChecklist } from './checklists.js';
import { updateCalendar } from './calendar.js';

const STORAGE_KEY = 'pending-approvals';

// Module-level state
let choresSectionOpen = false;
let activitiesSectionOpen = false;
let rewardsSectionOpen = false;
let rulesSectionOpen = false;
let kidsSectionOpen = false;
let endOfDaySectionOpen = false;
let allChoresCache = null;
let allActivitiesCache = null;
let allRewardsCache = null;
let allRulesCache = null; // flat array: [{ kid, rule, consequence, type }]
let _movingChoreKey = null; // "kidId|choreId" when move-to-checklist form is open
let _editingRewardId = null;
let _editingRuleKey = null; // "kid||rule" when editing a rule inline
let _editingKidKey = null; // "kid1", "kid2", etc.
let choresSearch = '';
let activitiesSearch = '';
let rewardsSearch = '';

// ── Pending approvals list ────────────────────────────────────────────────────

export function getPendingApprovals() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
        return [];
    }
}

function savePendingApprovals(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/**
 * Add an item to the pending approvals list.
 * @param {{ type, kidId, kidName, itemId, itemName, bp, multiplier }} item
 */
export function addPendingApproval(item) {
    const list = getPendingApprovals();
    const id = `${item.type}-${item.kidId}-${item.itemId}`;
    // Avoid duplicates
    if (list.some(p => p.id === id)) return;
    list.push({ id, ...item, markedAt: new Date().toISOString() });
    savePendingApprovals(list);
    updateParentBadge();
}

/**
 * Clear all pending approvals (called before rebuilding from Sheets).
 */
export function clearPendingApprovals() {
    savePendingApprovals([]);
}

/**
 * Remove an item from the pending approvals list.
 */
export function removePendingApproval(kidId, itemId, type) {
    const id = `${type}-${kidId}-${itemId}`;
    const list = getPendingApprovals().filter(p => p.id !== id);
    savePendingApprovals(list);
    updateParentBadge();
}

// ── Badge ─────────────────────────────────────────────────────────────────────

export function updateParentBadge() {
    const badge = document.getElementById('parentDashBadge');
    if (!badge) return;
    const count = getPendingApprovals().length;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
}

// ── Open / Close ─────────────────────────────────────────────────────────────

export function openParentDashboard() {
    if (!getIsUnlocked()) {
        showPinModal('parent', null, null, () => showParentDashboard());
        return;
    }
    showParentDashboard();
}

export function showParentDashboard() {
    renderParentDashboard();
    document.getElementById('parentDashOverlay').classList.add('active');
    document.getElementById('parentDashPanel').classList.add('open');
}

export function closeParentDashboard() {
    document.getElementById('parentDashOverlay').classList.remove('active');
    document.getElementById('parentDashPanel').classList.remove('open');
}

// ── Render ────────────────────────────────────────────────────────────────────

export function renderParentDashboard() {
    const container = document.getElementById('parentDashContent');
    if (!container) return;

    const pending = getPendingApprovals();
    let html = '';

    if (pending.length === 0) {
        html += `
            <div class="parent-dash-empty">
                <div style="font-size: 48px; margin-bottom: 12px;">✅</div>
                <div>All caught up! No pending approvals.</div>
            </div>`;
    } else {
        // Group by kid
        const byKid = {};
        pending.forEach(item => {
            if (!byKid[item.kidId]) byKid[item.kidId] = { kidName: item.kidName, items: [] };
            byKid[item.kidId].items.push(item);
        });

        Object.values(byKid).forEach(({ kidName, items }) => {
            html += `<div class="parent-dash-kid-group">
                <div class="parent-dash-kid-name">${kidName}</div>`;

            items.forEach(item => {
                const totalBP = item.bp * (item.multiplier || 1);
                const bpDisplay = item.multiplier > 1
                    ? `${item.bp}×${item.multiplier} = ${totalBP} BP`
                    : `${totalBP} BP`;
                const typeIcon = item.type === 'chore' ? '🧹' : '⭐';
                const age = formatAge(item.markedAt);

                html += `
                    <div class="parent-dash-item" id="pending-item-${item.id}">
                        <div class="parent-dash-item-info">
                            <span class="parent-dash-type-icon">${typeIcon}</span>
                            <div>
                                <div class="parent-dash-item-name">${item.itemName}</div>
                                <div class="parent-dash-item-meta">+${bpDisplay} · ${age}</div>
                            </div>
                        </div>
                        <div class="parent-dash-item-actions">
                            <button class="chore-btn approve-btn" title="Approve"
                                onclick="parentDashApprove('${item.type}', '${item.kidId}', '${item.itemId}', '${item.itemName}', ${item.bp}, ${item.multiplier || 1})">✓</button>
                            <button class="chore-btn reject-btn" title="Reject"
                                onclick="parentDashReject('${item.type}', '${item.kidId}', '${item.itemId}', '${item.itemName}')">✗</button>
                        </div>
                    </div>`;
            });

            html += `</div>`;
        });
    }

    html += renderMenuSectionHtml();
    html += renderChoresSectionHtml();
    html += renderActivitiesSectionHtml();
    html += renderChecklistsAdminSectionHtml();
    html += renderRewardsSectionHtml();
    html += renderHouseRulesSectionHtml();
    html += renderKidsSectionHtml();
    html += renderEndOfDaySectionHtml();
    html += renderSettingsSectionHtml();
    container.innerHTML = html;
    parseEmoji(container);
}

// ── Approve / Reject from parent dash ────────────────────────────────────────

export async function parentDashApprove(type, kidId, itemId, itemName, bp, multiplier) {
    if (type === 'chore') {
        await approveChore(kidId, itemId, itemName, bp, multiplier);
    } else {
        await approveActivity(kidId, itemId, itemName, bp, multiplier);
    }
    removePendingApproval(kidId, itemId, type);
    renderParentDashboard();
}

export function parentDashReject(type, kidId, itemId, itemName) {
    if (type === 'chore') {
        rejectChore(kidId, itemId, itemName);
    } else {
        rejectActivity(kidId, itemId, itemName);
    }
    removePendingApproval(kidId, itemId, type);
    renderParentDashboard();
}

// ── End of Day Section ────────────────────────────────────────────────────────

export function toggleEndOfDaySection() {
    endOfDaySectionOpen = !endOfDaySectionOpen;
    renderParentDashboard();
}

function renderEndOfDaySectionHtml() {
    const CONFIG = getConfig();
    if (!CONFIG) return '';
    const kids = Object.values(CONFIG).filter(k => k.id);
    const toggleIcon = endOfDaySectionOpen ? '▾' : '▸';

    let html = `
        <div class="chores-admin-section" style="margin-top:12px;">
            <div class="chores-admin-header" onclick="toggleEndOfDaySection()" title="Click to expand/collapse">
                <span>🌙 End of Day</span>
                <span>${toggleIcon}</span>
            </div>`;

    if (!endOfDaySectionOpen) return html + `</div>`;

    html += `<div style="display:flex;flex-wrap:wrap;gap:6px;padding:8px 0 4px;">`;

    kids.forEach(kid => {
        html += `<button class="chore-btn end-of-day-btn"
            style="flex:1;min-width:100px;font-size:12px;padding:5px 8px;height:auto;"
            title="End of day for ${kid.name}"
            onclick="endOfDay('${kid.id}')">🌙 ${kid.name}</button>`;
    });

    html += `</div>
        <button class="reset-btn end-of-day-all-btn"
            style="width:100%;margin-bottom:8px;font-size:13px;padding:8px 10px;height:auto;border-radius:8px;"
            title="Save daily BP and reset all kids"
            onclick="parentDashEndOfDayAll()">🌙 End Day for All Kids</button>
        </div>`;

    return html;
}

export async function parentDashEndOfDayAll() {
    await endOfDayAll();
    closeParentDashboard();
}

// ── Settings Section ─────────────────────────────────────────────────────────

function renderSettingsSectionHtml() {
    const CONFIG = getConfig() || {};
    const settings = typeof window.getModalTimeoutSettings === 'function'
        ? window.getModalTimeoutSettings()
        : { enabled: true, minutes: 2 };
    const checkedAttr = settings.enabled ? 'checked' : '';
    const weather = CONFIG.weather || {};
    const calendar = CONFIG.calendar || { enabled: true, daysAhead: 7 };
    const requirePin = CONFIG.requirePinForEdits ? 'checked' : '';

    const inp = (id, type, val, extra = '') =>
        `<input id="${id}" type="${type}" value="${val ?? ''}" class="chores-admin-input" ${extra}>`;

    return `
        <div class="chores-admin-section" style="margin-top:12px;">
            <div class="chores-admin-header" onclick="toggleSettingsSection()" title="Click to expand/collapse">
                <span>⚙️ Settings</span>
                <span id="settingsSectionToggle">▸</span>
            </div>
            <div id="settingsSectionBody" style="display:none;padding:8px 0 4px;">

                <div class="settings-subsection-label">Modal Auto-Close</div>
                <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                    <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
                        <input type="checkbox" id="modalTimeoutEnabled" ${checkedAttr}
                            onchange="saveModalTimeoutSettings()">
                        Auto-close after inactivity
                    </label>
                    <label style="display:flex;align-items:center;gap:6px;font-size:13px;">
                        Minutes: <input type="number" id="modalTimeoutMinutes" min="1" max="60"
                            value="${settings.minutes}" class="chores-admin-input chores-admin-input-sm"
                            onchange="saveModalTimeoutSettings()">
                    </label>
                </div>

                <div class="settings-subsection-label" style="margin-top:12px;">Parent PIN</div>
                <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                    <span class="admin-field-label">New</span>
                    <input id="settings-new-pin" type="password" placeholder="New PIN" maxlength="6"
                        class="chores-admin-input chores-admin-input-grow" style="letter-spacing:4px;max-width:120px;">
                    <span class="admin-field-label">Confirm</span>
                    <input id="settings-confirm-pin" type="password" placeholder="Confirm PIN" maxlength="6"
                        class="chores-admin-input chores-admin-input-grow" style="letter-spacing:4px;max-width:120px;">
                    <button class="chore-btn approve-btn" onclick="adminSaveParentPin()" title="Save new parent PIN">Save</button>
                </div>

                <div class="settings-subsection-label" style="margin-top:12px;">Require PIN for Edits</div>
                <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
                    <input type="checkbox" id="settings-require-pin" ${requirePin}
                        onchange="adminSaveRequirePin()">
                    Require parent PIN before changes in admin panel
                </label>



                <div class="settings-subsection-label" style="margin-top:12px;">Weather Location</div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                    ${inp('weather-lat', 'number', weather.latitude, 'placeholder="Latitude" step="any" style="width:90px;"')}
                    ${inp('weather-lng', 'number', weather.longitude, 'placeholder="Longitude" step="any" style="width:90px;"')}
                    ${inp('weather-tz', 'text', weather.timezone, 'placeholder="e.g. America/New_York" class="chores-admin-input chores-admin-input-grow"')}
                    <button class="chore-btn approve-btn" onclick="adminSaveWeather()" title="Save weather location">Save</button>
                </div>

                <div class="settings-subsection-label" style="margin-top:12px;">Calendar</div>
                <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-size:13px;">
                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                        <input type="checkbox" id="cal-enabled" ${calendar.enabled ? 'checked' : ''}>
                        Show upcoming events
                    </label>
                    <label style="display:flex;align-items:center;gap:6px;">
                        Days ahead: <input type="number" id="cal-days" value="${calendar.daysAhead ?? 7}" min="1" max="30"
                            class="chores-admin-input chores-admin-input-sm">
                    </label>
                    <button class="chore-btn approve-btn" onclick="adminSaveCalendar()" title="Save calendar settings">Save</button>
                </div>

            </div>
        </div>`;
}

export function toggleSettingsSection() {
    const body = document.getElementById('settingsSectionBody');
    const toggle = document.getElementById('settingsSectionToggle');
    if (!body) return;
    const open = body.style.display !== 'none';
    body.style.display = open ? 'none' : 'block';
    if (toggle) toggle.textContent = open ? '▸' : '▾';
}

export function saveModalTimeoutSettings() {
    const enabled = document.getElementById('modalTimeoutEnabled')?.checked ?? true;
    const minutes = parseInt(document.getElementById('modalTimeoutMinutes')?.value || '2', 10);
    if (typeof window.applyModalTimeout === 'function') {
        window.applyModalTimeout(enabled, isNaN(minutes) || minutes < 1 ? 2 : minutes);
    }
}

export function adminSaveParentPin() {
    const pin = document.getElementById('settings-new-pin')?.value.trim();
    const confirm2 = document.getElementById('settings-confirm-pin')?.value.trim();
    if (!pin) { showMessage('Enter a new PIN'); return; }
    if (pin !== confirm2) { showMessage('PINs do not match'); return; }
    const CONFIG = getConfig();
    if (CONFIG) CONFIG.pin = pin;
    saveConfigValue('pin', pin);
    document.getElementById('settings-new-pin').value = '';
    document.getElementById('settings-confirm-pin').value = '';
    showMessage('Parent PIN updated');
}

export function adminSaveRequirePin() {
    const val = document.getElementById('settings-require-pin')?.checked ?? true;
    const CONFIG = getConfig();
    if (CONFIG) CONFIG.requirePinForEdits = val;
    saveConfigValue('requirePinForEdits', val);
}

export function adminSaveWeather() {
    const lat = parseFloat(document.getElementById('weather-lat')?.value);
    const lng = parseFloat(document.getElementById('weather-lng')?.value);
    const tz = document.getElementById('weather-tz')?.value.trim();
    if (isNaN(lat) || isNaN(lng)) { showMessage('Enter valid latitude and longitude'); return; }
    const val = { latitude: lat, longitude: lng, timezone: tz || 'America/New_York' };
    const CONFIG = getConfig();
    if (CONFIG) CONFIG.weather = val;
    saveConfigValue('weather', val);
    showMessage('Weather location saved');
}

export function adminSaveCalendar() {
    const enabled = document.getElementById('cal-enabled')?.checked ?? true;
    const daysAhead = parseInt(document.getElementById('cal-days')?.value) || 7;
    const val = { enabled, daysAhead };
    const CONFIG = getConfig();
    if (CONFIG) CONFIG.calendar = val;
    saveConfigValue('calendar', val);
    showMessage('Calendar settings saved');
}

// ── Chores Admin Section ──────────────────────────────────────────────────────

export async function toggleChoresAdmin() {
    choresSectionOpen = !choresSectionOpen;
    if (choresSectionOpen) {
        renderParentDashboard(); // show loading state immediately
        allChoresCache = await fetchAllChores();
    }
    renderParentDashboard();
}

function renderChoresSectionHtml() {
    const CONFIG = getConfig();
    if (!CONFIG) return '';
    const kids = Object.values(CONFIG).filter(k => k.id);

    const toggleIcon = choresSectionOpen ? '▾' : '▸';
    let html = `
        <div class="chores-admin-section">
            <div class="chores-admin-header" onclick="toggleChoresAdmin()" title="Click to expand/collapse">
                <span>📋 Manage Chores</span>
                <span>${toggleIcon}</span>
            </div>`;

    if (!choresSectionOpen) {
        html += `</div>`;
        return html;
    }

    if (!allChoresCache) {
        html += `<div style="padding:12px;color:#999;font-size:12px;">Loading chores…</div></div>`;
        return html;
    }

    const CHORES = allChoresCache;
    const kidOptions = kids.map(k => `<option value="${k.id}">${k.name}</option>`).join('');
    const sq = choresSearch.toLowerCase();

    html += `<div class="chores-admin-body">`;
    html += `<input id="chores-search" type="search" placeholder="🔍 Search chores…" value="${choresSearch.replace(/"/g,'&quot;')}"
        class="chores-admin-input chores-admin-input-grow admin-search-input"
        oninput="setChoresSearch(this.value)" title="Filter chores by name">`;

    let hasAny = false;

    const byName = (a, b) => a.name.localeCompare(b.name);
    const matchSearch = c => !sq || c.name.toLowerCase().includes(sq);

    // Shared chores
    const sharedFiltered = (CHORES.shared || []).filter(matchSearch);
    if (sharedFiltered.length > 0) {
        hasAny = true;
        html += `<div class="chores-admin-group-label">Shared</div>`;
        [...sharedFiltered].sort(byName).forEach(chore => { html += choreAdminRow(chore, ''); });
    }

    // Individual chores grouped by kid
    Object.entries(CHORES.individual || {}).forEach(([kidId, chores]) => {
        const filtered = (chores || []).filter(matchSearch);
        if (!filtered.length) return;
        hasAny = true;
        const kid = kids.find(k => k.id.toLowerCase() === kidId.toLowerCase()) || { name: kidId };
        html += `<div class="chores-admin-group-label">${kid.name}</div>`;
        [...filtered].sort(byName).forEach(chore => { html += choreAdminRow(chore, kidId); });
    });

    if (!hasAny) {
        html += `<div style="color:#999;font-size:12px;padding:8px 0;">${sq ? 'No matches.' : 'No chores yet.'}</div>`;
    }

    // Add form
    html += `
        <div class="chores-admin-add-form">
            <select id="newChoreKid" class="chores-admin-input">
                <option value="">Shared</option>
                ${kidOptions}
            </select>
            <input id="newChoreName" type="text" placeholder="Chore name" class="chores-admin-input chores-admin-input-grow">
            <input id="newChoreBP" type="number" placeholder="BP" value="1" min="1" class="chores-admin-input chores-admin-input-sm">
            <button class="chore-btn approve-btn" onclick="adminAddChore()" title="Add chore">+</button>
        </div>
    </div></div>`;

    return html;
}

function choreAdminRow(chore, kidId) {
    const safeName = chore.name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    const isDisabled = chore.multiplier === 0;
    const moveKey = `${kidId}|${chore.id}`;
    const isMoving = _movingChoreKey === moveKey;
    const nameHtml = isDisabled
        ? `<span class="chore-name chores-admin-disabled-name">${chore.name}</span>`
        : `<span class="chore-name">${chore.name}</span>`;

    const checklists = getChecklists().filter(l => l.enabled !== false);
    const clOptions = checklists.length
        ? checklists.map(l => `<option value="${l.id}">${l.icon ? l.icon + ' ' : ''}${l.name}</option>`).join('')
        : `<option value="">No checklists available</option>`;

    const kidName = kidId
        ? (Object.values(getConfig() || {}).find(k => k.id?.toLowerCase() === kidId.toLowerCase())?.name || kidId)
        : 'shared';

    const moveForm = isMoving ? `
        <div class="chores-admin-add-form cl-move-form">
            <select id="move-cl-target-${chore.id}" class="chores-admin-input chores-admin-input-grow">
                ${clOptions}
            </select>
            <label class="cl-move-bp-label">
                <input type="checkbox" id="move-cl-bp-${chore.id}" checked>
                Award ${chore.bp} BP to ${kidName}
            </label>
            <label class="cl-move-bp-label">
                <input type="checkbox" id="move-cl-dwd-${chore.id}" checked>
                Delete when done
            </label>
            <button class="chore-btn approve-btn" title="Confirm"
                onclick="adminConfirmMoveChoreToChecklist('${kidId}','${chore.id}')">✓</button>
            <button class="chore-btn" title="Cancel"
                onclick="adminCancelMoveChore()">✕</button>
        </div>` : '';

    return `
        <div class="chores-admin-row${isDisabled ? ' chores-admin-row-disabled' : ''}" id="chore-admin-${kidId}-${chore.id}">
            <div class="chores-admin-row-info">
                ${nameHtml}
                <span class="chores-admin-meta">${chore.bp} BP</span>
            </div>
            <div class="chores-admin-row-actions">
                <label class="chores-admin-mult-label">×</label>
                <input type="number" value="${chore.multiplier}" min="0" max="99"
                    class="chores-admin-input chores-admin-input-sm"
                    title="Multiplier — set to 0 to hide from dashboard"
                    onchange="adminSetMultiplier('${kidId}', '${chore.id}', this.value)">
                <button class="chore-btn" title="Move to checklist"
                    onclick="adminStartMoveChore('${kidId}','${chore.id}')">📋</button>
                <button class="chore-btn" title="Edit name/BP"
                    onclick="adminEditChore('${kidId}', '${chore.id}', '${safeName}', ${chore.bp})">✏️</button>
            </div>
        </div>
        ${moveForm}`;
}

// ── Chores Admin Actions ──────────────────────────────────────────────────────

export function adminSetMultiplier(kidId, choreId, rawValue) {
    const multiplier = parseInt(rawValue);
    if (isNaN(multiplier) || multiplier < 0) return;

    // Update allChoresCache
    const cacheList = kidId === ''
        ? (allChoresCache?.shared || [])
        : (allChoresCache?.individual?.[kidId.toLowerCase()] || []);
    const cachedChore = cacheList.find(c => c.id === choreId);
    if (cachedChore) cachedChore.multiplier = multiplier;

    // Rebuild active CHORES state (multiplier > 0 only) for main dashboard
    if (allChoresCache) {
        const active = {
            shared: (allChoresCache.shared || []).filter(c => c.multiplier > 0),
            individual: {}
        };
        Object.entries(allChoresCache.individual || {}).forEach(([kid, list]) => {
            const enabled = list.filter(c => c.multiplier > 0);
            if (enabled.length) active.individual[kid] = enabled;
        });
        setChores(active);
    }

    // Fire-and-forget to Sheets
    setChoreMultiplier(choreId, kidId, multiplier);

    // Re-render to update disabled styling
    renderParentDashboard();
}

export function adminEditChore(kidId, choreId, currentName, currentBP) {
    const rowEl = document.getElementById(`chore-admin-${kidId}-${choreId}`);
    if (!rowEl) return;
    rowEl.innerHTML = `
        <input type="text" value="${currentName}" id="editChoreName-${kidId}-${choreId}" class="chores-admin-input chores-admin-input-grow" placeholder="Chore name">
        <span class="admin-field-label">BP</span>
        <input type="number" value="${currentBP}" id="editChoreBP-${kidId}-${choreId}" class="chores-admin-input chores-admin-input-sm">
        <button class="chore-btn approve-btn" onclick="adminSaveChoreEdit('${kidId}', '${choreId}')" title="Save">✓</button>
        <button class="chore-btn" onclick="renderParentDashboard()" title="Cancel">✗</button>
    `;
    rowEl.style.display = 'flex';
    rowEl.style.gap = '6px';
    rowEl.style.alignItems = 'center';
}

export async function adminSaveChoreEdit(kidId, choreId) {
    const nameEl = document.getElementById(`editChoreName-${kidId}-${choreId}`);
    const bpEl = document.getElementById(`editChoreBP-${kidId}-${choreId}`);
    if (!nameEl || !bpEl) return;

    const newName = nameEl.value.trim();
    const newBP = parseInt(bpEl.value) || 1;
    if (!newName) { showMessage('Chore name cannot be empty'); return; }

    // Update allChoresCache and active CHORES state
    const updateChore = (list) => {
        const chore = (list || []).find(c => c.id === choreId);
        if (chore) { chore.name = newName; chore.bp = newBP; }
    };
    if (kidId === '') {
        updateChore(allChoresCache?.shared);
        updateChore(getChores()?.shared);
    } else {
        updateChore(allChoresCache?.individual?.[kidId.toLowerCase()]);
        updateChore(getChores()?.individual?.[kidId.toLowerCase()]);
    }

    // Fire-and-forget to Sheets
    updateChoreInSheets(choreId, kidId, newName, newBP);

    showMessage(`Chore updated: ${newName}`);
    renderParentDashboard();
}

export async function adminAddChore() {
    const kidId = document.getElementById('newChoreKid')?.value || '';
    const choreName = document.getElementById('newChoreName')?.value.trim() || '';
    const bp = parseInt(document.getElementById('newChoreBP')?.value) || 1;

    if (!choreName) { showMessage('Chore name is required'); return; }

    // Generate a unique chore ID from the name + timestamp
    const choreId = choreName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-') + '-' + Date.now().toString(36);

    const newChore = { id: choreId, name: choreName, bp, multiplier: 1 };

    // Update active CHORES state and allChoresCache
    const CHORES = getChores() || { shared: [], individual: {} };
    if (kidId === '') {
        CHORES.shared = [...(CHORES.shared || []), newChore];
        if (allChoresCache) allChoresCache.shared = [...(allChoresCache.shared || []), { ...newChore }];
    } else {
        if (!CHORES.individual) CHORES.individual = {};
        if (!CHORES.individual[kidId.toLowerCase()]) CHORES.individual[kidId.toLowerCase()] = [];
        CHORES.individual[kidId.toLowerCase()].push(newChore);
        if (allChoresCache) {
            if (!allChoresCache.individual) allChoresCache.individual = {};
            if (!allChoresCache.individual[kidId.toLowerCase()]) allChoresCache.individual[kidId.toLowerCase()] = [];
            allChoresCache.individual[kidId.toLowerCase()].push({ ...newChore });
        }
    }
    setChores(CHORES);

    // Fire-and-forget to Sheets
    addChoreToSheets(kidId, choreId, choreName, bp, 1);

    showMessage(`Chore added: ${choreName}`);
    renderParentDashboard();
}

export function setChoresSearch(term) {
    const pos = document.getElementById('chores-search')?.selectionStart ?? term.length;
    choresSearch = term;
    renderParentDashboard();
    const el = document.getElementById('chores-search');
    if (el) { el.focus(); el.setSelectionRange(pos, pos); }
}
export function setActivitiesSearch(term) {
    const pos = document.getElementById('activities-search')?.selectionStart ?? term.length;
    activitiesSearch = term;
    renderParentDashboard();
    const el = document.getElementById('activities-search');
    if (el) { el.focus(); el.setSelectionRange(pos, pos); }
}
export function setRewardsSearch(term) {
    const pos = document.getElementById('rewards-search')?.selectionStart ?? term.length;
    rewardsSearch = term;
    renderParentDashboard();
    const el = document.getElementById('rewards-search');
    if (el) { el.focus(); el.setSelectionRange(pos, pos); }
}

export function adminStartMoveChore(kidId, choreId) {
    _movingChoreKey = `${kidId}|${choreId}`;
    renderParentDashboard();
}

export function adminCancelMoveChore() {
    _movingChoreKey = null;
    renderParentDashboard();
}

export function adminConfirmMoveChoreToChecklist(kidId, choreId) {
    const listId        = document.getElementById(`move-cl-target-${choreId}`)?.value;
    const awardBp       = document.getElementById(`move-cl-bp-${choreId}`)?.checked ?? true;
    const deleteWhenDone = document.getElementById(`move-cl-dwd-${choreId}`)?.checked ?? true;

    if (!listId) { showMessage('Select a checklist first'); return; }

    const cacheList = kidId === ''
        ? (allChoresCache?.shared || [])
        : (allChoresCache?.individual?.[kidId.toLowerCase()] || []);
    const chore = cacheList.find(c => c.id === choreId);
    if (!chore) { showMessage('Chore not found'); return; }

    const newItem = {
        id: `ci-${Date.now()}`,
        emoji: '',
        title: chore.name,
        detail: '',
        deleteWhenDone,
        bp: awardBp ? (chore.bp || 0) : 0,
        awardTo: awardBp && kidId ? kidId : null,
    };

    if (!addItemToChecklist(listId, newItem)) {
        showMessage('Checklist not found'); return;
    }

    _movingChoreKey = null;
    adminSetMultiplier(kidId, choreId, 0);
    showMessage(`📋 "${chore.name}" moved to checklist`);
}

// ── Activities Admin Section ──────────────────────────────────────────────────

export async function toggleActivitiesAdmin() {
    activitiesSectionOpen = !activitiesSectionOpen;
    if (activitiesSectionOpen && !allActivitiesCache) {
        renderParentDashboard();
        allActivitiesCache = await fetchAllActivities();
    }
    renderParentDashboard();
}

function renderActivitiesSectionHtml() {
    const CONFIG = getConfig();
    if (!CONFIG) return '';
    const kids = Object.values(CONFIG).filter(k => k.id);
    const toggleIcon = activitiesSectionOpen ? '▾' : '▸';

    let html = `
        <div class="chores-admin-section">
            <div class="chores-admin-header" onclick="toggleActivitiesAdmin()" title="Click to expand/collapse">
                <span>⭐ Manage Activities</span>
                <span>${toggleIcon}</span>
            </div>`;

    if (!activitiesSectionOpen) return html + `</div>`;

    if (!allActivitiesCache) {
        return html + `<div style="padding:12px;color:#999;font-size:12px;">Loading activities…</div></div>`;
    }

    const kidOptions = kids.map(k => `<option value="${k.id}">${k.name}</option>`).join('');
    const byName = (a, b) => a.name.localeCompare(b.name);
    const aq = activitiesSearch.toLowerCase();
    const matchAct = a => !aq || a.name.toLowerCase().includes(aq);
    html += `<div class="chores-admin-body">`;
    html += `<input id="activities-search" type="search" placeholder="🔍 Search activities…" value="${activitiesSearch.replace(/"/g,'&quot;')}"
        class="chores-admin-input chores-admin-input-grow admin-search-input"
        oninput="setActivitiesSearch(this.value)" title="Filter activities by name">`;
    let hasAny = false;

    const sharedActFiltered = (allActivitiesCache.shared || []).filter(matchAct);
    if (sharedActFiltered.length > 0) {
        hasAny = true;
        html += `<div class="chores-admin-group-label">Shared</div>`;
        [...sharedActFiltered].sort(byName).forEach(act => { html += activityAdminRow(act, ''); });
    }
    Object.entries(allActivitiesCache.individual || {}).forEach(([kidId, acts]) => {
        const filtered = (acts || []).filter(matchAct);
        if (!filtered.length) return;
        hasAny = true;
        const kid = kids.find(k => k.id.toLowerCase() === kidId.toLowerCase()) || { name: kidId };
        html += `<div class="chores-admin-group-label">${kid.name}</div>`;
        [...filtered].sort(byName).forEach(act => { html += activityAdminRow(act, kidId); });
    });

    if (!hasAny) html += `<div style="color:#999;font-size:12px;padding:8px 0;">${aq ? 'No matches.' : 'No activities yet.'}</div>`;

    html += `
        <div class="chores-admin-add-form">
            <select id="newActKid" class="chores-admin-input">
                <option value="">Shared</option>
                ${kidOptions}
            </select>
            <input id="newActName" type="text" placeholder="Activity name" class="chores-admin-input chores-admin-input-grow">
            <input id="newActBP" type="number" placeholder="BP" value="1" min="1" class="chores-admin-input chores-admin-input-sm">
            <input id="newActMax" type="number" placeholder="Max/wk" min="1" class="chores-admin-input chores-admin-input-sm" title="Max per week (blank = unlimited)">
            <button class="chore-btn approve-btn" onclick="adminAddActivity()" title="Add activity">+</button>
        </div>
    </div></div>`;
    return html;
}

function activityAdminRow(act, kidId) {
    const safeName = act.name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    const isDisabled = act.multiplier === 0;
    const nameHtml = isDisabled
        ? `<span class="chore-name chores-admin-disabled-name">${act.name}</span>`
        : `<span class="chore-name">${act.name}</span>`;
    const maxBadge = act.maxPerWeek ? `<span class="chores-admin-meta">${act.maxPerWeek}/wk</span>` : '';

    return `
        <div class="chores-admin-row${isDisabled ? ' chores-admin-row-disabled' : ''}" id="act-admin-${kidId}-${act.id}">
            <div class="chores-admin-row-info">
                ${nameHtml}
                <span class="chores-admin-meta">${act.bp} BP</span>
                ${maxBadge}
            </div>
            <div class="chores-admin-row-actions">
                <label class="chores-admin-mult-label">×</label>
                <input type="number" value="${act.multiplier}" min="0" max="99"
                    class="chores-admin-input chores-admin-input-sm"
                    title="Set to 0 to hide from dashboard"
                    onchange="adminSetActivityMultiplier('${kidId}','${act.id}',this.value)">
                <button class="chore-btn" title="Edit"
                    onclick="adminEditActivity('${kidId}','${act.id}','${safeName}',${act.bp},${act.maxPerWeek ?? ''})">✏️</button>
            </div>
        </div>`;
}

export function adminSetActivityMultiplier(kidId, actId, rawValue) {
    const multiplier = parseInt(rawValue);
    if (isNaN(multiplier) || multiplier < 0) return;

    const cacheList = kidId === ''
        ? (allActivitiesCache?.shared || [])
        : (allActivitiesCache?.individual?.[kidId.toLowerCase()] || []);
    const cached = cacheList.find(a => a.id === actId);
    if (cached) cached.multiplier = multiplier;

    setActivityMultiplier(kidId, actId, multiplier);
    renderParentDashboard();
}

export function adminEditActivity(kidId, actId, currentName, currentBP, currentMax) {
    const rowEl = document.getElementById(`act-admin-${kidId}-${actId}`);
    if (!rowEl) return;
    rowEl.innerHTML = `
        <input type="text" value="${currentName}" id="editActName-${kidId}-${actId}" class="chores-admin-input chores-admin-input-grow" placeholder="Activity name">
        <span class="admin-field-label">BP</span>
        <input type="number" value="${currentBP}" id="editActBP-${kidId}-${actId}" class="chores-admin-input chores-admin-input-sm">
        <span class="admin-field-label">Max/wk</span>
        <input type="number" value="${currentMax || ''}" id="editActMax-${kidId}-${actId}" min="1"
            class="chores-admin-input chores-admin-input-sm" title="Max per week (blank = unlimited)">
        <button class="chore-btn approve-btn" onclick="adminSaveActivityEdit('${kidId}','${actId}')" title="Save">✓</button>
        <button class="chore-btn" onclick="renderParentDashboard()" title="Cancel">✗</button>
    `;
    rowEl.style.cssText = 'display:flex;gap:6px;align-items:center;';
}

export function adminSaveActivityEdit(kidId, actId) {
    const newName = document.getElementById(`editActName-${kidId}-${actId}`)?.value.trim();
    const newBP = parseInt(document.getElementById(`editActBP-${kidId}-${actId}`)?.value) || 1;
    const maxVal = document.getElementById(`editActMax-${kidId}-${actId}`)?.value;
    const newMax = maxVal ? Math.max(1, parseInt(maxVal)) : null;
    if (!newName) { showMessage('Activity name cannot be empty'); return; }

    const update = (list) => {
        const act = (list || []).find(a => a.id === actId);
        if (act) { act.name = newName; act.bp = newBP; act.maxPerWeek = newMax; }
    };
    if (kidId === '') {
        update(allActivitiesCache?.shared);
    } else {
        update(allActivitiesCache?.individual?.[kidId.toLowerCase()]);
    }

    updateActivityInSheets(kidId, actId, newName, newBP, newMax ?? '');
    showMessage(`Activity updated: ${newName}`);
    renderParentDashboard();
}

export function adminAddActivity() {
    const kidId = document.getElementById('newActKid')?.value || '';
    const name = document.getElementById('newActName')?.value.trim() || '';
    const bp = parseInt(document.getElementById('newActBP')?.value) || 1;
    const maxVal = document.getElementById('newActMax')?.value;
    const maxPerWeek = maxVal ? Math.max(1, parseInt(maxVal)) : null;

    if (!name) { showMessage('Activity name is required'); return; }

    const actId = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-') + '-' + Date.now().toString(36);
    const newAct = { id: actId, name, bp, multiplier: 1, maxPerWeek };

    if (!allActivitiesCache) allActivitiesCache = { shared: [], individual: {} };
    if (kidId === '') {
        allActivitiesCache.shared.push({ ...newAct });
    } else {
        const kid = kidId.toLowerCase();
        if (!allActivitiesCache.individual[kid]) allActivitiesCache.individual[kid] = [];
        allActivitiesCache.individual[kid].push({ ...newAct });
    }

    addActivityToSheets(kidId, actId, name, bp, 1, maxPerWeek ?? '');
    showMessage(`Activity added: ${name}`);
    renderParentDashboard();
}

// ── Rewards Admin Section ─────────────────────────────────────────────────────

export async function toggleRewardsAdmin() {
    rewardsSectionOpen = !rewardsSectionOpen;
    if (rewardsSectionOpen && !allRewardsCache) {
        renderParentDashboard();
        allRewardsCache = await fetchRewards() || [];
    }
    renderParentDashboard();
}

function renderRewardsSectionHtml() {
    const toggleIcon = rewardsSectionOpen ? '▾' : '▸';
    let html = `
        <div class="chores-admin-section">
            <div class="chores-admin-header" onclick="toggleRewardsAdmin()" title="Click to expand/collapse">
                <span>🎁 Manage Rewards</span>
                <span>${toggleIcon}</span>
            </div>`;

    if (!rewardsSectionOpen) return html + `</div>`;
    if (!allRewardsCache) return html + `<div style="padding:12px;color:#999;font-size:12px;">Loading rewards…</div></div>`;

    const rq = rewardsSearch.toLowerCase();
    const visibleRewards = allRewardsCache
        .filter(r => !rq || r.name.toLowerCase().includes(rq))
        .sort((a, b) => a.name.localeCompare(b.name));
    html += `<div class="chores-admin-body">`;
    html += `<input id="rewards-search" type="search" placeholder="🔍 Search rewards…" value="${rewardsSearch.replace(/"/g,'&quot;')}"
        class="chores-admin-input chores-admin-input-grow admin-search-input"
        oninput="setRewardsSearch(this.value)" title="Filter rewards by name">`;

    visibleRewards.forEach(r => {
        const limitBadge = r.limitType ? `<span class="chores-admin-meta">${r.limitCount || '?'}/${r.limitType}</span>` : '';
        if (_editingRewardId === r.id) {
            html += rewardEditForm(r);
        } else {
            html += `
                <div class="chores-admin-row" id="reward-admin-${r.id}">
                    <div class="chores-admin-row-info">
                        <span style="font-size:14px;">${r.icon || '🎁'}</span>
                        <span class="chore-name">${r.name}</span>
                        <span class="chores-admin-meta">${r.cost} BP</span>
                        ${limitBadge}
                    </div>
                    <div class="chores-admin-row-actions">
                        <button class="chore-btn" title="Edit reward" onclick="adminEditReward('${r.id}')">✏️</button>
                        <button class="chore-btn reject-btn" title="Delete reward" onclick="adminDeleteReward('${r.id}')">🗑</button>
                    </div>
                </div>`;
        }
    });

    if (!allRewardsCache.length) html += `<div style="color:#999;font-size:12px;padding:8px 0;">No rewards yet.</div>`;
    else if (!visibleRewards.length) html += `<div style="color:#999;font-size:12px;padding:8px 0;">No matches.</div>`;

    if (_editingRewardId === 'new') {
        html += rewardEditForm(null);
    } else {
        html += `<button class="chore-btn approve-btn" style="margin-top:6px;width:100%;" onclick="adminEditReward('new')">+ Add Reward</button>`;
    }

    html += `</div></div>`;
    return html;
}

function rewardEditForm(r) {
    const id = r ? `reward-form-${r.id}` : 'reward-form-new';
    const isNew = !r;
    const limitTypeOpts = ['', 'daily', 'weekly', 'monthly']
        .map(t => `<option value="${t}"${(r?.limitType || '') === t ? ' selected' : ''}>${t || '— no limit —'}</option>`)
        .join('');
    return `
        <div class="chores-admin-add-form" id="${id}" style="flex-direction:column;gap:6px;">
            <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
                <span class="admin-field-label">Icon</span>
                <input id="rwd-icon-${isNew ? 'new' : r.id}" type="text" placeholder="🎁"
                    value="${r?.icon || ''}" class="chores-admin-input" style="width:40px;" maxlength="4">
                <span class="admin-field-label">Name</span>
                <input id="rwd-name-${isNew ? 'new' : r.id}" type="text" placeholder="Reward name"
                    value="${r?.name || ''}" class="chores-admin-input chores-admin-input-grow">
                <span class="admin-field-label">Cost</span>
                <input id="rwd-cost-${isNew ? 'new' : r.id}" type="number" placeholder="0"
                    value="${r?.cost ?? ''}" min="0" class="chores-admin-input chores-admin-input-sm">
                <span class="admin-field-label">BP</span>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
                <span class="admin-field-label">Limit</span>
                <select id="rwd-limit-type-${isNew ? 'new' : r.id}" class="chores-admin-input">${limitTypeOpts}</select>
                <input id="rwd-limit-count-${isNew ? 'new' : r.id}" type="number" placeholder="#"
                    value="${r?.limitCount ?? ''}" min="1" class="chores-admin-input chores-admin-input-sm">
            </div>
            <div style="display:flex;flex-direction:column;gap:2px;">
                <span class="admin-field-label">Guidelines</span>
                <textarea id="rwd-guidelines-${isNew ? 'new' : r.id}" placeholder="Parent notes / redemption rules (optional)"
                    class="chores-admin-input" style="width:100%;resize:vertical;min-height:36px;box-sizing:border-box;">${r?.guidelines || ''}</textarea>
            </div>
            <div style="display:flex;gap:6px;">
                <button class="chore-btn approve-btn" title="Save reward" onclick="adminSaveRewardEdit('${isNew ? 'new' : r.id}')">✓</button>
                <button class="chore-btn" title="Cancel" onclick="adminCancelRewardEdit()">✕</button>
            </div>
        </div>`;
}

export function adminEditReward(rewardId) {
    _editingRewardId = rewardId;
    renderParentDashboard();
}

export function adminCancelRewardEdit() {
    _editingRewardId = null;
    renderParentDashboard();
}

export function adminSaveRewardEdit(rewardId) {
    const isNew = rewardId === 'new';
    const key = isNew ? 'new' : rewardId;
    const name = document.getElementById(`rwd-name-${key}`)?.value.trim();
    const cost = parseInt(document.getElementById(`rwd-cost-${key}`)?.value) || 0;
    const icon = document.getElementById(`rwd-icon-${key}`)?.value.trim() || '🎁';
    const limitType = document.getElementById(`rwd-limit-type-${key}`)?.value || '';
    const limitCountVal = document.getElementById(`rwd-limit-count-${key}`)?.value;
    const limitCount = limitCountVal ? parseInt(limitCountVal) : '';
    const guidelines = document.getElementById(`rwd-guidelines-${key}`)?.value.trim() || '';

    if (!name) { showMessage('Reward name is required'); return; }

    if (isNew) {
        const newId = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-') + '-' + Date.now().toString(36);
        const newR = { id: newId, name, cost, icon, limitType, limitCount, guidelines };
        if (!allRewardsCache) allRewardsCache = [];
        allRewardsCache.push(newR);
        addRewardToSheets(newId, name, cost, icon, name, limitType, limitCount, guidelines);
    } else {
        const r = allRewardsCache?.find(x => x.id === rewardId);
        if (r) Object.assign(r, { name, cost, icon, limitType, limitCount, guidelines });
        updateRewardInSheets(rewardId, name, cost, icon, name, limitType, limitCount, guidelines);
    }

    _editingRewardId = null;
    showMessage(isNew ? `Reward added: ${name}` : `Reward updated: ${name}`);
    renderParentDashboard();
}

export function adminDeleteReward(rewardId) {
    if (!allRewardsCache) return;
    const r = allRewardsCache.find(x => x.id === rewardId);
    if (!r) return;
    if (!confirm(`Delete reward "${r.name}"?`)) return;
    allRewardsCache = allRewardsCache.filter(x => x.id !== rewardId);
    deleteRewardFromSheets(rewardId);
    showMessage(`Reward deleted: ${r.name}`);
    renderParentDashboard();
}

// ── House Rules Admin Section ─────────────────────────────────────────────────

export async function toggleRulesAdmin() {
    rulesSectionOpen = !rulesSectionOpen;
    if (rulesSectionOpen && !allRulesCache) {
        renderParentDashboard();
        const grouped = await fetchHouseRules();
        allRulesCache = _flattenRules(grouped);
    }
    renderParentDashboard();
}

function _flattenRules(grouped) {
    if (!grouped) return [];
    const flat = [];
    (grouped.general || []).forEach(r => flat.push({ kid: '', ...r }));
    Object.entries(grouped.kidSpecific || {}).forEach(([kid, rules]) =>
        rules.forEach(r => flat.push({ kid, ...r })));
    (grouped.spendingRequirements || []).forEach(r => flat.push({ kid: 'SPENDING', ...r }));
    (grouped.grounding || []).forEach(r => flat.push({ kid: 'GROUNDED', ...r }));
    (grouped.consequenceScale || []).forEach(r => flat.push({ kid: 'BP SCALE', ...r }));
    return flat;
}

function _ruleKey(kid, rule) { return `${kid || ''}||${rule}`; }

function renderHouseRulesSectionHtml() {
    const CONFIG = getConfig();
    const kids = CONFIG ? Object.values(CONFIG).filter(k => k.id) : [];
    const toggleIcon = rulesSectionOpen ? '▾' : '▸';

    let html = `
        <div class="chores-admin-section">
            <div class="chores-admin-header" onclick="toggleRulesAdmin()" title="Click to expand/collapse">
                <span>📜 Manage House Rules</span>
                <span>${toggleIcon}</span>
            </div>`;

    if (!rulesSectionOpen) return html + `</div>`;
    if (!allRulesCache) return html + `<div style="padding:12px;color:#999;font-size:12px;">Loading rules…</div></div>`;

    const TYPE_COLORS = { good: '#51cf66', warning: '#f59f00', bad: '#ff6b6b', info: '#339af0' };
    const SECTION_LABELS = {
        '': 'General', 'SPENDING': 'Spending Rules', 'GROUNDED': 'Grounded Rules', 'BP SCALE': 'BP Scale'
    };

    // Group for display
    const groups = {};
    allRulesCache.forEach(r => {
        const groupKey = r.kid || '';
        if (!groups[groupKey]) groups[groupKey] = [];
        groups[groupKey].push(r);
    });

    html += `<div class="chores-admin-body">`;

    Object.entries(groups).forEach(([groupKey, rules]) => {
        const label = SECTION_LABELS[groupKey] || groupKey;
        html += `<div class="chores-admin-group-label">${label}</div>`;
        rules.forEach(r => {
            const rKey = _ruleKey(r.kid, r.rule);
            const color = TYPE_COLORS[r.type] || '#868e96';
            const safeKid = (r.kid || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            const safeRule = (r.rule || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            if (_editingRuleKey === rKey) {
                html += ruleEditForm(r, kids);
            } else {
                html += `
                    <div class="chores-admin-row">
                        <div class="chores-admin-row-info" style="flex-direction:column;align-items:flex-start;gap:2px;">
                            <div style="display:flex;align-items:center;gap:6px;">
                                <span style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0;display:inline-block;"></span>
                                <span class="chore-name" style="font-size:11px;">${r.rule}</span>
                            </div>
                            ${r.consequence ? `<div style="font-size:10px;color:#999;padding-left:14px;">${r.consequence}</div>` : ''}
                        </div>
                        <div class="chores-admin-row-actions">
                            <button class="chore-btn" title="Edit rule"
                                onclick="adminEditHouseRule('${safeKid}','${safeRule}')">✏️</button>
                            <button class="chore-btn reject-btn" title="Delete rule"
                                onclick="adminDeleteHouseRule('${safeKid}','${safeRule}')">🗑</button>
                        </div>
                    </div>`;
            }
        });
    });

    if (!allRulesCache.length) html += `<div style="color:#999;font-size:12px;padding:8px 0;">No rules yet.</div>`;

    if (_editingRuleKey === 'new') {
        html += ruleEditForm(null, kids);
    } else {
        html += `<button class="chore-btn approve-btn" style="margin-top:6px;width:100%;" onclick="adminEditHouseRule('__new__','')">+ Add Rule</button>`;
    }

    html += `</div></div>`;
    return html;
}

function ruleEditForm(r, kids) {
    const isNew = !r;
    const safeKid = (r?.kid ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const safeRule = (r?.rule ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const SPECIAL = ['', 'SPENDING', 'GROUNDED', 'BP SCALE'];
    const kidOpts = [
        ...SPECIAL.map(s => `<option value="${s}"${(r?.kid || '') === s ? ' selected' : ''}>${s || 'General'}</option>`),
        ...kids.map(k => `<option value="${k.name}"${r?.kid === k.name ? ' selected' : ''}>${k.name}</option>`)
    ].join('');
    const typeOpts = ['', 'good', 'warning', 'bad', 'info']
        .map(t => `<option value="${t}"${(r?.type || '') === t ? ' selected' : ''}>${t || '— default —'}</option>`)
        .join('');
    return `
        <div class="chores-admin-add-form" style="flex-direction:column;gap:6px;margin:4px 0;">
            <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
                <span class="admin-field-label">Category</span>
                <select id="rule-kid-edit" class="chores-admin-input">${kidOpts}</select>
                <span class="admin-field-label">Type</span>
                <select id="rule-type-edit" class="chores-admin-input">${typeOpts}</select>
            </div>
            <div style="display:flex;flex-direction:column;gap:2px;">
                <span class="admin-field-label">Rule</span>
                <textarea id="rule-text-edit" placeholder="Rule text" class="chores-admin-input"
                    style="width:100%;resize:vertical;min-height:40px;box-sizing:border-box;">${r?.rule || ''}</textarea>
            </div>
            <div style="display:flex;flex-direction:column;gap:2px;">
                <span class="admin-field-label">Consequence</span>
                <input id="rule-consequence-edit" type="text" placeholder="Optional — e.g. lose 5 BP"
                    value="${r?.consequence || ''}" class="chores-admin-input chores-admin-input-grow">
            </div>
            <div style="display:flex;gap:6px;">
                <button class="chore-btn approve-btn" title="Save rule" onclick="adminSaveHouseRuleEdit('${safeKid}','${safeRule}')">✓</button>
                <button class="chore-btn" title="Cancel" onclick="adminCancelRuleEdit()">✕</button>
            </div>
        </div>`;
}

export function adminEditHouseRule(kid, rule) {
    _editingRuleKey = kid === '__new__' ? 'new' : _ruleKey(kid, rule);
    renderParentDashboard();
}

export function adminCancelRuleEdit() {
    _editingRuleKey = null;
    renderParentDashboard();
}

export function adminSaveHouseRuleEdit(originalKid, originalRule) {
    const newKid = document.getElementById('rule-kid-edit')?.value ?? '';
    const newRule = document.getElementById('rule-text-edit')?.value.trim() || '';
    const newConsequence = document.getElementById('rule-consequence-edit')?.value.trim() || '';
    const newType = document.getElementById('rule-type-edit')?.value || '';

    if (!newRule) { showMessage('Rule text is required'); return; }

    const isNew = _editingRuleKey === 'new';
    if (isNew) {
        if (!allRulesCache) allRulesCache = [];
        allRulesCache.push({ kid: newKid, rule: newRule, consequence: newConsequence, type: newType });
        addHouseRuleToSheets(newKid, newRule, newConsequence, newType);
        showMessage('Rule added');
    } else {
        const entry = allRulesCache?.find(r => r.kid === (originalKid || '') && r.rule === originalRule);
        if (entry) Object.assign(entry, { kid: newKid, rule: newRule, consequence: newConsequence, type: newType });
        updateHouseRuleInSheets(originalKid, originalRule, newKid, newRule, newConsequence, newType);
        showMessage('Rule updated');
    }

    _editingRuleKey = null;
    renderParentDashboard();
}

export function adminDeleteHouseRule(kid, rule) {
    if (!allRulesCache) return;
    const entry = allRulesCache.find(r => r.kid === (kid || '') && r.rule === rule);
    if (!entry) return;
    if (!confirm(`Delete rule: "${rule}"?`)) return;
    allRulesCache = allRulesCache.filter(r => !(r.kid === (kid || '') && r.rule === rule));
    deleteHouseRuleFromSheets(kid, rule);
    showMessage('Rule deleted');
    renderParentDashboard();
}

// ── Kids Admin Section ────────────────────────────────────────────────────────

export function toggleKidsAdmin() {
    kidsSectionOpen = !kidsSectionOpen;
    renderParentDashboard();
}

function renderKidsSectionHtml() {
    const CONFIG = getConfig();
    const toggleIcon = kidsSectionOpen ? '▾' : '▸';

    let html = `
        <div class="chores-admin-section">
            <div class="chores-admin-header" onclick="toggleKidsAdmin()" title="Click to expand/collapse">
                <span>👦 Manage Kids</span>
                <span>${toggleIcon}</span>
            </div>`;

    if (!kidsSectionOpen) return html + `</div>`;
    if (!CONFIG) return html + `<div style="padding:12px;color:#999;font-size:12px;">Config not loaded.</div></div>`;

    const kidEntries = Object.entries(CONFIG)
        .filter(([k]) => /^kid\d+$/.test(k))
        .sort(([a], [b]) => a.localeCompare(b));

    html += `<div class="chores-admin-body">`;

    kidEntries.forEach(([kidKey, kid]) => {
        if (_editingKidKey === kidKey) {
            html += kidEditForm(kidKey, kid);
        } else {
            const initials = (kid.name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
            const pinDisplay = kid.pin ? '••••' : '—';
            html += `
                <div class="chores-admin-row" id="kid-admin-${kidKey}">
                    <div class="chores-admin-row-info">
                        <div class="kid-admin-avatar">${initials}</div>
                        <div style="display:flex;flex-direction:column;gap:1px;">
                            <span class="chore-name">${kid.name}</span>
                            <span class="chores-admin-meta">ID: ${kid.id} · ${kid.defaultDailyBP ?? 5} BP/day · PIN: ${pinDisplay}</span>
                        </div>
                    </div>
                    <div class="chores-admin-row-actions">
                        <button class="chore-btn" title="Edit" onclick="adminEditKid('${kidKey}')">✏️</button>
                        <button class="chore-btn reject-btn" title="Delete" onclick="adminDeleteKid('${kidKey}')">🗑</button>
                    </div>
                </div>`;
        }
    });

    if (!kidEntries.length) html += `<div style="color:#999;font-size:12px;padding:8px 0;">No kids configured.</div>`;

    if (_editingKidKey === 'new') {
        html += kidEditForm('new', null);
    } else {
        html += `<button class="chore-btn approve-btn" style="margin-top:6px;width:100%;" onclick="adminEditKid('new')">+ Add Kid</button>`;
    }

    html += `</div></div>`;
    return html;
}

function kidEditForm(kidKey, kid) {
    const isNew = kidKey === 'new';
    return `
        <div class="chores-admin-add-form" style="flex-direction:column;gap:6px;margin:4px 0;" id="kid-form-${kidKey}">
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
                <input id="kid-name-${kidKey}" type="text" placeholder="Name" value="${kid?.name || ''}"
                    class="chores-admin-input chores-admin-input-grow"
                    oninput="adminAutoFillKidId('${kidKey}')">
                <input id="kid-id-${kidKey}" type="text" placeholder="id (e.g. clara)"
                    value="${kid?.id || ''}" class="chores-admin-input chores-admin-input-grow"
                    title="Unique ID — lowercase, no spaces">
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
                <label style="font-size:12px;white-space:nowrap;">Daily BP default:</label>
                <input id="kid-dailybp-${kidKey}" type="number" value="${kid?.defaultDailyBP ?? 5}" min="0"
                    class="chores-admin-input chores-admin-input-sm">
                <label style="font-size:12px;white-space:nowrap;">PIN (optional):</label>
                <input id="kid-pin-${kidKey}" type="number" value="${kid?.pin || ''}" placeholder="4-digit"
                    class="chores-admin-input chores-admin-input-sm" maxlength="4">
            </div>
            <div style="display:flex;gap:6px;">
                <button class="chore-btn approve-btn" title="Save" onclick="adminSaveKidEdit('${kidKey}')">✓</button>
                <button class="chore-btn" title="Cancel" onclick="adminCancelKidEdit()">✕</button>
            </div>
        </div>`;
}

export function adminAutoFillKidId(kidKey) {
    const nameEl = document.getElementById(`kid-name-${kidKey}`);
    const idEl = document.getElementById(`kid-id-${kidKey}`);
    if (!nameEl || !idEl || idEl.dataset.userEdited) return;
    idEl.value = nameEl.value.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
}

export function adminEditKid(kidKey) {
    _editingKidKey = kidKey;
    renderParentDashboard();
}

export function adminCancelKidEdit() {
    _editingKidKey = null;
    renderParentDashboard();
}

export function adminSaveKidEdit(kidKey) {
    const isNew = kidKey === 'new';
    const name = document.getElementById(`kid-name-${kidKey}`)?.value.trim();
    const id = document.getElementById(`kid-id-${kidKey}`)?.value.trim().toLowerCase();
    const dailyBP = parseInt(document.getElementById(`kid-dailybp-${kidKey}`)?.value) ?? 5;
    const pinVal = document.getElementById(`kid-pin-${kidKey}`)?.value.trim();
    const pin = pinVal || undefined;

    if (!name) { showMessage('Kid name is required'); return; }
    if (!id) { showMessage('Kid ID is required'); return; }

    const CONFIG = getConfig();

    if (isNew) {
        // Find next available kidN slot
        let n = 1;
        while (CONFIG[`kid${n}`]) n++;
        kidKey = `kid${n}`;
    }

    const kidObj = { name, id, defaultDailyBP: isNaN(dailyBP) ? 5 : dailyBP, defaultTotalBP: 0 };
    if (pin) kidObj.pin = pin;

    CONFIG[kidKey] = kidObj;
    saveConfigValue(kidKey, JSON.stringify(kidObj));

    _editingKidKey = null;
    showMessage(isNew ? `Kid added: ${name}` : `Kid updated: ${name}`);
    renderParentDashboard();
}

export function adminDeleteKid(kidKey) {
    const CONFIG = getConfig();
    const kid = CONFIG?.[kidKey];
    if (!kid) return;
    if (!confirm(`Remove "${kid.name}" from the dashboard? Point history is preserved.`)) return;
    delete CONFIG[kidKey];
    deleteConfigKey(kidKey);
    showMessage(`${kid.name} removed`);
    renderParentDashboard();
}

// ── Menu Admin Actions ────────────────────────────────────────────────────────

export function adminToggleMenuSection() {
    toggleMenuSection();
    renderParentDashboard();
}

export function adminToggleMealLibrary() {
    toggleMealLibrary();
    renderParentDashboard();
}

function applyMealForDate(dateStr, mealName) {
    if (!mealName) return;
    const date = new Date(dateStr + 'T12:00:00');
    setMealForDate(date, mealName);
    updateCalendar();
    renderParentDashboard();
    const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    showMessage(`🍽️ ${dayLabel}: ${mealName}`);
}

export function adminSetMealForDate(dateStr) {
    const el = document.getElementById(`mealPlanSelect-${dateStr}`);
    if (!el || !el.value) { showMessage('Select a meal first'); return; }
    applyMealForDate(dateStr, el.value);
}

export function adminRandomMealForDate(dateStr) {
    const meal = getRandomMeal();
    if (!meal) { showMessage('No meals in library yet'); return; }
    const el = document.getElementById(`mealPlanSelect-${dateStr}`);
    if (el) el.value = meal;
    applyMealForDate(dateStr, meal);
}

export function adminApproveDinnerRequest(id) {
    approveDinnerRequest(id);
    updateCalendar();
    renderParentDashboard();
    showMessage('✓ Dinner request approved and meal set!');
}

export function adminDismissDinnerRequest(id) {
    dismissDinnerRequest(id);
    renderParentDashboard();
}

export function adminAddMeal() {
    const el = document.getElementById('newMealName');
    const name = (el?.value || '').trim();
    if (!name) { showMessage('Meal name is required'); return; }
    addMealToCache(name);
    if (el) el.value = '';
    showMessage(`Meal added to library: ${name}`);
    renderParentDashboard();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatAge(isoString) {
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (mins > 0) return `${mins}m ago`;
    return 'just now';
}

