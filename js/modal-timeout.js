// modal-timeout.js — Auto-close modals after N minutes of inactivity

import { getConfig, setConfig } from './config.js';
import { saveConfigValue } from './api.js';

const MODAL_IDS = [
    'pinModal', 'kidSelectorModal', 'checklistModal', 'houseRulesModal',
    'reasonModal', 'rewardsModal', 'activitiesModal', 'dinnerRequestModal',
];

let _timerId   = null;
let _enabled   = true;
let _minutes   = 2;

function _anyOpen() {
    const modalOpen = MODAL_IDS.some(id => document.getElementById(id)?.classList.contains('active'));
    const panelOpen = document.getElementById('parentDashPanel')?.classList.contains('open');
    return modalOpen || panelOpen;
}

function _closeAll() {
    MODAL_IDS.forEach(id => document.getElementById(id)?.classList.remove('active'));
    document.getElementById('parentDashPanel')?.classList.remove('open');
    document.getElementById('parentDashOverlay')?.classList.remove('open');
}

function _resetTimer() {
    if (!_enabled) return;
    if (_timerId) clearTimeout(_timerId);
    if (!_anyOpen()) return;
    _timerId = setTimeout(() => {
        if (_anyOpen()) _closeAll();
    }, _minutes * 60 * 1000);
}

export function initModalTimeout() {
    const CONFIG = getConfig();
    const setting = CONFIG?.modalTimeoutMinutes;

    if (setting === 0 || setting === false) {
        _enabled = false;
    } else {
        _enabled = true;
        if (typeof setting === 'number' && setting > 0) _minutes = setting;
    }

    ['click', 'keydown', 'touchstart'].forEach(evt =>
        document.addEventListener(evt, _resetTimer, { passive: true })
    );
}

export function getModalTimeoutSettings() {
    return { enabled: _enabled, minutes: _minutes };
}

export function applyModalTimeout(enabled, minutes) {
    _enabled = enabled;
    _minutes = minutes;
    if (!_enabled && _timerId) {
        clearTimeout(_timerId);
        _timerId = null;
    }
    // Persist to Sheets (fire-and-forget)
    const newVal = enabled ? minutes : 0;
    saveConfigValue('modalTimeoutMinutes', newVal);
    // Update in-memory config so it survives re-reads this session
    const CONFIG = getConfig();
    if (CONFIG) {
        CONFIG.modalTimeoutMinutes = newVal;
        setConfig(CONFIG);
    }
}
