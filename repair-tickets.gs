// ═══════════════════════════════════════════════════════════════════════
// 🔧 REPAIR TICKETS MODULE
// ═══════════════════════════════════════════════════════════════════════
// Add these functions to your TV Dashboard Apps Script
// Also add the case statements to your doPost() switch block
//
// REQUIRED: Create a "Repair Tickets" sheet in your Google Sheet with columns:
// A: Ticket ID | B: Created | C: Asset ID | D: Asset Name | E: Asset Type
// F: Assigned To | G: Notes | H: Status | I: Completed
// ═══════════════════════════════════════════════════════════════════════

// Sheet name for repair tickets
const REPAIR_TICKETS_SHEET = 'Repair Tickets';

// Column indexes (0-based)
const RT_COLS = {
  TICKET_ID: 0,
  CREATED: 1,
  ASSET_ID: 2,
  ASSET_NAME: 3,
  ASSET_TYPE: 4,
  ASSIGNED_TO: 5,
  NOTES: 6,
  STATUS: 7,
  COMPLETED: 8
};

// ═══════════════════════════════════════════════════════════════════════
// Add these cases to your doPost() switch block:
// ═══════════════════════════════════════════════════════════════════════
/*
      case 'getFleetItemsForRepair':
        result = getFleetItemsForRepair();
        break;

      case 'getRepairTickets':
        result = getRepairTickets();
        break;

      case 'createRepairTicket':
        result = createRepairTicket(params[0]);
        break;

      case 'completeRepairTicket':
        result = completeRepairTicket(params[0]);
        break;

      case 'deleteRepairTicket':
        result = deleteRepairTicket(params[0]);
        break;
*/

// ═══════════════════════════════════════════════════════════════════════
// GET FLEET ITEMS FOR REPAIR DROPDOWN
// Returns all trucks, trailers, machinery, and attachments
// ═══════════════════════════════════════════════════════════════════════
function getFleetItemsForRepair() {
  try {
    // Get the TV dashboard data (reuse existing function)
    const dashboardData = getTVDashboardData();

    if (!dashboardData || !dashboardData.success) {
      return { success: false, error: 'Could not load fleet data' };
    }

    const data = dashboardData.data;
    const items = [];

    // Get open repair tickets to mark items as "In Repair"
    const openTickets = getOpenRepairTicketAssetIds();

    // Add active vehicles
    if (data.vehicles && data.vehicles.active) {
      data.vehicles.active.forEach(v => {
        items.push({
          id: v.assetNumber || v.name,
          name: v.name,
          type: 'Vehicle',
          status: openTickets.has(v.assetNumber || v.name) ? 'In Repair' : 'Active'
        });
      });
    }

    // Add inactive vehicles
    if (data.vehicles && data.vehicles.inactive) {
      data.vehicles.inactive.forEach(v => {
        items.push({
          id: v.assetNumber || v.name,
          name: v.name,
          type: 'Vehicle',
          status: openTickets.has(v.assetNumber || v.name) ? 'In Repair' : 'Inactive'
        });
      });
    }

    // Add machinery
    if (data.vehicles && data.vehicles.machinery) {
      data.vehicles.machinery.forEach(v => {
        items.push({
          id: v.assetNumber || v.name,
          name: v.name,
          type: 'Machinery',
          status: openTickets.has(v.assetNumber || v.name) ? 'In Repair' : (v.status || 'Active')
        });
      });
    }

    // Add attachments
    if (data.attachments) {
      data.attachments.forEach(a => {
        items.push({
          id: a.assetNumber || a.name,
          name: a.name,
          type: 'Attachment',
          status: openTickets.has(a.assetNumber || a.name) ? 'In Repair' : (a.status || 'Active')
        });
      });
    }

    return { success: true, items: items };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// Helper: Get set of asset IDs with open repair tickets
function getOpenRepairTicketAssetIds() {
  const openIds = new Set();
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(REPAIR_TICKETS_SHEET);
    if (!sheet) return openIds;

    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][RT_COLS.STATUS] === 'OPEN') {
        openIds.add(String(data[i][RT_COLS.ASSET_ID]));
      }
    }
  } catch (e) {
    Logger.log('Error getting open tickets: ' + e);
  }
  return openIds;
}

