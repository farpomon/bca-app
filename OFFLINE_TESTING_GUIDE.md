# Offline Functionality Testing Guide

## Overview
This guide provides step-by-step instructions for testing the BCA app's offline-first capabilities, which allow field inspectors to continue working without an internet connection.

## Prerequisites
- Chrome or Edge browser (for DevTools network throttling)
- Access to a BCA project with assets
- Basic understanding of Chrome DevTools

---

## Test Scenarios

### 1. Test Offline Indicator Badges

**Purpose**: Verify that the UI clearly shows when the app is offline

**Steps**:
1. Open a project and click "Start Assessment" on any asset
2. The assessment dialog should show a **green "Online" badge** in the top-right corner
3. Open Chrome DevTools (F12)
4. Go to the **Network** tab
5. Check the **"Offline"** checkbox at the top of the Network tab
6. The badge should immediately change to **amber "Offline Mode" badge**
7. Uncheck "Offline" to go back online
8. Badge should change back to green "Online"

**Expected Results**:
- ✅ Badge updates immediately when network status changes
- ✅ Amber badge with WiFi-off icon when offline
- ✅ Green badge with WiFi icon when online

---

### 2. Test Offline Assessment Creation

**Purpose**: Verify that assessments can be created and saved locally when offline

**Steps**:
1. Open a project and navigate to an asset
2. Open Chrome DevTools → Network tab → Enable "Offline" mode
3. Click "Start Assessment" on a component (e.g., A10 - Foundations)
4. Fill in the assessment form:
   - Condition: "Fair"
   - Component Name: "Test Offline Assessment"
   - Observations: "Testing offline functionality"
   - Remaining Useful Life: 10
5. Click "Save Assessment"
6. You should see a toast notification: **"Saving offline... Data will sync when connection is restored"**
7. The assessment should be saved to IndexedDB
8. Check the Offline Queue Widget (bottom-right corner) - it should show "1 item pending sync"

**Expected Results**:
- ✅ Toast notification appears when saving offline
- ✅ Assessment is saved to local IndexedDB
- ✅ Offline queue widget shows pending item count
- ✅ No error messages appear

---

### 3. Test Offline Photo Upload

**Purpose**: Verify that photos can be uploaded and queued when offline

**Steps**:
1. While still offline (from Test 2), open the assessment dialog again
2. Click "Upload Photo" and select an image file
3. Add a caption: "Test offline photo"
4. Click "Save Assessment"
5. The photo should be compressed and saved to IndexedDB
6. Check the offline queue - it should now show "2 items pending sync" (assessment + photo)

**Expected Results**:
- ✅ Photo is compressed and saved locally
- ✅ Queue count increases
- ✅ Photo preview is available from IndexedDB

---

### 4. Test Automatic Sync on Reconnection

**Purpose**: Verify that queued data automatically syncs when connection is restored

**Steps**:
1. With items in the offline queue (from Tests 2 & 3)
2. Open Chrome DevTools → Network tab
3. **Uncheck "Offline"** to restore connection
4. The app should automatically detect the connection and start syncing
5. Watch the Offline Queue Widget:
   - It should show a **sync progress indicator** (circular progress)
   - Progress should go from 0% → 100%
   - Queue count should decrease as items sync
6. Once complete, you should see a success toast: **"All offline data synced successfully"**
7. Verify the assessment appears in the project's assessment list
8. Verify the photo appears in the assessment's photo gallery

**Expected Results**:
- ✅ Sync starts automatically within 2-3 seconds of reconnection
- ✅ Progress indicator shows sync status
- ✅ Queue count decreases to 0
- ✅ Success toast appears
- ✅ Data appears in the live database

---

### 5. Test Manual Sync Trigger

**Purpose**: Verify that users can manually trigger sync

**Steps**:
1. Create an offline assessment (repeat Test 2)
2. Stay offline
3. Click the **Offline Queue Widget** in the bottom-right corner
4. A dialog should open showing all pending items
5. Click the **"Sync Now"** button
6. You should see an error toast: **"Cannot sync while offline"**
7. Go back online (uncheck "Offline" in DevTools)
8. Click **"Sync Now"** again
9. Sync should start and complete successfully

**Expected Results**:
- ✅ Queue dialog shows all pending items
- ✅ Manual sync fails gracefully when offline
- ✅ Manual sync works when online
- ✅ Queue clears after successful sync

---

### 6. Test Sync Retry on Failures

**Purpose**: Verify that failed syncs are retried automatically

**Steps**:
1. Create an offline assessment
2. Go back online
3. Immediately **restart the dev server** to simulate a backend failure:
   ```bash
   cd /home/ubuntu/bca-app
   # Stop the server (Ctrl+C if running in terminal)
   # Wait 5 seconds
   pnpm dev
   ```
4. The sync should fail and show an error toast
5. The sync engine should automatically retry with exponential backoff:
   - Retry 1: after 1 second
   - Retry 2: after 2 seconds
   - Retry 3: after 4 seconds
   - Retry 4: after 8 seconds
   - Retry 5: after 16 seconds
6. Once the server is back up, the next retry should succeed

**Expected Results**:
- ✅ Failed syncs show error toast
- ✅ Automatic retry with exponential backoff
- ✅ Eventually succeeds when server is available
- ✅ User is notified of both failures and success

---

### 7. Test Data Integrity After Sync

