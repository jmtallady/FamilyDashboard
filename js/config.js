// config.js - Configuration & Constants Management

export const SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbxGpKE8kZEv5PKbBfteVru3WcyP_qfX7U_eV5TEZrfPxrfxrlNmjqh3BRpsnSdNIsRNIQ/exec';

let CONFIG = null;

/**
 * Fetch configuration from Google Sheets
 */
export async function fetchConfig() {
    try {
        const url = `${SHEETS_API_URL}?action=getConfig&t=${Date.now()}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.config) {
            console.log('Loaded config from Google Sheets');
            return data.config;
        }

        return null;
    } catch (error) {
        console.error('Error fetching config:', error);
        return null;
    }
}

/**
 * Get current configuration
 */
export function getConfig() {
    return CONFIG;
}

/**
 * Set configuration
 */
export function setConfig(config) {
    CONFIG = config;
}
