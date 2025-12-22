# Google Sheets Sync Setup Instructions

This guide walks you through setting up the Google Sheets backend for work order synchronization.

## Prerequisites

- A Google account
- Access to Google Sheets and Google Apps Script

## Step 1: Create a New Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Click **+ Blank** to create a new spreadsheet
3. Name it something like "Branches Work Orders"

## Step 2: Open Apps Script Editor

1. In your new spreadsheet, click **Extensions** > **Apps Script**
2. This opens the Apps Script editor in a new tab

## Step 3: Add the Backend Code

1. Delete any existing code in the editor
2. Copy the entire contents of `Code.gs` from this folder
3. Paste it into the Apps Script editor
4. Click **File** > **Save** (or Ctrl+S)
5. Name the project (e.g., "Work Order Sync API")

## Step 4: Initialize the Sheets

1. In the Apps Script editor, select `initializeSheets` from the function dropdown
2. Click **Run**
3. When prompted, click **Review Permissions**
4. Select your Google account
5. Click **Advanced** > **Go to [Project Name] (unsafe)**
6. Click **Allow**

This creates three sheets in your spreadsheet:
- **WorkOrders** - Stores work order header data
- **LineItems** - Stores line items for each work order
- **Progress** - Stores progress tracking data

## Step 5: Deploy as Web App

1. Click **Deploy** > **New deployment**
2. Click the gear icon next to "Select type" and choose **Web app**
3. Configure:
   - **Description**: "Work Order Sync API v1"
   - **Execute as**: Me
   - **Who has access**: Anyone
4. Click **Deploy**
5. Click **Authorize access** and complete the authorization
6. **Copy the Web App URL** - you'll need this!

The URL looks like: `https://script.google.com/macros/s/XXXXX.../exec`

## Step 6: Configure the Dashboard

1. Open the Branches Dashboard
2. Click the **Settings** (gear icon)
3. Enable **Work Order Sync**
4. Paste the Web App URL into **Google Sheet URL**
5. Select your preferred **Sync Interval**
6. Click **Save Settings**

## Step 7: Test the Connection

After saving settings, the dashboard will attempt to connect. You should see:
- A success toast message if connected
- Work orders will begin syncing automatically

## Troubleshooting

### "Error: Sheets not initialized"
Run the `initializeSheets` function in Apps Script again.

### "Error: Authorization required"
1. Go to Apps Script editor
2. Run any function (like `initializeSheets`)
3. Complete the authorization flow

### "Error: Invalid URL"
Make sure you copied the full Web App URL, including the `/exec` at the end.

### Changes not appearing
- Check that sync is enabled in settings
- Try clicking the manual sync button
- Check browser console for errors

## Updating the API

If you need to update the backend code:

1. Open Apps Script editor
2. Make your changes
3. Click **Deploy** > **Manage deployments**
4. Click the pencil icon on your deployment
5. Select **New version**
6. Click **Deploy**

Note: The URL stays the same after updates.

## Data Structure

### WorkOrders Sheet
| Column | Description |
|--------|-------------|
| woNumber | Work order number |
| jobName | Job/project name |
| client | Client name |
| category | Category (e.g., Irrigation, Planting) |
| salesRep | Sales representative |
| address | Job site address |
| lat | Latitude |
| lng | Longitude |
| lastModified | Last sync timestamp |
| syncId | Unique sync identifier |

### LineItems Sheet
| Column | Description |
|--------|-------------|
| woNumber | Parent work order number |
| itemIndex | Position in line items array |
| itemCode | Item code |
| itemName | Item description |
| quantity | Quantity |
| unit | Unit of measure |
| category | Item category |
| lastModified | Last sync timestamp |

### Progress Sheet
| Column | Description |
|--------|-------------|
| woNumber | Work order number |
| itemIndex | Line item index |
| quantityCompleted | Completed quantity |
| status | Status (not-started, in-progress, completed) |
| notes | Progress notes |
| lastModified | Last update timestamp |
| modifiedBy | User who made the update |

## API Endpoints

The Web App responds to both GET and POST requests:

### GET Requests
- `?action=ping` - Test if API is running
- `?action=getWorkOrders` - Get all work orders with line items
- `?action=getProgress&woNumber=XXX` - Get progress for a work order
- `?action=getSummary&woNumber=XXX` - Get summary for progress widget
- `?action=getAll` - Get all data (work orders + progress)

### POST Requests
Send JSON body with `action` field:
- `syncWorkOrders` - Sync work orders from client
- `syncProgress` - Sync progress for a work order
- `updateProgress` - Update a single progress item
- `fullSync` - Full sync of work orders and progress
- `clearAll` - Clear all data (testing only)
