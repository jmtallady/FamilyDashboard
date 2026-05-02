// reason-modal.js - Reason selection for daily BP adjustments

import { getKidByID } from './utils.js';
import { adjustDailyBP } from './points.js';
import { renderBPStepper } from './ui.js';

// ── Edit these arrays to change available reasons ─────────────────────────────
const ADD_REASONS    = ['Extra effort', 'Good behavior', 'Kindness', 'Helpfulness', 'Other'];
const DEDUCT_REASONS = ['Rule violation', 'Undesired behavior', 'Other'];
// ─────────────────────────────────────────────────────────────────────────────

let pendingKidId      = null;
let pendingOriginalBP = 0;
let pendingDisplayBP  = 0;
let selectedReason    = null;

function currentDiff() { return pendingDisplayBP - pendingOriginalBP; }

function getDirection(diff) { return diff >= 0 ? 'add' : 'deduct'; }

function updateStepperDisplay() {
    const el = document.getElementById('reason-stepper-bp');
    if (el) el.textContent = pendingDisplayBP;

    const diff = currentDiff();
    const kid  = getKidByID(pendingKidId);
    let title;
    if (diff > 0)      title = `➕ ${kid.name}: +${diff} BP`;
    else if (diff < 0) title = `➖ ${kid.name}: ${diff} BP`;
    else               title = `${kid.name}: no change`;
    document.getElementById('reasonModalTitle').textContent = title;
}

function renderReasonButtons() {
    const isAdd   = getDirection(currentDiff()) === 'add';
    const reasons = isAdd ? ADD_REASONS : DEDUCT_REASONS;
    const grid    = document.getElementById('reasonBtnGrid');
    grid.innerHTML = reasons.map(r =>
        `<button class="reason-btn" onclick="selectAdjustReason('${r}')">${r}</button>`
    ).join('');
    selectedReason = null;
    document.getElementById('reasonOtherWrap').style.display   = 'none';
    document.getElementById('reasonOtherInput').value          = '';
    document.getElementById('reasonValidation').textContent    = '';
}

export function stepReasonBP(delta) {
    const prevDir = getDirection(currentDiff());
    pendingDisplayBP = Math.max(0, pendingDisplayBP + delta);
    updateStepperDisplay();
    if (getDirection(currentDiff()) !== prevDir) renderReasonButtons();
}

export function showAdjustReason(kidId, initialChange) {
    pendingKidId      = kidId;
    const el          = document.getElementById(`${kidId}-daily-bp`);
    pendingOriginalBP = el ? parseInt(el.textContent) : 0;
    pendingDisplayBP  = Math.max(0, pendingOriginalBP + initialChange);
    selectedReason    = null;

    document.getElementById('reasonStepperWrap').innerHTML = renderBPStepper(
        'Daily BP (Today)',
        'reason-stepper-bp',
        pendingDisplayBP,
        'stepReasonBP(-1)',
        'stepReasonBP(1)'
    );

    updateStepperDisplay();
    renderReasonButtons();
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
    const change = currentDiff();
    if (change === 0) { closeReasonModal(); return; }

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

    const kidId = pendingKidId;
    closeReasonModal();
    await adjustDailyBP(kidId, change, reason);
}

export function closeReasonModal() {
    document.getElementById('reasonModal').classList.remove('active');
    pendingKidId      = null;
    pendingOriginalBP = 0;
    pendingDisplayBP  = 0;
    selectedReason    = null;
}
