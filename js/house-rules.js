// house-rules.js - House Rules Modal Management

import { fetchHouseRules } from './api.js';

/**
 * Show the house rules modal with rules from Google Sheets
 */
export async function showHouseRules() {
    const container = document.getElementById('houseRulesContent');
    container.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;">Loading rules...</div>';
    document.getElementById('houseRulesModal').classList.add('active');

    const rules = await fetchHouseRules();

    if (!rules) {
        container.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;">No house rules configured.<br><small>Create a "House Rules" sheet in your Google Sheet to add rules.</small></div>';
        return;
    }

    let html = '';

    // General Rules
    if (rules.general && rules.general.length > 0) {
        html += '<div style="margin-bottom: 25px;">';
        html += '<h3 style="color: var(--primary-color); border-bottom: 2px solid var(--primary-color); padding-bottom: 8px; margin-bottom: 15px;">General Rules</h3>';
        html += '<div style="display: flex; flex-direction: column; gap: 8px;">';
        rules.general.forEach(rule => {
            const consequence = rule.consequence ? ` <span style="color: #e03131; font-weight: bold;">(${rule.consequence})</span>` : '';
            html += `<div style="padding: 8px 12px; background: #f8f9fa; border-radius: 6px; border-left: 3px solid var(--primary-color);">
                <span style="font-size: 13px; color: #333;">${rule.rule}${consequence}</span>
            </div>`;
        });
        html += '</div></div>';
    }

    // Kid-Specific Rules
    if (rules.kidSpecific && Object.keys(rules.kidSpecific).length > 0) {
        Object.keys(rules.kidSpecific).forEach(section => {
            const sectionRules = rules.kidSpecific[section];
            if (sectionRules && sectionRules.length > 0) {
                html += '<div style="margin-bottom: 25px;">';
                html += `<h3 style="color: var(--primary-color); border-bottom: 2px solid var(--primary-color); padding-bottom: 8px; margin-bottom: 15px;">${section}</h3>`;
                html += '<div style="display: flex; flex-direction: column; gap: 8px;">';
                sectionRules.forEach(rule => {
                    const consequence = rule.consequence ? ` <span style="color: #e03131; font-weight: bold;">(${rule.consequence})</span>` : '';
                    html += `<div style="padding: 8px 12px; background: #f8f9fa; border-radius: 6px; border-left: 3px solid var(--accent-color);">
                        <span style="font-size: 13px; color: #333;">${rule.rule}${consequence}</span>
                    </div>`;
                });
                html += '</div></div>';
            }
        });
    }

    // Spending Requirements
    if (rules.spendingRequirements && rules.spendingRequirements.length > 0) {
        html += '<div style="margin-bottom: 25px;">';
        html += '<h3 style="color: var(--primary-color); border-bottom: 2px solid var(--primary-color); padding-bottom: 8px; margin-bottom: 15px;">Before Spending Prize Coins</h3>';
        html += '<div style="display: flex; flex-direction: column; gap: 8px;">';
        rules.spendingRequirements.forEach(req => {
            html += `<div style="padding: 8px 12px; background: #fff9db; border-radius: 6px; border-left: 3px solid #f59f00;">
                <span style="font-size: 13px; color: #333;">✓ ${req.rule}</span>
            </div>`;
        });
        html += '</div></div>';
    }

    // Grounding Conditions
    if (rules.grounding && rules.grounding.length > 0) {
        html += '<div style="margin-bottom: 25px;">';
        html += '<h3 style="color: var(--primary-color); border-bottom: 2px solid var(--primary-color); padding-bottom: 8px; margin-bottom: 15px;">What "Grounded" Means</h3>';
        html += '<div style="display: flex; flex-direction: column; gap: 8px;">';
        rules.grounding.forEach(condition => {
            html += `<div style="padding: 8px 12px; background: #ffe9e9; border-radius: 6px; border-left: 3px solid #e03131;">
                <span style="font-size: 13px; color: #333;">⛔ ${condition.rule}</span>
            </div>`;
        });
        html += '</div></div>';
    }

    // Consequence Scale
    if (rules.consequenceScale && rules.consequenceScale.length > 0) {
        html += '<div style="margin-bottom: 25px;">';
        html += '<h3 style="color: var(--primary-color); border-bottom: 2px solid var(--primary-color); padding-bottom: 8px; margin-bottom: 15px;">Daily BP Consequences</h3>';
        html += '<div style="display: flex; flex-direction: column; gap: 8px;">';
        rules.consequenceScale.forEach(scale => {
            // Parse the rule text (e.g., "5 Daily BP: Prize basket + treat")
            const match = scale.rule.match(/^(\d+)\s+Daily BP:\s*(.+)$/);
            if (match) {
                const level = match[1];
                const description = match[2];
                const isGood = parseInt(level) >= 3;
                const bgColor = isGood ? '#d3f9d8' : '#ffe9e9';
                const borderColor = isGood ? '#51cf66' : '#e03131';
                const emoji = isGood ? '😊' : '😞';
                html += `<div style="padding: 8px 12px; background: ${bgColor}; border-radius: 6px; border-left: 3px solid ${borderColor};">
                    <span style="font-size: 13px; color: #333;"><strong>${level} Daily BP:</strong> ${emoji} ${description}</span>
                </div>`;
            }
        });
        html += '</div></div>';
    }

    container.innerHTML = html;

    // Parse emojis with Twemoji
    if (typeof twemoji !== 'undefined') {
        twemoji.parse(container, {
            folder: 'svg',
            ext: '.svg'
        });
    }
}

/**
 * Close the house rules modal
 */
export function closeHouseRules() {
    document.getElementById('houseRulesModal').classList.remove('active');
}
