// menu.js - Meal planning management
// Meal library: "Meals" Google Sheet + localStorage.
// Per-day planned meals: "Daily Meal" sheet (date | mealName) + localStorage.
// Kid dinner requests: "Meal Requests" sheet + localStorage.

import { SHEETS_API_URL, getConfig } from './config.js';
import { getMeals, setMeals, getUseGoogleSheets } from './state.js';
import { fetchMeals, fetchMealPlan, saveMeal, saveDailyMeal,
         fetchMealRequests, saveMealRequest } from './api.js';

// ── Module state ──────────────────────────────────────────────────────────────
let menuSectionOpen = false;
let mealLibraryOpen = false;

// ── localStorage helpers ──────────────────────────────────────────────────────

function planKey(date) {
    return `mealPlan-${date.toDateString()}`;
}

const REQUESTS_KEY = 'dinnerRequests';

// ── Public meal accessors ─────────────────────────────────────────────────────

/** Returns the planned meal for a given Date, or null. */
export function getMealForDate(date) {
    return localStorage.getItem(planKey(date)) ||
           // Backward-compat: check old "todayMeal-..." key for today
           (date.toDateString() === new Date().toDateString()
               ? localStorage.getItem(`todayMeal-${date.toDateString()}`)
               : null) ||
           null;
}

/** Today's meal — convenience alias. */
export function getTodayMeal() {
    return getMealForDate(new Date());
}

/** Persists a meal for a specific date to localStorage (and Sheets). */
export function setMealForDate(date, mealName) {
    const trimmed = (mealName || '').trim();
    if (trimmed) {
        localStorage.setItem(planKey(date), trimmed);
    } else {
        localStorage.removeItem(planKey(date));
    }
    if (getUseGoogleSheets() && SHEETS_API_URL) {
        saveDailyMeal(date.toISOString().split('T')[0], trimmed);
    }
}

/** Convenience alias — set today's meal. */
export function setTodayMeal(mealName) {
    setMealForDate(new Date(), mealName);
}

/** Returns a random active meal name from the library, or null. */
export function getRandomMeal() {
    const meals = getMealsCache().filter(m => m.active !== false);
    if (!meals.length) return null;
    return meals[Math.floor(Math.random() * meals.length)].name;
}

/** Returns the cached meal library array. */
export function getMealsCache() {
    return getMeals() || [];
}

// ── Dinner Requests ───────────────────────────────────────────────────────────

/** Returns all pending dinner requests from localStorage. */
export function getDinnerRequests() {
    try { return JSON.parse(localStorage.getItem(REQUESTS_KEY) || '[]'); }
    catch { return []; }
}

function _saveRequests(requests) {
    localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
}

/** Adds a new dinner request; syncs to Sheets fire-and-forget. */
export function addDinnerRequest(kidId, kidName, mealName, dateStr) {
    const req = {
        id: Date.now().toString(36),
        kidId, kidName, mealName, dateStr,
        requestedAt: new Date().toISOString()
    };
    _saveRequests([...getDinnerRequests(), req]);
    if (getUseGoogleSheets() && SHEETS_API_URL) {
        saveMealRequest(dateStr, kidName, mealName);
    }
    return req;
}

/** Approves a request: sets the meal for that date and removes the request. */
export function approveDinnerRequest(id) {
    const all = getDinnerRequests();
    const req = all.find(r => r.id === id);
    if (!req) return;
    setMealForDate(new Date(req.dateStr + 'T12:00:00'), req.mealName);
    _saveRequests(all.filter(r => r.id !== id));
}

/** Dismisses a request without approving. */
export function dismissDinnerRequest(id) {
    _saveRequests(getDinnerRequests().filter(r => r.id !== id));
}

// ── Initialization ────────────────────────────────────────────────────────────

export async function initializeMeals() {
    if (!getUseGoogleSheets() || !SHEETS_API_URL) return;

    const daysAhead = Math.min(getConfig()?.calendar?.daysAhead ?? 7, 14);
    const [meals, plan] = await Promise.all([fetchMeals(), fetchMealPlan(daysAhead)]);

    if (meals) setMeals(meals);

    // Write each planned meal into localStorage so calendar shows them offline
    plan.forEach(({ date, mealName }) => {
        if (mealName) {
            const d = new Date(date + 'T12:00:00');
            if (!isNaN(d)) localStorage.setItem(planKey(d), mealName);
        }
    });
}

// ── Admin panel toggle ────────────────────────────────────────────────────────

export function toggleMenuSection() { menuSectionOpen = !menuSectionOpen; }
export function toggleMealLibrary() { mealLibraryOpen = !mealLibraryOpen; }
export function isMenuSectionOpen() { return menuSectionOpen; }

// ── Admin panel HTML ──────────────────────────────────────────────────────────

