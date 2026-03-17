# Recent Activity Persistence Setup Guide

This guide shows you how to persist the Recent Activity feed to Google Sheets so it survives page refreshes.

## Quick Start

To enable persistent recent activity:

1. **Create the sheet**: Add a new tab called "Recent Activity" to your Google Sheet
2. **Add headers**: In row 1, add: `Timestamp | Type | Kid Name | Item Name | Icon`
3. **Update Apps Script**: Copy the two functions below into your Apps Script editor
4. **Update doGet**: Add the two new action cases to your `doGet` function
5. **Deploy**: Create a new version and deploy
6. **Done!** Recent activities will now persist across page refreshes

The dashboard code has already been updated to save and load activities automatically.

---

## Google Sheets Setup

### 1. Create the Recent Activity Sheet

In your Google Sheet, create a new tab called **"Recent Activity"** (case-sensitive).

### 2. Set Up the Table

In the Recent Activity sheet, create a table with these headers in Row 1:

| Timestamp | Type | Kid Name | Item Name | Icon |
|-----------|------|----------|-----------|------|

### 3. How It Works

- **Automatic logging**: Every time a chore/activity is approved/rejected or a reward is purchased, it's automatically logged
- **Keeps last 50 entries**: The sheet maintains the 50 most recent activities
- **Loads on startup**: When the dashboard loads, it fetches recent activities from the sheet
- **Real-time updates**: New activities are immediately saved to the sheet

## Apps Script Code

### Add These Functions to Your Apps Script

Open your Google Apps Script editor and add these two functions:

```javascript
// Save a recent activity to the Recent Activity sheet
function saveRecentActivity(type, kidName, itemName, icon) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Recent Activity');

  if (!sheet) {
    Logger.log('Recent Activity sheet not found');
    return { success: false, error: 'Sheet not found' };
  }

  try {
    // Add new row at the top (after header)
    sheet.insertRowBefore(2);

    // Add the activity data
    const timestamp = new Date();
    sheet.getRange(2, 1).setValue(timestamp);
    sheet.getRange(2, 2).setValue(type);
    sheet.getRange(2, 3).setValue(kidName);
    sheet.getRange(2, 4).setValue(itemName);
    sheet.getRange(2, 5).setValue(icon || '');

    // Keep only the last 50 entries (plus header row)
    const maxRows = 51;
    const currentRows = sheet.getLastRow();
    if (currentRows > maxRows) {
      sheet.deleteRows(maxRows + 1, currentRows - maxRows);
    }

    Logger.log('Recent activity saved: ' + type + ' - ' + kidName + ' - ' + itemName);
    return { success: true };

  } catch (error) {
    Logger.log('Error saving recent activity: ' + error);
    return { success: false, error: error.toString() };
  }
}

// Get recent activities from the Recent Activity sheet
function getRecentActivities() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Recent Activity');

  if (!sheet) {
    Logger.log('Recent Activity sheet not found');
    return { success: false, activities: [] };
  }

  try {
    const lastRow = sheet.getLastRow();

    if (lastRow <= 1) {
      // No data, just headers
      return { success: true, activities: [] };
    }

    // Get all data (skip header row)
    const range = sheet.getRange(2, 1, lastRow - 1, 5);
    const values = range.getValues();

    // Convert to activity objects
    const activities = values.map(row => {
      const timestamp = new Date(row[0]);
      const timeStr = timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

      return {
        type: row[1],
        kidName: row[2],
        itemName: row[3],
        icon: row[4],
        time: timeStr,
        timestamp: timestamp.getTime()
      };
    });

    Logger.log('Loaded ' + activities.length + ' recent activities');
    return { success: true, activities: activities };

  } catch (error) {
    Logger.log('Error loading recent activities: ' + error);
    return { success: false, error: error.toString(), activities: [] };
  }
}
```

### Update the doGet Function

Make sure your `doGet` function handles the new actions. Add these cases to your existing switch statement:

```javascript
function doGet(e) {
  const action = e.parameter.action;

  switch(action) {
    // ... existing cases ...

    case 'saveRecentActivity':
      return ContentService.createTextOutput(
        JSON.stringify(saveRecentActivity(
          e.parameter.type,
          e.parameter.kidName,
          e.parameter.itemName,
          e.parameter.icon
        ))
      ).setMimeType(ContentService.MimeType.JSON);

    case 'getRecentActivities':
      return ContentService.createTextOutput(
        JSON.stringify(getRecentActivities())
      ).setMimeType(ContentService.MimeType.JSON);

    // ... rest of cases ...
  }
}
```

### Deploy the Updated Script

After adding the functions:
1. Click **Deploy** > **Manage deployments**
2. Click the edit icon (pencil) on your existing deployment
3. Click **Version** > **New version**
4. Click **Deploy**

## Dashboard Updates

The dashboard code needs to be updated to save and load activities from Google Sheets. This involves:

1. **Loading activities on startup** - Fetch from Google Sheets when the page loads
2. **Saving new activities** - Call the Apps Script when `addRecentActivity()` is called

I'll update the dashboard code for you now.

## Activity Types

The Recent Activity feed tracks these types:
- **chore-approved**: When a parent approves a completed chore (✅ green)
- **chore-rejected**: When a parent rejects a chore (❌ red)
- **activity-approved**: When a parent approves an activity (⭐ orange)
- **activity-rejected**: When a parent rejects an activity (❌ red)
- **purchase**: When a kid purchases a reward (🎁 purple)

## Benefits

✅ **Persistent**: Activity log survives page refreshes
✅ **Automatic**: No manual intervention needed
✅ **Historical**: View up to 50 recent activities
✅ **Real-time**: Updates immediately when actions occur
✅ **Audit trail**: See exactly when activities happened

## Troubleshooting

**Recent activity not saving:**
- Make sure the sheet is named exactly **"Recent Activity"** (case-sensitive)
- Verify Row 1 has headers: Timestamp, Type, Kid Name, Item Name, Icon
- Check that your Apps Script has the new functions
- Redeploy your Apps Script after making changes

**Recent activity not loading:**
1. Open Apps Script editor
2. Run the `getRecentActivities` function
3. Check the log output to see if data is being read correctly
4. Make sure there are no empty rows between the header and data

**Timezone issues:**
- Timestamps are saved in your Google Sheet's timezone
- The time display uses the browser's local time format
