# House Rules Setup Guide

This guide shows you how to add a House Rules tab to your dashboard that displays family rules, consequences, and grounding conditions.

## Quick Start

1. **Create the House Rules sheet** in your Google Sheet
2. **Add your rules** using the simple 3-column structure below
3. **Update Apps Script** - already done!
4. **Deploy** a new version of your Apps Script
5. **Done!** Rules will appear in a popup when the 📋 button is clicked

---

## Google Sheets Setup

### 1. Create the House Rules Sheet

In your Google Sheet, create a new tab called **"House Rules"** (case-sensitive).

### 2. Set Up the Rules Table

Create a simple 3-column table with headers in Row 1:

| Kid | Rule | Consequence |
|-----|------|-------------|

### 3. Add Your Rules

Here's an example showing all the different types of rules you can add:

| Kid | Rule | Consequence |
|-----|------|-------------|
| | no cooking after 9pm | -3 |
| | No running in the house | -1 |
| | No jumping on the couch | -1 |
| | Be respectful of others | -1 |
| | No play fighting | -1 |
| | Multiple people sleepovers are only allowed on special occasions | 0 |
| | Must get a bowl for snacks | -1 |
| | No food allowed outside of kitchen w/o specific permission | -1 |
| | After school plans must be set the night before | 0 |
| | Repeated requests w/o new information | -1 |
| | | |
| Champ | Ready in kitchen by 7am | No electronics am + -1 |
| Champ | Meds & breakfast by 7:15am | -1 |
| Champ | Ready by door by 7:20am | -1 |
| Champ | Ready by door by 7:30am | -2 |
| | | |
| Clara | Out of bed and getting ready by 7 | No electronics am + -1 |
| Clara | Ready by door by 7:20am | -2 |
| Clara | Ready by door by 7:30am | -2 |
| | | |
| SPENDING | Summer learn/homework must be done | Required |
| SPENDING | Chores must be done | Required |
| | | |
| GROUNDED | Only educational apps | Restriction |
| GROUNDED | No leaving the property | Restriction |
| GROUNDED | No friends over | Restriction |
| GROUNDED | No TV | Restriction |
| | | |
| BP SCALE | 5 Daily BP: Prize basket + treat | Reward |
| BP SCALE | 4 Daily BP: No prize basket | Consequence |
| BP SCALE | 3 Daily BP: No treat | Consequence |
| BP SCALE | 2 Daily BP: 1 hr grounded | Consequence |
| BP SCALE | 1 Daily BP: 4 hrs grounded | Consequence |
| BP SCALE | 0 Daily BP: 24 hrs grounded | Consequence |

### Column Descriptions:

#### Kid Column:
- **Leave blank** for general house rules (apply to everyone)
- **Kid's name** (Clara, Champ, etc.) for kid-specific rules
- **SPENDING** for rules about spending Prize Coins
- **GROUNDED** for what being "grounded" means
- **BP SCALE** for the Daily BP consequence scale

#### Rule Column:
- The rule text or requirement
- For BP SCALE, include the BP level in the rule (e.g., "5 Daily BP: Prize basket + treat")

#### Consequence Column:
- Point deduction (e.g., -1, -2, -3) for rule violations
- Other consequence text (e.g., "No electronics am + -1")
- "Required" for spending requirements
- "Restriction" for grounding conditions
- "Reward" or "Consequence" for BP scale entries

### How It Works:

The dashboard automatically groups and displays rules by type:

1. **General Rules**: Rules where Kid column is blank
2. **Kid-Specific Rules**: Grouped by kid name (Clara, Champ, etc.)
3. **Before Spending Prize Coins**: Rules where Kid = "SPENDING"
4. **What "Grounded" Means**: Rules where Kid = "GROUNDED"
5. **Daily BP Consequences**: Scale where Kid = "BP SCALE"

---

## Apps Script Update

The Apps Script code has already been updated in your repository!

### Deploy the Updated Script

1. Open your Google Sheet
2. Go to **Extensions** > **Apps Script**
3. **Replace all code** with the contents of `apps-script.js` from your repository
4. Click **Save** (💾)
5. Click **Deploy** > **Manage deployments**
6. Click the pencil icon (✏️) next to your active deployment
7. Change **Version** to "New version"
8. Click **Deploy**

---

## Dashboard Integration

The dashboard already includes:
- ✅ 📋 button in the header to view rules
- ✅ Modal popup that displays rules in organized sections
- ✅ Color-coded sections (general, kid-specific, spending, grounding, BP scale)
- ✅ Automatic grouping by rule type

---

## Benefits

✅ **Simple structure** - Just 3 columns, easy to maintain
✅ **Flexible** - Supports general, kid-specific, and special rule types
✅ **Centralized** - All family rules in one place
✅ **Transparent** - Kids know what to expect
✅ **Easy to update** - Edit rules directly in Google Sheets
✅ **Always accessible** - View rules anytime from dashboard

---

## Troubleshooting

**Dashboard shows "No house rules configured":**
- Make sure the sheet is named exactly **"House Rules"** (case-sensitive)
- Verify Row 1 has headers: Kid | Rule | Consequence
- Make sure you have at least one rule (row 2+)
- Check that your Apps Script is updated and deployed

**Rules not displaying correctly:**
1. Check the Apps Script execution log for errors
2. Verify column structure matches: Kid | Rule | Consequence
3. Make sure special keywords are spelled correctly (SPENDING, GROUNDED, BP SCALE)

**How to test:**
1. Open Apps Script editor
2. Select the `getHouseRules` function from dropdown
3. Click **Run** (▶️)
4. Check the execution log to see if it's reading correctly