export function renderMenuSectionHtml() {
    const toggleIcon = menuSectionOpen ? '▾' : '▸';

    let html = `
        <div class="chores-admin-section">
            <div class="chores-admin-header" onclick="adminToggleMenuSection()" title="Click to expand/collapse">
                <span>🍽️ Meal Planner</span>
                <span>${toggleIcon}</span>
            </div>`;

    if (!menuSectionOpen) return html + `</div>`;

    const meals = getMealsCache().filter(m => m.active !== false).sort((a, b) => a.name.localeCompare(b.name));

    html += `<div class="chores-admin-body">`;

    // ── Pending dinner requests ──────────────────────────────────────────────
    const requests = getDinnerRequests();
    if (requests.length > 0) {
        html += `<div class="chores-admin-group-label">🙋 Dinner Requests</div>`;
        requests.forEach(req => {
            const d = new Date(req.dateStr + 'T12:00:00');
            const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            const safeId = req.id.replace(/'/g, "\\'");
            html += `
                <div class="chores-admin-row meal-request-row">
                    <div class="chores-admin-row-info">
                        <span class="chore-name">${req.kidName}</span>
                        <span class="chores-admin-meta">${req.mealName} · ${dayLabel}</span>
                    </div>
                    <div class="chores-admin-row-actions">
                        <button class="chore-btn approve-btn" title="Set this meal"
                            onclick="adminApproveDinnerRequest('${safeId}')">✓</button>
                        <button class="chore-btn" title="Dismiss"
                            onclick="adminDismissDinnerRequest('${safeId}')">✕</button>
                    </div>
                </div>`;
        });
    }

    // ── 7-day meal planner ───────────────────────────────────────────────────
    html += `<div class="chores-admin-group-label" style="margin-top:10px;">📅 This Week's Plan</div>`;
    const today = new Date();
    for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        const planned = getMealForDate(d) || '';
        const todayBadge = i === 0 ? `<span class="meal-today-badge">Today</span>` : '';

        html += `
            <div class="meal-plan-row">
                <div class="meal-plan-day">${dayLabel} ${todayBadge}</div>
                <div class="meal-plan-controls">
                    <select id="mealPlanSelect-${dateStr}" class="chores-admin-input chores-admin-input-grow">
                        <option value="">— not planned —</option>
                        ${meals.map(m => `<option value="${m.name.replace(/"/g, '&quot;')}"${m.name === planned ? ' selected' : ''}>${m.name}</option>`).join('')}
                    </select>
                    <button class="chore-btn approve-btn" title="Set meal"
                        onclick="adminSetMealForDate('${dateStr}')">✓</button>
                    <button class="chore-btn" title="Random meal"
                        onclick="adminRandomMealForDate('${dateStr}')">🎲</button>
                </div>
                ${planned ? `<div class="meal-plan-current">🍽️ ${planned}</div>` : ''}
            </div>`;
    }

    // ── Meal library ─────────────────────────────────────────────────────────
    const allMeals = [...getMealsCache()].sort((a, b) => a.name.localeCompare(b.name));
    const libIcon = mealLibraryOpen ? '▾' : '▸';
    html += `
        <div class="chores-admin-header" style="margin-top:10px;font-size:12px;font-weight:600;padding:4px 0;background:none;border-radius:0;"
            onclick="toggleMealLibrary()" title="Show/hide meal library">
            <span>📚 Meal Library (${allMeals.length})</span>
            <span>${libIcon}</span>
        </div>`;
    if (mealLibraryOpen) {
        if (allMeals.length > 0) {
            allMeals.forEach(meal => {
                html += `
                    <div class="chores-admin-row">
                        <div class="chores-admin-row-info">
                            <span class="chore-name">${meal.name}</span>
                        </div>
                    </div>`;
            });
        } else {
            html += `<div style="color:#999;font-size:12px;padding:4px 0;">No meals in library yet.</div>`;
        }
    }

    // ── Add to library ───────────────────────────────────────────────────────
    html += `
        <div class="chores-admin-group-label" style="margin-top:8px;">➕ Add to Library</div>
        <div class="chores-admin-add-form">
            <input id="newMealName" type="text" placeholder="New meal name"
                class="chores-admin-input chores-admin-input-grow" maxlength="80">
            <button class="chore-btn approve-btn" title="Add meal" onclick="adminAddMeal()">+</button>
        </div>
    </div></div>`;

    return html;
}

// ── Admin actions (exposed via parent-dashboard.js → window) ──────────────────

/** Adds a new meal to the in-memory library cache and persists to Sheets. */
export function addMealToCache(name) {
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-') + '-' + Date.now().toString(36);
    const newMeal = { id, name, active: true };
    setMeals([...(getMeals() || []), newMeal]);
    if (getUseGoogleSheets() && SHEETS_API_URL) saveMeal(name);
    return newMeal;
}
