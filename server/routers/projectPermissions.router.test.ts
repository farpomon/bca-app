import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// Mock the database module before importing the router
vi.mock('../db', () => {
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();
  
  return {
    getDb: vi.fn().mockResolvedValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    }),
    __mockSelect: mockSelect,
    __mockInsert: mockInsert,
    __mockUpdate: mockUpdate,
    __mockDelete: mockDelete,
  };
});

// Mock drizzle-orm
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a, b) => ({ type: 'eq', field: a, value: b })),
  and: vi.fn((...args) => ({ type: 'and', conditions: args })),
  inArray: vi.fn((field, values) => ({ type: 'inArray', field, values })),
  sql: vi.fn((strings, ...values) => ({ type: 'sql', strings, values })),
}));

// Mock schema
vi.mock('../../drizzle/schema', () => ({
  projectPermissions: { 
    id: 'projectPermissions.id', 
    projectId: 'projectPermissions.projectId', 
    userId: 'projectPermissions.userId', 
    companyId: 'projectPermissions.companyId', 
    permission: 'projectPermissions.permission', 
    grantedBy: 'projectPermissions.grantedBy',
    createdAt: 'projectPermissions.createdAt',
    updatedAt: 'projectPermissions.updatedAt',
  },
  projects: { 
    id: 'projects.id', 
    name: 'projects.name', 
    status: 'projects.status', 
    userId: 'projects.userId',
    createdAt: 'projects.createdAt',
  },
  users: { 
    id: 'users.id', 
    name: 'users.name', 
    email: 'users.email', 
    role: 'users.role', 
    company: 'users.company',
    accountStatus: 'users.accountStatus',
  },
  companies: { 
    id: 'companies.id', 
    name: 'companies.name' 
  },
}));

// Import after mocks are set up
import { projectPermissionsRouter } from './projectPermissions.router';
import * as dbModule from '../db';

describe('Project Permissions Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('grant permission', () => {
    it('should require admin or project_manager role to grant permissions', async () => {
      const ctx = {
        user: {
          id: 1,
          role: 'viewer',
          company: 'Test Company',
        },
        req: {},
        res: {},
      };

      const caller = projectPermissionsRouter.createCaller(ctx as any);

      await expect(
        caller.grant({
          projectId: 1,
          userId: 2,
          permission: 'view',
        })
      ).rejects.toThrow(TRPCError);
    });

    it('should require admin or project_manager role - editor should fail', async () => {
      const ctx = {
        user: {
          id: 1,
          role: 'editor',
          company: 'Test Company',
        },
        req: {},
        res: {},
      };

      const caller = projectPermissionsRouter.createCaller(ctx as any);

      await expect(
        caller.grant({
          projectId: 1,
          userId: 2,
          permission: 'edit',
        })
      ).rejects.toThrow('Only admins and project managers can grant permissions');
    });
  });

  describe('revoke permission', () => {
    it('should require admin or project_manager role to revoke permissions', async () => {
      const ctx = {
        user: {
          id: 1,
          role: 'editor',
          company: 'Test Company',
        },
        req: {},
        res: {},
      };

      const caller = projectPermissionsRouter.createCaller(ctx as any);

      await expect(
        caller.revoke({
          projectId: 1,
          userId: 2,
        })
      ).rejects.toThrow(TRPCError);
    });

    it('should prevent viewer from revoking permissions', async () => {
      const ctx = {
        user: {
          id: 1,
          role: 'viewer',
          company: 'Test Company',
        },
        req: {},
        res: {},
      };

      const caller = projectPermissionsRouter.createCaller(ctx as any);

      await expect(
        caller.revoke({
          projectId: 1,
          userId: 2,
        })
      ).rejects.toThrow('Only admins and project managers can revoke permissions');
    });
  });

  describe('listByUser', () => {
    it('should prevent non-admins from viewing other users permissions', async () => {
      const ctx = {
        user: {
          id: 1,
          role: 'viewer',
          company: 'Test Company',
        },
        req: {},
        res: {},
      };

      const caller = projectPermissionsRouter.createCaller(ctx as any);

      await expect(
        caller.listByUser({ userId: 2 })
      ).rejects.toThrow('You can only view your own permissions');
    });

    it('should prevent editor from viewing other users permissions', async () => {
      const ctx = {
        user: {
          id: 1,
          role: 'editor',
          company: 'Test Company',
        },
        req: {},
        res: {},
      };

      const caller = projectPermissionsRouter.createCaller(ctx as any);

      await expect(
        caller.listByUser({ userId: 999 })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe('bulkGrant', () => {
    it('should require admin role for bulk grant operations', async () => {
      const ctx = {
        user: {
          id: 1,
          role: 'project_manager',
          company: 'Test Company',
        },
        req: {},
        res: {},
      };

      const caller = projectPermissionsRouter.createCaller(ctx as any);

      await expect(
        caller.bulkGrant({
          projectId: 1,
          userIds: [2, 3, 4],
          permission: 'view',
        })
      ).rejects.toThrow('Only admins can bulk grant permissions');
    });

    it('should prevent editor from bulk granting', async () => {
      const ctx = {
        user: {
          id: 1,
          role: 'editor',
          company: 'Test Company',
        },
        req: {},
        res: {},
      };

      const caller = projectPermissionsRouter.createCaller(ctx as any);

      await expect(
        caller.bulkGrant({
          projectId: 1,
          userIds: [2, 3],
          permission: 'edit',
        })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe('bulkRevoke', () => {
    it('should require admin role for bulk revoke operations', async () => {
      const ctx = {
        user: {
          id: 1,
          role: 'editor',
          company: 'Test Company',
        },
        req: {},
        res: {},
      };

      const caller = projectPermissionsRouter.createCaller(ctx as any);

      await expect(
        caller.bulkRevoke({
          projectId: 1,
          userIds: [2, 3],
        })
      ).rejects.toThrow('Only admins can bulk revoke permissions');
    });

    it('should prevent project_manager from bulk revoking', async () => {
      const ctx = {
        user: {
          id: 1,
          role: 'project_manager',
          company: 'Test Company',
        },
        req: {},
        res: {},
      };

      const caller = projectPermissionsRouter.createCaller(ctx as any);

      await expect(
        caller.bulkRevoke({
          projectId: 1,
          userIds: [2],
        })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe('listByCompany', () => {
    it('should require admin or project_manager role', async () => {
      const ctx = {
        user: {
          id: 1,
          role: 'viewer',
          company: 'Test Company',
        },
        req: {},
        res: {},
      };

      const caller = projectPermissionsRouter.createCaller(ctx as any);

      await expect(
        caller.listByCompany({})
      ).rejects.toThrow('Only admins and project managers can view permissions');
    });

    it('should prevent editor from listing company permissions', async () => {
      const ctx = {
        user: {
          id: 1,
          role: 'editor',
          company: 'Test Company',
        },
        req: {},
        res: {},
      };

      const caller = projectPermissionsRouter.createCaller(ctx as any);

      await expect(
        caller.listByCompany({ companyName: 'Test Company' })
      ).rejects.toThrow(TRPCError);
    });
  });
});
