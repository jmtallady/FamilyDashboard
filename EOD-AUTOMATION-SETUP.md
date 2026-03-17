# End of Day Automation Setup Guide

This guide shows you how to set up automatic end-of-day processing that runs even when the dashboard isn't open.

## What Gets Automated

### 1. **9pm Auto-Save**
- Saves current state of all kids' points to Google Sheets
- Acts as a backup/snapshot before the day ends
- Runs automatically at 9:00 PM Eastern Time

### 2. **Midnight End of Day**
- Moves all Daily BP to Total BP (the bank) for each kid
- Resets Daily BP to default (5)
- Logs everything to Points Log
- Runs automatically at midnight Eastern Time

## Benefits

✅ **Reliable**: Runs server-side, doesn't require browser to be open
✅ **Automatic**: No manual intervention needed
✅ **Consistent**: Happens every day at the same time
✅ **Logged**: All transactions recorded in Points Log

---

## Setup Instructions

### Step 1: Update Your Apps Script

The new functions `endOfDayAll()` and `autoSaveAllPoints()` are already in your `apps-script.js` file. You just need to copy them to Google Apps Script:

1. Open your Google Sheet
2. Go to **Extensions** > **Apps Script**
3. Replace the entire code with the contents of `apps-script.js`
4. Click **Save** (💾)

### Step 2: Test the Functions

Before setting up automatic triggers, test that the functions work:

1. In the Apps Script editor, select **testEndOfDayAll** from the function dropdown (top toolbar)
2. Click **Run** (▶️)
3. Check the **Execution log** at the bottom - you should see success messages
4. Check your **Points Log** sheet - you should see new entries with type `end-of-day-auto`

Then test the 9pm save:

1. Select **testAutoSaveAllPoints** from the function dropdown
2. Click **Run** (▶️)
3. Check the execution log and Points Log for entries with type `auto-save-9pm`

### Step 3: Set Up Time-Based Triggers

#### Create the Midnight Trigger (End of Day)

1. In Apps Script editor, click the **clock icon** (⏰) on the left sidebar (Triggers)
2. Click **+ Add Trigger** (bottom right)
3. Configure:
   - **Choose which function to run**: `endOfDayAll`
   - **Choose which deployment should run**: `Head`
   - **Select event source**: `Time-driven`
   - **Select type of time based trigger**: `Day timer`
   - **Select time of day**: `Midnight to 1am`
4. Click **Save**
5. If prompted, authorize the script to run

#### Create the 9pm Trigger (Auto-Save)

1. Click **+ Add Trigger** again
2. Configure:
   - **Choose which function to run**: `autoSaveAllPoints`
   - **Choose which deployment should run**: `Head`
   - **Select event source**: `Time-driven`
   - **Select type of time based trigger**: `Day timer`
   - **Select time of day**: `8pm to 9pm`
3. Click **Save**

### Step 4: Verify Triggers Are Active

You should now see two triggers in the list:
- ✅ **endOfDayAll** - Runs daily between Midnight to 1am
- ✅ **autoSaveAllPoints** - Runs daily between 8pm to 9pm

### Step 5: Update Dashboard (Optional)

The browser-based end-of-day checks in the dashboard are still there as a backup. If you want to remove them to simplify the code, you can:

1. Open `family-dashboard.html`
2. Find these lines near the end (around line 1956-1960):
   ```javascript
   // Check for midnight every minute
   setInterval(checkForMidnight, 60000);

   // Check for 9pm save every minute
   setInterval(checkFor9pmSave, 60000);
   ```
3. Comment them out or delete them (they won't interfere, but aren't needed anymore)

---

## How It Works

### End of Day Process (Midnight)

1. Trigger fires at midnight Eastern Time
2. Script gets all kids from Config sheet
3. Script gets current points from Points Log
4. For each kid:
   - Adds Daily BP to Total BP
   - Resets Daily BP to default (from Config)
   - Logs transaction to Points Log
5. Summary logged to Apps Script execution log

### Auto-Save Process (9pm)

