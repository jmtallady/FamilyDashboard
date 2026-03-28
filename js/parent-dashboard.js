// parent-dashboard.js - Parent Dashboard (slide-in panel)
// Tracks pending approvals across days and provides a parent control center.
// DB-migration-ready: pending list is a flat array that maps 1:1 to a future DB table.

import { showPinModal } from './auth.js';
import { getIsUnlocked } from './state.js';
import { getChores, setChores } from './state.js';
import { getConfig } from './config.js';
import { approveChore, rejectChore } from './chores.js';
import { approveActivity, rejectActivity } from './activities.js';
import { addChoreToSheets, updateChoreInSheets, setChoreMultiplier, fetchAllChores } from './api.js';

const STORAGE_KEY = 'pending-approvals';

// Module-level state
let choresSectionOpen = false;
let allChoresCache = null; // All chores including disabled (multiplier=0)

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
                            <button class="chore-btn approve-btn"
                                onclick="parentDashApprove('${item.type}', '${item.kidId}', '${item.itemId}', '${item.itemName}', ${item.bp}, ${item.multiplier || 1})">✓</button>
                            <button class="chore-btn reject-btn"
                                onclick="parentDashReject('${item.type}', '${item.kidId}', '${item.itemId}', '${item.itemName}')">✗</button>
                        </div>
                    </div>`;
            });

            html += `</div>`;
        });
    }

    html += renderChoresSectionHtml();
    container.innerHTML = html;
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
            <div class="chores-admin-header" onclick="toggleChoresAdmin()">
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

    html += `<div class="chores-admin-body">`;

    let hasAny = false;

    // Shared chores
    if (CHORES.shared && CHORES.shared.length > 0) {
        hasAny = true;
        html += `<div class="chores-admin-group-label">Shared</div>`;
        CHORES.shared.forEach(chore => { html += choreAdminRow(chore, ''); });
    }

    // Individual chores grouped by kid
    Object.entries(CHORES.individual || {}).forEach(([kidId, chores]) => {
        if (!chores || !chores.length) return;
        hasAny = true;
        const kid = kids.find(k => k.id.toLowerCase() === kidId.toLowerCase()) || { name: kidId };
        html += `<div class="chores-admin-group-label">${kid.name}</div>`;
        chores.forEach(chore => { html += choreAdminRow(chore, kidId); });
    });

    if (!hasAny) {
        html += `<div style="color:#999;font-size:12px;padding:8px 0;">No chores yet.</div>`;
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
    const nameHtml = isDisabled
        ? `<span class="chore-name chores-admin-disabled-name">${chore.name}</span>`
        : `<span class="chore-name">${chore.name}</span>`;

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
                <button class="chore-btn" title="Edit name/BP" onclick="adminEditChore('${kidId}', '${chore.id}', '${safeName}', ${chore.bp})">✏️</button>
            </div>
        </div>`;
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
        <input type="text" value="${currentName}" id="editChoreName-${kidId}-${choreId}" class="chores-admin-input chores-admin-input-grow">
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

function showMessage(msg) {
    const el = document.getElementById('message');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 3000);
}
