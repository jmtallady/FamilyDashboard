// reason-modal.js - Reason selection for daily BP adjustments

import { getKidByID } from './utils.js';
import { adjustDailyBP } from './points.js';

// ── Edit these arrays to change available reasons ─────────────────────────────
const ADD_REASONS    = ['Extra effort', 'Good behavior', 'Kindness', 'Helpfulness', 'Other'];
const DEDUCT_REASONS = ['Rule violation', 'Undesired behavior', 'Other'];
// ─────────────────────────────────────────────────────────────────────────────

let pendingKidId   = null;
let pendingChange  = null;  // +1 or -1 (direction only)
let pendingQty     = 1;
let selectedReason = null;

function updateQtyDisplay() {
    const isAdd = pendingChange > 0;
    document.getElementById('reasonQty').textContent = pendingQty;
    document.getElementById('reasonModalTitle').textContent =
        `${isAdd ? '➕' : '➖'} ${getKidByID(pendingKidId).name}: ${isAdd ? '+' : '-'}${pendingQty} Point${pendingQty !== 1 ? 's' : ''}`;
}

export function adjustReasonQty(delta) {
    pendingQty = Math.max(1, pendingQty + delta);
    updateQtyDisplay();
}

export function showAdjustReason(kidId, change) {
    pendingKidId   = kidId;
    pendingChange  = change;
    pendingQty     = 1;
    selectedReason = null;

    const isAdd   = change > 0;
    const reasons = isAdd ? ADD_REASONS : DEDUCT_REASONS;

    updateQtyDisplay();

    const grid = document.getElementById('reasonBtnGrid');
    grid.innerHTML = reasons.map(r =>
        `<button class="reason-btn" onclick="selectAdjustReason('${r}')">${r}</button>`
    ).join('');

    document.getElementById('reasonOtherWrap').style.display = 'none';
    document.getElementById('reasonOtherInput').value = '';
    document.getElementById('reasonValidation').textContent = '';
    document.getElementById('reasonModal').classList.add('active');
}

export function selectAdjustReason(reason) {
    selectedReason = reason;
    document.querySelectorAll('.reason-btn').forEach(b => {
        b.classList.toggle('selected', b.textContent === reason);
    });
    document.getElementById('reasonOtherWrap').style.display =
        reason === 'Other' ? 'block' : 'none';
    document.getElementById('reasonValidation').textContent = '';
}

export async function confirmAdjustment() {
    let reason = '';
    if (selectedReason === 'Other') {
        reason = document.getElementById('reasonOtherInput').value.trim();
        if (!reason) {
            document.getElementById('reasonOtherInput').focus();
            document.getElementById('reasonValidation').textContent =
                'Please enter a reason or pick a different option.';
            return;
        }
    } else if (selectedReason) {
        reason = selectedReason;
    }
    const kidId  = pendingKidId;
    const change = pendingChange * pendingQty;
    closeReasonModal();
    await adjustDailyBP(kidId, change, reason);
}

export function closeReasonModal() {
    document.getElementById('reasonModal').classList.remove('active');
    pendingKidId   = null;
    pendingChange  = null;
    pendingQty     = 1;
    selectedReason = null;
}
