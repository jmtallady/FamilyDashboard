// house-rules.js - House Rules Modal Management

import { fetchHouseRules } from './api.js';
import { getHouseRules, setHouseRules } from './state.js';

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

    // Use cached rules if available, otherwise fetch from Sheets
    let rules = getHouseRules();
    if (!rules) {
        rules = await fetchHouseRules();
        if (rules) setHouseRules(rules);
    }

    if (!rules) {
        container.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;">No house rules configured.<br><small>Create a "House Rules" sheet in your Google Sheet to add rules.</small></div>';
        return;
    }

    const sectionHeader = (title) =>
        `<h3 style="color: var(--primary-color); border-bottom: 2px solid var(--primary-color); padding-bottom: 8px; margin-bottom: 15px;">${title}</h3>`;

    // ── Helper: build a section block ────────────────────────────────────────
    const section = (title, items, defaultStyle, renderItem) => {
        if (!items || items.length === 0) return '';
        let s = `<div class="rules-section">${sectionHeader(title)}<div style="display:flex;flex-direction:column;gap:8px;">`;
        items.forEach(item => { s += renderItem(item, getTypeStyle(item.type, defaultStyle)); });
        s += '</div></div>';
        return s;
    };

    // ── Row 1: General Rules (left) | Kid-Specific Rules stacked (right) ────────
    const generalSection = section('General Rules', rules.general,
        { bg: '#f8f9fa', border: 'var(--primary-color)', emoji: '' },
        (rule, style) => {
            const prefix = style.emoji ? `${style.emoji} ` : '✓ ';
            const consequence = rule.consequence ? ` <span style="color:#e03131;font-weight:bold;">(${rule.consequence})</span>` : '';
            return ruleBox(`${prefix}${rule.rule}${consequence}`, style);
        }
    );

    let kidSections = '';
    if (rules.kidSpecific) {
        Object.keys(rules.kidSpecific).forEach(name => {
            kidSections += section(name, rules.kidSpecific[name],
                { bg: '#f8f9fa', border: 'var(--accent-color)', emoji: '' },
                (rule, style) => {
                    const prefix = style.emoji ? `${style.emoji} ` : '• ';
                    const consequence = rule.consequence ? ` <span style="color:#e03131;font-weight:bold;">(${rule.consequence})</span>` : '';
                    return ruleBox(`${prefix}${rule.rule}${consequence}`, style);
                }
            );
        });
    }

    // ── Row 2: BP Consequences (left) | Spending + Grounding stacked (right) ──
    const bpSection = section('Daily BP Consequences', rules.consequenceScale,
        { bg: '#f8f9fa', border: '#ccc', emoji: '•' },
        (scale, style) => {
            const consequence = scale.consequence
                ? ` <span style="color:${style.border};font-weight:bold;">(${scale.consequence})</span>`
                : '';
            return ruleBox(`${style.emoji} ${scale.rule}${consequence}`, style);
        }
    );

    const spendingSection = section('Before Spending Prize Coins', rules.spendingRequirements,
        { bg: '#fff9db', border: '#f59f00', emoji: '' },
        (req, style) => ruleBox(`✓ ${req.rule}`, style)
    );

    const groundingSection = section('What "Grounded" Means', rules.grounding,
        { bg: '#ffe9e9', border: '#e03131', emoji: '' },
        (condition, style) => ruleBox(`⛔ ${condition.rule}`, style)
    );

    const row1 = generalSection || kidSections;
    const row2 = bpSection || spendingSection || groundingSection;

    const html = `
        ${row1 ? `<div class="rules-row">
            <div>${generalSection}</div>
            <div class="rules-col">${kidSections}</div>
        </div>` : ''}
        ${row2 ? `<div class="rules-row">
            <div>${bpSection}</div>
            <div class="rules-col">${spendingSection}${groundingSection}</div>
        </div>` : ''}
    `;

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
