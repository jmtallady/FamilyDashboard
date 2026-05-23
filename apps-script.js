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
//    - "Activities" - Row 1 headers: Kid | Activity ID | Activity Name | BP | Multiplier | Max Per Week
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
    return getChores(e.parameter.includeDisabled === 'true');
  } else if (action === 'getRewards') {
    return getRewards();
  } else if (action === 'getActivities') {
    return getActivities(e.parameter.includeDisabled === 'true');
  } else if (action === 'getRecentPointsLog') {
    return getRecentPointsLog();
  } else if (action === 'getHouseRules') {
    return getHouseRules();
  } else if (action === 'getDailyStatuses') {
    return getDailyStatuses();
  } else if (action === 'getMeals') {
    return getMeals();
  } else if (action === 'getDailyMeal') {
    return getDailyMeal(e.parameter.date);
  } else if (action === 'getMealPlan') {
    return getMealPlan(e.parameter.days);
  } else if (action === 'getMealRequests') {
    return getMealRequests();
  } else if (action === 'getChecklists') {
    return getChecklistsData();
  } else if (action === 'test') {
    return jsonResponse({ message: 'API is working!', timestamp: new Date().toISOString() });
  }

  return jsonResponse({ error: 'Invalid action. Use ?action=getCurrentPoints, ?action=getCalendarEvents, ?action=getConfig, ?action=getChores, ?action=getRewards, ?action=getActivities, ?action=getRecentPointsLog, ?action=getHouseRules, or ?action=test' }, 400);
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
    } else if (action === 'addChore') {
      return addChore(params);
    } else if (action === 'updateChore') {
      return updateChore(params);
    } else if (action === 'addMeal') {
      return addMeal(params);
    } else if (action === 'setDailyMeal') {
      return setDailyMeal(params);
    } else if (action === 'addMealRequest') {
      return addMealRequest(params);
    } else if (action === 'saveChecklists') {
      return saveChecklistsData(params);
    } else if (action === 'saveConfig') {
      return saveConfigValue(params);
    } else if (action === 'deleteConfigKey') {
      return deleteConfigKey(params);
    } else if (action === 'addActivity') {
      return addActivity(params);
    } else if (action === 'updateActivity') {
      return updateActivity(params);
    } else if (action === 'setActivityMultiplier') {
      return setActivityMultiplier(params);
    } else if (action === 'addReward') {
      return addReward(params);
    } else if (action === 'updateReward') {
      return updateReward(params);
    } else if (action === 'deleteReward') {
      return deleteReward(params);
    } else if (action === 'addHouseRule') {
      return addHouseRule(params);
    } else if (action === 'updateHouseRule') {
      return updateHouseRule(params);
    } else if (action === 'deleteHouseRule') {
      return deleteHouseRule(params);
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
          dailyBP: (dailyBP !== '' && dailyBP !== null) ? Number(dailyBP) : 5,
          totalBP: (totalBP !== '' && totalBP !== null) ? Number(totalBP) : 0,
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
      // undo-* types are returned so the frontend can hide the original entry
      const validTypes = ['chore-approved', 'activity-approved', 'reward-purchase', 'end-of-day', 'end-of-day-all', 'end-of-day-auto', 'daily-adjust', 'checklist-item', 'checklist-complete', 'undo-chore-approved', 'undo-activity-approved', 'undo-reward-purchase', 'undo-checklist-item', 'undo-checklist-complete'];
      if (!validTypes.includes(type)) continue;

      entries.push({
        date: date ? new Date(date).toISOString() : null,
        kid: kid || '',
        dailyBP: (dailyBP !== '' && dailyBP !== null) ? Number(dailyBP) : 0,
        totalBP: (totalBP !== '' && totalBP !== null) ? Number(totalBP) : 0,
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

// ====== SAVE CONFIG VALUE ======
function saveConfigValue(params) {
  try {
    const { key, value } = params;
    if (!key) return jsonResponse({ error: 'Missing key' }, 400);

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Config');
    if (!sheet) return jsonResponse({ error: 'Config sheet not found' }, 404);

    const data = sheet.getDataRange().getValues();
    const serialized = (typeof value === 'object' || typeof value === 'number' || typeof value === 'boolean')
      ? JSON.stringify(value)
      : String(value);

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === key) {
        sheet.getRange(i + 1, 2).setValue(serialized);
        return jsonResponse({ success: true });
      }
    }
    // Key not found — append new row
    sheet.appendRow([key, serialized]);
    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
  }
}

// ====== DELETE CONFIG KEY ======
// Removes a key-value row from the Config sheet (used for deleting kids)
function deleteConfigKey(params) {
  try {
    const { key } = params;
    if (!key) return jsonResponse({ error: 'Missing key' }, 400);

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Config');
    if (!sheet) return jsonResponse({ error: 'Config sheet not found' }, 404);

    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === key) {
        sheet.deleteRow(i + 1);
        return jsonResponse({ success: true });
      }
    }
    return jsonResponse({ success: true }); // idempotent — not found is fine
  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
  }
}