1. Trigger fires at 9pm Eastern Time
2. Script gets all kids from Config sheet
3. Script gets current points from Points Log
4. For each kid:
   - Saves current state (Daily BP, Total BP, Prize Coins)
   - Logs to Points Log with type `auto-save-9pm`
5. Summary logged to Apps Script execution log

### Example Points Log Entries

After midnight end-of-day:
```
Date       | Kid   | Daily BP | Total BP | Prize Coins | Type             | Note
-----------|-------|----------|----------|-------------|------------------|-----
3/15/2026  | Clara | 5        | 23       | 0           | end-of-day-auto  | Auto end-of-day: Added 8 Daily BP to Total BP, reset Daily BP to 5
3/15/2026  | Champ | 5        | 17       | 50          | end-of-day-auto  | Auto end-of-day: Added 12 Daily BP to Total BP, reset Daily BP to 5
```

After 9pm auto-save:
```
Date       | Kid   | Daily BP | Total BP | Prize Coins | Type            | Note
-----------|-------|----------|----------|-------------|-----------------|-----
3/14/2026  | Clara | 8        | 15       | 0           | auto-save-9pm   | Automatic 9pm save before end of day
3/14/2026  | Champ | 12       | 5        | 50          | auto-save-9pm   | Automatic 9pm save before end of day
```

---

## Troubleshooting

### Triggers not running

1. Check the **Triggers** page (clock icon) - make sure both triggers are listed and enabled
2. Check **Executions** (📜 icon on left) to see execution history and any errors
3. Make sure you authorized the script when setting up triggers

### Points not updating correctly

1. Run the test functions (`testEndOfDayAll`, `testAutoSaveAllPoints`) manually
2. Check the execution log for error messages
3. Verify your Config sheet has all kids properly configured with `defaultDailyBP`
4. Check Points Log to ensure current points are being saved correctly

### Time zone issues

The triggers use Google's servers, which are in UTC. However, the functions use your Sheet's timezone (set in the Config sheet via the `weather.timezone` setting). If end-of-day is happening at the wrong time:

1. Check your timezone in Config: `{"latitude":...,"longitude":...,"timezone":"America/New_York"}`
2. Make sure it's a valid IANA timezone
3. The trigger will run within the specified hour window (e.g., "Midnight to 1am" means sometime between 12:00 and 1:00 AM)

### Testing specific scenarios

To test end-of-day without waiting for midnight:

1. In Apps Script, select **testEndOfDayAll** and click Run
2. Check Points Log to see the results
3. This won't interfere with the automatic trigger - they can both run

---

## Monitoring

### Check Execution History

1. In Apps Script editor, click the **executions icon** (📜) on the left
2. You'll see a list of all recent executions:
   - Green checkmark ✅ = Success
   - Red X ❌ = Failed (click to see error)
3. Click any execution to see the detailed log

### Email Notifications (Optional)

You can get email notifications when triggers fail:

1. In Apps Script, click the **clock icon** (Triggers)
2. Click on a trigger to edit it
3. At the bottom, click **Notifications**
4. Choose when you want to be notified (e.g., "immediately" for failures)
5. Click **Save**

---

## What About the Dashboard?

The dashboard will still work exactly as before! The automatic triggers just ensure that:

- End-of-day happens even if the dashboard isn't open
- Points are saved reliably at 9pm as a backup
- You don't have to remember to run "End of Day" manually

The dashboard's "End of Day for All Kids" button still works and can be used anytime you want to manually trigger end-of-day.

---

## Summary

Once set up, your Family Dashboard will:

1. ✅ **9pm**: Auto-save all points to Google Sheets (backup)
2. ✅ **Midnight**: Automatically move Daily BP to Total BP and reset Daily BP
3. ✅ **Anytime**: Manual "End of Day" button still works on dashboard
4. ✅ **All logged**: Every transaction recorded in Points Log
5. ✅ **Reliable**: Works even when browser is closed or Pi is shut down

Your kids can complete chores and activities throughout the day, and at midnight, everything automatically rolls over - their earned BP goes to the bank where it's safe! 🎉
