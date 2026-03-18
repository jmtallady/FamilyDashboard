# Family Dashboard 🏠

A family behavior points tracking system with Google Sheets integration. Tracks daily behavior points, chores, activities, and rewards for multiple kids on any device.

**Live:** [jmtallady.github.io/FamilyDashboard](https://jmtallady.github.io/FamilyDashboard/)

---

## Features

| Feature | Description |
|---|---|
| 📊 Points Tracking | Daily BP, Total BP (bank), and Prize Coins per kid |
| 📋 Chores & Activities | Kids mark complete, parents approve to award points |
| 🎁 Rewards | Prize store where kids spend Prize Coins |
| ☁️ Cross-device Sync | Google Sheets keeps all devices in sync |
| 🔒 PIN Protection | Parent PIN for edits; optional kid PINs for self-service |
| 📅 Calendar | 7-day view with weather and US holidays |
| 📋 House Rules | Configurable rules popup with color-coded BP scale |
| 🌙 Dark Mode | Full dark mode support with 6 color themes |
| 📱 Mobile Friendly | Responsive layout that works on phone, tablet, or desktop |
| 💾 Offline Mode | Falls back to localStorage if Sheets is unavailable |

---

## How It Works

### Points System

- **Daily BP** — Each kid starts at 5 per day. Parents adjust +/- for behavior. Resets at midnight.
- **Total BP (Bank)** — Chores and activities award BP directly to the bank. Daily BP is added to the bank at end of day.
- **Prize Coins (PC)** — Converted from Total BP (e.g. 50 BP → 100 PC). Spent on rewards.

### Chores & Activities

1. Kid marks complete → shows as pending (⏳)
2. Parent approves → BP awarded to bank (✅) / rejects → resets to incomplete
3. Multiple kids can complete the same activity independently
4. Approved chores are automatically removed from the list (multiplier set to 0)

### Daily Automation

- **9pm** — Auto-save snapshot of all points to Google Sheets
- **Midnight** — Daily BP moves to Total BP, Daily BP resets to 5

---

## File Structure

```
FamilyDashboard/
├── index.html          # Main HTML — layout and modals
├── styles.css          # All styling, themes, dark mode, responsive
├── apps-script.js      # Google Apps Script — copy to your Google Sheet
├── js/
│   ├── app.js          # Initialization, wires everything together
│   ├── api.js          # All Google Sheets API calls
│   ├── config.js       # Config fetching and caching
│   ├── state.js        # Centralized state management
│   ├── points.js       # BP, PC, cash-in, end of day
│   ├── chores.js       # Chore completion and approval
│   ├── activities.js   # Activity completion and approval
│   ├── rewards.js      # Reward purchases
│   ├── calendar.js     # 7-day calendar with weather
│   ├── house-rules.js  # House rules modal
│   ├── recent-activity.js # Activity feed from Points Log
│   ├── auth.js         # PIN modal and lock/unlock
│   ├── ui.js           # Kid cards, date/time
│   ├── theme.js        # Color schemes and dark mode
│   ├── weather.js      # Open-Meteo weather API
│   └── automation.js   # Midnight and 9pm auto triggers
├── README.md           # This file
└── SETUP.md            # Full setup instructions
```

---

## Tech Stack

- **Frontend** — Vanilla HTML, CSS, ES6 modules (no framework)
- **Storage** — localStorage + Google Sheets
- **Backend** — Google Apps Script (serverless, free)
- **Hosting** — GitHub Pages
- **Weather** — Open-Meteo API (free, no key required)
