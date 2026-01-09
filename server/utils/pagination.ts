/**
 * Pagination Utility
 * 
 * Provides consistent pagination logic for large datasets
 */

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

/**
 * Default pagination settings
 */
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;

/**
 * Paginate an array of items
 * 
 * @param items - Array of items to paginate
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of items per page
 * @returns Paginated result with metadata
 */
export function paginate<T>(
  items: T[],
  page: number = 1,
  pageSize: number = DEFAULT_PAGE_SIZE
): PaginatedResult<T> {
  // Validate and normalize inputs
  const normalizedPage = Math.max(1, Math.floor(page));
  const normalizedPageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(pageSize)));
  
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / normalizedPageSize);
  
  // Calculate start and end indices
  const startIndex = (normalizedPage - 1) * normalizedPageSize;
  const endIndex = startIndex + normalizedPageSize;
  
  // Slice the items
  const paginatedItems = items.slice(startIndex, endIndex);
  
  return {
    items: paginatedItems,
    pagination: {
      page: normalizedPage,
      pageSize: normalizedPageSize,
      totalItems,
      totalPages,
      hasNextPage: normalizedPage < totalPages,
      hasPreviousPage: normalizedPage > 1,
    },
  };
}

/**
 * Calculate SQL LIMIT and OFFSET for database queries
 * 
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of items per page
 * @returns Object with limit and offset values
 */
export function getPaginationSql(
  page: number = 1,
  pageSize: number = DEFAULT_PAGE_SIZE
): { limit: number; offset: number } {
  const normalizedPage = Math.max(1, Math.floor(page));
  const normalizedPageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(pageSize)));
  
  return {
    limit: normalizedPageSize,
    offset: (normalizedPage - 1) * normalizedPageSize,
  };
}

/**
 * Create pagination metadata from total count
 * 
 * @param totalItems - Total number of items
 * @param page - Current page number
 * @param pageSize - Number of items per page
 * @returns Pagination metadata
 */
export function createPaginationMetadata(
  totalItems: number,
  page: number = 1,
  pageSize: number = DEFAULT_PAGE_SIZE
) {
  const normalizedPage = Math.max(1, Math.floor(page));
  const normalizedPageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(pageSize)));
  const totalPages = Math.ceil(totalItems / normalizedPageSize);
  
  return {
    page: normalizedPage,
    pageSize: normalizedPageSize,
    totalItems,
    totalPages,
    hasNextPage: normalizedPage < totalPages,
    hasPreviousPage: normalizedPage > 1,
  };
}
