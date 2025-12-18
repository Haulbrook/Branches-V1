/**
 * Deep Roots Landscape - Work Order Management API
 * Google Apps Script Web App
 *
 * Deploy this as a web app to sync work orders across all tools
 *
 * SETUP:
 * 1. Create a new Google Sheet
 * 2. Go to Extensions > Apps Script
 * 3. Paste this entire code
 * 4. Update SPREADSHEET_ID below with your sheet's ID
 * 5. Deploy > New Deployment > Web App
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 6. Copy the Web App URL into your dashboard settings
 */

// ============================================
// CONFIGURATION - UPDATE THIS!
// ============================================
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE'; // Get this from your Google Sheet URL

// Sheet names (will be created automatically)
const SHEETS = {
  WORK_ORDERS: 'WorkOrders',
  LINE_ITEMS: 'LineItems',
  PROGRESS: 'Progress'
};

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize the spreadsheet with required sheets and headers
 * Run this function once after setting SPREADSHEET_ID
 */
function initializeSpreadsheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // Work Orders sheet
  let woSheet = ss.getSheetByName(SHEETS.WORK_ORDERS);
  if (!woSheet) {
    woSheet = ss.insertSheet(SHEETS.WORK_ORDERS);
    woSheet.getRange(1, 1, 1, 10).setValues([[
      'woNumber', 'jobName', 'client', 'category', 'status',
      'address', 'jobNotes', 'salesRep', 'importedAt', 'lastUpdated'
    ]]);
    woSheet.getRange(1, 1, 1, 10).setFontWeight('bold').setBackground('#2E7D32').setFontColor('white');
    woSheet.setFrozenRows(1);
  }

  // Line Items sheet
  let liSheet = ss.getSheetByName(SHEETS.LINE_ITEMS);
  if (!liSheet) {
    liSheet = ss.insertSheet(SHEETS.LINE_ITEMS);
    liSheet.getRange(1, 1, 1, 6).setValues([[
      'woNumber', 'lineNumber', 'itemName', 'description', 'quantity', 'unit'
    ]]);
    liSheet.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#1B5E20').setFontColor('white');
    liSheet.setFrozenRows(1);
  }

  // Progress sheet
  let progSheet = ss.getSheetByName(SHEETS.PROGRESS);
  if (!progSheet) {
    progSheet = ss.insertSheet(SHEETS.PROGRESS);
    progSheet.getRange(1, 1, 1, 8).setValues([[
      'woNumber', 'lineIndex', 'quantityCompleted', 'status', 'notes',
      'lastUpdated', 'updatedBy', 'hoursUsed'
    ]]);
    progSheet.getRange(1, 1, 1, 8).setFontWeight('bold').setBackground('#4CAF50').setFontColor('white');
    progSheet.setFrozenRows(1);
  }

  // Remove default Sheet1 if it exists
  const defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }

  Logger.log('Spreadsheet initialized successfully!');
  return { success: true, message: 'Spreadsheet initialized' };
}

// ============================================
// WEB APP ENDPOINTS
// ============================================

/**
 * Handle GET requests
 */
