// recent-activity.js - Recent Activity Feed Display

import { fetchRecentPointsLog, savePointsToSheets } from './api.js';
import { getConfig, SHEETS_API_URL } from './config.js';
import { getIsUnlocked, getUseGoogleSheets } from './state.js';
import { showPinModal } from './auth.js';
import { getKidByName, showMessage } from './utils.js';

// ── BP delta parsing ──────────────────────────────────────────────────────────
// Returns the signed delta that was applied to totalBP for this entry,
// or null if the entry is not undoable.
// Positive = BP was added (chore/activity earned).
// Negative = BP was spent (reward purchase).

function parseBPDelta(type, note) {
    if (type === 'chore-approved' || type === 'activity-approved') {
        // Note: "...+N BP to bank)" or "...= N BP to bank)"
        const m = note?.match(/(\d+) BP to bank/);
        return m ? parseInt(m[1]) : null;
    }
    if (type === 'reward-purchase') {
        // Note: "...(-N BP)"
        const m = note?.match(/\(-(\d+) BP\)/);
        return m ? -parseInt(m[1]) : null;
    }
    return null; // not undoable
}

// ── Render ────────────────────────────────────────────────────────────────────

export async function renderRecentActivity() {
    const container = document.getElementById('recentActivityContainer');

    const entries = await fetchRecentPointsLog();

    console.log('Recent activity entries:', entries);

    if (!entries || entries.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #999; padding: 20px; font-size: 11px;">No recent activity</div>';
        return;
    }

    let html = '<div style="display: flex; flex-direction: column; gap: 4px;">';

    entries.forEach(entry => {
        let activityIcon = '';
        let activityText = '';
        let activityColor = '#666';

        const kidName = entry.kid || 'Someone';

        switch (entry.type) {
            case 'chore-approved': {
                activityIcon = '✅';
                const m = entry.note?.match(/Completed chore: (.+?) \(/);
                activityText = `${kidName} completed: ${m ? m[1] : 'a chore'}`;
                activityColor = '#51cf66';
                break;
            }
            case 'activity-approved': {
                activityIcon = '⭐';
                const m = entry.note?.match(/Completed activity: (.+?) \(/);
                activityText = `${kidName} completed: ${m ? m[1] : 'an activity'}`;
                activityColor = '#f59f00';
                break;
            }
            case 'reward-purchase': {
                activityIcon = '🎁';
                const m = entry.note?.match(/Purchased: (.+?) [^\w\s(]/);
                activityText = `${kidName} purchased: ${m ? m[1].trim() : 'a reward'}`;
                activityColor = '#a78bfa';
                break;
            }
            case 'end-of-day-auto':
                activityIcon = '🌙';
                activityText = `${kidName}: End of day`;
                activityColor = '#868e96';
                break;
            case 'daily-adjust':
                activityIcon = '📊';
                activityText = `${kidName}: Points adjusted`;
                activityColor = '#339af0';
                break;
            default:
                activityIcon = '📝';
                activityText = `${kidName}: ${entry.type}`;
                activityColor = '#666';
        }

        // Format the time
        const entryDate = new Date(entry.date);
        const now = new Date();
        const isToday = entryDate.toDateString() === now.toDateString();
        const timeStr = isToday
            ? entryDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
            : entryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        // Undo button — only for chore-approved, activity-approved, reward-purchase
        const bpDelta = parseBPDelta(entry.type, entry.note);
        const safeKidName = kidName.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const undoBtn = bpDelta !== null
            ? `<button class="activity-undo-btn" title="Undo" onclick="undoActivity('${safeKidName}', ${bpDelta}, '${entry.type}')">↩</button>`
            : '';

        html += `
            <div style="display: flex; align-items: center; gap: 8px; padding: 6px 8px; background: #f8f9fa; border-radius: 6px; border-left: 3px solid ${activityColor};">
                <span style="font-size: 14px;">${activityIcon}</span>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 10px; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${activityText}</div>
                </div>
                <span style="font-size: 9px; color: #999; white-space: nowrap;">${timeStr}</span>
                ${undoBtn}
            </div>`;
    });

    html += '</div>';
    container.innerHTML = html;
}

// ── Undo ──────────────────────────────────────────────────────────────────────

export async function undoActivity(kidName, bpDelta, type) {
    const CONFIG = getConfig();

    // PIN gate
    if (CONFIG.requirePinForEdits && !getIsUnlocked()) {
        showPinModal('parent', null, null, () => undoActivity(kidName, bpDelta, type));
        return;
    }

    const kid = getKidByName(kidName);
    if (!kid) { showMessage(`Could not find kid: ${kidName}`); return; }

    const totalBPElement = document.getElementById(`${kid.id}-total-bp`);
    if (!totalBPElement) return;

    const currentTotalBP = parseInt(totalBPElement.textContent);
    const newTotalBP = currentTotalBP - bpDelta;

    if (newTotalBP < 0) {
        showMessage(`Cannot undo: ${kid.name} only has ${currentTotalBP} BP`);
        return;
    }

    // Update UI and localStorage
    totalBPElement.textContent = newTotalBP;
    localStorage.setItem(`${kid.id}-total-bp`, newTotalBP.toString());

    // Log the reversal to Sheets
    if (getUseGoogleSheets() && SHEETS_API_URL) {
        const dailyBPElement = document.getElementById(`${kid.id}-daily-bp`);
        const currentDailyBP = parseInt(dailyBPElement.textContent);
        const note = `Undid ${type} (${bpDelta > 0 ? '-' : '+'}${Math.abs(bpDelta)} BP)`;
        await savePointsToSheets(kid.id, currentDailyBP, newTotalBP, `undo-${type}`, note);
    }

    const changeStr = bpDelta > 0 ? `-${bpDelta}` : `+${Math.abs(bpDelta)}`;
    showMessage(`↩ Undone for ${kid.name}: ${changeStr} BP (now ${newTotalBP})`);
    await renderRecentActivity();
}
