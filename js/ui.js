// ui.js - User Interface Management
// Handles UI updates for kid cards and date/time display

import { getConfig } from './config.js';

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

                    <div class="currency-section">
                        <div class="points-label">Daily BP (Today)</div>
                        <div class="points-display" id="${kid.id}-daily-bp">${kid.defaultDailyBP}</div>
                        <div class="button-group">
                            <button class="minus-btn" onclick="adjustDailyBP('${kid.id}', -1)">−</button>
                            <button class="plus-btn" onclick="adjustDailyBP('${kid.id}', 1)">+</button>
                        </div>
                    </div>

                    <div class="currency-section total-bp-section">
                        <div class="points-label">Total BP (Bank)</div>
                        <div class="points-display total-bp-display" id="${kid.id}-total-bp">${kid.defaultTotalBP}</div>
                        <div class="button-group">
                            <button class="end-of-day-btn" onclick="endOfDay('${kid.id}')">End of Day (Add to Bank)</button>
                        </div>
                    </div>

                    <div class="currency-section prize-coins-section">
                        <div class="points-label">Prize Coins</div>
                        <div class="points-display prize-coins-display" id="${kid.id}-pc">${kid.defaultPrizeCoins}</div>
                        <div class="button-group">
                            <button class="cash-in-btn" onclick="cashInPoints('${kid.id}')">Cash In (50 BP → 100 PC)</button>
                        </div>
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
