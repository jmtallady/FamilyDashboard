// ==========================================
// FAMILY DASHBOARD - GOOGLE APPS SCRIPT
// ==========================================
// Deploy this as a Web App in your Google Sheet
//
// SETUP INSTRUCTIONS:
// 1. Create new Google Sheet with these tabs:
//    - "Points Log" - Row 1 headers: Date | Kid | Daily BP | Total BP | Type | Note
//    - "Config" - Row 1 headers: Key | Value
//    - "Chores" - Row 1 headers: Kid | Chore ID | Chore Name | BP | Multiplier
//    - "Rewards" - Row 1 headers: ID | Name | Cost (BP) | Icon | Text Fallback
//    - "Activities" - Row 1 headers: Kid | Activity ID | Activity Name | BP | Multiplier
//    - "Recent Activity" - Row 1 headers: Timestamp | Type | Kid Name | Item Name | Icon
//
// 2. In Google Sheets, go to Extensions > Apps Script
// 3. Delete any existing code and paste THIS code
// 4. Save (Ctrl+S or Cmd+S)
// 5. Click "Deploy" > "New deployment"
// 6. Click gear icon ⚙️ > Select "Web app"
// 7. Settings:
//    - Description: "Family Dashboard API"
//    - Execute as: "Me"
//    - Who has access: "Anyone"
// 8. Click "Deploy"
// 9. Copy the Web App URL
// 10. Paste the URL in your dashboard HTML CONFIG.sheetsApiUrl

// ====== CONFIGURATION ======
const CONFIG = {
  pointsLogSheet: 'Points Log',
  startRow: 2,  // First data row (row 1 is headers)
  columns: {
    date: 1,      // Column A
    kid: 2,       // Column B
    dailyBP: 3,   // Column C
    totalBP: 4,   // Column D
    type: 5,      // Column E
    note: 6       // Column F
  }
};

// ====== MAIN WEB APP HANDLERS ======
function doGet(e) {
  const action = e.parameter.action;

  if (action === 'getCurrentPoints') {
    return getCurrentPoints();
  } else if (action === 'getCalendarEvents') {
    return getCalendarEvents(e.parameter.days);
  } else if (action === 'getConfig') {
    return getConfig();
  } else if (action === 'getChores') {
    return getChores();
  } else if (action === 'getRewards') {
    return getRewards();
  } else if (action === 'getActivities') {
    return getActivities();
  } else if (action === 'saveRecentActivity') {
    return saveRecentActivity(e.parameter.type, e.parameter.kidName, e.parameter.itemName, e.parameter.icon);
  } else if (action === 'getRecentActivities') {
    return getRecentActivities();
  } else if (action === 'getRecentPointsLog') {
    return getRecentPointsLog();
  } else if (action === 'getHouseRules') {
    return getHouseRules();
  } else if (action === 'getDailyStatuses') {
    return getDailyStatuses();
  } else if (action === 'test') {
    return jsonResponse({ message: 'API is working!', timestamp: new Date().toISOString() });
  }

  return jsonResponse({ error: 'Invalid action. Use ?action=getCurrentPoints, ?action=getCalendarEvents, ?action=getConfig, ?action=getChores, ?action=getRewards, ?action=getActivities, ?action=saveRecentActivity, ?action=getRecentActivities, ?action=getRecentPointsLog, ?action=getHouseRules, or ?action=test' }, 400);
}

function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const action = params.action;

    if (action === 'logPoints') {
      return logPoints(params);
    } else if (action === 'updateChoreMultiplier') {
      return updateChoreMultiplier(params);
    } else if (action === 'setDailyStatus') {
      return setDailyStatus(params);
    }

    return jsonResponse({ error: 'Invalid action' }, 400);
  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
  }
}

// ====== GET CURRENT POINTS ======
// Returns the most recent points for each kid
function getCurrentPoints() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.pointsLogSheet);

    if (!sheet) {
      return jsonResponse({ error: `Sheet "${CONFIG.pointsLogSheet}" not found` }, 404);
    }

    // Get all data from the sheet
    const lastRow = sheet.getLastRow();

    if (lastRow < CONFIG.startRow) {
      // No data yet, return defaults
      return jsonResponse({
        success: true,
        points: {},
        message: 'No data found, using defaults'
      });
    }

    const data = sheet.getRange(CONFIG.startRow, 1, lastRow - CONFIG.startRow + 1, 6).getValues();

    // Find the most recent entry for each kid
    const latestPoints = {};

    // Process rows in reverse order (most recent first)
    for (let i = data.length - 1; i >= 0; i--) {
      const [date, kid, dailyBP, totalBP, type, note] = data[i];

      if (kid && !latestPoints[kid.toLowerCase()]) {
        latestPoints[kid.toLowerCase()] = {
          dailyBP: dailyBP || 5,
          totalBP: totalBP || 0,
          date: date ? new Date(date).toLocaleDateString() : null,
          type: type || '',
          note: note || ''
        };
      }
    }

    return jsonResponse({
      success: true,
      points: latestPoints,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
  }
}

