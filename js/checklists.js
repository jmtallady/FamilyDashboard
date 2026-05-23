// checklists.js — Custom checklists backed by Google Sheets (definitions permanent,
// check state resets daily in localStorage)

import { showMessage } from './utils.js';
import { fetchChecklistsFromSheets, saveChecklistsToSheets, saveDailyStatusToSheets, savePointsToSheets } from './api.js';
import { getUseGoogleSheets } from './state.js';
import { getConfig } from './config.js';
import { renderRecentActivity } from './recent-activity.js';

function _emojiPickerHtml(current, inputId, btnId) {
    const stored = current ?? '';
    const btnLabel = stored || '—';
    return `<div class="emoji-pick-wrap">` +
        `<button type="button" class="emoji-pick-btn" id="${btnId}" ` +
            `onclick="toggleEmojiPicker('${inputId}','${btnId}')">${btnLabel}</button>` +
        `<button type="button" class="emoji-clear-btn" id="${btnId}-clr" ` +
            `style="display:${stored ? 'flex' : 'none'}" ` +
            `onclick="clearEmoji('${inputId}','${btnId}')">✕</button>` +
        `<input type="hidden" id="${inputId}" value="${stored}">` +
        `</div>`;
}

const LIST_KEY  = 'checklists';
const CLEAR_KEY = 'checklist-last-cleared';

// ── Storage helpers ───────────────────────────────────────────────────────────

export function getChecklists() {
    try { return JSON.parse(localStorage.getItem(LIST_KEY) || '[]'); }
    catch { return []; }
}

function saveChecklists(lists) {
    localStorage.setItem(LIST_KEY, JSON.stringify(lists));
    if (getUseGoogleSheets()) saveChecklistsToSheets(lists);
}

// Fetch from Sheets on load, fall back to localStorage cache if offline.
// Also purges stale check keys from previous days.
export async function initializeChecklists() {
    clearOldCheckKeys();
    if (!getUseGoogleSheets()) return;
    const lists = await fetchChecklistsFromSheets();
    if (lists !== null) {
        localStorage.setItem(LIST_KEY, JSON.stringify(lists));
    }
}

function todayStr() { return new Date().toDateString(); }
function checksKey(id) { return `checklist-checks-${id}-${todayStr()}`; }

function getChecks(listId) {
    try { return JSON.parse(localStorage.getItem(checksKey(listId)) || '[]'); }
    catch { return []; }
}

function saveChecks(listId, ids) {
    localStorage.setItem(checksKey(listId), JSON.stringify(ids));
}

function toggleCheck(listId, itemId) {
    const c = getChecks(listId);
    const i = c.indexOf(itemId);
    const nowChecked = i === -1;
    nowChecked ? c.push(itemId) : c.splice(i, 1);
    saveChecks(listId, c);
    saveDailyStatusToSheets('checklist', listId, itemId, nowChecked ? 'checked' : 'unchecked');

    if (!nowChecked) return;

    const lists = getChecklists();
    const list  = lists.find(l => l.id === listId);
    if (!list) return;
    const item  = list.items.find(it => it.id === itemId);
    const today = todayStr();

    // Award per-item BP (once per day)
    if (item?.bp > 0 && item.awardTo) {
        const ptsKey = `checklist-pts-${listId}-${itemId}-${today}`;
        if (!localStorage.getItem(ptsKey)) {
            _awardChecklistBP(item.awardTo, item.bp,
                `Checked '${item.title}' — added ${item.bp} BP to bank`, 'checklist-item');
            localStorage.setItem(ptsKey, 'awarded');
        }
    }

    // Award list-completion bonus (once per day, only when all items checked)
    if (list.completionBp > 0 && list.completionAwardTo) {
        const completeKey = `checklist-pts-complete-${listId}-${today}`;
        const allChecked  = list.items.every(it => c.includes(it.id));
        if (allChecked && !localStorage.getItem(completeKey)) {
            _awardChecklistBP(list.completionAwardTo, list.completionBp,
                `Completed checklist '${list.name}' — added ${list.completionBp} BP to bank`, 'checklist-complete');
            localStorage.setItem(completeKey, 'awarded');
        }
    }
}

