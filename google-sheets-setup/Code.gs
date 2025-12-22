/**
 * Google Apps Script Backend for Work Order Sync
 *
 * This script provides a REST API for syncing work orders, line items,
 * and progress data between the Branches dashboard and Google Sheets.
 *
 * Deploy as Web App with:
 * - Execute as: Me
 * - Who has access: Anyone
 */

// Sheet names
const SHEETS = {
  WORK_ORDERS: 'WorkOrders',
  LINE_ITEMS: 'LineItems',
  PROGRESS: 'Progress'
};

/**
 * Initialize sheets on first run
 */
function initializeSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Create WorkOrders sheet
  let woSheet = ss.getSheetByName(SHEETS.WORK_ORDERS);
  if (!woSheet) {
    woSheet = ss.insertSheet(SHEETS.WORK_ORDERS);
    woSheet.appendRow([
      'woNumber', 'jobName', 'client', 'category', 'salesRep',
      'address', 'lat', 'lng', 'lastModified', 'syncId'
    ]);
    woSheet.getRange(1, 1, 1, 10).setFontWeight('bold');
  }

  // Create LineItems sheet
  let liSheet = ss.getSheetByName(SHEETS.LINE_ITEMS);
  if (!liSheet) {
    liSheet = ss.insertSheet(SHEETS.LINE_ITEMS);
    liSheet.appendRow([
      'woNumber', 'itemIndex', 'itemCode', 'itemName', 'quantity',
      'unit', 'category', 'lastModified'
    ]);
    liSheet.getRange(1, 1, 1, 8).setFontWeight('bold');
  }

  // Create Progress sheet
  let pSheet = ss.getSheetByName(SHEETS.PROGRESS);
  if (!pSheet) {
    pSheet = ss.insertSheet(SHEETS.PROGRESS);
    pSheet.appendRow([
      'woNumber', 'itemIndex', 'quantityCompleted', 'status',
      'notes', 'lastModified', 'modifiedBy'
    ]);
    pSheet.getRange(1, 1, 1, 7).setFontWeight('bold');
  }

  return { success: true, message: 'Sheets initialized' };
}

/**
 * Handle GET requests
 */
function doGet(e) {
  const action = e.parameter.action || 'ping';
  let result;

  try {
    switch (action) {
      case 'ping':
        result = { success: true, message: 'API is running', timestamp: new Date().toISOString() };
        break;
      case 'init':
        result = initializeSheets();
        break;
      case 'getWorkOrders':
        result = getWorkOrders();
        break;
      case 'getProgress':
        result = getProgress(e.parameter.woNumber);
        break;
      case 'getSummary':
        result = getSummary(e.parameter.woNumber);
        break;
      case 'getAll':
        result = getAllData();
        break;
      default:
        result = { success: false, error: 'Unknown action: ' + action };
    }
  } catch (error) {
    result = { success: false, error: error.toString() };
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
    const action = data.action;

    switch (action) {
      case 'init':
        result = initializeSheets();
        break;
      case 'syncWorkOrders':
        result = syncWorkOrders(data.workOrders);
        break;
      case 'syncProgress':
        result = syncProgress(data.woNumber, data.progress);
        break;
      case 'updateProgress':
        result = updateProgressItem(data.woNumber, data.itemIndex, data.progressData);
        break;
      case 'fullSync':
        result = fullSync(data);
        break;
      case 'clearAll':
        result = clearAllData();
        break;
      default:
        result = { success: false, error: 'Unknown action: ' + action };
    }
  } catch (error) {
    result = { success: false, error: error.toString() };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Get all work orders
 */
function getWorkOrders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const woSheet = ss.getSheetByName(SHEETS.WORK_ORDERS);
  const liSheet = ss.getSheetByName(SHEETS.LINE_ITEMS);

  if (!woSheet || !liSheet) {
    return { success: false, error: 'Sheets not initialized. Call init first.' };
  }

  const woData = woSheet.getDataRange().getValues();
  const liData = liSheet.getDataRange().getValues();

  if (woData.length <= 1) {
    return { success: true, workOrders: [] };
  }

  const woHeaders = woData[0];
  const liHeaders = liData[0];

  // Build line items map by woNumber
  const lineItemsMap = {};
  for (let i = 1; i < liData.length; i++) {
    const row = liData[i];
    const woNumber = String(row[0]);
    if (!lineItemsMap[woNumber]) {
      lineItemsMap[woNumber] = [];
    }
    lineItemsMap[woNumber].push({
      itemCode: row[2],
      itemName: row[3],
      quantity: row[4],
      unit: row[5],
      category: row[6]
    });
  }

  // Build work orders with line items
  const workOrders = [];
  for (let i = 1; i < woData.length; i++) {
    const row = woData[i];
    const woNumber = String(row[0]);
    workOrders.push({
      woNumber: woNumber,
      jobName: row[1],
      client: row[2],
      category: row[3],
      salesRep: row[4],
      address: row[5],
      lat: row[6],
      lng: row[7],
      lastModified: row[8],
      lineItems: lineItemsMap[woNumber] || []
    });
  }

  return { success: true, workOrders: workOrders };
}

/**
 * Get progress for a specific work order
 */
function getProgress(woNumber) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const pSheet = ss.getSheetByName(SHEETS.PROGRESS);

  if (!pSheet) {
    return { success: false, error: 'Progress sheet not found' };
  }

  const data = pSheet.getDataRange().getValues();
  if (data.length <= 1) {
    return { success: true, progress: null };
  }

  const items = [];
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(woNumber)) {
      items.push({
        index: data[i][1],
        quantityCompleted: data[i][2],
        status: data[i][3],
        notes: data[i][4],
        lastModified: data[i][5],
        modifiedBy: data[i][6]
      });
    }
  }

  return {
    success: true,
    progress: items.length > 0 ? { woNumber: woNumber, items: items } : null
  };
}

