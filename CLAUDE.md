# Family Dashboard — Claude Code Context

## Project Overview
A family chore/activity tracking dashboard displayed on a shared screen (TV/tablet). Kids earn Behavior Points (BP) for completing chores and activities; parents approve completions. Points accumulate toward rewards they can spend.

## Tech Stack
- **Frontend**: Vanilla JS (ES6 modules), HTML, CSS — no framework
- **Backend**: Google Apps Script web app (REST API over `doGet`/`doPost`)
- **Storage**: Google Sheets (source of truth) + localStorage (fast local cache)
- **Cross-device sync**: Append-only "Daily Status" sheet; fetched on load and every 2 min

## Git Workflow Rules
1. **Always pull latest from `main` before starting any work**
2. **Always create a branch — no exceptions. Main is protected.**
   ```bash
   git pull origin main
   git checkout -b descriptive-branch-name
   ```

## File Structure
```
FamilyDashboard/
├── index.html              # Shell — layout, modals, script imports
├── styles.css              # All styles (theme vars, dark mode, responsive)
├── apps-script.js          # Google Apps Script code (deploy as Web App)
├── js/
│   ├── app.js              # Entry point — init, global wiring, intervals
│   ├── config.js           # SHEETS_API_URL, fetchConfig()
│   ├── state.js            # Module-level shared state (chores, activities, etc.)
│   ├── api.js              # All fetch calls to Google Apps Script
│   ├── chores.js           # Chore render, complete, approve, reject
│   ├── activities.js       # Activity render, complete, approve, reject
│   ├── rewards.js          # Reward purchase flow
│   ├── points.js           # BP math, end-of-day, cash-in
│   ├── house-rules.js      # House rules modal, TYPE_STYLES map
│   ├── calendar.js         # Calendar widget + US holidays
│   ├── weather.js          # Weather widget
│   ├── theme.js            # Dark mode + color scheme switching
│   ├── auth.js             # PIN modal
│   ├── ui.js               # Kid card generation, datetime
│   ├── recent-activity.js  # Recent activity feed
│   └── automation.js       # Midnight + 9pm auto-save triggers
└── SETUP.md               # Full setup guide
```

## Google Sheets Structure
| Sheet | Columns |
|-------|---------|
| Config | Key \| Value |
| Points Log | Date \| Kid \| Daily BP \| Total BP \| Prize Coins \| Type \| Note |
| Chores | Kid \| Chore ID \| Chore Name \| BP \| Multiplier |
| Activities | Kid \| Activity ID \| Activity Name \| BP \| Multiplier \| Max Per Week |
| Rewards | ID \| Name \| Cost \| Icon \| Text Fallback |
| House Rules | Kid \| Rule \| Consequence \| Type |
| Daily Status | Date \| Type \| KidId \| ItemId \| Status |
| Recent Activity | Timestamp \| Type \| Kid Name \| Item Name \| Icon |

## Key Patterns
- **Status keys**: `chore-{kidId}-{choreId}-{today}` and `activity-{kidId}-{activityId}-{today}` in localStorage
- **Weekly count keys**: `activity-week-{kidId}-{activityId}-{weekStart}` in localStorage
- **Fire-and-forget Sheets writes**: use `mode: 'no-cors'` POST — no response body readable
- **Global onclick handlers**: functions must be on `window.*` (see bottom of app.js)
- **Type styles in house rules**: `good` / `warning` / `bad` / `info` mapped in `TYPE_STYLES` (house-rules.js)
- **Chore removal after approval**: set multiplier to 0 in Sheets → re-fetch chores list

## Apps Script Deployment
After any change to `apps-script.js`:
1. Open the Google Sheet → Extensions → Apps Script
2. Replace all code with the updated `apps-script.js` content
3. Deploy → **New deployment** (not "Manage deployments" / edit existing)
4. Copy the new Web App URL and update `sheetsApiUrl` in the Config sheet if it changed

## Color Themes
Defined in `styles.css` as CSS custom properties on `body` (e.g., `body.theme-pink`):
- `--primary-start`, `--primary-end` — gradient endpoints
- `--primary-color` — main accent
- `--primary-dark` — darker variant
- `--accent-color` — secondary accent

Dark mode accent colors use `var(--primary-color)` so themes apply in dark mode too.