// ====== GET RECENT POINTS LOG ======
// Returns the most recent N entries from the Points Log for activity feed
function getRecentPointsLog() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.pointsLogSheet);

    if (!sheet) {
      return jsonResponse({ error: `Sheet "${CONFIG.pointsLogSheet}" not found` }, 404);
    }

    const lastRow = sheet.getLastRow();

    if (lastRow < CONFIG.startRow) {
      // No data yet
      return jsonResponse({
        success: true,
        entries: [],
        message: 'No data found'
      });
    }

    // Get the last 50 entries (or all if less than 50)
    const numEntries = Math.min(50, lastRow - CONFIG.startRow + 1);
    const startRow = lastRow - numEntries + 1;

    const data = sheet.getRange(startRow, 1, numEntries, 6).getValues();

    // Build array of entries (most recent first)
    const entries = [];

    for (let i = data.length - 1; i >= 0; i--) {
      const [date, kid, dailyBP, totalBP, type, note] = data[i];

      // Skip entries without a type (invalid/incomplete rows)
      if (!type) continue;

      // Only include certain types in the activity feed
      const validTypes = ['chore-approved', 'activity-approved', 'reward-purchase', 'end-of-day-auto', 'daily-adjust'];
      if (!validTypes.includes(type)) continue;

      entries.push({
        date: date ? new Date(date).toISOString() : null,
        kid: kid || '',
        dailyBP: dailyBP || 0,
        totalBP: totalBP || 0,
        type: type || '',
        note: note || ''
      });
    }

    return jsonResponse({
      success: true,
      entries: entries,
      count: entries.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
  }
}

// ====== LOG NEW POINTS ENTRY ======
// Appends a new row for every transaction
function logPoints(params) {
  try {
    const { kid, dailyBP, totalBP, type, note } = params;

    if (!kid || dailyBP === undefined || totalBP === undefined) {
      return jsonResponse({ error: 'Missing required fields: kid, dailyBP, totalBP' }, 400);
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.pointsLogSheet);

    if (!sheet) {
      return jsonResponse({ error: `Sheet "${CONFIG.pointsLogSheet}" not found` }, 404);
    }

    const today = new Date();
    const lastRow = sheet.getLastRow();

    // ALWAYS append a new row - never update existing rows
    // This ensures the last line is always the most accurate current state
    const newRow = lastRow + 1;
    sheet.getRange(newRow, CONFIG.columns.date).setValue(today);
    sheet.getRange(newRow, CONFIG.columns.kid).setValue(kid);
    sheet.getRange(newRow, CONFIG.columns.dailyBP).setValue(dailyBP);
    sheet.getRange(newRow, CONFIG.columns.totalBP).setValue(totalBP);
    sheet.getRange(newRow, CONFIG.columns.type).setValue(type || 'behavior');
    if (note) {
      sheet.getRange(newRow, CONFIG.columns.note).setValue(note);
    }

    return jsonResponse({
      success: true,
      kid: kid,
      dailyBP: dailyBP,
      totalBP: totalBP,
      type: type,
      date: today.toLocaleDateString(),
      row: newRow,
      updated: false,
      message: 'Points logged'
    });

  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
  }
}

// ====== GET CONFIGURATION ======
// Returns configuration from the Config sheet
function getConfig() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Config');

    if (!sheet) {
      return jsonResponse({ error: 'Config sheet not found. Please create a "Config" sheet.' }, 404);
    }

    // Read configuration from sheet (Key-Value pairs in columns A and B)
    const data = sheet.getDataRange().getValues();
    const config = {};

    // Skip header row, read key-value pairs
    for (let i = 1; i < data.length; i++) {
      const [key, value] = data[i];
      if (key) {
        // Try to parse JSON values, otherwise use as string
        try {
          config[key] = JSON.parse(value);
        } catch {
          config[key] = value;
        }
      }
    }

    return jsonResponse({
      success: true,
      config: config,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
  }
}