// ====== ADD ACTIVITY ======
function addActivity(params) {
  try {
    const { kidId, activityId, activityName, bp, multiplier, maxPerWeek } = params;
    if (!activityId || !activityName) return jsonResponse({ error: 'Missing activityId or activityName' }, 400);

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Activities');
    if (!sheet) return jsonResponse({ error: 'Activities sheet not found' }, 404);

    sheet.appendRow([
      kidId || '',
      activityId.toString().toLowerCase(),
      activityName,
      parseInt(bp) || 1,
      parseInt(multiplier) || 1,
      maxPerWeek !== undefined && maxPerWeek !== '' ? parseInt(maxPerWeek) : ''
    ]);
    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
  }
}

// ====== UPDATE ACTIVITY ======
function updateActivity(params) {
  try {
    const { kidId, activityId, activityName, bp, maxPerWeek } = params;
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Activities');
    if (!sheet) return jsonResponse({ error: 'Activities sheet not found' }, 404);

    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const rowKid = data[i][0] ? data[i][0].toString().toLowerCase().trim() : '';
      const rowActId = data[i][1] ? data[i][1].toString().toLowerCase().trim() : '';
      const kidMatch = (!kidId || kidId === '') ? rowKid === '' : rowKid === kidId.toString().toLowerCase().trim();
      if (rowActId === activityId.toString().toLowerCase().trim() && kidMatch) {
        if (activityName) sheet.getRange(i + 1, 3).setValue(activityName);
        if (bp !== undefined) sheet.getRange(i + 1, 4).setValue(parseInt(bp) || 1);
        if (maxPerWeek !== undefined) sheet.getRange(i + 1, 6).setValue(maxPerWeek !== '' ? parseInt(maxPerWeek) : '');
        return jsonResponse({ success: true, row: i + 1 });
      }
    }
    return jsonResponse({ error: 'Activity not found' }, 404);
  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
  }
}

// ====== SET ACTIVITY MULTIPLIER ======
function setActivityMultiplier(params) {
  try {
    const { kidId, activityId, multiplier } = params;
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Activities');
    if (!sheet) return jsonResponse({ error: 'Activities sheet not found' }, 404);

    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const rowKid = data[i][0] ? data[i][0].toString().toLowerCase().trim() : '';
      const rowActId = data[i][1] ? data[i][1].toString().toLowerCase().trim() : '';
      const kidMatch = (!kidId || kidId === '') ? rowKid === '' : rowKid === kidId.toString().toLowerCase().trim();
      if (rowActId === activityId.toString().toLowerCase().trim() && kidMatch) {
        sheet.getRange(i + 1, 5).setValue(parseInt(multiplier));
        return jsonResponse({ success: true });
      }
    }
    return jsonResponse({ error: 'Activity not found' }, 404);
  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
  }
}

// ====== ADD REWARD ======
function addReward(params) {
  try {
    const { rewardId, rewardName, cost, icon, textFallback, limitType, limitCount, guidelines } = params;
    if (!rewardId || !rewardName) return jsonResponse({ error: 'Missing rewardId or rewardName' }, 400);

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Rewards');
    if (!sheet) return jsonResponse({ error: 'Rewards sheet not found' }, 404);

    sheet.appendRow([
      rewardId.toString().toLowerCase(),
      rewardName,
      parseInt(cost) || 0,
      icon || '🎁',
      textFallback || rewardName,
      limitType || '',
      limitCount !== undefined && limitCount !== '' ? parseInt(limitCount) : '',
      guidelines || ''
    ]);
    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
  }
}

