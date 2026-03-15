# Chores and Rewards Setup Guide

Your chores and rewards configuration is now stored in separate Google Sheets tabs for easier editing.

## Chores Sheet Setup

### 1. Create the Chores Sheet

In your Google Sheet, create a new tab called **"Chores"** (case-sensitive).

### 2. Set Up the Chores Table

In the Chores sheet, create a table with these headers in Row 1:

| Kid | Chore ID | Chore Name | BP | Type |
|-----|----------|------------|-----|------|

### 3. Add Your Chores

There are two types of chores:
- **Individual**: Assigned to a specific kid
- **Shared**: Any kid can complete

#### Example Chores Configuration:

| Kid | Chore ID | Chore Name | BP | Type |
|-----|----------|------------|-----|------|
| Clara | bed | Make Bed | 1 | individual |
| Clara | homework | Do Homework | 2 | individual |
| Clara | room | Clean Room | 2 | individual |
| Champ | bed | Make Bed | 1 | individual |
| Champ | toys | Put Away Toys | 1 | individual |
| Champ | room | Clean Room | 2 | individual |
|  | dishes | Help with Dishes | 1 | shared |
|  | trash | Take Out Trash | 2 | shared |
|  | pets | Feed Pets | 1 | shared |

### Column Descriptions:

- **Kid**: The kid's name (for individual chores). Leave blank for shared chores.
- **Chore ID**: A unique identifier (lowercase, no spaces). Examples: `bed`, `homework`, `dishes`
- **Chore Name**: The display name shown in the dashboard
- **BP**: Behavior Points awarded when the chore is approved by a parent
- **Type**: Either `individual` (assigned to specific kid) or `shared` (any kid can do)

### How Chores Work:

1. **Kid marks chore complete** - Chore shows as "pending" (⏳)
2. **Parent approves** - Kid earns BP, chore marked "approved" (✅)
3. **Parent rejects** - Chore goes back to incomplete (⬜)
4. **Daily reset** - Use "Reset All Chores" button to clear all chores at end of day

---

## Rewards Sheet Setup

### 1. Create the Rewards Sheet

In your Google Sheet, create a new tab called **"Rewards"** (case-sensitive).

### 2. Set Up the Rewards Table

In the Rewards sheet, create a table with these headers in Row 1:

| ID | Name | Cost | Icon | Text Fallback |
|----|------|------|------|---------------|

### 3. Add Your Rewards

#### Example Rewards Configuration:

| ID | Name | Cost | Icon | Text Fallback |
|----|------|------|------|---------------|
| candy | Candy Bar | 50 | 🍫 | CANDY |
| ice-cream | Ice Cream | 75 | 🍦 | ICE CREAM |
| toy | Small Toy | 200 | 🧸 | TOY |
| movie | Movie Night | 150 | 🎬 | MOVIE |
| game | 30 Min Screen Time | 100 | 🎮 | GAME |
| dessert | Extra Dessert | 50 | 🍰 | DESSERT |
| stay-up | Stay Up Late | 200 | 🌙 | STAY UP |
| prize | Mystery Prize Box | 250 | 🎁 | PRIZE |

### Column Descriptions:

- **ID**: Unique identifier (lowercase, no spaces). Examples: `candy`, `ice-cream`, `toy`
- **Name**: The display name shown in the dashboard
- **Cost**: Prize Coins required to purchase
- **Icon**: Emoji icon (used if Pi supports emojis)
- **Text Fallback**: Text shown if emojis aren't supported (UPPERCASE recommended)

### How Rewards Work:

1. **Kid clicks Purchase** on a reward
2. **Kid selector appears** - Shows all kids and their current Prize Coins
3. **Kid selects themselves** - Can only purchase if they have enough PC
4. **Purchase confirmed** - Prize Coins deducted, transaction logged to Points Log sheet

### Emoji Support:

The dashboard automatically detects if your Raspberry Pi supports emoji rendering:
- **Emoji supported**: Shows the Icon emoji (🍫, 🍦, etc.)
- **Emoji not supported**: Shows the Text Fallback (CANDY, ICE CREAM, etc.)

---

## Points Log Behavior

### How Logging Works:

- **Behavior point adjustments** (daily +/-): Updates or creates today's entry
- **End of day**: Updates or creates today's entry
- **Cash in**: Updates or creates today's entry
- **Chore approved**: **Always creates a NEW entry** in the log
- **Reward purchased**: **Always creates a NEW entry** in the log

This means you'll see a detailed history of all chore completions and reward purchases throughout each day!

### Points Log Structure:

| Date | Kid | Daily BP | Total BP | Prize Coins | Type | Note |
|------|-----|----------|----------|-------------|------|------|
| 3/14/2026 | Clara | 5 | 0 | 0 | daily-adjust | earned daily BP via dashboard |
| 3/14/2026 | Clara | 6 | 0 | 0 | chore-approved | Completed chore: Make Bed (+1 BP) |
| 3/14/2026 | Clara | 8 | 0 | 0 | chore-approved | Completed chore: Do Homework (+2 BP) |
| 3/14/2026 | Clara | 8 | 8 | 0 | end-of-day | Added 8 daily BP to total, reset daily to 5 |
| 3/14/2026 | Clara | 5 | 8 | 0 | reward-purchase | Purchased: Candy Bar 🍫 (-50 PC) |

---

## Troubleshooting

**Dashboard shows "No chores configured":**
- Make sure the sheet is named exactly **"Chores"** (case-sensitive)
- Verify Row 1 has headers: Kid, Chore ID, Chore Name, BP, Type
- Make sure your Apps Script is deployed and updated

**Dashboard shows "No rewards configured":**
- Make sure the sheet is named exactly **"Rewards"** (case-sensitive)
- Verify Row 1 has headers: ID, Name, Cost, Icon, Text Fallback
- Make sure your Apps Script is deployed and updated

**Chores or rewards not appearing:**
1. Open Apps Script editor
2. Run the `getChores` or `getRewards` function
3. Check the log output to see if data is being read correctly
4. Make sure there are no empty rows in the middle of your data

**Icons showing as boxes or question marks:**
- This is normal! The dashboard detects emoji support and shows text fallbacks automatically
- The Text Fallback column is used when emojis aren't rendered

---

## Benefits of This Approach

✅ **Easy to Edit**: Update chores and rewards right in Google Sheets
✅ **No Code Changes**: No need to edit HTML or JavaScript files
✅ **Separate Log Entries**: Chores and rewards create individual log entries for detailed tracking
✅ **Automatic Fallbacks**: Text fallbacks for systems that don't support emojis
✅ **Mouse-Accessible**: Kids can purchase rewards without a keyboard

---

## Example Google Sheets Structure

Your Google Sheet should now have these tabs:
1. **Points Log** - Transaction history
2. **Config** - Dashboard configuration (PIN, kids, settings)
3. **Chores** - Chores configuration (NEW!)
4. **Rewards** - Rewards configuration (NEW!)

All four tabs work together to power your Family Dashboard!
