# Family Dashboard — Setup Guide

---

## 1. Create Your Google Sheet

1. Go to [Google Sheets](https://sheets.google.com) and create a new blank spreadsheet
2. Name it **"Family Dashboard Data"**
3. Create the following tabs (exact names, case-sensitive):

| Tab Name | Purpose |
|---|---|
| **Points Log** | Transaction history |
| **Config** | Kids, PIN, settings |
| **Chores** | Chore definitions |
| **Activities** | Activity definitions |
| **Rewards** | Prize store items |
| **House Rules** | Family rules popup |
| **Daily Status** | Cross-device chore/activity sync (auto-created) |

---

## 2. Points Log Tab

Rename "Sheet1" to **Points Log** and add headers in Row 1:

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| Date | Kid | Daily BP | Total BP | Prize Coins | Type | Note |

---

## 3. Config Tab

Create a **Config** tab with two columns: **Key** (A) and **Value** (B), with headers in Row 1.

| Key | Value |
|---|---|
| kid1 | `{"name":"Clara","id":"clara","defaultDailyBP":5,"defaultTotalBP":0,"defaultPrizeCoins":0,"pin":"1111"}` |
| kid2 | `{"name":"Champ","id":"champ","defaultDailyBP":5,"defaultTotalBP":0,"defaultPrizeCoins":0,"pin":"2222"}` |
| pin | `1220` |
| requirePinForEdits | `true` |
| conversionRate | `{"bp":50,"pc":100}` |
| colorScheme | `pink` |
| weather | `{"latitude":42.87,"longitude":-85.62,"timezone":"America/New_York"}` |
| calendar | `{"enabled":true,"daysAhead":7}` |

**Kids:** Add `kid3`, `kid4`, etc. for more kids. Each kid's `id` must be lowercase with no spaces. The optional `"pin"` field enables kids to do self-service cash-ins and reward purchases.

**Parent PIN:** Used to approve/reject chores, adjust daily BP, and run end of day.

**conversionRate:** `{"bp":50,"pc":100}` means 50 BP converts to 100 Prize Coins.

**colorScheme:** Choose from `purple`, `pink`, `blue`, `green`, `teal`, or `orange`.

**weather:** Get coordinates from Google Maps (right-click → copy coordinates). Use a valid [IANA timezone](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones).

---

## 4. Chores Tab

Create a **Chores** tab with headers in Row 1:

| Kid | Chore ID | Chore Name | BP | Multiplier |
|---|---|---|---|---|
| Clara | bed | Make Bed | 1 | 1 |
| Clara | homework | Do Homework | 2 | 1 |
| Champ | bed | Make Bed | 1 | 1 |
| Champ | toys | Put Away Toys | 1 | 2 |
| *(blank)* | dishes | Help with Dishes | 1 | 1 |
| *(blank)* | trash | Take Out Trash | 2 | 1 |

- **Kid**: Kid's name for individual chores. Leave blank for shared chores (any kid can complete).
- **Chore ID**: Unique identifier, lowercase, no spaces (e.g., `bed`, `dishes`).
- **BP**: Base Behavior Points awarded on approval.
- **Multiplier**: Multiplies BP earned. `1` = normal, `2` or `3` = extra credit. Set to `0` to hide a chore without deleting it. When a parent approves a chore, the multiplier is automatically set to `0` to remove it from the list.

---

## 5. Activities Tab

Create an **Activities** tab with the same structure as Chores:

| Kid | Activity ID | Activity Name | BP | Multiplier |
|---|---|---|---|---|
| Clara | reading | Reading 20 min | 2 | 1 |
| Clara | exercise | Exercise | 3 | 1 |
| Champ | reading | Reading 20 min | 1 | 1 |
| *(blank)* | practice | Practice Instrument | 2 | 1 |

Activities are optional positive behaviors (not required like chores). Each activity can be completed once per day per kid. Multiple kids can complete the same shared activity — each is tracked and approved independently.

---

## 6. Rewards Tab

Create a **Rewards** tab with headers in Row 1:

| ID | Name | Cost | Icon | Text Fallback |
|---|---|---|---|---|
| candy | Candy Bar | 50 | 🍫 | CANDY |
| ice-cream | Ice Cream | 75 | 🍦 | ICE CREAM |
| movie | Movie Night | 150 | 🎬 | MOVIE |
| toy | Small Toy | 200 | 🧸 | TOY |
| stay-up | Stay Up Late | 200 | 🌙 | STAY UP |

- **Cost**: Prize Coins required to purchase.
- **Icon**: Emoji displayed in the reward card.
- **Text Fallback**: Shown if emojis aren't supported by the display device.

---

## 7. House Rules Tab

Create a **House Rules** tab with headers in Row 1:

| Kid | Rule | Consequence | Type |
|---|---|---|---|
| *(blank)* | No running in the house | -1 | bad |
| *(blank)* | Be respectful of others | -1 | bad |
| Champ | Ready in kitchen by 7am | No electronics am + -1 | warning |
| Clara | Out of bed and getting ready by 7 | No electronics am + -1 | warning |
| SPENDING | Chores must be done | Required | info |
| SPENDING | Summer learn/homework must be done | Required | info |
| GROUNDED | Only educational apps | Restriction | bad |
| GROUNDED | No leaving the property | Restriction | bad |
| BP SCALE | 5 Daily BP | Prize basket + treat | good |
| BP SCALE | 4 Daily BP | No prize basket | warning |
| BP SCALE | 3 Daily BP | No treat | warning |
| BP SCALE | 2 Daily BP | 1 hr grounded | bad |
| BP SCALE | 1 Daily BP | 4 hrs grounded | bad |
| BP SCALE | 0 Daily BP | 24 hrs grounded | bad |

**Kid column values:**
- Blank → General house rules
- Kid's name → Kid-specific rules (grouped by name)
- `SPENDING` → Requirements before spending Prize Coins
- `GROUNDED` → What being grounded means
- `BP SCALE` → Daily BP consequence scale

**Type column values (controls color coding):**
- `good` → Green
- `warning` → Yellow
- `bad` → Red
- `info` → Blue
- Blank → Default section style

---

## 8. Install Apps Script

1. In your Google Sheet, go to **Extensions > Apps Script**
2. Delete any existing code
3. Copy the entire contents of `apps-script.js` from this repo
4. Paste it in and click **Save** (Ctrl+S)
5. Name the project: **"Family Dashboard API"**

### Test before deploying

1. In the Apps Script editor, select **`testAPI`** from the function dropdown
2. Click **Run** — you'll be prompted to authorize on first run
3. Click "Review permissions" → choose your account → "Advanced" → "Go to ... (unsafe)" → "Allow"
4. Check the execution log for success messages

### Deploy as Web App

1. Click **Deploy** → **New deployment**
2. Click the gear icon ⚙️ → **Web app**
3. Set:
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click **Deploy**
5. **Copy the Web app URL** — you'll need it in the next step

### Add the URL to your config.js

Open `js/config.js` and set `SHEETS_API_URL`:

```javascript
export const SHEETS_API_URL = 'https://script.google.com/macros/s/YOUR_ID_HERE/exec';
```

---

## 9. Time-Based Triggers (Automation)

Set up two triggers so points roll over automatically even when the dashboard isn't open.

1. In Apps Script, click the **clock icon** (Triggers) on the left sidebar
2. Click **+ Add Trigger** and create:

**End of Day (midnight):**
- Function: `endOfDayAll`
- Event source: Time-driven
- Type: Day timer
- Time: Midnight to 1am

**Auto-save (9pm):**
- Function: `autoSaveAllPoints`
- Event source: Time-driven
- Type: Day timer
- Time: 8pm to 9pm

Both triggers work in addition to the dashboard's built-in midnight and 9pm checks — they're a server-side backup that runs even when no browser is open.

---

## 10. Re-deploying After Changes

Any time you update `apps-script.js`:

1. In Apps Script editor, paste the new code and save
2. Click **Deploy** → **Manage deployments**
3. Click the pencil icon ✏️ on your active deployment
4. Set **Version** to "New version"
5. Click **Deploy**

---

## Troubleshooting

| Problem | Solution |
|---|---|
| "Failed to load configuration" | Sheet named exactly **Config**? Row 1 headers: Key, Value? |
| "No chores configured" | Sheet named **Chores**? Multiplier > 0 on all rows? |
| "No activities configured" | Sheet named **Activities**? Multiplier > 0 on all rows? |
| "No house rules configured" | Sheet named **House Rules**? At least one data row? |
| Points not syncing | Check browser console (F12) for errors. Verify Web App URL in config.js. |
| Script not authorized | Re-run `testAPI` and go through the authorization flow again |
| Triggers not running | Check Apps Script → Executions (📜 icon) for error history |
| Wrong end-of-day time | Verify `timezone` in the `weather` config row is a valid IANA timezone |

### Testing individual functions

Open Apps Script editor, select the function from the dropdown, and click Run:

- `testAPI` — basic connectivity
- `testEndOfDayAll` — end-of-day logic
- `testAutoSaveAllPoints` — 9pm save
- `getConfig` — verify config is loading
- `getChores` / `getActivities` / `getRewards` — verify sheet data
- `getHouseRules` — verify house rules