// ====== UPDATE REWARD ======
function updateReward(params) {
  try {
    const { rewardId, rewardName, cost, icon, textFallback, limitType, limitCount, guidelines } = params;
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Rewards');
    if (!sheet) return jsonResponse({ error: 'Rewards sheet not found' }, 404);

    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]?.toString().toLowerCase().trim() === rewardId.toString().toLowerCase().trim()) {
        sheet.getRange(i + 1, 1, 1, 8).setValues([[
          rewardId.toString().toLowerCase(),
          rewardName || data[i][1],
          parseInt(cost) || 0,
          icon || data[i][3] || '🎁',
          textFallback !== undefined ? textFallback : data[i][4],
          limitType !== undefined ? limitType : data[i][5],
          limitCount !== undefined && limitCount !== '' ? parseInt(limitCount) : '',
          guidelines !== undefined ? guidelines : data[i][7]
        ]]);
        return jsonResponse({ success: true });
      }
    }
    return jsonResponse({ error: 'Reward not found' }, 404);
  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
  }
}

// ====== DELETE REWARD ======
function deleteReward(params) {
  try {
    const { rewardId } = params;
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Rewards');
    if (!sheet) return jsonResponse({ error: 'Rewards sheet not found' }, 404);

    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]?.toString().toLowerCase().trim() === rewardId.toString().toLowerCase().trim()) {
        sheet.deleteRow(i + 1);
        return jsonResponse({ success: true });
      }
    }
    return jsonResponse({ success: true }); // idempotent
  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
  }
}

// ====== ADD HOUSE RULE ======
function addHouseRule(params) {
  try {
    const { kid, rule, consequence, type } = params;
    if (!rule) return jsonResponse({ error: 'Missing rule text' }, 400);

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('House Rules');
    if (!sheet) return jsonResponse({ error: 'House Rules sheet not found' }, 404);

    sheet.appendRow([kid || '', rule, consequence || '', type || '']);
    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
  }
}

// ====== UPDATE HOUSE RULE ======
// Identified by originalKid + originalRule (composite key — no ID column)
function updateHouseRule(params) {
  try {
    const { originalKid, originalRule, kid, rule, consequence, type } = params;
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('House Rules');
    if (!sheet) return jsonResponse({ error: 'House Rules sheet not found' }, 404);

    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const rowKid = data[i][0] ? data[i][0].toString().trim() : '';
      const rowRule = data[i][1] ? data[i][1].toString().trim() : '';
      if (rowKid === (originalKid || '') && rowRule === originalRule) {
        sheet.getRange(i + 1, 1, 1, 4).setValues([[
          kid !== undefined ? kid : rowKid,
          rule !== undefined ? rule : rowRule,
          consequence !== undefined ? consequence : data[i][2],
          type !== undefined ? type : data[i][3]
        ]]);
        return jsonResponse({ success: true });
      }
    }
    return jsonResponse({ error: 'House rule not found' }, 404);
  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
  }
}