function _awardChecklistBP(kidId, bp, note, type) {
    const CONFIG = getConfig();
    if (!CONFIG) return;
    const kid = Object.values(CONFIG).find(k => k.id === kidId);
    if (!kid) return;

    const totalEl = document.getElementById(`${kidId}-total-bp`);
    const dailyEl = document.getElementById(`${kidId}-daily-bp`);
    if (!totalEl) return;

    const newTotalBP = (parseInt(totalEl.textContent) || 0) + bp;
    const currentDailyBP = parseInt(dailyEl?.textContent) || 0;

    totalEl.textContent = newTotalBP;
    localStorage.setItem(`${kidId}-total-bp`, newTotalBP.toString());
    savePointsToSheets(kidId, currentDailyBP, newTotalBP, type, note);
    renderRecentActivity();
}

function _kidOptions(selectedId = '') {
    const CONFIG = getConfig();
    const kids = Object.values(CONFIG || {}).filter(k => k.id);
    return `<option value=""${!selectedId ? ' selected' : ''}>— none —</option>` +
        kids.map(k => `<option value="${k.id}"${k.id === selectedId ? ' selected' : ''}>${k.name}</option>`).join('');
}

// Purge check and pts entries from previous days — runs once per day on init
export function clearOldCheckKeys() {
    const today = todayStr();
    if (localStorage.getItem(CLEAR_KEY) === today) return;
    Object.keys(localStorage)
        .filter(k => (k.startsWith('checklist-checks-') || k.startsWith('checklist-pts-')) && !k.endsWith(today))
        .forEach(k => localStorage.removeItem(k));
    localStorage.setItem(CLEAR_KEY, today);
}

// Remove items flagged deleteWhenDone that were checked yesterday — called at midnight.
// Must use yesterday's date: at 12:00 AM todayStr() already returns the new day,
// so the previous day's check keys must be looked up explicitly.
export function purgeDeleteWhenDoneItems() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    const lists = getChecklists();
    let changed = false;
    lists.forEach(list => {
        const key = `checklist-checks-${list.id}-${yesterdayStr}`;
        let checks = [];
        try { checks = JSON.parse(localStorage.getItem(key) || '[]'); } catch { checks = []; }
        const before = list.items.length;
        list.items = list.items.filter(item => !(item.deleteWhenDone && checks.includes(item.id)));
        if (list.items.length !== before) changed = true;
    });
    if (changed) saveChecklists(lists);
}

