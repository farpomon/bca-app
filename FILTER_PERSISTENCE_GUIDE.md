# Filter State Persistence Guide

## Overview

The BCA App now includes a **filter state persistence** feature that automatically preserves applied filters when users navigate between pages. When users click "Back to Projects" from an asset or project detail view, they return to the Projects list with their previously applied filters intact.

## How It Works

### URL-Based State Management

The filter persistence system uses URL query parameters to store filter state. This approach provides several benefits:

- **Shareable URLs**: Users can share filtered project lists with colleagues
- **Browser History**: The back button works naturally with filter state
- **Bookmarkable**: Users can bookmark filtered views
- **Stateless**: No server-side session management required

### Filter Preservation Flow

```
Projects Page (with filters: search=test&status=active)
    ↓
User clicks on a project
    ↓
Project Detail Page
    ↓
User clicks "Back to Projects"
    ↓
Projects Page (filters restored: search=test&status=active)
```

## Supported Filters

The following filter parameters are automatically preserved when navigating back to the Projects page:

| Filter | URL Parameter | Example |
|--------|---------------|---------|
| Search Query | `search` | `?search=City Hall` |
| Status | `status` | `?status=active` |
| Date Start | `dateStart` | `?dateStart=2024-01-01` |
| Date End | `dateEnd` | `?dateEnd=2024-12-31` |
| Type | `type` | `?type=building` |
| Priority | `priority` | `?priority=high` |
| Condition | `condition` | `?condition=poor` |

Multiple filters can be combined:
```
/?search=test&status=active&dateStart=2024-01-01&dateEnd=2024-12-31
```

## Using the BackButton Component

### Basic Usage

The `BackButton` component has been enhanced with filter preservation capabilities:

```tsx
import { BackButton } from "@/components/BackButton";

// Navigate back to Projects with filter preservation (default behavior)
<BackButton to="dashboard" label="Back to Projects" />

// Navigate back with filters explicitly enabled
<BackButton to="dashboard" label="Back to Projects" preserveFilters={true} />

// Navigate back without preserving filters
<BackButton to="dashboard" label="Back to Projects" preserveFilters={false} />

// Use browser history (doesn't preserve filters)
<BackButton to="back" label="Back" />
```

### BackButton Props

```typescript
interface BackButtonProps {
  /**
   * Navigation target:
   * - "back": Use browser history back
   * - "dashboard": Navigate to "/" (Projects page)
   * - string: Navigate to specific path
   */
  to?: "back" | "dashboard" | string;
  
  /**
   * Custom label for the button
   */
  label?: string;
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Whether to preserve filter state when navigating
   * @default true
   */
  preserveFilters?: boolean;
}
```

## Updated Pages

The following pages have been updated to use filter-preserving navigation:

### 1. **AssetsList.tsx**
- "Back to Projects" button now preserves filters
- Users can filter projects, navigate to assets, and return with filters intact

### 2. **ProjectDetail.tsx**
- Both "Back to Projects" buttons (error state and main header) preserve filters
- Supports returning from project details with active filters

### 3. **ProjectAnalytics.tsx**
- "Back to Projects" button preserves filters
- Users can return from analytics view with filters maintained

## Implementation Details

### useFilterPersistence Hook

The `useFilterPersistence` hook (in `client/src/hooks/useFilterPersistence.ts`) manages filter state:

```typescript
const { filters, setFilter, clearFilters, activeFiltersCount } = useFilterPersistence({
  search: "",
  status: "all",
  dateStart: "",
  dateEnd: "",
});
```

**Hook Features:**
- Automatically syncs filters with URL query parameters
- Restores filters from URL on page load
- Provides methods to update individual filters
- Counts active filters for UI indicators

### BackButton Filter Extraction

The `BackButton` component extracts filter parameters from the current URL using the `useSearch` hook from wouter:

```typescript
const getFilterQueryString = useCallback(() => {
  if (!preserveFilters || !searchString) return "";
  
  const params = new URLSearchParams(searchString);
  const filterParams = new URLSearchParams();
  
  // Only preserve supported filter keys
  const filterKeys = ["search", "status", "dateStart", "dateEnd", "type", "priority", "condition"];
  
  filterKeys.forEach((key) => {
    const value = params.get(key);
    if (value) {
      filterParams.set(key, value);
    }
  });
  
  const queryString = filterParams.toString();
  return queryString ? `?${queryString}` : "";
}, [searchString, preserveFilters]);
```

