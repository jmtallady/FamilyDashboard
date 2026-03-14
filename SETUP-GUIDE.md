# Family Dashboard - Google Sheets Setup Guide

## Step 1: Create New Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new blank spreadsheet
3. Name it: **"Family Dashboard Data"**

## Step 2: Set Up the "Points Log" Sheet

1. Rename "Sheet1" to **"Points Log"**
2. In Row 1, create these headers:
   - **A1**: Date
   - **B1**: Kid
   - **C1**: Points
   - **D1**: Note

3. **(Optional)** Add some starting data for testing:
   - **A2**: 3/14/2026, **B2**: Clara, **C2**: 5
   - **A3**: 3/14/2026, **B3**: Champ, **C3**: 5

Your sheet should look like this:
```
| Date       | Kid   | Points | Note |
|------------|-------|--------|------|
| 3/14/2026  | Clara | 5      |      |
| 3/14/2026  | Champ | 5      |      |
```

## Step 3: Install Apps Script

1. In your Google Sheet, go to: **Extensions > Apps Script**
2. Delete any existing code in the editor
3. Open the file `apps-script.js` from your project folder
4. Copy ALL the code
5. Paste it into the Apps Script editor
6. Click **Save** (💾 icon or Ctrl+S)
7. Name the project: **"Family Dashboard API"**

## Step 4: Test the Script (Optional but Recommended)

1. In the Apps Script editor, select the function **`testAPI`** from the dropdown
2. Click **Run** (▶️ icon)
3. First time: You'll need to authorize the script
   - Click "Review permissions"
   - Choose your Google account
   - Click "Advanced" → "Go to Family Dashboard API (unsafe)"
   - Click "Allow"
4. Check the "Execution log" at the bottom - you should see test results
5. Go back to your sheet - you should see a new test entry added!

## Step 5: Deploy as Web App

1. In Apps Script editor, click **Deploy** → **New deployment**
2. Click the gear icon ⚙️ next to "Select type"
3. Choose **Web app**
4. Configure settings:
   - **Description**: "Family Dashboard API"
   - **Execute as**: **Me** (your email)
   - **Who has access**: **Anyone**
5. Click **Deploy**
6. **IMPORTANT**: Copy the **Web app URL** (looks like: `https://script.google.com/macros/s/ABC123.../exec`)
7. Click **Done**

## Step 6: Update Your Dashboard HTML

1. Open `family-dashboard.html`
2. Find the `CONFIG` section (around line 320)
3. Add this line after `requirePinForEdits: true`:
   ```javascript
   sheetsApiUrl: 'YOUR_WEB_APP_URL_HERE'
   ```
4. Replace `YOUR_WEB_APP_URL_HERE` with the URL you copied in Step 5

Example:
```javascript
const CONFIG = {
    kid1: {
        name: 'Clara',
        id: 'clara',
        defaultPoints: 5
    },
    kid2: {
        name: 'Champ',
        id: 'champ',
        defaultPoints: 5
    },
    pin: '1220',
    requirePinForEdits: true,
    sheetsApiUrl: 'https://script.google.com/macros/s/ABC123.../exec'
};
```

## Step 7: Test the Integration

1. Open your dashboard in a browser
2. You should see the current points loaded from the sheet!
3. Unlock with PIN and change points
4. Check your Google Sheet - new entries should appear!

## Troubleshooting

**Problem**: "Sheet not found" error
- **Solution**: Make sure your sheet is named exactly "Points Log" (case-sensitive!)

**Problem**: "Script not authorized" error
- **Solution**: Go back to Step 4 and authorize the script

**Problem**: Points not updating
- **Solution**: Check the browser console (F12) for errors. Make sure your Web App URL is correct.

**Problem**: Need to update the script
- **Solution**: Make changes in Apps Script, then go to **Deploy** → **Manage deployments** → Click ✏️ Edit → **Version**: New version → **Deploy**

## Next Steps

Once everything is working:
- ✅ You can delete the localStorage entries and rely fully on Google Sheets
- ✅ Access your dashboard from any device
- ✅ Never lose track of points again!
- ✅ View full history in the Points Log sheet

## Future Enhancements (Phase 3+)

- Add "Chores" sheet and display on dashboard
- Pull calendar events from Google Calendar
- Add rewards tracking
- Make it configurable for other families