// ====== DELETE HOUSE RULE ======
function deleteHouseRule(params) {
  try {
    const { kid, rule } = params;
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('House Rules');
    if (!sheet) return jsonResponse({ error: 'House Rules sheet not found' }, 404);

    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const rowKid = data[i][0] ? data[i][0].toString().trim() : '';
      const rowRule = data[i][1] ? data[i][1].toString().trim() : '';
      if (rowKid === (kid || '') && rowRule === rule) {
        sheet.deleteRow(i + 1);
        return jsonResponse({ success: true });
      }
    }
    return jsonResponse({ success: true }); // idempotent
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
// Pass includeDisabled=true to include rows with multiplier <= 0 (for admin panel)
function getChores(includeDisabled) {
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

      // Skip chores with multiplier <= 0 (disabled chores) unless admin view
      if (!includeDisabled && !isNaN(rawMultiplier) && rawMultiplier <= 0) continue;

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
    // Expected columns: ID | Name | Cost | Icon | Text Fallback | Limit Type | Limit Count | Guidelines
    for (let i = 1; i < data.length; i++) {
      const [id, name, cost, icon, textFallback, limitType, limitCount, guidelines] = data[i];

      if (!id || !name) continue; // Skip empty rows

      const rawLimitCount = parseInt(limitCount);

      rewards.push({
        id: id.toString().toLowerCase(),
        name: name,
        cost: parseInt(cost) || 0,
        icon: icon || '🎁',
        text: textFallback || name.toUpperCase(),
        limitType: limitType ? limitType.toString().trim().toLowerCase() : null,
        limitCount: isNaN(rawLimitCount) ? null : rawLimitCount,
        guidelines: guidelines ? guidelines.toString().trim() : null
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
function getActivities(includeDisabled) {
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
    // Expected columns: Kid | Activity ID | Activity Name | BP | Multiplier | Max Per Week
    for (let i = 1; i < data.length; i++) {
      const [kid, activityId, activityName, bp, multiplier, maxPerWeek] = data[i];

      if (!activityId || !activityName) continue; // Skip empty rows

      const rawMultiplier = parseInt(multiplier);

      // Skip activities with multiplier <= 0 unless includeDisabled is requested
      if (!includeDisabled && !isNaN(rawMultiplier) && rawMultiplier <= 0) continue;

      const rawMaxPerWeek = parseInt(maxPerWeek);

      const activity = {
        id: activityId.toString().toLowerCase(),
        name: activityName,
        bp: parseInt(bp) || 1,
        multiplier: isNaN(rawMultiplier) ? 1 : rawMultiplier,
        maxPerWeek: isNaN(rawMaxPerWeek) ? null : rawMaxPerWeek
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

// ====== ADD CHORE ======
// Appends a new row to the Chores sheet
function addChore(params) {
  try {
    const { kidId, choreId, choreName, bp, multiplier } = params;
    if (!choreId || !choreName) return jsonResponse({ error: 'Missing choreId or choreName' }, 400);

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Chores');
    if (!sheet) return jsonResponse({ error: 'Chores sheet not found' }, 404);

    const newRow = sheet.getLastRow() + 1;
    sheet.getRange(newRow, 1, 1, 5).setValues([[
      kidId || '',
      choreId.toString().toLowerCase(),
      choreName,
      parseInt(bp) || 1,
      parseInt(multiplier) || 1
    ]]);

    return jsonResponse({ success: true, row: newRow });
  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
  }
}

// ====== UPDATE CHORE ======
// Updates name and BP for an existing chore row
function updateChore(params) {
  try {
    const { choreId, kidId, choreName, bp } = params;
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Chores');
    if (!sheet) return jsonResponse({ error: 'Chores sheet not found' }, 404);

    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const rowKid = data[i][0] ? data[i][0].toString().toLowerCase().trim() : '';
      const rowChoreId = data[i][1] ? data[i][1].toString().toLowerCase().trim() : '';
      const choreMatch = rowChoreId === choreId.toString().toLowerCase().trim();
      const kidMatch = (!kidId || kidId === '') ? rowKid === '' : rowKid === kidId.toString().toLowerCase().trim();

      if (choreMatch && kidMatch) {
        if (choreName) sheet.getRange(i + 1, 3).setValue(choreName);
        if (bp !== undefined) sheet.getRange(i + 1, 4).setValue(parseInt(bp) || 1);
        return jsonResponse({ success: true, row: i + 1 });
      }
    }
    return jsonResponse({ error: 'Chore not found' }, 404);
  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
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
          dailyBP: kid.defaultDailyBP ?? 5,
          totalBP: kid.defaultTotalBP ?? 0
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

// ====== MEAL LIBRARY ======
// Sheet "Meals": columns ID | Name | Active

function getMeals() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Meals');
    if (!sheet) {
      // Sheet doesn't exist yet — return empty list so client degrades gracefully
      return jsonResponse({ success: true, meals: [] });
    }
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return jsonResponse({ success: true, meals: [] });

    const data = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
    const meals = data
      .filter(row => row[0])
      .map(row => ({ id: String(row[0]), name: String(row[1]), active: row[2] !== false && row[2] !== 'false' && row[2] !== 0 }));

    return jsonResponse({ success: true, meals });
  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
  }
}

function addMeal(params) {
  try {
    const name = (params.name || '').trim();
    if (!name) return jsonResponse({ error: 'name required' }, 400);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Meals');
    if (!sheet) {
      sheet = ss.insertSheet('Meals');
      sheet.getRange(1, 1, 1, 3).setValues([['ID', 'Name', 'Active']]);
    }

    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-') + '-' + Date.now().toString(36);
    sheet.appendRow([id, name, true]);
    return jsonResponse({ success: true, id });
  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
  }
}

// ====== DAILY MEAL ======
// Sheet "Daily Meal": columns Date | MealName

function getMealPlan(daysParam) {
  try {
    const days = parseInt(daysParam) || 8;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Daily Meal');
    if (!sheet) return jsonResponse({ success: true, plan: [] });

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return jsonResponse({ success: true, plan: [] });

    // Build set of target dates (today + N days)
    const tz = Session.getScriptTimeZone();
    const targets = new Set();
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      targets.add(Utilities.formatDate(d, tz, 'yyyy-MM-dd'));
    }

    const data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    const planMap = {};
    // Iterate forward so later rows (more recent) win
    data.forEach(row => {
      if (!row[0]) return;
      const rowDate = row[0] instanceof Date
        ? Utilities.formatDate(row[0], tz, 'yyyy-MM-dd')
        : String(row[0]);
      if (targets.has(rowDate) && row[1]) planMap[rowDate] = String(row[1]);
    });

    const plan = Object.entries(planMap).map(([date, mealName]) => ({ date, mealName }));
    return jsonResponse({ success: true, plan });
  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
  }
}

function getDailyMeal(dateParam) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Daily Meal');
    if (!sheet) return jsonResponse({ success: true, meal: null });

    const today = dateParam || new Date().toISOString().split('T')[0];
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return jsonResponse({ success: true, meal: null });

    const data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    // Search from bottom so most-recent entry wins
    for (let i = data.length - 1; i >= 0; i--) {
      const rowDate = data[i][0] instanceof Date
        ? Utilities.formatDate(data[i][0], Session.getScriptTimeZone(), 'yyyy-MM-dd')
        : String(data[i][0]);
      if (rowDate === today) {
        return jsonResponse({ success: true, meal: { date: today, mealName: String(data[i][1]) } });
      }
    }
    return jsonResponse({ success: true, meal: null });
  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
  }
}

function setDailyMeal(params) {
  try {
    const date = (params.date || '').trim();
    const mealName = (params.mealName || '').trim();
    if (!date) return jsonResponse({ error: 'date required' }, 400);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Daily Meal');
    if (!sheet) {
      sheet = ss.insertSheet('Daily Meal');
      sheet.getRange(1, 1, 1, 2).setValues([['Date', 'MealName']]);
    }

    // Overwrite existing row for this date if present
    const lastRow = sheet.getLastRow();
    if (lastRow >= 2) {
      const dates = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (let i = 0; i < dates.length; i++) {
        const rowDate = dates[i][0] instanceof Date
          ? Utilities.formatDate(dates[i][0], Session.getScriptTimeZone(), 'yyyy-MM-dd')
          : String(dates[i][0]);
        if (rowDate === date) {
          sheet.getRange(i + 2, 2).setValue(mealName);
          return jsonResponse({ success: true });
        }
      }
    }

    sheet.appendRow([date, mealName]);
    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
  }
}

// ====== MEAL REQUESTS ======
// Sheet "Meal Requests": Date | KidName | MealName | Timestamp

function getMealRequests() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Meal Requests');
    if (!sheet) return jsonResponse({ success: true, requests: [] });
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return jsonResponse({ success: true, requests: [] });
    const data = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
    const requests = data.filter(r => r[0]).map(r => ({
      date: r[0] instanceof Date
        ? Utilities.formatDate(r[0], Session.getScriptTimeZone(), 'yyyy-MM-dd')
        : String(r[0]),
      kidName: String(r[1]),
      mealName: String(r[2]),
      requestedAt: r[3] ? String(r[3]) : ''
    }));
    return jsonResponse({ success: true, requests });
  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
  }
}

function addMealRequest(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Meal Requests');
    if (!sheet) {
      sheet = ss.insertSheet('Meal Requests');
      sheet.getRange(1, 1, 1, 4).setValues([['Date', 'KidName', 'MealName', 'Timestamp']]);
    }
    sheet.appendRow([params.date, params.kidName, params.mealName, new Date().toISOString()]);
    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
  }
}

// ====== CHECKLISTS ======
// Stores the full checklist definitions as a JSON blob in the Checklists sheet.
// Checked state (which items are ticked) stays in the browser — resets daily.

function getChecklistsData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Checklists');
    if (!sheet || sheet.getLastRow() < 2) {
      return jsonResponse({ success: true, checklists: [] });
    }
    const raw = sheet.getRange(2, 2).getValue();
    const checklists = raw ? JSON.parse(raw) : [];
    return jsonResponse({ success: true, checklists });
  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
  }
}

