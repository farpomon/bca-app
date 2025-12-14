# Photo Upload Features Testing Guide

This guide provides step-by-step instructions for testing the new drag-and-drop and photo reordering features in the AssessmentDialog component.

## Features Implemented

### 1. Drag-and-Drop File Upload
- Users can drag image files from their computer and drop them into the upload area
- Visual feedback shows when files are being dragged over the upload zone
- Multiple files can be dropped at once
- Only image files are accepted (non-image files are filtered out)
- Success toast notification shows the number of photos added

### 2. Photo Reordering with Drag-and-Drop
- After photos are uploaded, users can drag and drop them to reorder
- Visual feedback shows which photo is being dragged (reduced opacity)
- Drop zone indicator highlights the target position (ring border)
- Photos maintain their new order when saved to the server
- Success toast notification confirms reordering

## Testing Instructions

### Test 1: Drag-and-Drop File Upload

**Steps:**
1. Navigate to any project in the BCA app
2. Click "Start Assessment" or edit an existing assessment
3. In the AssessmentDialog, locate the "Upload Photos (Optional)" section
4. Open your file explorer and select 2-3 image files (JPG, PNG, or GIF)
5. Drag the selected files over the upload area

**Expected Results:**
- The upload area border should turn blue/primary color
- Background should show a light blue tint
- Text should change from "Click to upload or drag and drop" to "Drop photos here"
- Upload icon should change to primary color

**Steps (continued):**
6. Drop the files into the upload area

**Expected Results:**
- A success toast should appear: "X photos added" (where X is the number of files)
- Photo previews should appear in a 2-column grid below the upload area
- Each preview should show:
  - The image thumbnail
  - A delete button (X) in the top-right corner (visible on hover)
  - A label at the bottom: "Photo 1 of X", "Photo 2 of X", etc.
- A hint text should appear: "Drag photos to reorder them"
- Location capture toast should appear if geolocation is enabled

### Test 2: Click to Upload (Traditional Method)

**Steps:**
1. In the same upload area, click anywhere on the dashed border box
2. Select multiple image files from the file picker dialog
3. Click "Open"

**Expected Results:**
- Same as Test 1 (photos should appear in preview grid)
- Multiple files can be selected using Ctrl+Click or Shift+Click

### Test 3: Photo Reordering

**Steps:**
1. After uploading 3+ photos (using either drag-and-drop or click method)
2. Click and hold on the second photo preview
3. Drag it to the first position (over the first photo)

**Expected Results:**
- The dragged photo should become semi-transparent (50% opacity) and slightly smaller
- The target photo (where you're hovering) should show a blue ring border and scale up slightly
- The cursor should change to indicate a move operation

**Steps (continued):**
4. Release the mouse button to drop the photo

**Expected Results:**
- A success toast should appear: "Photo reordered"
- The photos should swap positions
- The photo labels should update: the moved photo should now be "Photo 1 of X"
- The original first photo should now be "Photo 2 of X"

### Test 4: Removing Photos

**Steps:**
1. Upload 2-3 photos
2. Hover over any photo preview
3. Click the red X button in the top-right corner

**Expected Results:**
- The photo should be removed from the preview grid
- Remaining photos should re-flow to fill the grid
- Photo labels should update to reflect the new count

### Test 5: Mixed File Types

**Steps:**
1. Select both image files and non-image files (e.g., PDF, DOCX)
2. Drag them into the upload area
3. Drop the files

**Expected Results:**
- An error toast should appear: "Please drop image files only"
- No files should be added to the preview grid

### Test 6: Photo Order Persistence

**Steps:**
1. Upload 3 photos
2. Reorder them by dragging (e.g., move Photo 3 to position 1)
3. Fill in other assessment fields (condition, observations, etc.)
4. Click "Save Assessment"

**Expected Results:**
- Photos should upload in the reordered sequence
- When viewing the saved assessment, photos should appear in the new order
- Photo captions should reflect the component code and sequential numbering

### Test 7: AI Analysis with Multiple Photos

**Steps:**
1. Upload 3+ photos
2. Reorder them so your preferred photo is first
3. Click "Analyze First Photo with AI"

**Expected Results:**
- The AI should analyze the first photo in the current order
- Assessment fields should populate with AI-generated content
- Success toast: "AI analysis complete! Review and adjust the assessment as needed."

### Test 8: Responsive Behavior

**Steps:**
1. Test the upload and reordering features on different screen sizes:
   - Desktop (1920x1080)
   - Tablet (768x1024)
   - Mobile (375x667)

**Expected Results:**
- The 2-column grid should remain functional on all screen sizes
- Drag-and-drop should work on touch devices (mobile/tablet)
- Upload area should be easily tappable on mobile

## Known Behaviors

1. **Geolocation**: When photos are uploaded (either via drag-and-drop or click), the app attempts to capture the device's current location. This requires location permissions.

2. **Photo Limit**: There is no hard limit on the number of photos, but each photo should be under 10MB.

3. **Drag Cursor**: The cursor changes to indicate the drag operation (move cursor with arrows).

4. **Photo Previews**: Previews are generated client-side using FileReader API before upload.

5. **Upload Order**: Photos are uploaded sequentially in the order they appear in the preview grid after any reordering.

## Troubleshooting

### Issue: Drag-and-drop doesn't work
- **Solution**: Ensure you're using a modern browser (Chrome, Firefox, Safari, Edge)
- Check browser console for JavaScript errors

### Issue: Photos don't reorder
- **Solution**: Make sure you're dragging from one photo preview to another (not to empty space)
- Try clicking and holding for a moment before dragging

### Issue: Upload area doesn't highlight when dragging
- **Solution**: Ensure you're dragging image files (check file extensions)
- Try dragging directly over the dashed border area

### Issue: Location not captured
- **Solution**: Grant location permissions when prompted by the browser
- Check browser settings to ensure location access is enabled

## Developer Notes

### Implementation Details

**State Management:**
- `photoFiles`: Array of File objects
- `photoPreviews`: Array of base64 data URLs for preview display
- `isDragging`: Boolean for upload area drag state
- `draggedPhotoIndex`: Index of photo being dragged (null when not dragging)
- `dragOverPhotoIndex`: Index of photo being hovered over during drag

**Event Handlers:**
- `handleDragEnter`: Sets isDragging to true
- `handleDragLeave`: Sets isDragging to false
- `handleDragOver`: Prevents default to allow drop
- `handleDrop`: Processes dropped files and creates previews
- `handlePhotoDragStart`: Initiates photo reordering
- `handlePhotoDragOver`: Updates drag-over state
- `handlePhotoDrop`: Reorders photos in state arrays
- `handlePhotoDragEnd`: Cleans up drag state

**Visual Feedback:**
- Upload area: Border color changes, background tint, text update
- Dragged photo: Opacity 50%, scale 95%
- Drop target: Ring border (2px primary), scale 105%
- Cursor: Changes to move cursor during drag

### Code Location
- Component: `/home/ubuntu/bca-app/client/src/components/AssessmentDialog.tsx`
- Lines: 186-188 (state), 464-576 (handlers), 870-920 (UI)
