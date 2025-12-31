import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the email service
vi.mock('./emailService', () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

// Mock the database
vi.mock('../db', () => ({
  getDb: vi.fn().mockResolvedValue({
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{
            id: 1,
            name: 'Test User',
            email: 'test@example.com',
            company: 'Test Company',
            role: 'viewer',
            accountStatus: 'active',
          }]),
        }),
      }),
    }),
  }),
}));

import { sendWelcomeEmail, resendWelcomeEmail } from './welcomeEmail';
import { sendEmail } from './emailService';

describe('Welcome Email Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email with correct data', async () => {
      const emailData = {
        userId: 1,
        name: 'John Doe',
        email: 'john@example.com',
        companyName: 'Test Company',
        role: 'viewer',
        accountStatus: 'active',
      };

      const result = await sendWelcomeEmail(emailData);

      expect(result).toBe(true);
      expect(sendEmail).toHaveBeenCalledTimes(1);
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'john@example.com',
          subject: expect.stringContaining('Welcome'),
        })
      );
    });

    it('should include user name in email content', async () => {
      const emailData = {
        userId: 1,
        name: 'Jane Smith',
        email: 'jane@example.com',
        companyName: 'ABC Corp',
        role: 'editor',
        accountStatus: 'trial',
      };

      await sendWelcomeEmail(emailData);

      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('Jane Smith'),
          text: expect.stringContaining('Jane Smith'),
        })
      );
    });

    it('should include company name in email content', async () => {
      const emailData = {
        userId: 1,
        name: 'Test User',
        email: 'test@example.com',
        companyName: 'My Company Inc',
        role: 'project_manager',
        accountStatus: 'active',
      };

      await sendWelcomeEmail(emailData);

      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('My Company Inc'),
          text: expect.stringContaining('My Company Inc'),
        })
      );
    });

    it('should format role correctly in email', async () => {
      const emailData = {
        userId: 1,
        name: 'Test User',
        email: 'test@example.com',
        companyName: 'Test Company',
        role: 'project_manager',
        accountStatus: 'active',
      };

      await sendWelcomeEmail(emailData);

      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('Project Manager'),
        })
      );
    });

    it('should format account status correctly in email', async () => {
      const emailData = {
        userId: 1,
        name: 'Test User',
        email: 'test@example.com',
        companyName: 'Test Company',
        role: 'viewer',
        accountStatus: 'trial',
      };

      await sendWelcomeEmail(emailData);

      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('Trial Period'),
        })
      );
    });
  });

  describe('resendWelcomeEmail', () => {
    it('should return success when user exists and has email', async () => {
      const result = await resendWelcomeEmail(1);

      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully');
    });
  });
});
