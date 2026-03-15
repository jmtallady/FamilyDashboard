// ==========================================
// FAMILY DASHBOARD - GOOGLE APPS SCRIPT
// ==========================================
// Deploy this as a Web App in your Google Sheet
//
// SETUP INSTRUCTIONS:
// 1. Create new Google Sheet with this structure:
//    - Sheet name: "Points Log"
//    - Row 1 headers: Date | Kid | Daily BP | Total BP | Prize Coins | Type | Note
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
  } else if (action === 'test') {
    return jsonResponse({ message: 'API is working!', timestamp: new Date().toISOString() });
  }

  return jsonResponse({ error: 'Invalid action. Use ?action=getCurrentPoints, ?action=getCalendarEvents, ?action=getConfig, or ?action=test' }, 400);
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
    const todayDateString = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd');

    // Get all data to find if today's entry exists
    const lastRow = sheet.getLastRow();
    let existingRow = null;

    if (lastRow >= CONFIG.startRow) {
      const data = sheet.getRange(CONFIG.startRow, 1, lastRow - CONFIG.startRow + 1, 7).getValues();

      // Look for today's entry for this kid
      for (let i = data.length - 1; i >= 0; i--) {
        const [date, rowKid] = data[i];
        const rowDateString = Utilities.formatDate(new Date(date), Session.getScriptTimeZone(), 'yyyy-MM-dd');

        if (rowDateString === todayDateString && rowKid.toLowerCase() === kid.toLowerCase()) {
          existingRow = CONFIG.startRow + i;
          break;
        }
      }
    }

    if (existingRow) {
      // Update existing row
      sheet.getRange(existingRow, CONFIG.columns.dailyBP).setValue(dailyBP);
      sheet.getRange(existingRow, CONFIG.columns.totalBP).setValue(totalBP);
      sheet.getRange(existingRow, CONFIG.columns.prizeCoins).setValue(prizeCoins);
      sheet.getRange(existingRow, CONFIG.columns.type).setValue(type || 'behavior');
      if (note) {
        sheet.getRange(existingRow, CONFIG.columns.note).setValue(note);
      }

      return jsonResponse({
        success: true,
        kid: kid,
        dailyBP: dailyBP,
        totalBP: totalBP,
        prizeCoins: prizeCoins,
        type: type,
        date: today.toLocaleDateString(),
        row: existingRow,
        updated: true,
        message: 'Points updated for today'
      });
    } else {
      // Create new row for today
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
        message: 'Points logged for today'
      });
    }

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

function testAPI() {
  Logger.log('Testing getCurrentPoints...');
  testGetCurrentPoints();

  Logger.log('\nTesting logPoints...');
  testLogPoints();

  Logger.log('\nTests complete! Check the sheet to verify the test entry was added.');
}
