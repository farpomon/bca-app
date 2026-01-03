# Company-Based Sign-Up Process Implementation Guide

## Overview

Transform the current individual account system into a robust multi-tenant architecture where each user belongs to a company account. This enables proper data isolation, team collaboration, and enterprise-grade account management.

---

## Current State Analysis

**Existing Infrastructure:**
- ✅ Users table has `company` and `city` fields (VARCHAR 255)
- ✅ Access requests table captures company information during registration
- ✅ `accountStatus` enum supports pending/active/trial/suspended states
- ✅ Role-based access control with admin/user roles
- ✅ Data isolation logic in `getUserProjects()` filters by company name

**Current Limitations:**
- ❌ Company field is free-text (no normalization, prone to typos)
- ❌ No dedicated companies table (can't manage company-level settings)
- ❌ Users manually enter company name during OAuth callback
- ❌ No company admin role (can't delegate user management)
- ❌ No invitation system (users can't invite teammates)
- ❌ No company-level billing or subscription management

---

## Proposed Architecture

### Database Schema Changes

#### 1. Create Companies Table

```sql
CREATE TABLE companies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  domain VARCHAR(255), -- Email domain for auto-assignment (e.g., "acme.com")
  industry VARCHAR(100),
  size ENUM('1-10', '11-50', '51-200', '201-500', '501+'),
  address TEXT,
  city VARCHAR(255),
  province VARCHAR(100),
  postalCode VARCHAR(20),
  country VARCHAR(100) DEFAULT 'Canada',
  phone VARCHAR(50),
  website VARCHAR(255),
  
  -- Subscription & Billing
  subscriptionTier ENUM('free', 'professional', 'enterprise') DEFAULT 'free',
  subscriptionStatus ENUM('trial', 'active', 'past_due', 'cancelled') DEFAULT 'trial',
  trialEndsAt TIMESTAMP,
  subscriptionStartedAt TIMESTAMP,
  maxUsers INT DEFAULT 5,
  maxProjects INT DEFAULT 10,
  
  -- Company Settings
  allowedDomains TEXT, -- JSON array of approved email domains
  requireEmailVerification TINYINT DEFAULT 1,
  allowSelfSignup TINYINT DEFAULT 0, -- If true, users with matching domain can auto-join
  
  -- Compliance & Security
  dataResidency VARCHAR(50) DEFAULT 'Canada',
  retentionPolicyYears INT DEFAULT 7,
  
  -- Metadata
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  createdBy INT, -- User ID of company creator
  
  INDEX idx_domain (domain),
  INDEX idx_name (name)
);
```

#### 2. Update Users Table

```sql
ALTER TABLE users
  ADD COLUMN companyId INT AFTER role,
  ADD COLUMN companyRole ENUM('member', 'company_admin', 'owner') DEFAULT 'member',
  ADD COLUMN invitedBy INT,
  ADD COLUMN invitationAcceptedAt TIMESTAMP,
  ADD COLUMN emailVerified TINYINT DEFAULT 0,
  ADD COLUMN emailVerificationToken VARCHAR(255),
  ADD COLUMN emailVerificationExpiry TIMESTAMP,
  ADD FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE,
  ADD FOREIGN KEY (invitedBy) REFERENCES users(id) ON DELETE SET NULL,
  ADD INDEX idx_company (companyId);

-- Migrate existing company names to companies table
-- Keep existing 'company' VARCHAR field for backward compatibility during migration
```

#### 3. Create Company Invitations Table

```sql
CREATE TABLE company_invitations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  companyId INT NOT NULL,
  email VARCHAR(320) NOT NULL,
  role ENUM('viewer', 'editor', 'project_manager', 'company_admin') DEFAULT 'editor',
  invitedBy INT NOT NULL,
  invitationToken VARCHAR(255) NOT NULL UNIQUE,
  status ENUM('pending', 'accepted', 'expired', 'cancelled') DEFAULT 'pending',
  expiresAt TIMESTAMP NOT NULL,
  acceptedAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (invitedBy) REFERENCES users(id) ON DELETE CASCADE,
  
  INDEX idx_token (invitationToken),
  INDEX idx_email (email),
  INDEX idx_company (companyId)
);
```

---

## Sign-Up Workflow Design

### Workflow 1: New Company Registration (Company Owner)

**User Journey:**
1. User clicks "Sign Up" → Redirects to Manus OAuth
2. After OAuth, user lands on **Company Setup Page** (first-time only)
3. User fills out company registration form:
   - Company Name (required)
   - Industry (dropdown)
   - Company Size (dropdown)
   - City, Province (required)
   - Email domain (optional, for auto-assignment)
4. System creates company record with user as `owner`
5. User gets 14-day free trial automatically
6. Redirect to dashboard with onboarding checklist

**Backend Logic:**
```typescript
// In OAuth callback (server/_core/oauth.ts)
const user = await db.getUserByOpenId(userInfo.openId);

if (!user) {
  // New user - redirect to company setup
  res.redirect(302, "/setup/company?openId=" + userInfo.openId);
} else if (!user.companyId) {
  // Existing user without company - redirect to company setup
  res.redirect(302, "/setup/company");
} else {
  // Existing user with company - normal login
  res.redirect(302, "/");
}
```

### Workflow 2: Invited User (Team Member)

**User Journey:**
1. User receives invitation email with link: `/invite/accept?token=abc123`
2. User clicks link → Redirects to Manus OAuth (if not logged in)
3. After OAuth, system validates invitation token
4. User sees invitation acceptance page showing:
   - Company name
   - Role being assigned
   - Inviter name
5. User clicks "Accept Invitation"
6. System assigns user to company with specified role
7. Redirect to dashboard

**Backend Logic:**
```typescript
// New endpoint: /api/invite/accept
async acceptInvitation(token: string, userId: number) {
  const invitation = await db.getInvitationByToken(token);
  
  if (!invitation || invitation.status !== 'pending') {
    throw new Error('Invalid or expired invitation');
  }
  
  if (new Date() > new Date(invitation.expiresAt)) {
    await db.updateInvitationStatus(invitation.id, 'expired');
    throw new Error('Invitation has expired');
  }
  
  // Assign user to company
  await db.updateUser(userId, {
    companyId: invitation.companyId,
    companyRole: invitation.role,
    invitedBy: invitation.invitedBy,
    invitationAcceptedAt: new Date().toISOString(),
    accountStatus: 'active'
  });
  
  // Mark invitation as accepted
  await db.updateInvitationStatus(invitation.id, 'accepted');
  
  return { success: true };
}
```

### Workflow 3: Domain-Based Auto-Assignment (Optional)

**User Journey:**
1. User signs up with email `john@acme.com`
2. System checks if company with domain `acme.com` exists
3. If company has `allowSelfSignup = true`:
   - Auto-assign user to company as `member`
   - Send notification to company admins
   - User gets immediate access
4. If `allowSelfSignup = false`:
   - Create access request for company admin approval
   - User sees "Pending approval" message

---

## UI Components to Build

### 1. Company Setup Page (`/setup/company`)

**Form Fields:**
- Company Name* (text input)
- Industry (dropdown: Construction, Real Estate, Property Management, Government, Other)
- Company Size (dropdown: 1-10, 11-50, 51-200, 201-500, 501+)
- Address (text input)
- City* (text input)
- Province* (dropdown: Canadian provinces)
- Postal Code (text input)
- Phone (text input)
- Website (text input)
- Email Domain (text input, help text: "e.g., acme.com - users with this domain can auto-join")

**Submit Button:** "Create Company & Continue"

**Design Notes:**
- Clean, professional form with validation
- Progress indicator: "Step 1 of 2: Company Information"
- Help text explaining trial period (14 days free)

### 2. Team Management Page (`/settings/team`)

**Features:**
- List all company users with roles
- Invite new users (email + role selection)
- Change user roles (dropdown)
- Remove users (with confirmation)
- Pending invitations list (with resend/cancel options)

**Invite User Dialog:**
- Email address input
- Role dropdown (Viewer, Editor, Project Manager, Company Admin)
- Custom message (optional textarea)
- "Send Invitation" button

### 3. Company Settings Page (`/settings/company`)

**Tabs:**
- **General**: Company name, industry, size, contact info
- **Team**: User management (link to Team Management Page)
- **Subscription**: Current plan, usage limits, upgrade button
- **Security**: Email domain settings, self-signup toggle, email verification toggle
- **Compliance**: Data residency, retention policy

### 4. Invitation Acceptance Page (`/invite/accept`)

**Display:**
- Company logo (if available)
- "You've been invited to join [Company Name]"
- Inviter name and photo
- Role being assigned
- "Accept Invitation" button
- "Decline" link

---

## Backend Implementation Checklist

### Database Layer (`server/db.ts`)

```typescript
// Company CRUD
export async function createCompany(data: InsertCompany): Promise<number>
export async function getCompanyById(id: number): Promise<Company | undefined>
export async function getCompanyByDomain(domain: string): Promise<Company | undefined>
export async function updateCompany(id: number, data: Partial<Company>): Promise<void>
export async function getCompanyUsers(companyId: number): Promise<User[]>

// User-Company Association
export async function assignUserToCompany(userId: number, companyId: number, role: string): Promise<void>
export async function removeUserFromCompany(userId: number): Promise<void>
export async function updateUserCompanyRole(userId: number, role: string): Promise<void>

// Invitations
export async function createInvitation(data: InsertInvitation): Promise<string> // Returns token
export async function getInvitationByToken(token: string): Promise<Invitation | undefined>
export async function getCompanyInvitations(companyId: number): Promise<Invitation[]>
export async function updateInvitationStatus(id: number, status: string): Promise<void>
export async function cancelInvitation(id: number): Promise<void>
```

### tRPC Routers

#### Company Router (`server/routers/company.router.ts`)

```typescript
export const companyRouter = router({
  // Company Setup
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(2).max(255),
      industry: z.string().optional(),
      size: z.enum(['1-10', '11-50', '51-200', '201-500', '501+']).optional(),
      city: z.string().min(2),
      province: z.string().min(2),
      domain: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Create company with user as owner
    }),
  
  // Get current user's company
  getCurrent: protectedProcedure
    .query(async ({ ctx }) => {
      // Return company details
    }),
  
  // Update company (company_admin or owner only)
  update: protectedProcedure
    .input(z.object({
      name: z.string().optional(),
      industry: z.string().optional(),
      // ... other fields
    }))
    .mutation(async ({ ctx, input }) => {
      // Update company
    }),
  
  // Get company users (company_admin or owner only)
  getUsers: protectedProcedure
    .query(async ({ ctx }) => {
      // Return list of company users
    }),
  
  // Update user role (company_admin or owner only)
  updateUserRole: protectedProcedure
    .input(z.object({
      userId: z.number(),
      role: z.enum(['member', 'company_admin']),
    }))
    .mutation(async ({ ctx, input }) => {
      // Update user's company role
    }),
  
  // Remove user from company (company_admin or owner only)
  removeUser: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Remove user from company
    }),
});
```

#### Invitation Router (`server/routers/invitation.router.ts`)

```typescript
export const invitationRouter = router({
  // Send invitation (company_admin or owner only)
  send: protectedProcedure
    .input(z.object({
      email: z.string().email(),
      role: z.enum(['viewer', 'editor', 'project_manager', 'company_admin']),
      message: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Create invitation and send email
    }),
  
  // Get company invitations (company_admin or owner only)
  list: protectedProcedure
    .query(async ({ ctx }) => {
      // Return pending/accepted invitations
    }),
  
  // Validate invitation token (public)
  validate: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      // Return invitation details if valid
    }),
  
  // Accept invitation (protected)
  accept: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Assign user to company
    }),
  
  // Cancel invitation (company_admin or owner only)
  cancel: protectedProcedure
    .input(z.object({ invitationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Cancel invitation
    }),
  
  // Resend invitation (company_admin or owner only)
  resend: protectedProcedure
    .input(z.object({ invitationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Generate new token and resend email
    }),
});
```

### Email Notifications

**Invitation Email Template:**
```
Subject: You've been invited to join [Company Name] on Building Condition Assessment

Hi there,

[Inviter Name] has invited you to join [Company Name] on the Building Condition Assessment platform.

Role: [Role Name]
Company: [Company Name]

Click the link below to accept this invitation:
[Accept Invitation Button] → https://app.example.com/invite/accept?token=abc123

This invitation will expire in 7 days.

If you have any questions, please contact [Inviter Email].

---
Building Condition Assessment System
```

**Company Admin Notification (New User Auto-Joined):**
```
Subject: New team member joined [Company Name]

Hi [Admin Name],

A new user has joined your company:

Name: [User Name]
Email: [User Email]
Joined: [Date]

They were automatically added because their email domain matches your company settings.

View team members: [Link to Team Management]

---
Building Condition Assessment System
```

---

## Migration Strategy

### Phase 1: Add New Tables (Non-Breaking)
1. Create `companies` table
2. Create `company_invitations` table
3. Add new columns to `users` table (nullable)
4. Deploy database changes

### Phase 2: Data Migration
1. Create companies from existing unique `company` values in users table
2. Assign `companyId` to users based on company name match
3. Set first user per company as `owner`, others as `member`
4. Verify data integrity

### Phase 3: Update Application Logic
1. Update OAuth callback to check for company assignment
2. Implement company setup page
3. Implement invitation system
4. Update data isolation logic to use `companyId` instead of company name
5. Add company admin capabilities

### Phase 4: Enforce Company Requirement
1. Make `companyId` NOT NULL (after all users assigned)
2. Remove old `company` VARCHAR field
3. Update all queries to use `companyId`

---

## Authorization Rules

### Company-Level Permissions

| Action | Owner | Company Admin | Project Manager | Editor | Viewer |
|--------|-------|---------------|-----------------|--------|--------|
| View company settings | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit company settings | ✅ | ✅ | ❌ | ❌ | ❌ |
| Invite users | ✅ | ✅ | ✅ | ❌ | ❌ |
| Remove users | ✅ | ✅ | ❌ | ❌ | ❌ |
| Change user roles | ✅ | ✅ | ❌ | ❌ | ❌ |
| View all company projects | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create projects | ✅ | ✅ | ✅ | ✅ | ❌ |
| Edit any project | ✅ | ✅ | ✅ | ❌ | ❌ |
| Delete projects | ✅ | ✅ | ✅ | ❌ | ❌ |
| Manage subscription | ✅ | ✅ | ❌ | ❌ | ❌ |

### Implementation in tRPC

```typescript
// Middleware for company admin actions
const companyAdminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.user.companyId) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'No company assigned' });
  }
  
  if (ctx.user.companyRole !== 'owner' && ctx.user.companyRole !== 'company_admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Company admin access required' });
  }
  
  return next({ ctx });
});

// Middleware for company owner actions
const companyOwnerProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.companyRole !== 'owner') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Company owner access required' });
  }
  
  return next({ ctx });
});
```

---

## Testing Checklist

### Unit Tests
- [ ] Company creation with valid data
- [ ] Company creation with duplicate name (should fail)
- [ ] User assignment to company
- [ ] Invitation creation and token generation
- [ ] Invitation acceptance flow
- [ ] Invitation expiration handling
- [ ] Domain-based auto-assignment logic
- [ ] Company admin permission checks
- [ ] Data isolation by companyId

### Integration Tests
- [ ] Full sign-up flow for new company owner
- [ ] Full invitation flow for team member
- [ ] OAuth callback with existing company user
- [ ] OAuth callback with new user (no company)
- [ ] Company settings update by admin
- [ ] User role change by company admin
- [ ] User removal from company
- [ ] Invitation cancellation
- [ ] Invitation resend

### Manual Testing Scenarios
1. **New Company Registration**
   - Sign up as new user
   - Complete company setup form
   - Verify company created
   - Verify user assigned as owner
   - Verify trial period activated

2. **Team Invitation**
   - As company admin, invite new user
   - Verify invitation email sent
   - Accept invitation as invited user
   - Verify user assigned to company with correct role
   - Verify access to company projects

3. **Domain Auto-Assignment**
   - Configure company with email domain
   - Enable self-signup
   - Sign up with matching email domain
   - Verify auto-assignment to company
   - Verify company admin notification sent

4. **Permission Enforcement**
   - Test each role's access to various features
   - Verify company admins can manage team
   - Verify members cannot access company settings
   - Verify data isolation between companies

---

## Security Considerations

### Data Isolation
- **Critical**: All queries MUST filter by `companyId`
- Use middleware to inject company filter automatically
- Prevent cross-company data access through API manipulation

### Invitation Security
- Generate cryptographically secure tokens (32+ bytes)
- Set expiration (7 days recommended)
- Validate token on every use
- Prevent token reuse after acceptance
- Rate limit invitation sending (prevent spam)

### Company Admin Abuse Prevention
- Log all admin actions (user invites, role changes, removals)
- Prevent owner from being removed or demoted
- Require owner confirmation for sensitive actions
- Implement audit trail for company changes

### Email Verification
- Send verification email after sign-up
- Block access until email verified (optional, configurable per company)
- Resend verification email option
- Expire verification tokens after 24 hours

---

## Future Enhancements

### Phase 2 Features
- [ ] Company branding (logo, colors)
- [ ] Custom email domains (white-label)
- [ ] SSO/SAML integration per company
- [ ] Company-level API keys
- [ ] Billing and subscription management
- [ ] Usage analytics per company
- [ ] Company-level compliance settings
- [ ] Multi-company support (users in multiple companies)

### Phase 3 Features
- [ ] Company hierarchy (parent/child companies)
- [ ] Cross-company project sharing
- [ ] Company templates and standards
- [ ] Company-wide reporting
- [ ] Bulk user import (CSV)
- [ ] Active Directory integration
- [ ] Company-level data export

---

## Success Metrics

### Key Performance Indicators
- **Sign-up completion rate**: % of users who complete company setup
- **Invitation acceptance rate**: % of invitations accepted within 7 days
- **Time to first project**: Average time from sign-up to first project creation
- **Team size growth**: Average number of users per company over time
- **Feature adoption**: % of companies using team collaboration features

### User Experience Goals
- Company setup completed in < 2 minutes
- Invitation acceptance flow completed in < 1 minute
- Zero confusion about company vs. personal accounts
- Clear role and permission understanding

---

## Implementation Priority

### Must Have (MVP)
1. ✅ Companies table and user association
2. ✅ Company setup page for new users
3. ✅ Basic invitation system (send/accept)
4. ✅ Company admin role and permissions
5. ✅ Data isolation by companyId
6. ✅ Team management page

### Should Have (Phase 1)
7. ✅ Domain-based auto-assignment
8. ✅ Email notifications for invitations
9. ✅ Company settings page
10. ✅ Invitation expiration and resend
11. ✅ Audit logging for company actions

### Nice to Have (Phase 2)
12. ⏳ Company branding
13. ⏳ Usage limits enforcement
14. ⏳ Subscription management
15. ⏳ Bulk user import
16. ⏳ SSO integration

---

## Support & Documentation

### User-Facing Documentation
- **Getting Started Guide**: How to set up your company account
- **Inviting Team Members**: Step-by-step invitation process
- **Managing Roles**: Understanding permissions and roles
- **Company Settings**: Configuring domain settings and security

### Admin Documentation
- **Multi-Tenancy Architecture**: Technical overview
- **Data Isolation**: How company data is separated
- **Migration Guide**: Moving from individual to company accounts
- **Troubleshooting**: Common issues and solutions

---

## Questions to Consider

1. **Should users be allowed to create multiple companies?**
   - Recommendation: No for MVP, add in Phase 2 if needed

2. **What happens to projects when a user leaves a company?**
   - Recommendation: Projects stay with company, reassign ownership to company admin

3. **Can a user be in multiple companies simultaneously?**
   - Recommendation: No for MVP, single company per user

4. **Should we allow company merging?**
   - Recommendation: Not in MVP, complex data migration required

5. **How do we handle company name changes?**
   - Recommendation: Allow company admins to change name, log changes

6. **Should invitations be email-only or support other methods?**
   - Recommendation: Email-only for MVP, add SMS/Slack in Phase 2

7. **What's the maximum team size for free tier?**
   - Recommendation: 5 users for free, unlimited for paid plans

8. **Should we enforce unique email domains per company?**
   - Recommendation: No, multiple companies can share domains (e.g., gmail.com)

---

## Conclusion

This implementation guide provides a complete roadmap for transforming the BCA application into a multi-tenant, company-based system. The phased approach ensures minimal disruption while delivering immediate value through team collaboration and proper data isolation.

**Estimated Implementation Time:**
- Phase 1 (MVP): 2-3 weeks
- Phase 2 (Enhancements): 1-2 weeks
- Phase 3 (Advanced Features): 2-4 weeks

**Next Steps:**
1. Review and approve this design document
2. Create database migration scripts
3. Implement backend company and invitation routers
4. Build company setup and team management UI
5. Test thoroughly with multiple companies
6. Deploy to staging for user acceptance testing
7. Migrate existing users to company structure
8. Deploy to production with monitoring

