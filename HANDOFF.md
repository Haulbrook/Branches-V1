# Handoff: Work Order Sync & Progress Widget Integration

## Current Branch
```
claude/sync-scheduler-planner-G5WRF
```

## What Was Built

### Phase 1: Google Sheets Sync (COMPLETE)
- **`google-sheets-setup/Code.gs`** - Google Apps Script for centralized work order storage
- **`google-sheets-setup/SETUP_INSTRUCTIONS.md`** - Setup guide for deploying the script
- **`js/workOrderSync.js`** - Sync module used by all tools
- Updated tools to use sync: `work-order-import.html`, `crew-scheduler.html`, `logistics-map.html`, `progress-tracker.html`
- Added "Work Order Sync" URL field in dashboard settings (`index.html` + `js/app.js`)

### Phase 2: Progress Widget (COMPLETE)
- **`js/progressWidget.js`** - Reusable component showing % complete + hours used/remaining
- Integrated into `crew-scheduler.html` (compact widget on job cards)
- Integrated into `logistics-map.html` (widget in info panel when job selected)

## Outstanding Issue
**User reports the "Work Order Sync" setting is not visible in the Settings modal.**

The code IS in the files:
- `index.html` lines 479-488 has the Work Order Sync section
- `js/app.js` has the load/save logic for `workOrderSyncUrl`

Possible causes:
1. User is viewing main branch, not `claude/sync-scheduler-planner-G5WRF`
2. Browser cache (need hard refresh)
3. Not deployed to Netlify yet

## Files Modified (All on branch `claude/sync-scheduler-planner-G5WRF`)

| File | Changes |
|------|---------|
| `index.html` | Added Work Order Sync settings section |
| `js/app.js` | Added workOrderSyncUrl load/save |
| `js/workOrderSync.js` | NEW - Sync module |
| `js/progressWidget.js` | NEW - Progress widget |
| `work-order-import.html` | Sync status bar, cloud save |
| `crew-scheduler.html` | Progress widget on job cards |
| `logistics-map.html` | Progress widget in info panel |
| `progress-tracker.html` | Cloud progress sync |
| `google-sheets-setup/` | NEW - Setup files |

## Next Steps

1. **Debug why settings not showing** - Check which branch user is viewing
2. **Merge to main** if ready (or create PR)
3. **User needs to deploy Google Apps Script** - Follow `SETUP_INSTRUCTIONS.md`

## How to Continue

```
Tell Claude: "Continue from HANDOFF.md - help me get the Work Order Sync setting visible in the dashboard settings menu"
```

## Git Status
- Branch: `claude/sync-scheduler-planner-G5WRF`
- All changes committed and pushed
- Latest commit: "Add progress widget to crew scheduler and logistics map"