function saveChecklistsData(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Checklists');
    if (!sheet) {
      sheet = ss.insertSheet('Checklists');
      sheet.getRange(1, 1, 1, 2).setValues([['Key', 'Value']]);
      sheet.getRange(2, 1).setValue('data');
    }
    sheet.getRange(2, 2).setValue(JSON.stringify(params.checklists || []));
    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
  }
}

// ====== PURGE COMPLETED CHECKLIST ITEMS ======
// Run via a time-based trigger at ~12:05 AM.
// Removes items flagged deleteWhenDone that were checked yesterday.
function purgeCompletedChecklistItems() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Build set of itemIds checked yesterday, keyed by listId
    const statusSheet = ss.getSheetByName('Daily Status');
    const checkedByList = {}; // { listId: Set<itemId> }
    if (statusSheet && statusSheet.getLastRow() >= 2) {
      const tz = Session.getScriptTimeZone();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = Utilities.formatDate(yesterday, tz, 'yyyy-MM-dd');

      const rows = statusSheet.getRange(2, 1, statusSheet.getLastRow() - 1, 5).getValues();
      // Last-write-wins per (type, kidId, itemId)
      const statusMap = {};
      rows.forEach(row => {
        if (!row[0]) return;
        const rowDate = Utilities.formatDate(new Date(row[0]), tz, 'yyyy-MM-dd');
        if (rowDate !== yesterdayStr) return;
        const type   = row[1] ? row[1].toString() : '';
        const listId = row[2] ? row[2].toString() : '';
        const itemId = row[3] ? row[3].toString() : '';
        const status = row[4] ? row[4].toString() : '';
        if (type !== 'checklist') return;
        statusMap[`${listId}-${itemId}`] = { listId, itemId, status };
      });
      Object.values(statusMap).forEach(({ listId, itemId, status }) => {
        if (status !== 'checked') return;
        if (!checkedByList[listId]) checkedByList[listId] = new Set();
        checkedByList[listId].add(itemId);
      });
    }

    // Nothing was checked — nothing to purge
    if (Object.keys(checkedByList).length === 0) return;

    // Load checklists, filter out completed deleteWhenDone items, save back
    const clSheet = ss.getSheetByName('Checklists');
    if (!clSheet || clSheet.getLastRow() < 2) return;

    const raw = clSheet.getRange(2, 2).getValue();
    const lists = raw ? JSON.parse(raw) : [];
    let changed = false;

    lists.forEach(list => {
      const checked = checkedByList[list.id];
      if (!checked) return;
      const before = list.items.length;
      list.items = list.items.filter(item => !(item.deleteWhenDone && checked.has(item.id)));
      if (list.items.length !== before) changed = true;
    });

    if (changed) {
      clSheet.getRange(2, 2).setValue(JSON.stringify(lists));
      Logger.log('purgeCompletedChecklistItems: saved updated checklists');
    }
  } catch (error) {
    Logger.log('purgeCompletedChecklistItems error: ' + error.toString());
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

  Logger.log('\nTests complete! Check the sheets to verify the test entries were added.');
}
