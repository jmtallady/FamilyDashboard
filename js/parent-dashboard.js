// parent-dashboard.js - Parent Dashboard (slide-in panel)
// Tracks pending approvals across days and provides a parent control center.
// DB-migration-ready: pending list is a flat array that maps 1:1 to a future DB table.

import { showPinModal } from './auth.js';
import { getIsUnlocked } from './state.js';
import { approveChore, rejectChore } from './chores.js';
import { approveActivity, rejectActivity } from './activities.js';

const STORAGE_KEY = 'pending-approvals';

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

    if (pending.length === 0) {
        container.innerHTML = `
            <div class="parent-dash-empty">
                <div style="font-size: 48px; margin-bottom: 12px;">✅</div>
                <div>All caught up! No pending approvals.</div>
            </div>`;
        return;
    }

    // Group by kid
    const byKid = {};
    pending.forEach(item => {
        if (!byKid[item.kidId]) byKid[item.kidId] = { kidName: item.kidName, items: [] };
        byKid[item.kidId].items.push(item);
    });

    let html = '';
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