// ═══════════════════════════════════════════════════════════════════════
// GET REPAIR TICKETS
// Returns open tickets and tickets completed today
// ═══════════════════════════════════════════════════════════════════════
function getRepairTickets() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(REPAIR_TICKETS_SHEET);

    if (!sheet) {
      return {
        success: true,
        data: { open: [], completed: [] },
        message: 'Repair Tickets sheet not found. Create it first.'
      };
    }

    const data = sheet.getDataRange().getValues();
    const tickets = { open: [], completed: [] };
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[RT_COLS.TICKET_ID]) continue;

      const ticket = {
        ticketId: String(row[RT_COLS.TICKET_ID]),
        created: formatDate(row[RT_COLS.CREATED]),
        assetId: String(row[RT_COLS.ASSET_ID] || ''),
        assetName: String(row[RT_COLS.ASSET_NAME] || ''),
        assetType: String(row[RT_COLS.ASSET_TYPE] || ''),
        assignedTo: String(row[RT_COLS.ASSIGNED_TO] || ''),
        notes: String(row[RT_COLS.NOTES] || ''),
        status: String(row[RT_COLS.STATUS] || 'OPEN'),
        completed: formatDate(row[RT_COLS.COMPLETED])
      };

      if (ticket.status === 'COMPLETED') {
        // Only show tickets completed today
        const completedDate = row[RT_COLS.COMPLETED];
        if (completedDate instanceof Date) {
          const compDay = new Date(completedDate);
          compDay.setHours(0, 0, 0, 0);
          if (compDay.getTime() === today.getTime()) {
            tickets.completed.push(ticket);
          }
        }
      } else {
        tickets.open.push(ticket);
      }
    }

    // Sort: open by created (oldest first), completed by completed time (newest first)
    tickets.open.sort((a, b) => new Date(a.created) - new Date(b.created));
    tickets.completed.sort((a, b) => new Date(b.completed) - new Date(a.completed));

    return { success: true, data: tickets };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// CREATE REPAIR TICKET
// Creates ticket and marks asset as "In Repair"
// ═══════════════════════════════════════════════════════════════════════
function createRepairTicket(ticketData) {
  try {
    if (!ticketData.assetId) {
      return { success: false, error: 'Asset is required' };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(REPAIR_TICKETS_SHEET);

    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet(REPAIR_TICKETS_SHEET);
      sheet.getRange(1, 1, 1, 9).setValues([[
        'Ticket ID', 'Created', 'Asset ID', 'Asset Name', 'Asset Type',
        'Assigned To', 'Notes', 'Status', 'Completed'
      ]]);
      sheet.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#4a4a4a').setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }

    // Generate ticket ID
    const now = new Date();
    const ticketId = 'RT-' + Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');

    // Append new row
    sheet.appendRow([
      ticketId,
      now,
      ticketData.assetId,
      ticketData.assetName || '',
      ticketData.assetType || '',
      ticketData.assignedTo || '',
      ticketData.notes || '',
      'OPEN',
      ''
    ]);

    return {
      success: true,
      message: 'Repair ticket created',
      ticketId: ticketId
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// COMPLETE REPAIR TICKET
// Marks ticket as complete and restores asset status
// ═══════════════════════════════════════════════════════════════════════
function completeRepairTicket(ticketId) {
  try {
    if (!ticketId) {
      return { success: false, error: 'Ticket ID is required' };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(REPAIR_TICKETS_SHEET);

    if (!sheet) {
      return { success: false, error: 'Repair Tickets sheet not found' };
    }

    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][RT_COLS.TICKET_ID]) === String(ticketId)) {
        const rowNum = i + 1;
        sheet.getRange(rowNum, RT_COLS.STATUS + 1).setValue('COMPLETED');
        sheet.getRange(rowNum, RT_COLS.COMPLETED + 1).setValue(new Date());
        return { success: true, message: 'Ticket completed' };
      }
    }

    return { success: false, error: 'Ticket not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// DELETE REPAIR TICKET
// Removes ticket from sheet
// ═══════════════════════════════════════════════════════════════════════
function deleteRepairTicket(ticketId) {
  try {
    if (!ticketId) {
      return { success: false, error: 'Ticket ID is required' };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(REPAIR_TICKETS_SHEET);

    if (!sheet) {
      return { success: false, error: 'Repair Tickets sheet not found' };
    }

    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][RT_COLS.TICKET_ID]) === String(ticketId)) {
        sheet.deleteRow(i + 1);
        return { success: true, message: 'Ticket deleted' };
      }
    }

    return { success: false, error: 'Ticket not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════
function formatDate(value) {
  if (!value) return '';
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}

// ═══════════════════════════════════════════════════════════════════════
// SETUP: Run this once to create the Repair Tickets sheet
// ═══════════════════════════════════════════════════════════════════════
function setupRepairTicketsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(REPAIR_TICKETS_SHEET);

  if (!sheet) {
    sheet = ss.insertSheet(REPAIR_TICKETS_SHEET);
  }

  // Set headers
  sheet.getRange(1, 1, 1, 9).setValues([[
    'Ticket ID', 'Created', 'Asset ID', 'Asset Name', 'Asset Type',
    'Assigned To', 'Notes', 'Status', 'Completed'
  ]]);

  // Format header row
  sheet.getRange(1, 1, 1, 9)
    .setFontWeight('bold')
    .setBackground('#4a4a4a')
    .setFontColor('#ffffff');

  // Set column widths
  sheet.setColumnWidth(1, 180);  // Ticket ID
  sheet.setColumnWidth(2, 150);  // Created
  sheet.setColumnWidth(3, 120);  // Asset ID
  sheet.setColumnWidth(4, 150);  // Asset Name
  sheet.setColumnWidth(5, 100);  // Asset Type
  sheet.setColumnWidth(6, 120);  // Assigned To
  sheet.setColumnWidth(7, 250);  // Notes
  sheet.setColumnWidth(8, 100);  // Status
  sheet.setColumnWidth(9, 150);  // Completed

  sheet.setFrozenRows(1);

  return 'Repair Tickets sheet created successfully!';
}