// ====== GET CALENDAR EVENTS ======
// Returns upcoming calendar events from primary calendar
function getCalendarEvents(daysParam) {
  try {
    const days = parseInt(daysParam) || 7; // Default to 7 days
    const calendar = CalendarApp.getDefaultCalendar();

    const now = new Date();
    const endDate = new Date();
    endDate.setDate(now.getDate() + days);

    const events = calendar.getEvents(now, endDate);

    const eventList = events.map(event => {
      return {
        title: event.getTitle(),
        start: event.getStartTime().toISOString(),
        end: event.getEndTime().toISOString(),
        allDay: event.isAllDayEvent(),
        location: event.getLocation() || '',
        description: event.getDescription() || ''
      };
    });

    return jsonResponse({
      success: true,
      events: eventList,
      count: eventList.length,
      daysAhead: days,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
  }
}

// ====== GET CHORES ======
// Returns chores configuration from the Chores sheet
function getChores() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Chores');

    if (!sheet) {
      return jsonResponse({ error: 'Chores sheet not found. Please create a "Chores" sheet.' }, 404);
    }

    const data = sheet.getDataRange().getValues();
    const chores = {
      individual: {},
      shared: []
    };

    // Skip header row, read chore data
    // Expected columns: Kid | Chore ID | Chore Name | BP | Multiplier
    for (let i = 1; i < data.length; i++) {
      const [kid, choreId, choreName, bp, multiplier] = data[i];

      if (!choreId || !choreName) continue; // Skip empty rows

      const rawMultiplier = parseInt(multiplier);

      // Skip chores with multiplier <= 0 (disabled chores)
      if (!isNaN(rawMultiplier) && rawMultiplier <= 0) continue;

      const chore = {
        id: choreId.toString().toLowerCase(),
        name: choreName,
        bp: parseInt(bp) || 1,
        multiplier: isNaN(rawMultiplier) ? 1 : rawMultiplier
      };

      // If kid column is blank, add to shared list
      // If kid column has a value, add to that kid's individual list
      if (!kid || kid.toString().trim() === '') {
        chores.shared.push(chore);
      } else {
        const kidId = kid.toString().toLowerCase();
        if (!chores.individual[kidId]) {
          chores.individual[kidId] = [];
        }
        chores.individual[kidId].push(chore);
      }
    }

    return jsonResponse({
      success: true,
      chores: chores,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
  }
}

// ====== GET REWARDS ======
// Returns rewards configuration from the Rewards sheet
function getRewards() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Rewards');

    if (!sheet) {
      return jsonResponse({ error: 'Rewards sheet not found. Please create a "Rewards" sheet.' }, 404);
    }

    const data = sheet.getDataRange().getValues();
    const rewards = [];

    // Skip header row, read reward data
    // Expected columns: ID | Name | Cost | Icon | Text Fallback
    for (let i = 1; i < data.length; i++) {
      const [id, name, cost, icon, textFallback] = data[i];

      if (!id || !name) continue; // Skip empty rows

      rewards.push({
        id: id.toString().toLowerCase(),
        name: name,
        cost: parseInt(cost) || 0,
        icon: icon || '🎁',
        text: textFallback || name.toUpperCase()
      });
    }

    return jsonResponse({
      success: true,
      rewards: rewards,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
  }
}

// ====== GET ACTIVITIES ======
// Returns activities configuration from the Activities sheet
function getActivities() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Activities');

    if (!sheet) {
      return jsonResponse({ error: 'Activities sheet not found. Please create an "Activities" sheet.' }, 404);
    }

    const data = sheet.getDataRange().getValues();
    const activities = {
      individual: {},
      shared: []
    };

    // Skip header row, read activity data
    // Expected columns: Kid | Activity ID | Activity Name | BP | Multiplier
    for (let i = 1; i < data.length; i++) {
      const [kid, activityId, activityName, bp, multiplier] = data[i];

      if (!activityId || !activityName) continue; // Skip empty rows

      const rawMultiplier = parseInt(multiplier);

      // Skip activities with multiplier <= 0 (disabled activities)
      if (!isNaN(rawMultiplier) && rawMultiplier <= 0) continue;

      const activity = {
        id: activityId.toString().toLowerCase(),
        name: activityName,
        bp: parseInt(bp) || 1,
        multiplier: isNaN(rawMultiplier) ? 1 : rawMultiplier
      };

      // If kid column is blank, add to shared list
      // If kid column has a value, add to that kid's individual list
      if (!kid || kid.toString().trim() === '') {
        activities.shared.push(activity);
      } else {
        const kidId = kid.toString().toLowerCase();
        if (!activities.individual[kidId]) {
          activities.individual[kidId] = [];
        }
        activities.individual[kidId].push(activity);
      }
    }

    return jsonResponse({
      success: true,
      activities: activities,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
  }
}

// ====== RECENT ACTIVITY FUNCTIONS ======

// Save a recent activity to the Recent Activity sheet
function saveRecentActivity(type, kidName, itemName, icon) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Recent Activity');

    if (!sheet) {
      Logger.log('Recent Activity sheet not found');
      return jsonResponse({ success: false, error: 'Sheet not found' });
    }

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
    return jsonResponse({ success: true });

  } catch (error) {
    Logger.log('Error saving recent activity: ' + error);
    return jsonResponse({ success: false, error: error.toString() });
  }
}

