// state.js - Application State Management

// Centralized application state
const state = {
    isUnlocked: false,
    unlockTimeout: null,
    enteredPin: '',
    useGoogleSheets: false,
    CHORES: null,
    REWARDS: null,
    ACTIVITIES: null,
    pinContext: {
        type: 'parent',  // 'parent' or 'kid'
        kidId: null,     // The kid ID when type is 'kid'
        action: null,    // 'cash-in' or 'purchase'
        callback: null   // Function to call after successful PIN entry
    }
};

// Getters and setters for controlled state access
export function getIsUnlocked() {
    return state.isUnlocked;
}

export function setIsUnlocked(value) {
    state.isUnlocked = value;
}

export function getUnlockTimeout() {
    return state.unlockTimeout;
}

export function setUnlockTimeout(value) {
    state.unlockTimeout = value;
}

export function getEnteredPin() {
    return state.enteredPin;
}

export function setEnteredPin(value) {
    state.enteredPin = value;
}

export function getUseGoogleSheets() {
    return state.useGoogleSheets;
}

export function setUseGoogleSheets(value) {
    state.useGoogleSheets = value;
}

export function getChores() {
    return state.CHORES;
}

export function setChores(value) {
    state.CHORES = value;
}

export function getRewards() {
    return state.REWARDS;
}

export function setRewards(value) {
    state.REWARDS = value;
}

export function getActivities() {
    return state.ACTIVITIES;
}

export function setActivities(value) {
    state.ACTIVITIES = value;
}

export function getPinContext() {
    return state.pinContext;
}

export function setPinContext(context) {
    state.pinContext = { ...state.pinContext, ...context };
}

export function resetPinContext() {
    state.pinContext = {
        type: 'parent',
        kidId: null,
        action: null,
        callback: null
    };
}
