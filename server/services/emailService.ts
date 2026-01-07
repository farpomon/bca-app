import sgMail from '@sendgrid/mail';

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

/**
 * Initialize SendGrid with API key
 */
function initializeSendGrid(): boolean {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('[Email] SendGrid API key not configured');
    return false;
  }
  
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  return true;
}

/**
 * Send email using SendGrid
 * Returns true if email was sent successfully, false otherwise
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    if (!initializeSendGrid()) {
      return false;
    }

    const fromEmail = process.env.SENDGRID_FROM_EMAIL || process.env.ADMIN_EMAIL || 'lfaria@mabenconsulting.ca';

    const msg = {
      to: options.to,
      from: {
        email: fromEmail,
        name: 'BCA System',
      },
      subject: options.subject,
      text: options.text || '',
      html: options.html || options.text || '',
    };

    await sgMail.send(msg);
    console.log('[Email] Email sent successfully to:', options.to);
    return true;
  } catch (error: any) {
    console.error('[Email] Failed to send email:', error);
    if (error.response) {
      console.error('[Email] SendGrid error response:', error.response.body);
    }
    return false;
  }
}

/**
 * Send access request notification to admin
 */
export async function sendAccessRequestNotification(data: {
  fullName: string;
  email: string;
  companyName: string;
  city: string;
  phoneNumber?: string;
  useCase?: string;
}): Promise<boolean> {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">New Access Request Submitted</h2>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #1f2937;">Applicant Information</h3>
        
        <p><strong>Full Name:</strong> ${data.fullName}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Company:</strong> ${data.companyName}</p>
        <p><strong>City:</strong> ${data.city}</p>
        ${data.phoneNumber ? `<p><strong>Phone:</strong> ${data.phoneNumber}</p>` : ''}
        ${data.useCase ? `<p><strong>Use Case:</strong><br/>${data.useCase}</p>` : ''}
      </div>
      
      <p style="color: #6b7280;">
        Please review this request in the admin dashboard and approve or reject it.
      </p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px;">
        <p>This is an automated notification from the BCA System.</p>
      </div>
    </div>
  `;

  const textContent = `
New Access Request Submitted

Applicant Information:
- Full Name: ${data.fullName}
- Email: ${data.email}
- Company: ${data.companyName}
- City: ${data.city}
${data.phoneNumber ? `- Phone: ${data.phoneNumber}` : ''}
${data.useCase ? `- Use Case: ${data.useCase}` : ''}

Please review this request in the admin dashboard and approve or reject it.
  `.trim();

  const adminEmail = process.env.ADMIN_EMAIL || 'lfaria@mabenconsulting.ca';
  
  return sendEmail({
    to: adminEmail,
    subject: `New Access Request from ${data.fullName}`,
    text: textContent,
    html: htmlContent,
  });
}

/**
 * Send approval notification to user
 */
export async function sendApprovalNotification(data: {
  email: string;
  fullName: string;
  company: string;
  role: string;
  accountStatus: string;
}): Promise<boolean> {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #10b981;">Your Access Request Has Been Approved!</h2>
      
      <p>Dear ${data.fullName},</p>
      
      <p>Great news! Your access request to the BCA System has been approved.</p>
      
      <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
        <h3 style="margin-top: 0; color: #1f2937;">Account Details</h3>
        <p><strong>Company:</strong> ${data.company}</p>
        <p><strong>Role:</strong> ${data.role}</p>
        <p><strong>Account Status:</strong> ${data.accountStatus}</p>
      </div>
      
      <p>You can now log in to the BCA System and start using all available features.</p>
      
      <div style="margin: 30px 0;">
        <a href="https://www.b3nma.com" 
           style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Log In to BCA System
        </a>
      </div>
      
      <p style="color: #6b7280;">
        If you have any questions, please don't hesitate to contact us.
      </p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px;">
        <p>This is an automated notification from the BCA System.</p>
      </div>
    </div>
  `;

  const textContent = `
Your Access Request Has Been Approved!

Dear ${data.fullName},

Great news! Your access request to the BCA System has been approved.

Account Details:
- Company: ${data.company}
- Role: ${data.role}
- Account Status: ${data.accountStatus}

You can now log in to the BCA System and start using all available features.

If you have any questions, please don't hesitate to contact us.
  `.trim();

  return sendEmail({
    to: data.email,
    subject: 'Your BCA System Access Request Has Been Approved',
    text: textContent,
    html: htmlContent,
  });
}

/**
 * Send rejection notification to user
 */
export async function sendRejectionNotification(data: {
  email: string;
  fullName: string;
  rejectionReason: string;
}): Promise<boolean> {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #ef4444;">Update on Your Access Request</h2>
      
      <p>Dear ${data.fullName},</p>
      
      <p>Thank you for your interest in the BCA System. After careful review, we are unable to approve your access request at this time.</p>
      
      <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
        <h3 style="margin-top: 0; color: #1f2937;">Reason</h3>
        <p>${data.rejectionReason}</p>
      </div>
      
      <p style="color: #6b7280;">
        If you believe this decision was made in error or if you have additional information to provide, please contact us directly.
      </p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px;">
        <p>This is an automated notification from the BCA System.</p>
      </div>
    </div>
  `;

  const textContent = `
Update on Your Access Request

Dear ${data.fullName},

Thank you for your interest in the BCA System. After careful review, we are unable to approve your access request at this time.

Reason:
${data.rejectionReason}

If you believe this decision was made in error or if you have additional information to provide, please contact us directly.
  `.trim();

  return sendEmail({
    to: data.email,
    subject: 'Update on Your BCA System Access Request',
    text: textContent,
    html: htmlContent,
  });
}