// Get recent activities from the Recent Activity sheet
function getRecentActivities() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Recent Activity');

    if (!sheet) {
      Logger.log('Recent Activity sheet not found');
      return jsonResponse({ success: false, activities: [] });
    }

    const lastRow = sheet.getLastRow();

    if (lastRow <= 1) {
      // No data, just headers
      return jsonResponse({ success: true, activities: [] });
    }

    // Get all data (skip header row)
    const range = sheet.getRange(2, 1, lastRow - 1, 5);
    const values = range.getValues();

    // Convert to activity objects
    const activities = values.map(row => {
      const timestamp = new Date(row[0]);
      const timeStr = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'h:mm a');

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
    return jsonResponse({ success: true, activities: activities });

  } catch (error) {
    Logger.log('Error loading recent activities: ' + error);
    return jsonResponse({ success: false, error: error.toString(), activities: [] });
  }
}

// ====== GET HOUSE RULES ======
// Returns house rules from the House Rules sheet (3-column format: Kid | Rule | Consequence)
function getHouseRules() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('House Rules');

    if (!sheet) {
      return jsonResponse({ error: 'House Rules sheet not found' }, 404);
    }

    const lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      return jsonResponse({
        success: true,
        rules: {
          general: [],
          kidSpecific: {},
          spendingRequirements: [],
          grounding: [],
          consequenceScale: []
        }
      });
    }

    // Read all data (columns A-D: Kid, Rule, Consequence, Type)
    const numCols = sheet.getLastColumn();
    const data = sheet.getRange(2, 1, lastRow - 1, Math.max(numCols, 4)).getValues();

    const rules = {
      general: [],
      kidSpecific: {},
      spendingRequirements: [],
      grounding: [],
      consequenceScale: []
    };

    // Process each row
    data.forEach(row => {
      const kid = row[0] ? row[0].toString().trim() : '';
      const rule = row[1] ? row[1].toString().trim() : '';
      const consequence = row[2] ? row[2].toString().trim() : '';
      const type = row[3] ? row[3].toString().trim().toLowerCase() : '';

      // Skip empty rows
      if (!rule) return;

      const entry = { rule, consequence, type };

      // Special categories based on Kid column
      if (kid === 'SPENDING') {
        rules.spendingRequirements.push(entry);
      } else if (kid === 'GROUNDED') {
        rules.grounding.push(entry);
      } else if (kid === 'BP SCALE') {
        rules.consequenceScale.push(entry);
      } else if (kid === '') {
        rules.general.push(entry);
      } else {
        if (!rules.kidSpecific[kid]) {
          rules.kidSpecific[kid] = [];
        }
        rules.kidSpecific[kid].push(entry);
      }
    });

    return jsonResponse({
      success: true,
      rules: rules
    });

  } catch (error) {
    Logger.log('Error loading house rules: ' + error);
    return jsonResponse({ success: false, error: error.toString() });
  }
}

