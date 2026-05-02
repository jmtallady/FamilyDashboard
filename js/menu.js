// menu.js - Meal planning management
// Meal library lives in the "Meals" Google Sheet.
// Today's selection lives in the "Daily Meal" sheet.
// Both are mirrored in localStorage for offline/fast access.
// DB-migration-ready: data model maps 1:1 to Meal and DailyMeal tables.

import { SHEETS_API_URL } from './config.js';
import { getMeals, setMeals, getTodayMealState, setTodayMealState, getUseGoogleSheets } from './state.js';
import { fetchMeals, fetchDailyMeal, saveMeal, saveDailyMeal } from './api.js';

// ── Module state ──────────────────────────────────────────────────────────────
let menuSectionOpen = false;

// ── localStorage keys ─────────────────────────────────────────────────────────
function todayKey() {
    return `todayMeal-${new Date().toDateString()}`;
}

// ── Public meal accessors ─────────────────────────────────────────────────────

/** Returns today's meal name from in-memory state or localStorage, or null. */
export function getTodayMeal() {
    return getTodayMealState() || localStorage.getItem(todayKey()) || null;
}

/** Persists a meal selection to state, localStorage, and Sheets. */
export function setTodayMeal(mealName) {
    const trimmed = (mealName || '').trim();
    setTodayMealState(trimmed || null);
    if (trimmed) {
        localStorage.setItem(todayKey(), trimmed);
    } else {
        localStorage.removeItem(todayKey());
    }
    if (getUseGoogleSheets() && SHEETS_API_URL) {
        const date = new Date().toISOString().split('T')[0];
        saveDailyMeal(date, trimmed);
    }
}

/** Returns the cached meal library array. */
export function getMealsCache() {
    return getMeals() || [];
}

// ── Initialization ────────────────────────────────────────────────────────────

export async function initializeMeals() {
    // Restore today's meal from localStorage immediately (no network wait)
    const cached = localStorage.getItem(todayKey());
    if (cached) setTodayMealState(cached);

    if (!getUseGoogleSheets() || !SHEETS_API_URL) return;

    const [meals, dailyMeal] = await Promise.all([fetchMeals(), fetchDailyMeal()]);

    if (meals) setMeals(meals);

    if (dailyMeal?.mealName) {
        setTodayMealState(dailyMeal.mealName);
        localStorage.setItem(todayKey(), dailyMeal.mealName);
    }
}

// ── Admin panel toggle ────────────────────────────────────────────────────────

export function toggleMenuSection() {
    menuSectionOpen = !menuSectionOpen;
}

export function isMenuSectionOpen() {
    return menuSectionOpen;
}

// ── Admin panel HTML ──────────────────────────────────────────────────────────

export function renderMenuSectionHtml() {
    const toggleIcon = menuSectionOpen ? '▾' : '▸';
    const currentMeal = getTodayMeal();

    let html = `
        <div class="chores-admin-section">
            <div class="chores-admin-header" onclick="adminToggleMenuSection()">
                <span>🍽️ Today's Menu</span>
                <span>${toggleIcon}</span>
            </div>`;

    if (!menuSectionOpen) {
        html += `</div>`;
        return html;
    }

    const meals = getMealsCache().filter(m => m.active !== false);
    const mealOptions = meals
        .map(m => `<option value="${m.name.replace(/"/g, '&quot;')}">${m.name}</option>`)
        .join('');

    html += `<div class="chores-admin-body">`;

    // Current meal display
    html += `
        <div class="menu-current-display">
            <span class="menu-current-label">Tonight:</span>
            <strong class="menu-current-name">${currentMeal || '—'}</strong>
        </div>`;

    // Select from library
    html += `
        <div class="chores-admin-add-form" style="margin-bottom:6px;">
            <select id="mealSelectDropdown" class="chores-admin-input chores-admin-input-grow">
                <option value="">Pick from library…</option>
                ${mealOptions}
            </select>
            <button class="chore-btn approve-btn" title="Set meal" onclick="adminSetTodayMealFromSelect()">✓</button>
        </div>`;

    // Custom / one-off meal
    html += `
        <div class="chores-admin-add-form">
            <input id="customMealInput" type="text" placeholder="Or type custom meal…"
                class="chores-admin-input chores-admin-input-grow" maxlength="80">
            <button class="chore-btn approve-btn" title="Set meal" onclick="adminSetCustomMeal()">✓</button>
        </div>`;

    // Meal library list
    const allMeals = getMealsCache();
    if (allMeals.length > 0) {
        html += `<div class="chores-admin-group-label" style="margin-top:10px;">Meal Library</div>`;
        allMeals.forEach(meal => {
            const safeName = meal.name.replace(/'/g, "\\'");
            html += `
                <div class="chores-admin-row">
                    <div class="chores-admin-row-info">
                        <span class="chore-name">${meal.name}</span>
                    </div>
                    <div class="chores-admin-row-actions">
                        <button class="chore-btn" title="Set as tonight's meal"
                            onclick="adminSetMealFromLibrary('${safeName}')">📅</button>
                    </div>
                </div>`;
        });
    }

    // Add to library
    html += `
        <div class="chores-admin-group-label" style="margin-top:8px;">Add to Library</div>
        <div class="chores-admin-add-form">
            <input id="newMealName" type="text" placeholder="New meal name"
                class="chores-admin-input chores-admin-input-grow" maxlength="80">
            <button class="chore-btn approve-btn" title="Add meal" onclick="adminAddMeal()">+</button>
        </div>
    </div></div>`;

    return html;
}

// ── Admin actions (exposed via parent-dashboard.js onto window) ───────────────

/** Adds a new meal to the in-memory library cache and persists to Sheets. */
export function addMealToCache(name) {
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-') + '-' + Date.now().toString(36);
    const newMeal = { id, name, active: true };
    const current = getMeals() || [];
    setMeals([...current, newMeal]);

    if (getUseGoogleSheets() && SHEETS_API_URL) {
        saveMeal(name);
    }
    return newMeal;
}
