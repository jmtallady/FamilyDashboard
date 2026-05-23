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
 * Parse emoji in an element using Twemoji (replaces emoji chars with cross-platform SVG images).
 * Falls back silently if Twemoji hasn't loaded yet (e.g. offline / Pi with no CDN).
 */
export function parseEmoji(el) {
    if (typeof twemoji !== 'undefined') {
        twemoji.parse(el || document.body, { folder: 'svg', ext: '.svg' });
    }
}

/**
 * Emoji picker widget — renders a button showing the current emoji (or —), a clear button,
 * and a hidden input that holds the value. Relies on window.toggleEmojiPicker and
 * window.clearEmoji wired up in app.js, and .emoji-pick-wrap / .emoji-pick-btn CSS.
 *
 * Usage:
 *   html += emojiPickerHtml(currentValue, 'my-input-id', 'my-btn-id');
 *   // Read value: document.getElementById('my-input-id').value
 */
export function emojiPickerHtml(current, inputId, btnId) {
    const stored = current ?? '';
    const btnLabel = stored || '—';
    return `<div class="emoji-pick-wrap">` +
        `<button type="button" class="emoji-pick-btn" id="${btnId}" ` +
            `onclick="toggleEmojiPicker('${inputId}','${btnId}')">${btnLabel}</button>` +
        `<button type="button" class="emoji-clear-btn" id="${btnId}-clr" ` +
            `style="display:${stored ? 'flex' : 'none'}" ` +
            `onclick="clearEmoji('${inputId}','${btnId}')">✕</button>` +
        `<input type="hidden" id="${inputId}" value="${stored}">` +
        `</div>`;
}

/**
 * Show a floating toast notification for 3 seconds.
 */
export function showMessage(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    document.body.appendChild(toast);

    // Trigger fade-in on next frame
    requestAnimationFrame(() => toast.classList.add('toast-visible'));

    setTimeout(() => {
        toast.classList.remove('toast-visible');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, 3000);
}