// ====== UPDATE CHORE MULTIPLIER ======
// Sets a chore's multiplier (use 0 to remove it from the list)
function updateChoreMultiplier(params) {
  try {
    const { choreId, kidId, multiplier } = params;
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Chores');
    if (!sheet) return jsonResponse({ error: 'Chores sheet not found' }, 404);

    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const rowKid = data[i][0] ? data[i][0].toString().toLowerCase().trim() : '';
      const rowChoreId = data[i][1] ? data[i][1].toString().toLowerCase().trim() : '';

      const choreMatch = rowChoreId === choreId.toString().toLowerCase().trim();
      // For shared chores kidId is empty string; for individual, match the kid
      const kidMatch = (!kidId || kidId === '') ? rowKid === '' : rowKid === kidId.toString().toLowerCase().trim();

      if (choreMatch && kidMatch) {
        sheet.getRange(i + 1, 5).setValue(multiplier);
        return jsonResponse({ success: true, row: i + 1 });
      }
    }
    return jsonResponse({ error: 'Chore not found', choreId: choreId, kidId: kidId }, 404);
  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
  }
}

// ====== DAILY STATUS (Chore/Activity completion across devices) ======
// Sheet: "Daily Status" - columns: Date | Type | KidId | ItemId | Status

function getDailyStatuses() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Daily Status');
    if (!sheet) {
      // Sheet doesn't exist yet - return empty (will be created on first write)
      return jsonResponse({ success: true, statuses: [] });
    }

    const today = new Date();
    const todayStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd');

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return jsonResponse({ success: true, statuses: [] });

    const data = sheet.getRange(2, 1, lastRow - 1, 5).getValues();

    // Build map of most recent status per (type, kidId, itemId) for today
    const statusMap = {};
    data.forEach(row => {
      const rowDate = row[0] ? Utilities.formatDate(new Date(row[0]), Session.getScriptTimeZone(), 'yyyy-MM-dd') : '';
      if (rowDate !== todayStr) return;

      const type = row[1] ? row[1].toString() : '';
      const kidId = row[2] ? row[2].toString() : '';
      const itemId = row[3] ? row[3].toString() : '';
      const status = row[4] ? row[4].toString() : '';

      const key = `${type}-${kidId}-${itemId}`;
      statusMap[key] = { type, kidId, itemId, status }; // last write wins
    });

    return jsonResponse({ success: true, statuses: Object.values(statusMap) });
  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
  }
}

function setDailyStatus(params) {
  try {
    const { type, kidId, itemId, status } = params;
    if (!type || !itemId || !status) {
      return jsonResponse({ error: 'Missing required fields: type, itemId, status' }, 400);
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Daily Status');

    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet('Daily Status');
      sheet.getRange(1, 1, 1, 5).setValues([['Date', 'Type', 'KidId', 'ItemId', 'Status']]);
    }

    const today = new Date();
    const newRow = sheet.getLastRow() + 1;
    sheet.getRange(newRow, 1, 1, 5).setValues([[today, type, kidId || '', itemId, status]]);

    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
  }
}

// ====== END OF DAY AUTOMATION ======

/**
 * End of Day for All Kids
 * - Adds Daily BP to Total BP for each kid
 * - Resets Daily BP to default (from config)
 * - Logs transactions to Points Log
 *
 * This function should be triggered automatically at midnight via a time-based trigger.
 */
