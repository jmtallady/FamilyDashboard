// theme.js - Theme & Dark Mode Management

import { getConfig } from './config.js';

/**
 * Toggle dark mode on/off
 */
export function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
    const iconElement = document.getElementById('darkModeIcon');
    iconElement.textContent = isDark ? '☀️' : '🌙';

    // Re-parse the emoji with Twemoji after changing it
    if (typeof twemoji !== 'undefined') {
        twemoji.parse(iconElement, {
            folder: 'svg',
            ext: '.svg'
        });
    }
}

/**
 * Load dark mode preference from localStorage
 */
export function loadDarkMode() {
    const isDark = localStorage.getItem('darkMode') === 'true';
    if (isDark) {
        document.body.classList.add('dark-mode');
        const iconElement = document.getElementById('darkModeIcon');
        iconElement.textContent = '☀️';

        // Parse the emoji with Twemoji
        if (typeof twemoji !== 'undefined') {
            twemoji.parse(iconElement, {
                folder: 'svg',
                ext: '.svg'
            });
        }
    }
}

/**
 * Load and apply color scheme from localStorage or config
 */
export function applyColorScheme() {
    const CONFIG = getConfig();
    const validSchemes = ['purple', 'pink', 'blue', 'green', 'teal', 'orange'];

    // Check localStorage first (per-device preference)
    let scheme = localStorage.getItem('colorScheme');

    // Fall back to config if no localStorage value
    if (!scheme && CONFIG && CONFIG.colorScheme) {
        scheme = CONFIG.colorScheme.toLowerCase();
    }

    // Default to purple if nothing set
    if (!scheme) {
        scheme = 'purple';
    }

    // Validate scheme
    if (!validSchemes.includes(scheme)) {
        scheme = 'purple';
    }

    // Remove all theme classes first
    validSchemes.forEach(s => {
        if (s !== 'purple') {
            document.body.classList.remove(`theme-${s}`);
        }
    });

    // Apply new theme (purple is default, no class needed)
    if (scheme !== 'purple') {
        document.body.classList.add(`theme-${scheme}`);
    }

    // Update dropdown to match current scheme
    const dropdown = document.getElementById('colorScheme');
    if (dropdown) {
        dropdown.value = scheme;
    }

    console.log(`Applied ${scheme} color scheme`);
}

/**
 * Change color scheme and save to localStorage
 */
export function changeColorScheme(scheme) {
    const validSchemes = ['purple', 'pink', 'blue', 'green', 'teal', 'orange'];

    if (!validSchemes.includes(scheme)) {
        console.error('Invalid color scheme:', scheme);
        return;
    }

    // Save to localStorage (per-device preference)
    localStorage.setItem('colorScheme', scheme);

    // Apply the new color scheme
    applyColorScheme();

    console.log(`Changed color scheme to ${scheme} and saved to localStorage`);
}