/**
 * Get summary for progress widget
 */
function getSummary(woNumber) {
  const woResult = getWorkOrders();
  const progressResult = getProgress(woNumber);

  if (!woResult.success) return woResult;

  const wo = woResult.workOrders.find(w => String(w.woNumber) === String(woNumber));
  if (!wo) {
    return { success: false, error: 'Work order not found' };
  }

  const lineItems = wo.lineItems || [];
  const progressItems = progressResult.progress?.items || [];

  let totalItems = lineItems.length;
  let completedItems = 0;
  let totalHours = 0;
  let completedHours = 0;

  lineItems.forEach((item, index) => {
    const prog = progressItems.find(p => p.index === index);
    const isLaborItem = /hour|labor|man|time|install/i.test(item.itemName || '');

    if (prog && prog.status === 'completed') {
      completedItems++;
      if (isLaborItem) completedHours += item.quantity || 0;
    } else if (prog && prog.status === 'in-progress' && isLaborItem) {
      completedHours += prog.quantityCompleted || 0;
    }

    if (isLaborItem) totalHours += item.quantity || 0;
  });

  const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return {
    success: true,
    summary: {
      woNumber: woNumber,
      jobName: wo.jobName,
      percentage: percentage,
      completedItems: completedItems,
      totalItems: totalItems,
      completedHours: Math.round(completedHours),
      totalHours: Math.round(totalHours),
      remainingHours: Math.round(totalHours - completedHours)
    }
  };
}

/**
 * Get all data (work orders + progress)
 */
function getAllData() {
  const woResult = getWorkOrders();
  if (!woResult.success) return woResult;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const pSheet = ss.getSheetByName(SHEETS.PROGRESS);

  const progressData = {};
  if (pSheet) {
    const data = pSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const woNumber = String(data[i][0]);
      if (!progressData[woNumber]) {
        progressData[woNumber] = { items: [] };
      }
      progressData[woNumber].items.push({
        index: data[i][1],
        quantityCompleted: data[i][2],
        status: data[i][3],
        notes: data[i][4],
        lastModified: data[i][5]
      });
    }
  }

  return {
    success: true,
    workOrders: woResult.workOrders,
    progressData: progressData,
    lastSync: new Date().toISOString()
  };
}

/**
 * Sync work orders from client
 */