**Purpose**: Verify that synced data matches what was entered offline

**Steps**:
1. Create an offline assessment with specific values:
   - Condition: "Poor"
   - Component Name: "Data Integrity Test"
   - Component Location: "Building A, Floor 2"
   - Observations: "Significant cracking observed"
   - Recommendations: "Immediate repair required"
   - Remaining Useful Life: 5
   - Estimated Service Life: 20
   - Review Year: 2025
2. Go back online and let it sync
3. Navigate to the assessment in the UI
4. Click "Edit Assessment"
5. Verify **all fields match** what you entered offline

**Expected Results**:
- ✅ All text fields match exactly
- ✅ All numeric fields match exactly
- ✅ Timestamps are preserved
- ✅ No data loss or corruption

---

### 8. Test Offline Queue Persistence

**Purpose**: Verify that the offline queue persists across page reloads

**Steps**:
1. Create 2-3 offline assessments (stay offline)
2. Check the queue widget - should show "3 items pending sync"
3. **Refresh the page** (F5 or Ctrl+R)
4. Wait for the page to reload
5. Check the queue widget again

**Expected Results**:
- ✅ Queue count is preserved after reload
- ✅ All pending items are still in the queue
- ✅ No data is lost during reload

---

### 9. Test Multiple Offline Sessions

**Purpose**: Verify that the app handles multiple offline/online cycles

**Steps**:
1. Go offline → Create assessment 1 → Go online → Wait for sync
2. Go offline → Create assessment 2 → Go online → Wait for sync
3. Go offline → Create assessment 3 → Go online → Wait for sync
4. Verify all 3 assessments appear in the project

**Expected Results**:
- ✅ Each offline session works independently
- ✅ All assessments sync successfully
- ✅ No conflicts or duplicate data

---

### 10. Test Conflict Resolution

**Purpose**: Verify that the app handles conflicts gracefully

**Steps**:
1. Open the same assessment in two browser tabs (Tab A and Tab B)
2. In Tab A: Go offline → Edit assessment → Change condition to "Good" → Save
3. In Tab B: Stay online → Edit assessment → Change condition to "Fair" → Save
4. In Tab A: Go back online → Let it sync
5. The server-wins strategy should apply - Tab B's "Fair" should be preserved
6. Refresh Tab A and verify the condition is "Fair" (server version)

**Expected Results**:
- ✅ No error when syncing conflicting data
- ✅ Server version is preserved (server-wins strategy)
- ✅ User is notified of conflict resolution

---

## Debugging Tips

### Check IndexedDB Contents
1. Open Chrome DevTools → Application tab
2. Expand "IndexedDB" → "BCAOfflineDB"
3. Inspect stores:
   - `offlineAssessments` - Pending assessments
   - `offlinePhotos` - Pending photos
   - `syncQueue` - Sync queue items
   - `cachedProjects` - Cached project data
   - `cachedComponents` - Cached UNIFORMAT II components

### Check Console Logs
Look for these log messages:
- `[OfflineSync] Detected online, starting sync...`
- `[OfflineSync] Syncing item X of Y`
- `[OfflineSync] Sync completed successfully`
- `[OfflineSync] Sync failed, will retry in X seconds`

### Check Network Requests
In the Network tab, look for:
- `assessments.createOffline` - Syncing assessments
- `photos.createOffline` - Syncing photos
- Status codes: 200 (success), 500 (server error), 0 (offline)

---

## Known Issues & Limitations

1. **Photo size limit**: Photos are compressed to ~500KB before storage. Very large photos (>10MB) may fail to compress.

2. **Storage quota**: IndexedDB has a ~50MB limit. If exceeded, oldest cached data is cleared automatically.

3. **Voice recordings**: Voice-to-text transcription requires an online connection. Recordings are queued offline but transcribed when online.

4. **Deficiency sync**: Offline deficiency creation is not yet implemented (Phase 7 - pending).

5. **Real-time updates**: Changes made by other users won't appear until you go online and refresh.

---

## Success Criteria

All tests should pass with these results:
- ✅ Offline indicators work correctly
- ✅ Assessments can be created offline
- ✅ Photos can be uploaded offline
- ✅ Automatic sync works on reconnection
- ✅ Manual sync trigger works
- ✅ Sync retries on failures
- ✅ Data integrity is maintained
- ✅ Queue persists across reloads
- ✅ Multiple offline sessions work
- ✅ Conflicts are resolved gracefully

---

## Troubleshooting

### Sync is not starting automatically
- Check if the browser supports the `online` event: `window.addEventListener('online', ...)`
- Check console for errors
- Try manual sync from the queue widget

### Items stuck in queue
- Check if the backend is running
- Check if authentication is still valid (token may have expired)
- Try clearing the queue and re-creating items

### Data not appearing after sync
- Check if the tRPC mutations are returning success
- Check if the database is receiving the data
- Verify the project ID and asset ID are correct

### IndexedDB errors
- Clear IndexedDB: DevTools → Application → IndexedDB → Right-click "BCAOfflineDB" → Delete
- Refresh the page
- Try again

---

## Next Steps

After completing all tests:
1. Document any bugs or issues found
2. Create a checkpoint with the working offline functionality
3. Deploy to production for field testing
4. Gather feedback from real users in the field

---

## Contact

For questions or issues, contact the development team or check the project documentation.
