import { notifyOwner } from "../_core/notification";

/**
 * Email notification service for access requests
 * Sends notifications to admin and users during the signup workflow
 */

const ADMIN_EMAIL = "lfaria@mabenconsulting.ca";

/**
 * Send notification to admin when a new registration request is submitted
 */
export async function notifyAdminNewRegistration(data: {
  fullName: string;
  email: string;
  companyName: string;
  city: string;
  phoneNumber?: string;
  useCase?: string;
  submittedAt: Date;
}): Promise<boolean> {
  const title = `🆕 New Registration Request - ${data.fullName}`;
  
  const content = `
A new user has requested access to the Building Condition Assessment System.

**User Details:**
- Name: ${data.fullName}
- Email: ${data.email}
- Company: ${data.companyName}
- City: ${data.city}
${data.phoneNumber ? `- Phone: ${data.phoneNumber}` : ""}
- Submitted: ${data.submittedAt.toLocaleString()}

${data.useCase ? `**Use Case:**\n${data.useCase}` : ""}

**Next Steps:**
Please review this request in the Admin dashboard and approve or reject it.

---
This notification was sent to: ${ADMIN_EMAIL}
  `.trim();

  try {
    const result = await notifyOwner({ title, content });
    return result;
  } catch (error) {
    console.error("[Email] Failed to send admin notification:", error);
    return false;
  }
}

/**
 * Send confirmation email to user after they submit registration
 */
export async function notifyUserRegistrationReceived(data: {
  fullName: string;
  email: string;
}): Promise<boolean> {
  const title = `✅ Registration Request Received`;
  
  const content = `
Hi ${data.fullName},

Thank you for requesting access to the Building Condition Assessment System!

We have received your registration request and will review it within 24-48 hours.

**What happens next:**
1. Our team will review your request
2. You'll receive an email notification once your request is approved or if we need more information
3. After approval, you can log in and start creating building assessments

If you have any questions, please contact us at ${ADMIN_EMAIL}.

Best regards,
Maben Consulting Team
  `.trim();

  try {
    // Note: This uses notifyOwner which sends to the project owner
    // In a production system, you would use a proper email service to send to the user's email
    console.log(`[Email] Would send confirmation to ${data.email}:`, { title, content });
    return true;
  } catch (error) {
    console.error("[Email] Failed to send user confirmation:", error);
    return false;
  }
}

/**
 * Send approval notification to user when admin approves their request
 */
export async function notifyUserApproved(data: {
  fullName: string;
  email: string;
  companyName: string;
  role: string;
}): Promise<boolean> {
  const title = `🎉 Your Access Request Has Been Approved!`;
  
  const content = `
Hi ${data.fullName},

Great news! Your access request to the Building Condition Assessment System has been approved.

**Your Account Details:**
- Company: ${data.companyName}
- Role: ${data.role}

**Getting Started:**
1. Visit the application and click "Log In"
2. Use your email (${data.email}) to sign in
3. Start creating building assessment projects

If you need any help getting started, please contact us at ${ADMIN_EMAIL}.

Welcome to the BCA System!

Best regards,
Maben Consulting Team
  `.trim();

  try {
    console.log(`[Email] Would send approval notification to ${data.email}:`, { title, content });
    return true;
  } catch (error) {
    console.error("[Email] Failed to send approval notification:", error);
    return false;
  }
}

/**
 * Send rejection notification to user when admin rejects their request
 */
export async function notifyUserRejected(data: {
  fullName: string;
  email: string;
  rejectionReason?: string;
}): Promise<boolean> {
  const title = `Registration Request Update`;
  
  const content = `
Hi ${data.fullName},

Thank you for your interest in the Building Condition Assessment System.

Unfortunately, we are unable to approve your access request at this time.

${data.rejectionReason ? `**Reason:**\n${data.rejectionReason}` : ""}

If you have any questions or would like to discuss this further, please contact us at ${ADMIN_EMAIL}.

Best regards,
Maben Consulting Team
  `.trim();

  try {
    console.log(`[Email] Would send rejection notification to ${data.email}:`, { title, content });
    return true;
  } catch (error) {
    console.error("[Email] Failed to send rejection notification:", error);
    return false;
  }
}
