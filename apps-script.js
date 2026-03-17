// ==========================================
// FAMILY DASHBOARD - GOOGLE APPS SCRIPT
// ==========================================
// Deploy this as a Web App in your Google Sheet
//
// SETUP INSTRUCTIONS:
// 1. Create new Google Sheet with these tabs:
//    - "Points Log" - Row 1 headers: Date | Kid | Daily BP | Total BP | Prize Coins | Type | Note
//    - "Config" - Row 1 headers: Key | Value
//    - "Chores" - Row 1 headers: Kid | Chore ID | Chore Name | BP | Multiplier
//    - "Rewards" - Row 1 headers: ID | Name | Cost | Icon | Text Fallback
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
    prizeCoins: 5, // Column E
    type: 6,      // Column F
    note: 7       // Column G
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
  } else if (action === 'test') {
    return jsonResponse({ message: 'API is working!', timestamp: new Date().toISOString() });
  }

  return jsonResponse({ error: 'Invalid action. Use ?action=getCurrentPoints, ?action=getCalendarEvents, ?action=getConfig, ?action=getChores, ?action=getRewards, ?action=getActivities, ?action=saveRecentActivity, ?action=getRecentActivities, or ?action=test' }, 400);
}

function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const action = params.action;

    if (action === 'logPoints') {
      return logPoints(params);
    }

    return jsonResponse({ error: 'Invalid action. Use action=logPoints' }, 400);
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

    const data = sheet.getRange(CONFIG.startRow, 1, lastRow - CONFIG.startRow + 1, 7).getValues();

    // Find the most recent entry for each kid
    const latestPoints = {};

    // Process rows in reverse order (most recent first)
    for (let i = data.length - 1; i >= 0; i--) {
      const [date, kid, dailyBP, totalBP, prizeCoins, type, note] = data[i];

      if (kid && !latestPoints[kid.toLowerCase()]) {
        latestPoints[kid.toLowerCase()] = {
          dailyBP: dailyBP || 5,
          totalBP: totalBP || 0,
          prizeCoins: prizeCoins || 0,
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

// ====== LOG NEW POINTS ENTRY ======
// Updates today's row for the kid, or creates a new one if it doesn't exist
function logPoints(params) {
  try {
    const { kid, dailyBP, totalBP, prizeCoins, type, note } = params;

    if (!kid || dailyBP === undefined || totalBP === undefined || prizeCoins === undefined) {
      return jsonResponse({ error: 'Missing required fields: kid, dailyBP, totalBP, prizeCoins' }, 400);
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
    sheet.getRange(newRow, CONFIG.columns.prizeCoins).setValue(prizeCoins);
    sheet.getRange(newRow, CONFIG.columns.type).setValue(type || 'behavior');
    if (note) {
      sheet.getRange(newRow, CONFIG.columns.note).setValue(note);
    }

    return jsonResponse({
      success: true,
      kid: kid,
      dailyBP: dailyBP,
      totalBP: totalBP,
      prizeCoins: prizeCoins,
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
          totalBP: kid.defaultTotalBP || 0,
          prizeCoins: kid.defaultPrizeCoins || 0
        };

        // Calculate new values
        const newTotalBP = current.totalBP + current.dailyBP;
        const newDailyBP = defaultDailyBP;

        // Log the transaction
        const params = {
          kid: kidName,
          dailyBP: newDailyBP,
          totalBP: newTotalBP,
          prizeCoins: current.prizeCoins,
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
          totalBP: kid.defaultTotalBP || 0,
          prizeCoins: kid.defaultPrizeCoins || 0
        };

        // Log current state
        const params = {
          kid: kidName,
          dailyBP: current.dailyBP,
          totalBP: current.totalBP,
          prizeCoins: current.prizeCoins,
          type: 'auto-save-9pm',
          note: 'Automatic 9pm save before end of day'
        };

        logPoints(params);

        summary.push(`${kidName}: ${current.dailyBP} Daily, ${current.totalBP} Total, ${current.prizeCoins} PC`);
        Logger.log(`Auto-save for ${kidName}: Daily BP=${current.dailyBP}, Total BP=${current.totalBP}, Prize Coins=${current.prizeCoins}`);
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
    prizeCoins: 50,
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
