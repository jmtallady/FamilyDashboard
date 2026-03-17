// utils.js - Utility Functions

import { getConfig } from './config.js';

/**
 * Get kid object by ID from configuration
 */
export function getKidByID(kidId) {
    const CONFIG = getConfig();
    return Object.values(CONFIG).find(kid => kid.id === kidId);
}

/**
 * Show status message for 3 seconds
 */
export function showMessage(message) {
    const statusElement = document.getElementById('statusMessage');
    statusElement.textContent = message;
    setTimeout(() => {
        statusElement.textContent = '';
    }, 3000);
}
