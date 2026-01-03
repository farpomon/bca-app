# Offline-First Functionality Documentation

## Overview

The BCA application now includes comprehensive offline-first functionality, enabling field inspectors to work without an internet connection. All data is automatically saved locally and synchronized when connection is restored.

## Features

### ✅ Offline Capabilities

1. **Assessment Data Entry**
   - Create and edit assessments while offline
   - All form data saved to IndexedDB
   - Auto-save drafts every 30 seconds
   - Automatic sync when connection returns

2. **Photo Management**
   - Upload photos while offline
   - Automatic photo compression (50-70% size reduction)
   - Photos queued in IndexedDB with metadata
   - Batch upload when online
   - GPS location capture (if available)

3. **Voice Recording** (Already Implemented)
   - Record voice notes offline
   - Automatic transcription when online
   - Queue management for pending transcriptions

4. **Background Synchronization**
   - Automatic sync on connection restore
   - Retry logic with exponential backoff
   - Conflict resolution (server-wins strategy)
   - Progress tracking and notifications

### 📊 Storage Architecture

#### IndexedDB Stores

1. **offline_assessments**
   - Stores assessment data locally
   - Indexed by: projectId, assetId, syncStatus, createdAt
   - Automatic cleanup after successful sync

2. **offline_photos**
   - Stores compressed photo blobs
   - Indexed by: assessmentId, projectId, syncStatus, createdAt
   - Includes original and compressed versions

3. **offline_deficiencies**
   - Stores deficiency records
   - Indexed by: projectId, assessmentId, syncStatus

4. **sync_queue**
   - Priority-based sync queue
   - Indexed by: type, priority, status, nextRetryAt
   - Tracks retry attempts and errors

5. **cached_projects**
   - Caches recent projects for offline viewing
   - TTL: 24 hours

6. **cached_components**
   - Caches UNIFORMAT II building components
   - Static data for offline reference

## Usage Guide

### For Developers

#### Using Offline Assessment Hook

```typescript
import { useOfflineAssessment } from "@/hooks/useOfflineAssessment";

function AssessmentForm() {
  const { saveAssessment, isSaving, isOnline } = useOfflineAssessment({
    projectId: 123,
    onSuccess: (id) => console.log("Saved:", id),
  });

  const handleSubmit = async (data) => {
    await saveAssessment(data);
  };

  return (
    <form onSubmit={handleSubmit}>
      {!isOnline && <Badge>Offline Mode</Badge>}
      {/* Form fields */}
    </form>
  );
}
```

#### Using Offline Photo Hook

```typescript
import { useOfflinePhoto } from "@/hooks/useOfflinePhoto";

function PhotoUpload() {
  const { uploadPhoto, isUploading, uploadProgress } = useOfflinePhoto({
    autoCompress: true,
    onUploadSuccess: (result) => {
      console.log("Photo saved:", result.photoId);
      console.log("Compressed:", result.compressionResult?.compressionRatio + "%");
    },
  });

  const handleFileSelect = async (file: File) => {
    await uploadPhoto({
      assessmentId: "123",
      projectId: 456,
      file,
      caption: "Building exterior",
    });
  };

  return (
    <div>
      <input type="file" onChange={(e) => handleFileSelect(e.target.files[0])} />
      {isUploading && <Progress value={uploadProgress} />}
    </div>
  );
}
```

#### Using Sync Management Hook

```typescript
import { useOfflineSync } from "@/hooks/useOfflineSync";

function SyncStatus() {
  const {
    isOnline,
    isSyncing,
    progress,
    pendingCount,
    startSync,
    stats,
  } = useOfflineSync();

  return (
    <div>
      <Badge>{isOnline ? "Online" : "Offline"}</Badge>
      {pendingCount > 0 && (
        <Button onClick={startSync}>
          Sync {pendingCount} items
        </Button>
      )}
      {isSyncing && progress && (
        <Progress value={progress.percentage} />
      )}
    </div>
  );
}
```

### For Users

#### Working Offline

1. **No Internet Connection?**
   - The app automatically detects when you're offline
   - A banner appears at the top showing offline status
   - Continue working normally - all data saves locally

2. **Creating Assessments Offline**
   - Fill out assessment forms as usual
   - Data is saved to your device's local storage
   - You'll see a notification: "Saved offline. Will sync when connection returns."

3. **Uploading Photos Offline**
   - Select photos as normal
   - Photos are compressed and stored locally
   - Original quality preserved for upload
   - Queue shows pending uploads

4. **Automatic Sync**
   - When connection returns, sync starts automatically
   - Progress bar shows sync status
   - Notifications confirm successful sync
   - Failed items can be retried manually

#### Sync Queue

Access the sync queue to:
- View all pending items
- See sync progress
- Retry failed items
- Clear completed items

**Location:** Click "Sync Queue" button in the offline status banner

## Technical Details

