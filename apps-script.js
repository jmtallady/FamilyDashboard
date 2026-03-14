// ==========================================
// FAMILY DASHBOARD - GOOGLE APPS SCRIPT
// ==========================================
// Deploy this as a Web App in your Google Sheet
//
// SETUP INSTRUCTIONS:
// 1. Create new Google Sheet with this structure:
//    - Sheet name: "Points Log"
//    - Row 1 headers: Date | Kid | Points | Note
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
    date: 1,    // Column A
    kid: 2,     // Column B
    points: 3,  // Column C
    note: 4     // Column D
  }
};

// ====== MAIN WEB APP HANDLERS ======
function doGet(e) {
  const action = e.parameter.action;

  if (action === 'getCurrentPoints') {
    return getCurrentPoints();
  } else if (action === 'test') {
    return jsonResponse({ message: 'API is working!', timestamp: new Date().toISOString() });
  }

  return jsonResponse({ error: 'Invalid action. Use ?action=getCurrentPoints or ?action=test' }, 400);
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

    const data = sheet.getRange(CONFIG.startRow, 1, lastRow - CONFIG.startRow + 1, 4).getValues();

    // Find the most recent entry for each kid
    const latestPoints = {};

    // Process rows in reverse order (most recent first)
    for (let i = data.length - 1; i >= 0; i--) {
      const [date, kid, points, note] = data[i];

      if (kid && !latestPoints[kid.toLowerCase()]) {
        latestPoints[kid.toLowerCase()] = {
          points: points || 5,
          date: date ? new Date(date).toLocaleDateString() : null,
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
// Appends a new row to the Points Log
function logPoints(params) {
  try {
    const { kid, points, note } = params;

    if (!kid || points === undefined) {
      return jsonResponse({ error: 'Missing required fields: kid, points' }, 400);
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.pointsLogSheet);

    if (!sheet) {
      return jsonResponse({ error: `Sheet "${CONFIG.pointsLogSheet}" not found` }, 404);
    }

    const today = new Date();
    const lastRow = sheet.getLastRow();
    const newRow = lastRow + 1;

    // Append new row: Date | Kid | Points | Note
    sheet.getRange(newRow, CONFIG.columns.date).setValue(today);
    sheet.getRange(newRow, CONFIG.columns.kid).setValue(kid);
    sheet.getRange(newRow, CONFIG.columns.points).setValue(points);
    if (note) {
      sheet.getRange(newRow, CONFIG.columns.note).setValue(note);
    }

    return jsonResponse({
      success: true,
      kid: kid,
      points: points,
      date: today.toLocaleDateString(),
      row: newRow,
      message: 'Points logged successfully'
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
    points: 7,
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
