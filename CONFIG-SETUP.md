# Configuration Setup Guide

Your dashboard configuration is stored securely in a Google Sheets tab called **"Config"**. This keeps your sensitive data (PIN, kids' names, location) private while allowing you to host the dashboard publicly on GitHub Pages.

## Setup Instructions

### 1. Create the Config Sheet

In your Google Sheet, create a new tab called **"Config"** (case-sensitive).

### 2. Set Up the Configuration Table

In the Config sheet, create a two-column table with headers:
- **Column A**: Key
- **Column B**: Value

### 3. Add Your Configuration

Copy and paste this structure into your Config sheet:

| Key | Value |
|-----|-------|
| **Key** | **Value** |
| kid1 | {"name":"Clara","id":"clara","defaultDailyBP":5,"defaultTotalBP":0,"defaultPrizeCoins":0} |
| kid2 | {"name":"Champ","id":"champ","defaultDailyBP":5,"defaultTotalBP":0,"defaultPrizeCoins":0} |
| pin | 1220 |
| requirePinForEdits | true |
| conversionRate | {"bp":50,"pc":100} |
| weather | {"latitude":42.87035582295225,"longitude":-85.61757137488162,"timezone":"America/New_York"} |
| calendar | {"enabled":true,"daysAhead":7} |
| chores | {"individual":{"clara":[{"id":"bed","name":"Make Bed","bp":1}],"champ":[{"id":"bed","name":"Make Bed","bp":1}]},"shared":[{"id":"dishes","name":"Help with Dishes","bp":1}]} |
| rewards | [{"id":"candy","name":"Candy Bar","cost":50,"icon":"🍫"},{"id":"toy","name":"Small Toy","cost":200,"icon":"🧸"}] |

### 4. Customize Your Values

**Kids Configuration:**
- Edit the `kid1` and `kid2` rows with your kids' names
- Add more kids by adding rows: `kid3`, `kid4`, etc.
- Make sure each kid has: `name`, `id` (lowercase), `defaultDailyBP`, `defaultTotalBP`, `defaultPrizeCoins`

**PIN:**
- Change the `pin` value to your desired 4-digit PIN

**Weather:**
- Get your coordinates from Google Maps (right-click → copy coordinates)
- Update `latitude` and `longitude` in the weather row
- Set your IANA timezone (e.g., `America/New_York`, `America/Los_Angeles`, `America/Chicago`)

**Calendar:**
- Set `enabled` to `true` or `false`
- Set `daysAhead` to how many days of events to show (1-30)

**Chores:**
- Configure both individual chores (assigned to specific kids) and shared chores (any kid can do)
- Each chore has: `id` (unique identifier), `name` (display name), `bp` (behavior points awarded when approved)
- Individual chores are organized by kid ID: `"individual":{"clara":[...], "champ":[...]}`
- Shared chores are in a single array: `"shared":[...]`
- Kids mark chores complete, parents approve to award points

**Rewards:**
- Create a prize store where kids can spend Prize Coins
- Each reward has: `id` (unique), `name`, `cost` (Prize Coins), `icon` (emoji)
- Kids can purchase rewards when they have enough Prize Coins
- Example: `{"id":"movie","name":"Movie Night","cost":150,"icon":"🎬"}`

### 5. Example Configuration

Here's what your Config sheet should look like:

```
Row 1:  Key                  Value
Row 2:  kid1                 {"name":"Alice","id":"alice","defaultDailyBP":5,"defaultTotalBP":0,"defaultPrizeCoins":0}
Row 3:  kid2                 {"name":"Bob","id":"bob","defaultDailyBP":5,"defaultTotalBP":0,"defaultPrizeCoins":0}
Row 4:  kid3                 {"name":"Charlie","id":"charlie","defaultDailyBP":5,"defaultTotalBP":0,"defaultPrizeCoins":0}
Row 5:  pin                  4567
Row 6:  requirePinForEdits   true
Row 7:  conversionRate       {"bp":50,"pc":100}
Row 8:  weather              {"latitude":40.7128,"longitude":-74.0060,"timezone":"America/New_York"}
Row 9:  calendar             {"enabled":true,"daysAhead":7}
Row 10: chores               {"individual":{"alice":[{"id":"bed","name":"Make Bed","bp":1},{"id":"homework","name":"Homework","bp":2}],"bob":[{"id":"bed","name":"Make Bed","bp":1},{"id":"toys","name":"Clean Room","bp":2}]},"shared":[{"id":"dishes","name":"Help with Dishes","bp":1},{"id":"trash","name":"Take Out Trash","bp":2}]}
Row 11: rewards              [{"id":"candy","name":"Candy Bar","cost":50,"icon":"🍫"},{"id":"ice-cream","name":"Ice Cream","cost":75,"icon":"🍦"},{"id":"toy","name":"Small Toy","cost":200,"icon":"🧸"},{"id":"movie","name":"Movie Night","cost":150,"icon":"🎬"}]
```

## Benefits of This Approach

✅ **Private**: Your config never goes to GitHub
✅ **Easy to Edit**: Change settings right in Google Sheets
✅ **Secure**: Only you have access to your Google Sheet
✅ **Shareable**: Your GitHub repo can be public without exposing personal data

## Troubleshooting

**Dashboard shows "Failed to load configuration":**
- Make sure the sheet is named exactly **"Config"** (case-sensitive)
- Verify your Apps Script is deployed and the URL is correct in the HTML
- Check that Row 1 has headers: "Key" and "Value"
- Make sure all JSON values are properly formatted (no trailing commas, proper quotes)

**How to test your config:**
1. Open Apps Script editor
2. Run the `getConfig` function
3. Check the log output to see if it's reading correctly
