// auth.js - PIN Authentication & Authorization Management
// Handles parent and kid PIN validation, modal dialogs, and dashboard locking

import { getConfig } from './config.js';
import {
    getIsUnlocked,
    setIsUnlocked,
    getUnlockTimeout,
    setUnlockTimeout,
    getEnteredPin,
    setEnteredPin,
    getPinContext,
    setPinContext,
    resetPinContext
} from './state.js';

/**
 * Show PIN modal dialog
 * @param {string} type - 'parent' or 'kid'
 * @param {string|null} kidId - Kid ID if type is 'kid'
 * @param {string|null} action - Action being performed ('cash-in', 'purchase', etc.)
 * @param {Function|null} callback - Callback function to execute after successful PIN entry
 */
export function showPinModal(type = 'parent', kidId = null, action = null, callback = null) {
    setPinContext({
        type: type,
        kidId: kidId,
        action: action,
        callback: callback
    });

    setEnteredPin('');
    updatePinDisplay();

    // Update modal title based on context
    const titleElement = document.getElementById('pinModalTitle');
    if (type === 'parent') {
        titleElement.textContent = 'Enter Parent PIN';
    } else if (type === 'kid') {
        const CONFIG = getConfig();
        const kid = Object.values(CONFIG).find(k => k.id === kidId);
        if (kid) {
            if (action === 'cash-in') {
                titleElement.textContent = `${kid.name}, Enter Your PIN to Cash In`;
            } else if (action === 'purchase') {
                titleElement.textContent = `${kid.name}, Enter Your PIN to Purchase`;
            } else {
                titleElement.textContent = `${kid.name}, Enter Your PIN`;
            }
        }
    }

    document.getElementById('pinModal').classList.add('active');

    // Add keyboard event listener
    document.addEventListener('keydown', handlePinKeyboard);
}

/**
 * Close PIN modal dialog
 */
export function closePinModal() {
    document.getElementById('pinModal').classList.remove('active');
    setEnteredPin('');
    clearPinError();
    resetPinContext();

    // Remove keyboard event listener
    document.removeEventListener('keydown', handlePinKeyboard);
}

/**
 * Add a digit to the entered PIN
 * @param {string} digit - Digit to add (0-9)
 */
export function addPinDigit(digit) {
    const enteredPin = getEnteredPin();
    if (enteredPin.length < 4) {
        setEnteredPin(enteredPin + digit);
        updatePinDisplay();
        clearPinError();
    }
}

/**
 * Remove last digit from entered PIN
 */
export function backspacePin() {
    const enteredPin = getEnteredPin();
    setEnteredPin(enteredPin.slice(0, -1));
    updatePinDisplay();
}

/**
 * Clear all entered PIN digits
 */
export function clearPin() {
    setEnteredPin('');
    updatePinDisplay();
}

/**
 * Update PIN display to show entered digits
 */
export function updatePinDisplay() {
    const enteredPin = getEnteredPin();
    const display = document.getElementById('pinDisplay');
    if (enteredPin.length === 0) {
        display.textContent = '○○○○';
    } else {
        // Show filled circles for entered digits, empty circles for remaining
        display.textContent = '●'.repeat(enteredPin.length) + '○'.repeat(4 - enteredPin.length);
    }

    // Add a pulse animation to the display when a digit is added
    display.classList.add('pulse');
    setTimeout(() => {
        display.classList.remove('pulse');
    }, 200);
}

/**
 * Show error message in the PIN modal
 * @param {string} message - Error message to display
 */
export function showPinError(message) {
    const errorElement = document.getElementById('pinError');
    errorElement.textContent = message;
    errorElement.style.display = 'block';

    // Auto-hide after 3 seconds
    setTimeout(() => {
        clearPinError();
    }, 3000);
}

/**
 * Clear error message in the PIN modal
 */
export function clearPinError() {
    const errorElement = document.getElementById('pinError');
    errorElement.textContent = '';
    errorElement.style.display = 'none';
}

/**
 * Check if entered PIN is correct and handle authentication
 */
export function checkPin() {
    const CONFIG = getConfig();
    const enteredPin = getEnteredPin();
    const pinContext = getPinContext();
    let pinValid = false;

    // Check if it's a parent PIN request
    if (pinContext.type === 'parent') {
        // Convert CONFIG.pin to string for comparison (it's stored as a number in Config sheet)
        if (enteredPin === CONFIG.pin.toString()) {
            pinValid = true;
            setIsUnlocked(true);
            closePinModal();
            
            // Show message (assumes showMessage is available globally)
            if (typeof showMessage === 'function') {
                showMessage('Unlocked! You can now edit points.');
            }

            // Show unlock indicator
            document.getElementById('unlockIndicator').classList.add('active');

            // Auto-lock after 2 minutes of inactivity
            clearTimeout(getUnlockTimeout());
            const timeout = setTimeout(() => {
                setIsUnlocked(false);
                document.getElementById('unlockIndicator').classList.remove('active');
                if (typeof showMessage === 'function') {
                    showMessage('Auto-locked for security');
                }
            }, 120000); // 2 minutes
            setUnlockTimeout(timeout);
        }
    }
    // Check if it's a kid PIN request
    else if (pinContext.type === 'kid') {
        const kid = Object.values(CONFIG).find(k => k.id === pinContext.kidId);
        if (kid && kid.pin && enteredPin === kid.pin.toString()) {
            pinValid = true;

            // Capture callback before closing modal (closePinModal resets pinContext)
            const callback = pinContext.callback;

            closePinModal();
            if (typeof showMessage === 'function') {
                showMessage(`✓ Welcome, ${kid.name}!`);
            }

            // Execute the callback function if provided
            if (callback) {
                callback();
            }
        }
    }

    // Handle incorrect PIN
    if (!pinValid) {
        showPinError('❌ Incorrect PIN!');
        setEnteredPin('');
        updatePinDisplay();
    }
}

/**
 * Lock the dashboard (requires parent PIN to unlock)
 */
export function lockDashboard() {
    setIsUnlocked(false);
    clearTimeout(getUnlockTimeout());
    document.getElementById('unlockIndicator').classList.remove('active');
    if (typeof showMessage === 'function') {
        showMessage('🔒 Dashboard locked!');
    }
}

/**
 * Handle keyboard input for PIN pad
 * @param {KeyboardEvent} event - Keyboard event
 */
export function handlePinKeyboard(event) {
    // Handle number keys (0-9)
    if (event.key >= '0' && event.key <= '9') {
        event.preventDefault();
        addPinDigit(event.key);
    }
    // Handle Enter key to submit
    else if (event.key === 'Enter') {
        event.preventDefault();
        checkPin();
    }
    // Handle Backspace to delete last digit
    else if (event.key === 'Backspace') {
        event.preventDefault();
        backspacePin();
    }
}
