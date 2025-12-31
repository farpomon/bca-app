import { sendEmail } from './emailService';
import { getDb } from '../db';
import { users } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

export interface WelcomeEmailData {
  userId: number;
  name: string;
  email: string;
  companyName: string;
  role: string;
  accountStatus: string;
}

/**
 * Generate the app URL for login
 */
function getAppUrl(): string {
  return process.env.VITE_APP_URL || 'https://bca-app.manus.space';
}

/**
 * Send welcome email to a newly created user
 */
export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
  const appUrl = getAppUrl();
  const appTitle = process.env.VITE_APP_TITLE || 'BCA System';
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      <div style="background-color: #1e3a5f; padding: 30px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Welcome to ${appTitle}</h1>
      </div>
      
      <div style="padding: 30px;">
        <p style="font-size: 16px; color: #333333;">Dear ${data.name},</p>
        
        <p style="font-size: 16px; color: #333333; line-height: 1.6;">
          You have been invited to join the <strong>${appTitle}</strong> platform. 
          Your account has been created and you can now access the system.
        </p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #1e3a5f;">
          <h3 style="margin-top: 0; color: #1e3a5f; font-size: 18px;">Your Account Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666666; width: 120px;"><strong>Company:</strong></td>
              <td style="padding: 8px 0; color: #333333;">${data.companyName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666;"><strong>Role:</strong></td>
              <td style="padding: 8px 0; color: #333333;">${formatRole(data.role)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666;"><strong>Status:</strong></td>
              <td style="padding: 8px 0; color: #333333;">${formatStatus(data.accountStatus)}</td>
            </tr>
          </table>
        </div>
        
        <div style="background-color: #e8f4f8; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="margin-top: 0; color: #1e3a5f; font-size: 18px;">How to Get Started</h3>
          <ol style="color: #333333; line-height: 1.8; padding-left: 20px;">
            <li>Click the button below to access the login page</li>
            <li>Sign in using your email address: <strong>${data.email}</strong></li>
            <li>Complete the authentication process</li>
            <li>Start exploring your projects and assessments</li>
          </ol>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${appUrl}" 
             style="background-color: #1e3a5f; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 16px; font-weight: bold;">
            Access ${appTitle}
          </a>
        </div>
        
        <p style="font-size: 14px; color: #666666; line-height: 1.6;">
          If you have any questions or need assistance, please contact your company administrator 
          or reach out to our support team.
        </p>
      </div>
      
      <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          This is an automated notification from ${appTitle}.<br/>
          Please do not reply to this email.
        </p>
      </div>
    </div>
  `;

  const textContent = `
Welcome to ${appTitle}!

Dear ${data.name},

You have been invited to join the ${appTitle} platform. Your account has been created and you can now access the system.

Your Account Details:
- Company: ${data.companyName}
- Role: ${formatRole(data.role)}
- Status: ${formatStatus(data.accountStatus)}

How to Get Started:
1. Visit ${appUrl}
2. Sign in using your email address: ${data.email}
3. Complete the authentication process
4. Start exploring your projects and assessments

If you have any questions or need assistance, please contact your company administrator or reach out to our support team.

This is an automated notification from ${appTitle}.
  `.trim();

  const success = await sendEmail({
    to: data.email,
    subject: `Welcome to ${appTitle} - Your Account Has Been Created`,
    text: textContent,
    html: htmlContent,
  });

  // Update user record to mark email as sent
  if (success) {
    try {
      const db = await getDb();
      if (db) {
        await db.update(users)
          .set({
            welcomeEmailSent: 1,
            welcomeEmailSentAt: new Date().toISOString(),
          })
          .where(eq(users.id, data.userId));
        console.log(`[WelcomeEmail] Marked email as sent for user ${data.userId}`);
      }
    } catch (error) {
      console.error('[WelcomeEmail] Failed to update user record:', error);
    }
  }

  return success;
}

/**
 * Format role for display
 */
function formatRole(role: string): string {
  const roleMap: Record<string, string> = {
    viewer: 'Viewer',
    editor: 'Editor',
    project_manager: 'Project Manager',
    admin: 'Administrator',
    user: 'User',
  };
  return roleMap[role] || role;
}

/**
 * Format account status for display
 */
function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'Pending Activation',
    active: 'Active',
    trial: 'Trial Period',
    suspended: 'Suspended',
  };
  return statusMap[status] || status;
}

/**
 * Resend welcome email to a user
 */
export async function resendWelcomeEmail(userId: number): Promise<{ success: boolean; message: string }> {
  const db = await getDb();
  if (!db) {
    return { success: false, message: 'Database not available' };
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  
  if (!user) {
    return { success: false, message: 'User not found' };
  }

  if (!user.email) {
    return { success: false, message: 'User does not have an email address' };
  }

  const success = await sendWelcomeEmail({
    userId: user.id,
    name: user.name || 'User',
    email: user.email,
    companyName: user.company || 'N/A',
    role: user.role,
    accountStatus: user.accountStatus,
  });

  return {
    success,
    message: success ? 'Welcome email sent successfully' : 'Failed to send welcome email',
  };
}