function doGet(e) {
  const action = e.parameter.action || 'getAll';
  const woNumber = e.parameter.woNumber;

  let result;

  try {
    switch(action) {
      case 'getAll':
        result = getAllWorkOrders();
        break;
      case 'getOne':
        result = getWorkOrder(woNumber);
        break;
      case 'getProgress':
        result = getProgress(woNumber);
        break;
      case 'getSummary':
        result = getWorkOrderSummary();
        break;
      default:
        result = { error: 'Unknown action', action: action };
    }
  } catch (error) {
    result = { error: error.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle POST requests
 */
function doPost(e) {
  let result;

  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action || 'save';

    switch(action) {
      case 'save':
      case 'saveWorkOrders':
        result = saveWorkOrders(data.workOrders || [data]);
        break;
      case 'updateProgress':
        result = updateProgress(data.woNumber, data.progress);
        break;
      case 'deleteWorkOrder':
        result = deleteWorkOrder(data.woNumber);
        break;
      case 'clearAll':
        result = clearAllData();
        break;
      default:
        result = { error: 'Unknown action', action: action };
    }
  } catch (error) {
    result = { error: error.message, stack: error.stack };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// WORK ORDER OPERATIONS
// ============================================

/**
 * Get all work orders with their line items and progress
 */
function getAllWorkOrders() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // Get work orders
  const woSheet = ss.getSheetByName(SHEETS.WORK_ORDERS);
  const woData = woSheet.getDataRange().getValues();
  const woHeaders = woData[0];

  // Get line items
  const liSheet = ss.getSheetByName(SHEETS.LINE_ITEMS);
  const liData = liSheet.getDataRange().getValues();
  const liHeaders = liData[0];

  // Get progress
  const progSheet = ss.getSheetByName(SHEETS.PROGRESS);
  const progData = progSheet.getDataRange().getValues();
  const progHeaders = progData[0];

  // Build work order objects
  const workOrders = [];
  const lineItemsMap = {};
  const progressMap = {};

  // Index line items by woNumber
  for (let i = 1; i < liData.length; i++) {
    const row = liData[i];
    const woNumber = String(row[0]);
    if (!lineItemsMap[woNumber]) lineItemsMap[woNumber] = [];
    lineItemsMap[woNumber].push({
      lineNumber: row[1],
      itemName: row[2],
      description: row[3],
      quantity: row[4],
      unit: row[5] || ''
    });
  }

  // Index progress by woNumber
  for (let i = 1; i < progData.length; i++) {
    const row = progData[i];
    const woNumber = String(row[0]);
    if (!progressMap[woNumber]) progressMap[woNumber] = { items: [] };
    progressMap[woNumber].items.push({
      index: row[1],
      quantityCompleted: row[2] || 0,
      status: row[3] || 'not-started',
      notes: row[4] || '',
      lastUpdated: row[5] || '',
      updatedBy: row[6] || '',
      hoursUsed: row[7] || 0
    });
  }

  // Build complete work order objects
  for (let i = 1; i < woData.length; i++) {
    const row = woData[i];
    const woNumber = String(row[0]);
    if (!woNumber) continue;

    workOrders.push({
      woNumber: woNumber,
      jobName: row[1] || '',
      client: row[2] || '',
      category: row[3] || '',
      status: row[4] || '',
      address: row[5] || '',
      jobNotes: row[6] || '',
      salesRep: row[7] || '',
      importedAt: row[8] || '',
      lastUpdated: row[9] || '',
      lineItems: lineItemsMap[woNumber] || [],
      progress: progressMap[woNumber] || { items: [] }
    });
  }

  return {
    success: true,
    workOrders: workOrders,
    count: workOrders.length,
    timestamp: new Date().toISOString()
  };
}

/**
 * Get a single work order by number
 */
function getWorkOrder(woNumber) {
  const all = getAllWorkOrders();
  const wo = all.workOrders.find(w => w.woNumber === String(woNumber));

  if (!wo) {
    return { success: false, error: 'Work order not found', woNumber: woNumber };
  }

  return { success: true, workOrder: wo };
}

/**
 * Get summary stats for all work orders (for dashboard widgets)
 */
function getWorkOrderSummary() {
  const all = getAllWorkOrders();
  const workOrders = all.workOrders;

  const summary = workOrders.map(wo => {
    const totalItems = wo.lineItems.length;
    const progressItems = wo.progress?.items || [];

    // Calculate overall percentage
    const completed = progressItems.filter(p => p.status === 'completed').length;
    const percentage = totalItems > 0 ? Math.round((completed / totalItems) * 100) : 0;

    // Calculate hours (look for items with "hour" or "labor" in name)
    let totalHours = 0;
    let usedHours = 0;

    wo.lineItems.forEach((item, idx) => {
      const itemLower = item.itemName.toLowerCase();
      if (itemLower.includes('hour') || itemLower.includes('labor') || itemLower.includes('man')) {
        totalHours += item.quantity || 0;
        const prog = progressItems.find(p => p.index === idx);
        if (prog) {
          usedHours += prog.hoursUsed || prog.quantityCompleted || 0;
        }
      }
    });

    return {
      woNumber: wo.woNumber,
      jobName: wo.jobName,
      client: wo.client,
      address: wo.address,
      percentage: percentage,
      totalItems: totalItems,
      completedItems: completed,
      totalHours: totalHours,
      usedHours: usedHours,
      remainingHours: totalHours - usedHours,
      status: percentage === 100 ? 'completed' : percentage > 0 ? 'in-progress' : 'not-started'
    };
  });

  return {
    success: true,
    summary: summary,
    totals: {
      workOrders: workOrders.length,
      totalHours: summary.reduce((sum, s) => sum + s.totalHours, 0),
      usedHours: summary.reduce((sum, s) => sum + s.usedHours, 0),
      avgCompletion: summary.length > 0
        ? Math.round(summary.reduce((sum, s) => sum + s.percentage, 0) / summary.length)
        : 0
    }
  };
}

/**
 * Save work orders (create or update)
 */
function saveWorkOrders(workOrders) {
  if (!Array.isArray(workOrders)) {
    workOrders = [workOrders];
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const woSheet = ss.getSheetByName(SHEETS.WORK_ORDERS);
  const liSheet = ss.getSheetByName(SHEETS.LINE_ITEMS);

  // Get existing work orders to update
  const existingData = woSheet.getDataRange().getValues();
  const existingMap = {};
  for (let i = 1; i < existingData.length; i++) {
    existingMap[String(existingData[i][0])] = i + 1; // Store row number
  }

  const timestamp = new Date().toISOString();
  let added = 0;
  let updated = 0;

  workOrders.forEach(wo => {
    const woNumber = String(wo.woNumber);
    const rowData = [
      woNumber,
      wo.jobName || '',
      wo.client || '',
      wo.category || '',
      wo.status || '',
      wo.address || '',
      wo.jobNotes || '',
      wo.salesRep || '',
      wo.importedAt || timestamp,
      timestamp
    ];

    if (existingMap[woNumber]) {
      // Update existing row
      woSheet.getRange(existingMap[woNumber], 1, 1, 10).setValues([rowData]);
      updated++;
    } else {
      // Add new row
      woSheet.appendRow(rowData);
      added++;
    }

    // Handle line items - delete existing and re-add
    if (wo.lineItems && wo.lineItems.length > 0) {
      // Find and delete existing line items for this WO
      const liData = liSheet.getDataRange().getValues();
      const rowsToDelete = [];
      for (let i = liData.length - 1; i >= 1; i--) {
        if (String(liData[i][0]) === woNumber) {
          rowsToDelete.push(i + 1);
        }
      }
      // Delete from bottom up to preserve row indices
      rowsToDelete.forEach(row => {
        liSheet.deleteRow(row);
      });

      // Add new line items
      wo.lineItems.forEach((item, index) => {
        liSheet.appendRow([
          woNumber,
          item.lineNumber || index + 1,
          item.itemName || '',
          item.description || '',
          item.quantity || 0,
          item.unit || ''
        ]);
      });
    }
  });

  return {
    success: true,
    added: added,
    updated: updated,
    total: workOrders.length,
    timestamp: timestamp
  };
}

/**
 * Delete a work order and its related data
 */
function deleteWorkOrder(woNumber) {
  woNumber = String(woNumber);
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // Delete from all sheets
  [SHEETS.WORK_ORDERS, SHEETS.LINE_ITEMS, SHEETS.PROGRESS].forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    const data = sheet.getDataRange().getValues();
    for (let i = data.length - 1; i >= 1; i--) {
      if (String(data[i][0]) === woNumber) {
        sheet.deleteRow(i + 1);
      }
    }
  });

  return { success: true, deleted: woNumber };
}

// ============================================
// PROGRESS OPERATIONS
// ============================================

/**
 * Get progress for a work order
 */
function getProgress(woNumber) {
  woNumber = String(woNumber);
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.PROGRESS);
  const data = sheet.getDataRange().getValues();

  const items = [];
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === woNumber) {
      items.push({
        index: data[i][1],
        quantityCompleted: data[i][2] || 0,
        status: data[i][3] || 'not-started',
        notes: data[i][4] || '',
        lastUpdated: data[i][5] || '',
        updatedBy: data[i][6] || '',
        hoursUsed: data[i][7] || 0
      });
    }
  }

  return {
    success: true,
    woNumber: woNumber,
    progress: { items: items }
  };
}

