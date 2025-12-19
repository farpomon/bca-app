/**
 * Email Service
 * Handles email sending via SendGrid
 */

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY ?? "";
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL ?? "";

interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Send an email using SendGrid API
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  if (!SENDGRID_API_KEY || !SENDGRID_FROM_EMAIL) {
    console.error("[Email Service] SendGrid not configured - missing API key or from email");
    return false;
  }

  try {
    console.log(`[Email Service] Attempting to send email to ${options.to}`);
    console.log(`[Email Service] From: ${SENDGRID_FROM_EMAIL}`);
    console.log(`[Email Service] Subject: ${options.subject}`);
    
    const payload = {
      personalizations: [
        {
          to: [{ email: options.to }],
        },
      ],
      from: { email: SENDGRID_FROM_EMAIL },
      subject: options.subject,
      content: [
        {
          type: "text/plain",
          value: options.text,
        },
        ...(options.html
          ? [
              {
                type: "text/html",
                value: options.html,
              },
            ]
          : []),
      ],
    };
    
    console.log(`[Email Service] Payload:`, JSON.stringify(payload, null, 2));
    
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    console.log(`[Email Service] SendGrid response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Email Service] SendGrid API error:", response.status, errorText);
      console.error("[Email Service] Full error details:", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: errorText,
      });
      return false;
    }

    console.log(`[Email Service] Email sent successfully to ${options.to}`);
    return true;
  } catch (error) {
    console.error("[Email Service] Failed to send email:", error);
    return false;
  }
}

/**
 * Send a verification code email
 */
export async function sendVerificationEmail(
  userEmail: string,
  code: string,
  purpose: "mfa_setup" | "mfa_login" | "email_verification"
): Promise<boolean> {
  const purposeText = {
    mfa_setup: "Set Up Email-Based MFA",
    mfa_login: "Verify Your Identity",
    email_verification: "Verify Your Email Address",
  };

  const purposeDescription = {
    mfa_setup: "set up email-based multi-factor authentication",
    mfa_login: "verify your identity and sign in",
    email_verification: "verify your email address",
  };

  const subject = `BCA System - ${purposeText[purpose]}`;
  
  const text = `Your BCA System verification code is: ${code}

This code will expire in 5 minutes.

Purpose: ${purposeDescription[purpose]}

If you didn't request this code, please ignore this email.`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <h1 style="color: #2563eb; margin-top: 0;">BCA System</h1>
    <h2 style="color: #1e293b; margin-bottom: 20px;">${purposeText[purpose]}</h2>
    
    <p style="font-size: 16px; margin-bottom: 20px;">Your verification code is:</p>
    
    <div style="background-color: #fff; border: 2px solid #2563eb; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
      <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2563eb;">${code}</span>
    </div>
    
    <p style="font-size: 14px; color: #64748b; margin-top: 20px;">
      This code will expire in <strong>5 minutes</strong>.
    </p>
    
    <p style="font-size: 14px; color: #64748b;">
      Purpose: ${purposeDescription[purpose]}
    </p>
  </div>
  
  <div style="font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px;">
    <p>If you didn't request this code, please ignore this email.</p>
    <p>This is an automated message from the BCA System. Please do not reply to this email.</p>
  </div>
</body>
</html>`;

  return sendEmail({
    to: userEmail,
    subject,
    text,
    html,
  });
}