## Testing the Feature

### Manual Testing Steps

1. **Navigate to Projects Page**
   - Go to the Projects page
   - Apply a filter (e.g., search for "test" or select a status)

2. **Navigate to Project Details**
   - Click on a project from the filtered list
   - Observe the URL contains the filter parameters

3. **Return to Projects**
   - Click "Back to Projects" button
   - Verify that the same filter is still active
   - The filtered project list should be displayed

4. **Test Multiple Filters**
   - Apply multiple filters (search + status + date range)
   - Navigate to project details
   - Return to projects
   - All filters should be preserved

### Browser DevTools Testing

1. **Open DevTools** (F12)
2. **Go to Network tab**
3. **Apply filters on Projects page**
4. **Observe URL** in the address bar
5. **Navigate to project details**
6. **Click "Back to Projects"**
7. **Verify URL** contains the filter parameters

### Example URLs

**No filters:**
```
https://example.com/
```

**With search filter:**
```
https://example.com/?search=City%20Hall
```

**With multiple filters:**
```
https://example.com/?search=test&status=active&dateStart=2024-01-01&dateEnd=2024-12-31
```

## Adding New Filters

To add support for a new filter parameter:

1. **Update the supported filters list in BackButton.tsx:**
   ```typescript
   const filterKeys = ["search", "status", "dateStart", "dateEnd", "type", "priority", "condition", "newFilter"];
   ```

2. **Add the filter to useFilterPersistence in Projects.tsx:**
   ```typescript
   const { filters, setFilter } = useFilterPersistence({
     search: "",
     status: "all",
     dateStart: "",
     dateEnd: "",
     newFilter: "",
   });
   ```

3. **Use the filter in your component:**
   ```typescript
   const newFilterValue = filters.newFilter;
   const setNewFilter = useCallback((value: string) => setFilter("newFilter", value), [setFilter]);
   ```

## Troubleshooting

### Filters Not Persisting

**Problem:** Filters disappear when navigating back to Projects.

**Solution:**
- Verify the BackButton has `to="dashboard"` and `preserveFilters={true}`
- Check that filter parameters are present in the URL when navigating away
- Ensure the filter key is in the supported list in BackButton.tsx

### URL Getting Too Long

**Problem:** URL becomes very long with many filters.

**Solution:**
- Only non-default, non-empty filter values are added to the URL
- The `useFilterPersistence` hook automatically excludes default values
- Consider reducing the number of active filters

### Filters Not Showing in URL

**Problem:** Applied filters don't appear in the URL.

**Solution:**
- Verify the filter value is not empty
- Check that the filter value is different from the default value
- Ensure the filter key is supported by `useFilterPersistence`

## Browser Compatibility

The filter persistence feature uses standard browser APIs and works in all modern browsers:

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

## Performance Considerations

- **URL Length**: Filter parameters are kept concise to avoid excessively long URLs
- **Query Parsing**: URL parsing happens on component mount and when the URL changes
- **State Updates**: Filter changes use `replaceState` to avoid adding to browser history

## Future Enhancements

Potential improvements to the filter persistence feature:

1. **Filter Presets**: Save and load named filter combinations
2. **Filter History**: Track recently used filter combinations
3. **Advanced Filters**: Support for complex filter expressions
4. **Filter Export**: Share filter configurations via URLs or codes
5. **Filter Analytics**: Track which filters are most commonly used

## Related Files

- `client/src/components/BackButton.tsx` - Filter-preserving navigation button
- `client/src/hooks/useFilterPersistence.ts` - URL-based filter state management
- `client/src/pages/Projects.tsx` - Projects page with filter support
- `client/src/pages/AssetsList.tsx` - Assets page with filter preservation
- `client/src/pages/ProjectDetail.tsx` - Project detail page with filter preservation
- `client/src/pages/ProjectAnalytics.tsx` - Analytics page with filter preservation

## Support

For issues or questions about filter persistence:

1. Check this guide for troubleshooting steps
2. Review the implementation in the related files
3. Check the test file: `client/src/components/BackButton.test.tsx`
4. Contact the development team with specific use cases
