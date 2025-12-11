# BCA App TODO

## SaaS Registration Approval & Multi-Tenant Isolation

### Phase 1: Access Requests Backend
- [x] Create access_requests table in schema
  - [x] Columns: id, openId, fullName, email, companyName, city, phoneNumber, useCase, status, submittedAt, reviewedAt, reviewedBy, adminNotes, rejectionReason
- [x] Create accessRequests router with endpoints:
  - [x] submit - New user submits access request
  - [x] list - Admin views all pending requests
  - [x] approve - Admin approves and assigns company/role
  - [x] reject - Admin rejects with reason
  - [x] getMyRequest - User checks their request status
  - [x] getPendingCount - Get count of pending requests
- [x] Register accessRequests router in main router

### Phase 2: New User Request Access Flow
- [ ] Create RequestAccessDialog component
  - [ ] Form fields: Full Name, Email, Company, City, Phone, Reason
  - [ ] Validation and submission
- [ ] Create PendingApproval page
  - [ ] Show "Request submitted" message
  - [ ] Display request status
  - [ ] Show estimated review time
- [ ] Update auth flow to check approval status
  - [ ] Redirect unapproved users to request form or pending page
  - [ ] Allow approved users to proceed

### Phase 3: Admin Approval Dashboard
- [ ] Add "Access Requests" tab to Admin section
- [ ] Create pending requests table
  - [ ] Display: Name, Email, Company, City, Phone, Reason, Date
  - [ ] Actions: Approve, Reject buttons
- [ ] Create ApproveUserDialog
  - [ ] Editable: Company Name, City, Role, Account Status
  - [ ] Admin notes field
  - [ ] Confirm button
- [ ] Create RejectUserDialog
  - [ ] Rejection reason field
  - [ ] Send notification
- [ ] Show pending count badge on Admin nav

### Phase 4: Multi-Tenant Data Isolation
- [x] Update project queries to filter by company
  - [x] getUserProjects - only show user's company projects (admin sees all)
  - [x] getDeletedProjects - filter by company (admin sees all)
  - [ ] getProjectById - verify company ownership
  - [ ] Update tRPC endpoints to pass company and isAdmin flags
- [ ] Update all assessment queries to filter by project's company
- [ ] Update all asset queries to filter by project's company
- [ ] Add company validation to all mutations
  - [ ] Create: auto-assign user's company
  - [ ] Update/Delete: verify company ownership

### Phase 5: Company Filters in UI
- [ ] Update Projects page
  - [ ] Auto-filter by user's company (non-admins)
  - [ ] Show company filter dropdown (admins only)
- [ ] Update user profile to show company name
- [ ] Add company name to project cards
- [ ] Ensure no cross-company data leaks in:
  - [ ] Search results
  - [ ] Shared links
  - [ ] Export functions
  - [ ] Reports

### Phase 6: Testing & Security
- [ ] Test registration flow end-to-end
- [ ] Test company data isolation
  - [ ] User A cannot see User B's projects (different companies)
  - [ ] User A cannot access User B's project by URL
  - [ ] Admin can see all companies
- [ ] Test approval/rejection flow
- [ ] Create checkpoint

## Completed Features

### Soft Delete with 90-Day Recovery
- [x] Add "deleted" status to projects status enum
- [x] Add deletedAt timestamp column to projects table
- [x] Add deletedBy column to track who deleted the project
- [x] Update projects.delete mutation to soft delete
- [x] Create projects.restore mutation
- [x] Update projects.list to exclude deleted projects by default
- [x] Create projects.listDeleted to show deleted projects
- [x] Create "Deleted Projects" view/tab
- [x] Create cleanup function for projects > 90 days old
- [x] Add admin endpoint to trigger cleanup manually

### Admin User Management
- [x] Create users.list tRPC query (admin only)
- [x] Create users.updateRole tRPC mutation (admin only)
- [x] Create users.updateAccountStatus tRPC mutation (admin only)
- [x] Add "User Management" tab to Admin page
- [x] Create user list table with all user details
- [x] Add role dropdown for each user
- [x] Add account status dropdown for each user
- [x] Disable dropdown for current user (prevent self-demotion)
- [x] Show success/error toasts

### User Management Enhancements (In Progress)
- [x] Add updateAccountStatus mutation to users router
- [x] Add account status dropdown next to role dropdown
- [x] Add search input above user table
- [x] Implement client-side search by name, email, company
- [x] Add filter dropdowns for Role, Account Status, Company
- [x] Show active filter count badge
- [x] Add "Clear Filters" button
- [ ] Create activity_logs table (pending)
- [ ] Create user activity log UI (pending)