function endOfDayAll() {
  try {
    // Get config to know all kids and their defaults
    const configResult = getConfig();
    const configData = JSON.parse(configResult.getContent());

    if (!configData.success) {
      Logger.log('ERROR: Failed to load config');
      return { success: false, error: 'Failed to load config' };
    }

    const config = configData.config;

    // Get current points for all kids
    const pointsResult = getCurrentPoints();
    const pointsData = JSON.parse(pointsResult.getContent());

    if (!pointsData.success) {
      Logger.log('ERROR: Failed to load current points');
      return { success: false, error: 'Failed to load current points' };
    }

    const currentPoints = pointsData.points;
    const summary = [];

    // Process each kid
    Object.keys(config).forEach(key => {
      if (key.startsWith('kid') && config[key].id) {
        const kid = config[key];
        const kidId = kid.id.toLowerCase();
        const kidName = kid.name;
        const defaultDailyBP = kid.defaultDailyBP || 5;

        // Get current points or use defaults
        const current = currentPoints[kidId] || {
          dailyBP: defaultDailyBP,
          totalBP: kid.defaultTotalBP || 0
        };

        // Calculate new values
        const newTotalBP = current.totalBP + current.dailyBP;
        const newDailyBP = defaultDailyBP;

        // Log the transaction
        const params = {
          kid: kidName,
          dailyBP: newDailyBP,
          totalBP: newTotalBP,
          type: 'end-of-day-auto',
          note: `Auto end-of-day: Added ${current.dailyBP} Daily BP to Total BP, reset Daily BP to ${newDailyBP}`
        };

        logPoints(params);

        summary.push(`${kidName}: +${current.dailyBP} → ${newTotalBP} Total BP`);
        Logger.log(`End of day for ${kidName}: Daily BP ${current.dailyBP} added to Total BP (now ${newTotalBP}), Daily BP reset to ${newDailyBP}`);
      }
    });

    Logger.log('✅ End of day complete! ' + summary.join(' | '));
    return { success: true, summary: summary, timestamp: new Date().toISOString() };

  } catch (error) {
    Logger.log('ERROR in endOfDayAll: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Auto-Save All Points (9pm)
 * - Saves current state of all kids' points to Points Log
 * - Acts as a backup/snapshot before end of day
 *
 * This function should be triggered automatically at 9pm via a time-based trigger.
 */
function autoSaveAllPoints() {
  try {
    // Get config to know all kids
    const configResult = getConfig();
    const configData = JSON.parse(configResult.getContent());

    if (!configData.success) {
      Logger.log('ERROR: Failed to load config');
      return { success: false, error: 'Failed to load config' };
    }

    const config = configData.config;

    // Get current points for all kids
    const pointsResult = getCurrentPoints();
    const pointsData = JSON.parse(pointsResult.getContent());

    if (!pointsData.success) {
      Logger.log('ERROR: Failed to load current points');
      return { success: false, error: 'Failed to load current points' };
    }

    const currentPoints = pointsData.points;
    const summary = [];

    // Save current state for each kid
    Object.keys(config).forEach(key => {
      if (key.startsWith('kid') && config[key].id) {
        const kid = config[key];
        const kidId = kid.id.toLowerCase();
        const kidName = kid.name;

        // Get current points or use defaults
        const current = currentPoints[kidId] || {
          dailyBP: kid.defaultDailyBP || 5,
          totalBP: kid.defaultTotalBP || 0
        };

        // Log current state
        const params = {
          kid: kidName,
          dailyBP: current.dailyBP,
          totalBP: current.totalBP,
          type: 'auto-save-9pm',
          note: 'Automatic 9pm save before end of day'
        };

        logPoints(params);

        summary.push(`${kidName}: ${current.dailyBP} Daily, ${current.totalBP} Total`);
        Logger.log(`Auto-save for ${kidName}: Daily BP=${current.dailyBP}, Total BP=${current.totalBP}`);
      }
    });

    Logger.log('✅ Auto-save complete (9pm)! ' + summary.join(' | '));
    return { success: true, summary: summary, timestamp: new Date().toISOString() };

  } catch (error) {
    Logger.log('ERROR in autoSaveAllPoints: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

// ====== HELPER FUNCTIONS ======

// Helper to return JSON response with CORS headers
function jsonResponse(data, status = 200) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ====== TEST FUNCTIONS (Run these in Apps Script to verify) ======

function testGetCurrentPoints() {
  const result = getCurrentPoints();
  Logger.log(result.getContent());
}

function testLogPoints() {
  const params = {
    action: 'logPoints',
    kid: 'Clara',
    dailyBP: 5,
    totalBP: 25,
    type: 'test',
    note: 'Test from Apps Script'
  };

  const result = logPoints(params);
  Logger.log(result.getContent());
}

function testSaveRecentActivity() {
  const result = saveRecentActivity('chore-approved', 'Clara', 'Make Bed', '✅');
  Logger.log(result.getContent());
}

function testGetRecentActivities() {
  const result = getRecentActivities();
  Logger.log(result.getContent());
}

function testEndOfDayAll() {
  Logger.log('Running endOfDayAll test...');
  const result = endOfDayAll();
  Logger.log(JSON.stringify(result, null, 2));
}

function testAutoSaveAllPoints() {
  Logger.log('Running autoSaveAllPoints test...');
  const result = autoSaveAllPoints();
  Logger.log(JSON.stringify(result, null, 2));
}

function testAPI() {
  Logger.log('Testing getCurrentPoints...');
  testGetCurrentPoints();

  Logger.log('\nTesting logPoints...');
  testLogPoints();

  Logger.log('\nTesting saveRecentActivity...');
  testSaveRecentActivity();

  Logger.log('\nTesting getRecentActivities...');
  testGetRecentActivities();

  Logger.log('\nTests complete! Check the sheets to verify the test entries were added.');
}