function syncWorkOrders(workOrders) {
  if (!workOrders || !Array.isArray(workOrders)) {
    return { success: false, error: 'Invalid work orders data' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let woSheet = ss.getSheetByName(SHEETS.WORK_ORDERS);
  let liSheet = ss.getSheetByName(SHEETS.LINE_ITEMS);

  // Initialize if needed
  if (!woSheet || !liSheet) {
    initializeSheets();
    woSheet = ss.getSheetByName(SHEETS.WORK_ORDERS);
    liSheet = ss.getSheetByName(SHEETS.LINE_ITEMS);
  }

  const timestamp = new Date().toISOString();

  // Clear existing data (except headers)
  if (woSheet.getLastRow() > 1) {
    woSheet.deleteRows(2, woSheet.getLastRow() - 1);
  }
  if (liSheet.getLastRow() > 1) {
    liSheet.deleteRows(2, liSheet.getLastRow() - 1);
  }

  // Insert work orders
  const woRows = [];
  const liRows = [];

  workOrders.forEach(wo => {
    woRows.push([
      wo.woNumber,
      wo.jobName || '',
      wo.client || '',
      wo.category || '',
      wo.salesRep || '',
      wo.address || '',
      wo.lat || '',
      wo.lng || '',
      timestamp,
      wo.syncId || ''
    ]);

    // Insert line items
    (wo.lineItems || []).forEach((item, index) => {
      liRows.push([
        wo.woNumber,
        index,
        item.itemCode || '',
        item.itemName || '',
        item.quantity || 0,
        item.unit || '',
        item.category || '',
        timestamp
      ]);
    });
  });

  if (woRows.length > 0) {
    woSheet.getRange(2, 1, woRows.length, 10).setValues(woRows);
  }
  if (liRows.length > 0) {
    liSheet.getRange(2, 1, liRows.length, 8).setValues(liRows);
  }

  return {
    success: true,
    message: `Synced ${workOrders.length} work orders with ${liRows.length} line items`,
    timestamp: timestamp
  };
}

/**
 * Sync progress data for a work order
 */
function syncProgress(woNumber, progress) {
  if (!woNumber || !progress) {
    return { success: false, error: 'Missing woNumber or progress data' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let pSheet = ss.getSheetByName(SHEETS.PROGRESS);

  if (!pSheet) {
    initializeSheets();
    pSheet = ss.getSheetByName(SHEETS.PROGRESS);
  }

  const timestamp = new Date().toISOString();

  // Remove existing progress for this work order
  const data = pSheet.getDataRange().getValues();
  for (let i = data.length - 1; i > 0; i--) {
    if (String(data[i][0]) === String(woNumber)) {
      pSheet.deleteRow(i + 1);
    }
  }

  // Insert new progress items
  const items = progress.items || [];
  const rows = items.map(item => [
    woNumber,
    item.index,
    item.quantityCompleted || 0,
    item.status || 'not-started',
    item.notes || '',
    timestamp,
    item.modifiedBy || ''
  ]);

  if (rows.length > 0) {
    pSheet.getRange(pSheet.getLastRow() + 1, 1, rows.length, 7).setValues(rows);
  }

  return {
    success: true,
    message: `Synced progress for WO#${woNumber}`,
    timestamp: timestamp
  };
}

/**
 * Update a single progress item
 */
function updateProgressItem(woNumber, itemIndex, progressData) {
  if (!woNumber || itemIndex === undefined || !progressData) {
    return { success: false, error: 'Missing required parameters' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let pSheet = ss.getSheetByName(SHEETS.PROGRESS);

  if (!pSheet) {
    initializeSheets();
    pSheet = ss.getSheetByName(SHEETS.PROGRESS);
  }

  const timestamp = new Date().toISOString();
  const data = pSheet.getDataRange().getValues();

  // Find existing row
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(woNumber) && data[i][1] === itemIndex) {
      rowIndex = i + 1;
      break;
    }
  }

  const rowData = [
    woNumber,
    itemIndex,
    progressData.quantityCompleted || 0,
    progressData.status || 'not-started',
    progressData.notes || '',
    timestamp,
    progressData.modifiedBy || ''
  ];

  if (rowIndex > 0) {
    // Update existing row
    pSheet.getRange(rowIndex, 1, 1, 7).setValues([rowData]);
  } else {
    // Append new row
    pSheet.appendRow(rowData);
  }

  return {
    success: true,
    message: `Updated progress for WO#${woNumber} item ${itemIndex}`,
    timestamp: timestamp
  };
}

/**
 * Full sync - work orders and progress
 */
function fullSync(data) {
  const results = {
    workOrders: null,
    progress: null
  };

  if (data.workOrders) {
    results.workOrders = syncWorkOrders(data.workOrders);
  }

  if (data.progressData) {
    const progressResults = [];
    for (const woNumber in data.progressData) {
      progressResults.push(syncProgress(woNumber, data.progressData[woNumber]));
    }
    results.progress = {
      success: progressResults.every(r => r.success),
      count: progressResults.length
    };
  }

  return {
    success: true,
    results: results,
    timestamp: new Date().toISOString()
  };
}

/**
 * Clear all data (for testing)
 */
function clearAllData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  [SHEETS.WORK_ORDERS, SHEETS.LINE_ITEMS, SHEETS.PROGRESS].forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (sheet && sheet.getLastRow() > 1) {
      sheet.deleteRows(2, sheet.getLastRow() - 1);
    }
  });

  return { success: true, message: 'All data cleared' };
}

/**
 * Menu for manual operations
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Work Order Sync')
    .addItem('Initialize Sheets', 'initializeSheets')
    .addItem('Clear All Data', 'clearAllData')
    .addToUi();
}
