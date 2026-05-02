// ui.js - User Interface Management
// Handles UI updates for kid cards and date/time display

import { getConfig } from './config.js';

/**
 * Reusable BP stepper component: label + large number display + −/+ buttons.
 * Returns an HTML string. displayId is the element id for the number.
 * minusFn / plusFn are onclick expression strings (e.g. "stepReasonBP(-1)").
 */
export function renderBPStepper(label, displayId, value, minusFn, plusFn) {
    return `
        <div class="currency-section">
            <div class="points-label">${label}</div>
            <div class="points-display" id="${displayId}">${value}</div>
            <div class="button-group">
                <button class="minus-btn" onclick="${minusFn}">−</button>
                <button class="plus-btn" onclick="${plusFn}">+</button>
            </div>
        </div>`;
}

/**
 * Generate kid cards dynamically from configuration
 */
export function generateKidCards() {
    const CONFIG = getConfig();
    const container = document.getElementById('kidsContainer');
    container.innerHTML = '';

    Object.values(CONFIG).forEach(kid => {
        if (kid.id) { // Skip non-kid config items
            const card = `
                <div class="kid-card">
                    <div class="kid-name">${kid.name}</div>

                    ${renderBPStepper(
                        'Daily BP (Today)',
                        `${kid.id}-daily-bp`,
                        kid.defaultDailyBP,
                        `showAdjustReason('${kid.id}', -1)`,
                        `showAdjustReason('${kid.id}', 1)`
                    )}

                    <div class="currency-section total-bp-section">
                        <div class="points-label">Total BP (Bank)</div>
                        <div class="points-display total-bp-display" id="${kid.id}-total-bp">${kid.defaultTotalBP}</div>
                    </div>

                </div>
            `;
            container.innerHTML += card;
        }
    });
}

/**
 * Update date and time display in clock widget
 */
export function updateDateTime() {
    const now = new Date();

    // Update clock time (12-hour format with AM/PM)
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    const timeElement = document.getElementById('clockTime');
    if (timeElement) {
        timeElement.textContent = `${hours}:${minutes}:${seconds} ${ampm}`;
    }

    // Update clock date
    const dateOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    const dateElement = document.getElementById('clockDate');
    if (dateElement) {
        dateElement.textContent = now.toLocaleDateString('en-US', dateOptions);
    }
}
