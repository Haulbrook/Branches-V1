# Google Sheets Setup for Work Order Sync

This guide will help you set up Google Sheets as the central database for your work orders.

## Step 1: Create a New Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Click **+ Blank** to create a new spreadsheet
3. Name it something like "Deep Roots Work Orders"
4. **Important:** Copy the Spreadsheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/THIS_IS_YOUR_SPREADSHEET_ID/edit
   ```
   The ID is the long string between `/d/` and `/edit`

## Step 2: Add the Apps Script

1. In your new spreadsheet, go to **Extensions > Apps Script**
2. This opens the Apps Script editor
3. Delete any code in the default `Code.gs` file
4. Copy the entire contents of `Code.gs` from this folder
5. Paste it into the Apps Script editor
6. **Update the SPREADSHEET_ID** near the top of the file:
   ```javascript
   const SPREADSHEET_ID = 'paste_your_spreadsheet_id_here';
   ```

## Step 3: Initialize the Spreadsheet

1. In the Apps Script editor, click the function dropdown (says "Select function")
2. Select `initializeSpreadsheet`
3. Click the **Run** button (play icon)
4. Google will ask for permissions - click **Review Permissions**
5. Choose your Google account
6. Click **Advanced** > **Go to Deep Roots (unsafe)** > **Allow**
7. The script will create three sheets: WorkOrders, LineItems, Progress

## Step 4: Deploy as Web App

1. In Apps Script, click **Deploy** > **New deployment**
2. Click the gear icon next to "Select type" and choose **Web app**
3. Fill in:
   - **Description:** "Work Order API v1"
   - **Execute as:** Me
   - **Who has access:** Anyone
4. Click **Deploy**
5. Copy the **Web app URL** (looks like: `https://script.google.com/macros/s/ABC123.../exec`)
6. **Save this URL!** You'll need it for your dashboard.

## Step 5: Test the Setup

You can test your deployment by visiting:
```
YOUR_WEB_APP_URL?action=getAll
```

You should see a JSON response like:
```json
{
  "success": true,
  "workOrders": [],
  "count": 0,
  "timestamp": "..."
}
```

## Step 6: Configure Your Dashboard

1. Open your Deep Roots Dashboard
2. Go to Settings
3. Find the "Work Order Sync URL" field
4. Paste your Web App URL
5. Click Save

## API Reference

### GET Requests

| Action | URL | Description |
|--------|-----|-------------|
| Get all | `?action=getAll` | Get all work orders with line items and progress |
| Get one | `?action=getOne&woNumber=91108` | Get a specific work order |
| Get progress | `?action=getProgress&woNumber=91108` | Get progress for a work order |
| Get summary | `?action=getSummary` | Get summary stats for widgets |

### POST Requests

Send JSON body with:

**Save work orders:**
```json
{
  "action": "saveWorkOrders",
  "workOrders": [{ ... }]
}
```

**Update progress:**
```json
{
  "action": "updateProgress",
  "woNumber": "91108",
  "progress": {
    "items": [
      {
        "index": 0,
        "quantityCompleted": 15,
        "status": "in-progress",
        "notes": "Good progress",
        "hoursUsed": 45
      }
    ]
  }
}
```

**Delete work order:**
```json
{
  "action": "deleteWorkOrder",
  "woNumber": "91108"
}
```

## Troubleshooting

### "Script has no function doGet"
Make sure you copied the entire Code.gs file and saved it.

### Permission errors
Re-run the authorization flow. Go to Run > Run function > initializeSpreadsheet

### CORS errors in browser
This is expected when calling from localhost. The dashboard uses `fetch` with `mode: 'cors'` which should work.

### Data not syncing
1. Check the Web App URL is correct
2. Make sure you deployed the latest version (Deploy > Manage deployments > Edit > New version)
3. Check browser console for errors

## Re-deploying Updates

If you make changes to the Apps Script:
1. Go to **Deploy** > **Manage deployments**
2. Click the edit pencil icon
3. Under "Version", select **New version**
4. Click **Deploy**
5. The URL stays the same!
