# Pre-Release Review Checklist

## Test Suite
- [ ] Run all unit tests (`pnpm test`)
- [ ] Verify all tests pass
- [ ] Check test coverage

## Database
- [ ] Push schema changes (`pnpm db:push`)
- [ ] Verify database structure
- [ ] Check for pending migrations

## Security
- [ ] Review environment variables
- [ ] Verify authentication flows
- [ ] Check authorization rules
- [ ] Review data isolation (multi-tenant)

## Code Quality
- [ ] Check for TypeScript errors
- [ ] Review critical code paths
- [ ] Identify potential performance issues

## User Flows
- [ ] Test authentication (login/logout)
- [ ] Test project creation
- [ ] Test assessment creation and editing
- [ ] Test backup/restore functionality

## Production Readiness
- [ ] Review error handling
- [ ] Check logging configuration
- [ ] Verify API rate limiting
- [ ] Review backup schedule

---

**Review Started**: $(date)
