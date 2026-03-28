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
 * Get kid object by name from configuration
 */
export function getKidByName(name) {
    const CONFIG = getConfig();
    return Object.values(CONFIG).find(kid => kid.name === name);
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
