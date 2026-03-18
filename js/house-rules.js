// house-rules.js - House Rules Modal Management

import { fetchHouseRules } from './api.js';

// ── Type → visual style mapping ──────────────────────────────────────────────
// Recognised type values (set in column D of the House Rules sheet):
//   good    → green
//   warning → yellow
//   bad     → red
//   info    → blue (neutral / informational)
// Any unrecognised or empty type falls back to the section default.

const TYPE_STYLES = {
    good:    { bg: '#d3f9d8', border: '#51cf66', emoji: '😊' },
    warning: { bg: '#fff9db', border: '#f59f00', emoji: '⚠️' },
    bad:     { bg: '#ffe9e9', border: '#e03131', emoji: '😞' },
    info:    { bg: '#e7f5ff', border: '#4dabf7', emoji: 'ℹ️' },
};

function getTypeStyle(type, defaultStyle) {
    return TYPE_STYLES[type] || defaultStyle;
}

function ruleBox(text, style) {
    return `<div style="padding: 8px 12px; background: ${style.bg}; border-radius: 6px; border-left: 3px solid ${style.border}; word-break: break-word;">
        <span style="font-size: 13px; color: #333;">${text}</span>
    </div>`;
}

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

    const sectionHeader = (title) =>
        `<h3 style="color: var(--primary-color); border-bottom: 2px solid var(--primary-color); padding-bottom: 8px; margin-bottom: 15px;">${title}</h3>`;

    let html = '';

    // General Rules — default: primary color border, light grey bg
    if (rules.general && rules.general.length > 0) {
        const defaultStyle = { bg: '#f8f9fa', border: 'var(--primary-color)', emoji: '' };
        html += `<div style="margin-bottom: 25px;">${sectionHeader('General Rules')}<div style="display: flex; flex-direction: column; gap: 8px;">`;
        rules.general.forEach(rule => {
            const style = getTypeStyle(rule.type, defaultStyle);
            const prefix = style.emoji ? `${style.emoji} ` : '✓ ';
            const consequence = rule.consequence ? ` <span style="color: #e03131; font-weight: bold;">(${rule.consequence})</span>` : '';
            html += ruleBox(`${prefix}${rule.rule}${consequence}`, style);
        });
        html += '</div></div>';
    }

    // Kid-Specific Rules — default: accent color border
    if (rules.kidSpecific && Object.keys(rules.kidSpecific).length > 0) {
        Object.keys(rules.kidSpecific).forEach(section => {
            const sectionRules = rules.kidSpecific[section];
            if (!sectionRules || sectionRules.length === 0) return;
            const defaultStyle = { bg: '#f8f9fa', border: 'var(--accent-color)', emoji: '' };
            html += `<div style="margin-bottom: 25px;">${sectionHeader(section)}<div style="display: flex; flex-direction: column; gap: 8px;">`;
            sectionRules.forEach(rule => {
                const style = getTypeStyle(rule.type, defaultStyle);
                const prefix = style.emoji ? `${style.emoji} ` : '• ';
                const consequence = rule.consequence ? ` <span style="color: #e03131; font-weight: bold;">(${rule.consequence})</span>` : '';
                html += ruleBox(`${prefix}${rule.rule}${consequence}`, style);
            });
            html += '</div></div>';
        });
    }

    // Spending Requirements — default: yellow
    if (rules.spendingRequirements && rules.spendingRequirements.length > 0) {
        const defaultStyle = { bg: '#fff9db', border: '#f59f00', emoji: '' };
        html += `<div style="margin-bottom: 25px;">${sectionHeader('Before Spending Prize Coins')}<div style="display: flex; flex-direction: column; gap: 8px;">`;
        rules.spendingRequirements.forEach(req => {
            const style = getTypeStyle(req.type, defaultStyle);
            html += ruleBox(`✓ ${req.rule}`, style);
        });
        html += '</div></div>';
    }

    // Grounding Conditions — default: red
    if (rules.grounding && rules.grounding.length > 0) {
        const defaultStyle = { bg: '#ffe9e9', border: '#e03131', emoji: '' };
        html += `<div style="margin-bottom: 25px;">${sectionHeader('What "Grounded" Means')}<div style="display: flex; flex-direction: column; gap: 8px;">`;
        rules.grounding.forEach(condition => {
            const style = getTypeStyle(condition.type, defaultStyle);
            html += ruleBox(`⛔ ${condition.rule}`, style);
        });
        html += '</div></div>';
    }

    // BP Consequence Scale — color driven entirely by the Type column (column D)
    if (rules.consequenceScale && rules.consequenceScale.length > 0) {
        const defaultStyle = { bg: '#f8f9fa', border: '#ccc', emoji: '•' };
        html += `<div style="margin-bottom: 25px;">${sectionHeader('Daily BP Consequences')}<div style="display: flex; flex-direction: column; gap: 8px;">`;
        rules.consequenceScale.forEach(scale => {
            const style = getTypeStyle(scale.type, defaultStyle);
            const consequence = scale.consequence
                ? ` <span style="color: ${style.border}; font-weight: bold;">(${scale.consequence})</span>`
                : '';
            html += ruleBox(`${style.emoji} ${scale.rule}${consequence}`, style);
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
