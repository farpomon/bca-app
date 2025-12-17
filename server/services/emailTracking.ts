import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { emailDeliveryLog, InsertEmailDeliveryLog } from "../../drizzle/schema";

export type EmailType = 'admin_notification' | 'user_confirmation' | 'user_approved' | 'user_rejected' | 'mfa_code' | 'password_reset' | 'other';
export type EmailStatus = 'sent' | 'delivered' | 'failed' | 'pending';

interface LogEmailParams {
  emailType: EmailType;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  metadata?: Record<string, any>;
}

interface UpdateEmailStatusParams {
  logId: number;
  status: EmailStatus;
  failureReason?: string;
}

/**
 * Log an email delivery attempt to the database
 * Returns the log ID for future status updates
 */
export async function logEmailDelivery(params: LogEmailParams): Promise<number> {
  const db = await getDb();
  if (!db) {
    console.error("[EmailTracking] Database not available");
    throw new Error("Database not available");
  }

  const logEntry: InsertEmailDeliveryLog = {
    emailType: params.emailType,
    recipientEmail: params.recipientEmail,
    recipientName: params.recipientName,
    subject: params.subject,
    status: 'pending',
    metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
    createdAt: new Date().toISOString(),
  };

  const result = await db.insert(emailDeliveryLog).values(logEntry);
  const insertId = Number(result[0].insertId);
  
  console.log(`[EmailTracking] Logged email delivery: ID=${insertId}, type=${params.emailType}, recipient=${params.recipientEmail}`);
  
  return insertId;
}

/**
 * Update the status of an email delivery log
 */
export async function updateEmailStatus(params: UpdateEmailStatusParams): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.error("[EmailTracking] Database not available");
    return;
  }

  const updateData: Partial<InsertEmailDeliveryLog> = {
    status: params.status,
  };

  if (params.status === 'sent') {
    updateData.sentAt = new Date().toISOString();
  } else if (params.status === 'delivered') {
    updateData.deliveredAt = new Date().toISOString();
  } else if (params.status === 'failed') {
    updateData.failureReason = params.failureReason;
  }

  await db.update(emailDeliveryLog)
    .set(updateData)
    .where(eq(emailDeliveryLog.id, params.logId));

  console.log(`[EmailTracking] Updated email status: ID=${params.logId}, status=${params.status}`);
}

/**
 * Wrapper function to send email with automatic tracking
 * This wraps any email sending function with logging
 */
export async function sendEmailWithTracking<T>(
  params: LogEmailParams,
  sendFn: () => Promise<T>
): Promise<{ success: boolean; logId: number; result?: T; error?: string }> {
  // Log the email attempt
  const logId = await logEmailDelivery(params);

  try {
    // Attempt to send the email
    const result = await sendFn();
    
    // Update status to sent (we assume success if no error thrown)
    await updateEmailStatus({ logId, status: 'sent' });
    
    return { success: true, logId, result };
  } catch (error) {
    // Update status to failed
    const errorMessage = error instanceof Error ? error.message : String(error);
    await updateEmailStatus({ 
      logId, 
      status: 'failed', 
      failureReason: errorMessage 
    });
    
    console.error(`[EmailTracking] Email send failed: ${errorMessage}`);
    return { success: false, logId, error: errorMessage };
  }
}