### Photo Compression

Photos are automatically compressed before storage:

- **Large files (>5MB):** 1280x1280, 70% quality
- **Medium files (2-5MB):** 1600x1600, 75% quality
- **Small files (1-2MB):** 1920x1920, 80% quality
- **Tiny files (<1MB):** 1920x1920, 85% quality

Average compression: **50-70% size reduction**

### Sync Strategy

1. **Priority Order:**
   - Assessments (Priority 1)
   - Photos (Priority 2)
   - Deficiencies (Priority 3)

2. **Retry Logic:**
   - Initial retry: 1 second
   - Exponential backoff: 2s, 4s, 8s, 16s, 32s
   - Max retries: 5 attempts
   - Max delay: 60 seconds

3. **Conflict Resolution:**
   - **Server wins:** Server data takes precedence
   - Future: Implement merge strategies for specific fields

### Storage Limits

- **IndexedDB:** Browser-dependent (typically 50MB - 2GB)
- **Recommended max:** 50MB offline data
- **Auto-cleanup:** Completed items removed after sync
- **Cache TTL:** 24 hours for projects, permanent for components

## Monitoring & Debugging

### Browser DevTools

1. **IndexedDB Inspection:**
   - Open DevTools → Application → IndexedDB
   - Database: `bca_offline_storage`
   - View all stores and data

2. **Console Logs:**
   - `[OfflineSync]` - Initialization and sync events
   - `[SyncEngine]` - Sync progress and errors
   - `[Offline]` - Assessment/photo operations

3. **Network Throttling:**
   - DevTools → Network → Throttling
   - Test offline mode: Select "Offline"
   - Test slow connection: Select "Slow 3G"

### Storage Statistics

Get storage stats programmatically:

```typescript
import { getStorageStats } from "@/lib/offlineStorage";

const stats = await getStorageStats();
console.log("Pending assessments:", stats.assessments.pending);
console.log("Pending photos:", stats.photos.pending);
console.log("Total photo size:", stats.photos.totalSize);
```

## Troubleshooting

### Common Issues

**1. Sync Not Starting**
- Check internet connection
- Verify browser allows IndexedDB
- Check console for errors
- Try manual sync from sync queue

**2. Photos Not Uploading**
- Check file size (<10MB recommended)
- Verify photo format (JPEG, PNG, WebP)
- Check storage quota
- Clear completed items from queue

**3. Data Loss Prevention**
- Never clear browser data while offline
- Don't close browser during sync
- Check sync queue before clearing cache
- Export important data before troubleshooting

**4. Performance Issues**
- Limit offline photos to <50 per session
- Clear old cached data regularly
- Use photo compression (enabled by default)
- Close unused tabs

### Recovery Steps

If sync fails repeatedly:

1. Open sync queue dialog
2. Check error messages for failed items
3. Try manual retry
4. If still failing, contact support with:
   - Browser console logs
   - Sync queue screenshot
   - Error messages

## Future Enhancements

### Planned Features

- [ ] Conflict resolution UI (merge changes)
- [ ] Selective sync (choose what to sync)
- [ ] Offline project creation
- [ ] Offline deficiency management
- [ ] Background sync API integration
- [ ] Service Worker for true PWA
- [ ] Offline map caching
- [ ] Export offline data to file

### Backend Requirements

The following backend endpoints need to be implemented for full sync functionality:

1. **Assessment Creation**
   ```typescript
   trpc.assessments.create.mutate({
     projectId, assetId, componentCode, ...
   })
   ```

2. **Photo Upload**
   ```typescript
   trpc.photos.create.mutate({
     assessmentId, projectId, url, fileName, ...
   })
   ```

3. **Deficiency Creation**
   ```typescript
   trpc.deficiencies.create.mutate({
     projectId, assessmentId, description, ...
   })
   ```

## Best Practices

### For Field Inspectors

1. **Before Going Offline:**
   - Open the app while online
   - Let project data cache
   - Verify offline mode works

2. **While Offline:**
   - Save work frequently (auto-save enabled)
   - Keep photo count reasonable (<50)
   - Monitor storage space

3. **After Reconnecting:**
   - Wait for automatic sync to complete
   - Verify all items synced successfully
   - Clear completed items from queue

### For Administrators

1. **Monitor Sync Health:**
   - Check sync queue regularly
   - Review failed sync items
   - Investigate recurring errors

2. **Storage Management:**
   - Set reasonable photo size limits
   - Implement cleanup policies
   - Monitor IndexedDB usage

3. **User Training:**
   - Educate users on offline mode
   - Provide sync troubleshooting guide
   - Set expectations for sync times

## Support

For issues or questions:
- Check browser console for errors
- Review sync queue for failed items
- Contact development team with logs
- Report bugs with reproduction steps

---

**Last Updated:** December 2024  
**Version:** 1.0.0  
**Status:** Beta - Ready for testing