/**
 * Update progress for a work order
 */
function updateProgress(woNumber, progress) {
  woNumber = String(woNumber);
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.PROGRESS);
  const timestamp = new Date().toISOString();

  // Delete existing progress for this WO
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]) === woNumber) {
      sheet.deleteRow(i + 1);
    }
  }

  // Add new progress items
  if (progress && progress.items) {
    progress.items.forEach(item => {
      sheet.appendRow([
        woNumber,
        item.index,
        item.quantityCompleted || 0,
        item.status || 'not-started',
        item.notes || '',
        timestamp,
        item.updatedBy || '',
        item.hoursUsed || 0
      ]);
    });
  }

  return {
    success: true,
    woNumber: woNumber,
    itemsUpdated: progress?.items?.length || 0,
    timestamp: timestamp
  };
}

// ============================================
// UTILITY OPERATIONS
// ============================================

/**
 * Clear all data (use with caution!)
 */
function clearAllData() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  [SHEETS.WORK_ORDERS, SHEETS.LINE_ITEMS, SHEETS.PROGRESS].forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.deleteRows(2, lastRow - 1);
    }
  });

  return { success: true, message: 'All data cleared' };
}

/**
 * Test function - run this to verify setup
 */
function testSetup() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    Logger.log('Connected to spreadsheet: ' + ss.getName());

    const sheets = ss.getSheets().map(s => s.getName());
    Logger.log('Available sheets: ' + sheets.join(', '));

    const requiredSheets = [SHEETS.WORK_ORDERS, SHEETS.LINE_ITEMS, SHEETS.PROGRESS];
    const missing = requiredSheets.filter(s => !sheets.includes(s));

    if (missing.length > 0) {
      Logger.log('Missing sheets: ' + missing.join(', '));
      Logger.log('Run initializeSpreadsheet() to create them');
    } else {
      Logger.log('All required sheets present!');
    }

    return { success: true, sheets: sheets, missing: missing };
  } catch (error) {
    Logger.log('Error: ' + error.message);
    return { success: false, error: error.message };
  }
}