// Rebuild local check state from Sheets statuses — called by loadDailyStatusesFromSheets.
// Sheets is authoritative: clears today's local arrays then rewrites from 'checked' entries.
export function syncChecklistStatusesFromSheets(statuses) {
    const today = todayStr();
    const clStatuses = statuses.filter(s => s.type === 'checklist');

    Object.keys(localStorage)
        .filter(k => k.startsWith('checklist-checks-') && k.endsWith(today))
        .forEach(k => localStorage.removeItem(k));

    const byList = {};
    clStatuses.forEach(s => {
        if (s.status === 'checked') {
            if (!byList[s.kidId]) byList[s.kidId] = [];
            byList[s.kidId].push(s.itemId);
        }
    });
    Object.entries(byList).forEach(([listId, ids]) => saveChecks(listId, ids));
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

function addChecklist(name, icon) {
    const lists = getChecklists();
    const id = `cl-${Date.now()}`;
    lists.push({ id, name: name.trim(), icon: (icon ?? '').trim(), items: [], enabled: true,
        completionBp: 0, completionAwardTo: null });
    saveChecklists(lists);
    return id;
}

function toggleChecklistEnabled(listId) {
    const lists = getChecklists();
    const list = lists.find(l => l.id === listId);
    if (list) list.enabled = list.enabled === false ? true : false;
    saveChecklists(lists);
}

function deleteChecklist(id) {
    saveChecklists(getChecklists().filter(l => l.id !== id));
}

function updateChecklist(listId, name, icon, completionBp, completionAwardTo) {
    const lists = getChecklists();
    const list = lists.find(l => l.id === listId);
    if (list) {
        list.name = name.trim();
        list.icon = (icon ?? '').trim();
        list.completionBp = parseInt(completionBp) || 0;
        list.completionAwardTo = completionAwardTo || null;
    }
    saveChecklists(lists);
}

function addChecklistItem(listId, emoji, title, detail, deleteWhenDone, bp, awardTo) {
    const lists = getChecklists();
    const list = lists.find(l => l.id === listId);
    if (!list) return;
    list.items.push({
        id: `ci-${Date.now()}`,
        emoji: (emoji ?? '').trim(),
        title: title.trim(),
        detail: (detail || '').trim(),
        deleteWhenDone: !!deleteWhenDone,
        bp: parseInt(bp) || 0,
        awardTo: awardTo || null,
    });
    saveChecklists(lists);
}

function updateChecklistItem(listId, itemId, emoji, title, detail, deleteWhenDone, bp, awardTo) {
    const lists = getChecklists();
    const list = lists.find(l => l.id === listId);
    if (!list) return;
    const item = list.items.find(i => i.id === itemId);
    if (item) {
        item.emoji          = (emoji ?? '').trim();
        item.title          = title.trim();
        item.detail         = (detail || '').trim();
        item.deleteWhenDone = !!deleteWhenDone;
        item.bp             = parseInt(bp) || 0;
        item.awardTo        = awardTo || null;
    }
    saveChecklists(lists);
}

function deleteChecklistItem(listId, itemId) {
    const lists = getChecklists();
    const list = lists.find(l => l.id === listId);
    if (list) list.items = list.items.filter(i => i.id !== itemId);
    saveChecklists(lists);
}

function moveChecklistItem(listId, itemId, dir) {
    const lists = getChecklists();
    const list = lists.find(l => l.id === listId);
    if (!list) return;
    const idx = list.items.findIndex(i => i.id === itemId);
    const to = idx + dir;
    if (to < 0 || to >= list.items.length) return;
    [list.items[idx], list.items[to]] = [list.items[to], list.items[idx]];
    saveChecklists(lists);
}

// ── Modal state + public API ──────────────────────────────────────────────────

let _viewId = null;

export function openChecklistModal() {
    _viewId = null;
    _renderModal();
    document.getElementById('checklistModal').classList.add('active');
}

export function closeChecklistModal() {
    document.getElementById('checklistModal').classList.remove('active');
    _viewId = null;
}

export function viewChecklist(listId) {
    _viewId = listId;
    _renderModal();
}

export function viewChecklistSelector() {
    _viewId = null;
    _renderModal();
}

export function toggleCheckItem(listId, itemId) {
    toggleCheck(listId, itemId);
    if (_viewId === listId) _renderModal();
}

export function resetChecklist(listId) {
    saveChecks(listId, []);
    _renderModal();
}

// ── Modal rendering ───────────────────────────────────────────────────────────

function _renderModal() {
    const el = document.getElementById('checklistModalInner');
    if (!el) return;
    const lists = getChecklists();
    el.innerHTML = _viewId
        ? _renderListView(lists.find(l => l.id === _viewId))
        : _renderSelector(lists);
    if (typeof twemoji !== 'undefined') {
        twemoji.parse(el, { folder: 'svg', ext: '.svg' });
    }
}

function _renderSelector(lists) {
    const header = `
        <div class="cl-modal-header">
            <h2>✅ Checklists</h2>
            <button class="modal-close-btn" onclick="closeChecklistModal()">✕</button>
        </div>`;

    const enabled = lists.filter(l => l.enabled !== false);
    if (!enabled.length) {
        return header + `<div class="cl-empty">No checklists yet —<br>add some in the Parent Dashboard.</div>`;
    }
    lists = enabled;

    const cards = lists.map(l => {
        const checks = getChecks(l.id);
        const total  = l.items.length;
        const done   = l.items.filter(i => checks.includes(i.id)).length;
        const pct    = total ? Math.round(done / total * 100) : 0;
        const full   = total > 0 && done === total;
        return `
            <div class="cl-card${full ? ' cl-card-done' : ''}" onclick="viewChecklist('${l.id}')">
                <div class="cl-card-icon">${l.icon}</div>
                <div class="cl-card-body">
                    <div class="cl-card-name">${l.name}</div>
                    <div class="cl-bar-wrap"><div class="cl-bar-fill" style="width:${pct}%"></div></div>
                    <div class="cl-card-count">${done} / ${total} done</div>
                </div>
                ${full ? '<div class="cl-card-badge">🏆</div>' : ''}
            </div>`;
    }).join('');

    return header + `<div class="cl-selector-grid">${cards}</div>`;
}

function _renderListView(list) {
    if (!list) { _viewId = null; return _renderSelector(getChecklists()); }

    const checks = getChecks(list.id);
    const total  = list.items.length;
    const done   = list.items.filter(i => checks.includes(i.id)).length;
    const pct    = total ? Math.round(done / total * 100) : 0;
    const full   = total > 0 && done === total;

    const items = list.items.map(item => {
        const isDone = checks.includes(item.id);
        return `
            <div class="cl-item${isDone ? ' cl-item-done' : ''}"
                onclick="toggleCheckItem('${list.id}','${item.id}')">
                <div class="cl-check-circle${isDone ? ' cl-checked' : ''}">${isDone ? '✓' : ''}</div>
                <div class="cl-item-emoji">${item.emoji}</div>
                <div class="cl-item-body">
                    <div class="cl-item-title">${item.title}</div>
                    ${item.detail ? `<div class="cl-item-detail">${item.detail}</div>` : ''}
                </div>
            </div>`;
    }).join('');

    return `
        <div class="cl-modal-header">
            <button class="cl-back-btn" onclick="viewChecklistSelector()">‹</button>
            <h2>${list.icon} ${list.name}</h2>
            <button class="modal-close-btn" onclick="closeChecklistModal()">✕</button>
        </div>
        <div class="cl-list-meta">
            <div class="cl-bar-wrap cl-bar-lg"><div class="cl-bar-fill" style="width:${pct}%"></div></div>
            <div class="cl-progress-label">${done} of ${total} done</div>
        </div>
        <div class="cl-items">
            ${items || '<div class="cl-empty">No items in this list yet.</div>'}
        </div>
        ${full ? '<div class="cl-banner">🏆 All done!</div>' : ''}
        ${total > 0 ? `<button class="cl-reset-btn" onclick="resetChecklist('${list.id}')">↺ Reset</button>` : ''}`;
}

// ── Admin panel (rendered inside parent dashboard) ────────────────────────────

let _adminOpen = false;
const _expanded = new Set();
let _editingListId = null;
let _editingItemId = null;

function _rerender() { window.renderParentDashboard?.(); }

export function toggleChecklistsAdmin() {
    _adminOpen = !_adminOpen;
    _rerender();
}

export function toggleChecklistExpand(listId) {
    _expanded.has(listId) ? _expanded.delete(listId) : _expanded.add(listId);
    _rerender();
}

export function adminAddChecklist() {
    const nameEl = document.getElementById('cl-new-name');
    const iconEl = document.getElementById('cl-new-icon');
    const name = nameEl?.value.trim();
    const icon = (iconEl?.value ?? '').trim();
    if (!name) { showMessage('Enter a checklist name'); return; }
    const id = addChecklist(name, icon);
    _expanded.add(id);
    if (nameEl) nameEl.value = '';
    if (iconEl) iconEl.value = '';
    _rerender();
}

export function adminDeleteChecklist(listId) {
    deleteChecklist(listId);
    _expanded.delete(listId);
    _editingListId = null;
    _rerender();
}

export function adminToggleChecklistEnabled(listId) {
    toggleChecklistEnabled(listId);
    _rerender();
}

export function adminEditChecklist(listId) {
    _editingListId = listId;
    _rerender();
}

export function adminSaveChecklist(listId) {
    const name          = document.getElementById(`cl-ln-${listId}`)?.value.trim();
    const icon          = (document.getElementById(`cl-li-${listId}`)?.value ?? '').trim();
    const completionBp  = document.getElementById(`cl-cbp-${listId}`)?.value || '0';
    const completionAwardTo = document.getElementById(`cl-ckid-${listId}`)?.value || '';
    if (!name) { showMessage('Enter a checklist name'); return; }
    updateChecklist(listId, name, icon, completionBp, completionAwardTo);
    _editingListId = null;
    _rerender();
}

export function adminCancelChecklistEdit() {
    _editingListId = null;
    _rerender();
}

export function adminAddChecklistItem(listId) {
    const emoji          = (document.getElementById(`cl-ei-${listId}`)?.value ?? '').trim();
    const title          = document.getElementById(`cl-ti-${listId}`)?.value.trim();
    const detail         = document.getElementById(`cl-di-${listId}`)?.value.trim() || '';
    const deleteWhenDone = document.getElementById(`cl-dwd-${listId}`)?.checked ?? false;
    const bp             = document.getElementById(`cl-bp-${listId}`)?.value || '0';
    const awardTo        = document.getElementById(`cl-kid-${listId}`)?.value || '';
    if (!title) { showMessage('Enter an item title'); return; }
    addChecklistItem(listId, emoji, title, detail, deleteWhenDone, bp, awardTo);
    _rerender();
}

export function adminEditChecklistItem(listId, itemId) {
    _editingItemId = itemId;
    _rerender();
}

export function adminCancelChecklistItemEdit() {
    _editingItemId = null;
    _rerender();
}

export function adminSaveChecklistItem(listId, itemId) {
    const emoji          = (document.getElementById(`cl-ee-${itemId}`)?.value ?? '').trim();
    const title          = document.getElementById(`cl-te-${itemId}`)?.value.trim();
    const detail         = document.getElementById(`cl-de-${itemId}`)?.value.trim() || '';
    const deleteWhenDone = document.getElementById(`cl-dwd-e-${itemId}`)?.checked ?? false;
    const bp             = document.getElementById(`cl-bp-e-${itemId}`)?.value || '0';
    const awardTo        = document.getElementById(`cl-kid-e-${itemId}`)?.value || '';
    if (!title) { showMessage('Item title cannot be empty'); return; }
    updateChecklistItem(listId, itemId, emoji, title, detail, deleteWhenDone, bp, awardTo);
    _editingItemId = null;
    _rerender();
}

export function adminDeleteChecklistItem(listId, itemId) {
    deleteChecklistItem(listId, itemId);
    _editingItemId = null;
    _rerender();
}

export function addItemToChecklist(listId, item) {
    const lists = getChecklists();
    const list = lists.find(l => l.id === listId);
    if (!list) return false;
    list.items.push(item);
    saveChecklists(lists);
    return true;
}

export function adminMoveChecklistItem(listId, itemId, dir) {
    moveChecklistItem(listId, itemId, dir);
    _rerender();
}

export function renderChecklistsAdminSectionHtml() {
    const arrow = _adminOpen ? '▾' : '▸';
    let html = `
        <div class="chores-admin-section">
            <div class="chores-admin-header" onclick="toggleChecklistsAdmin()">
                <span>✅ Checklists</span>
                <span>${arrow}</span>
            </div>`;

    if (!_adminOpen) return html + `</div>`;

    const lists = getChecklists();
    html += `<div class="chores-admin-body cl-admin-body">`;

    lists.forEach(list => {
        const exp = _expanded.has(list.id);
        const safeName = list.name.replace(/"/g, '&quot;');

        if (_editingListId === list.id) {
            html += `
                <div class="chores-admin-add-form" style="margin:4px 0;flex-wrap:wrap;">
                    ${_emojiPickerHtml(list.icon, `cl-li-${list.id}`, `cl-li-btn-${list.id}`, `cl-li-pick-${list.id}`)}
                    <input id="cl-ln-${list.id}" type="text" value="${safeName}"
                        class="chores-admin-input chores-admin-input-grow">
                    <input id="cl-cbp-${list.id}" type="number" min="0" value="${list.completionBp || 0}"
                        class="chores-admin-input chores-admin-input-sm" placeholder="Bonus BP" title="BP awarded on full completion">
                    <select id="cl-ckid-${list.id}" class="chores-admin-input" title="Kid who earns the completion bonus">
                        ${_kidOptions(list.completionAwardTo || '')}
                    </select>
                    <button class="chore-btn approve-btn"
                        onclick="adminSaveChecklist('${list.id}')">✓</button>
                    <button class="chore-btn"
                        onclick="adminCancelChecklistEdit()">✕</button>
                </div>`;
        } else {
            const isEnabled = list.enabled !== false;
            const disabledStyle = isEnabled ? '' : 'opacity:0.5;';
            const toggleTitle = isEnabled ? 'Disable' : 'Enable';
            const toggleLabel = isEnabled ? '🟢' : '🔴';
            html += `
                <div class="chores-admin-group-label cl-admin-list-header"
                    style="${disabledStyle}"
                    onclick="toggleChecklistExpand('${list.id}')">
                    <span>${list.icon} ${list.name}
                        <span class="chores-admin-meta">${list.items.length} items</span>
                        ${!isEnabled ? `<span class="chores-admin-meta cl-dwd-tag">disabled</span>` : ''}
                    </span>
                    <div style="display:flex;gap:4px;align-items:center;">
                        <button class="chore-btn" style="padding:2px 6px;" title="${toggleTitle}"
                            onclick="event.stopPropagation();adminToggleChecklistEnabled('${list.id}')">${toggleLabel}</button>
                        <button class="chore-btn" style="padding:2px 6px;"
                            onclick="event.stopPropagation();adminEditChecklist('${list.id}')">✏️</button>
                        <button class="chore-btn reject-btn" style="padding:2px 6px;"
                            onclick="event.stopPropagation();adminDeleteChecklist('${list.id}')">🗑</button>
                        <span>${exp ? '▾' : '▸'}</span>
                    </div>
                </div>`;
        }

        if (exp) {
            list.items.forEach((item, idx) => {
                const safeEmoji  = item.emoji.replace(/"/g, '&quot;');
                const safeTitle  = item.title.replace(/"/g, '&quot;');
                const safeDetail = item.detail.replace(/"/g, '&quot;');

                if (_editingItemId === item.id) {
                    const dwdChecked = item.deleteWhenDone ? 'checked' : '';
                    html += `
                        <div class="chores-admin-add-form" style="margin:4px 0;flex-wrap:wrap;">
                            ${_emojiPickerHtml(item.emoji, `cl-ee-${item.id}`, `cl-ee-btn-${item.id}`, `cl-ee-pick-${item.id}`)}
                            <input id="cl-te-${item.id}" type="text" value="${safeTitle}"
                                class="chores-admin-input chores-admin-input-grow">
                            <input id="cl-de-${item.id}" type="text" value="${safeDetail}"
                                class="chores-admin-input chores-admin-input-grow" placeholder="Detail (optional)">
                            <input id="cl-bp-e-${item.id}" type="number" min="0" value="${item.bp || 0}"
                                class="chores-admin-input chores-admin-input-sm" placeholder="BP" title="BP awarded on check">
                            <select id="cl-kid-e-${item.id}" class="chores-admin-input" title="Kid who earns the BP">
                                ${_kidOptions(item.awardTo || '')}
                            </select>
                            <input type="checkbox" id="cl-dwd-e-${item.id}" style="display:none" ${dwdChecked}>
                            <button type="button" id="cl-dwd-btn-e-${item.id}"
                                class="chore-btn cl-dwd-btn${item.deleteWhenDone ? ' active' : ''}"
                                title="Delete when done"
                                onclick="toggleDwdBtn('cl-dwd-e-${item.id}','cl-dwd-btn-e-${item.id}')">🗑</button>
                            <button class="chore-btn approve-btn"
                                onclick="adminSaveChecklistItem('${list.id}','${item.id}')">✓</button>
                            <button class="chore-btn"
                                onclick="adminCancelChecklistItemEdit()">✕</button>
                        </div>`;
                } else {
                    html += `
                        <div class="chores-admin-row">
                            <div class="chores-admin-row-info">
                                <span class="chore-name">${[item.emoji, item.title].filter(Boolean).join(' ')}</span>
                                ${item.detail ? `<span class="chores-admin-meta">${item.detail}</span>` : ''}
                                ${item.deleteWhenDone ? `<span class="chores-admin-meta cl-dwd-tag">auto-delete</span>` : ''}
                                ${item.bp > 0 ? `<span class="chores-admin-meta" style="color:var(--primary-color)">+${item.bp} BP</span>` : ''}
                            </div>
                            <div class="chores-admin-row-actions">
                                ${idx > 0
                                    ? `<button class="chore-btn" title="Up"
                                        onclick="adminMoveChecklistItem('${list.id}','${item.id}',-1)">↑</button>`
                                    : ''}
                                ${idx < list.items.length - 1
                                    ? `<button class="chore-btn" title="Down"
                                        onclick="adminMoveChecklistItem('${list.id}','${item.id}',1)">↓</button>`
                                    : ''}
                                <button class="chore-btn" title="Edit"
                                    onclick="adminEditChecklistItem('${list.id}','${item.id}')">✏️</button>
                                <button class="chore-btn reject-btn" title="Delete"
                                    onclick="adminDeleteChecklistItem('${list.id}','${item.id}')">✕</button>
                            </div>
                        </div>`;
                }
            });

            html += `
                <div class="chores-admin-add-form" style="margin:4px 0 10px;flex-wrap:wrap;">
                    ${_emojiPickerHtml('📌', `cl-ei-${list.id}`, `cl-ei-btn-${list.id}`, `cl-ei-pick-${list.id}`)}
                    <input id="cl-ti-${list.id}" type="text" placeholder="Item title"
                        class="chores-admin-input chores-admin-input-grow">
                    <input id="cl-di-${list.id}" type="text" placeholder="Detail (optional)"
                        class="chores-admin-input chores-admin-input-grow">
                    <input id="cl-bp-${list.id}" type="number" min="0" value="0"
                        class="chores-admin-input chores-admin-input-sm" placeholder="BP" title="BP awarded on check">
                    <select id="cl-kid-${list.id}" class="chores-admin-input" title="Kid who earns the BP">
                        ${_kidOptions('')}
                    </select>
                    <input type="checkbox" id="cl-dwd-${list.id}" style="display:none">
                    <button type="button" id="cl-dwd-btn-${list.id}"
                        class="chore-btn cl-dwd-btn"
                        title="Delete when done"
                        onclick="toggleDwdBtn('cl-dwd-${list.id}','cl-dwd-btn-${list.id}')">🗑</button>
                    <button class="chore-btn approve-btn"
                        onclick="adminAddChecklistItem('${list.id}')">+</button>
                </div>`;
        }
    });

    html += `
        <div class="chores-admin-add-form" style="margin-top:8px;">
            ${_emojiPickerHtml('📋', 'cl-new-icon', 'cl-new-icon-btn', 'cl-new-icon-pick')}
            <input id="cl-new-name" type="text" placeholder="New checklist name"
                class="chores-admin-input chores-admin-input-grow">
            <button class="chore-btn approve-btn" onclick="adminAddChecklist()">+</button>
        </div>
    </div></div>`;

    return html;
}
