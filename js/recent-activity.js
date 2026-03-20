// recent-activity.js - Recent Activity Feed Display

import { fetchRecentPointsLog } from './api.js';

/**
 * Render recent activity from Points Log
 */
export async function renderRecentActivity() {
    const container = document.getElementById('recentActivityContainer');

    // Fetch latest entries from Points Log
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

        // Parse the entry based on type
        // Always include kid's name at the beginning for clarity
        const kidName = entry.kid || 'Someone';

        switch(entry.type) {
            case 'chore-approved':
                activityIcon = '✅';
                // Extract chore name from note if possible
                const choreMatch = entry.note?.match(/Completed chore: (.+?) \(/);
                const choreName = choreMatch ? choreMatch[1] : 'a chore';
                activityText = `${kidName} completed: ${choreName}`;
                activityColor = '#51cf66';
                break;
            case 'activity-approved':
                activityIcon = '⭐';
                // Extract activity name from note if possible
                const activityMatch = entry.note?.match(/Completed activity: (.+?) \(/);
                const activityName = activityMatch ? activityMatch[1] : 'an activity';
                activityText = `${kidName} completed: ${activityName}`;
                activityColor = '#f59f00';
                break;
            case 'reward-purchase':
                activityIcon = '🎁';
                // Extract reward name from note if possible
                const rewardMatch = entry.note?.match(/Purchased: (.+?) \(/);
                const rewardName = rewardMatch ? rewardMatch[1] : 'a reward';
                activityText = `${kidName} purchased: ${rewardName}`;
                activityColor = '#a78bfa';
                break;
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

        html += `
            <div style="display: flex; align-items: center; gap: 8px; padding: 6px 8px; background: #f8f9fa; border-radius: 6px; border-left: 3px solid ${activityColor};">
                <span style="font-size: 14px;">${activityIcon}</span>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 10px; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${activityText}</div>
                </div>
                <span style="font-size: 9px; color: #999; white-space: nowrap;">${timeStr}</span>
            </div>`;
    });

    html += '</div>';
    container.innerHTML = html;
}
