/**
 * Backup Encryption Service
 * Provides AES-256-GCM encryption for backup data
 * Following industry best practices for data protection
 */

import * as crypto from 'crypto';
import { getDb } from '../db';
import { encryptionKeyMetadata } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32;

// Key derivation configuration
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_DIGEST = 'sha256';

export interface EncryptionResult {
  encryptedData: Buffer;
  iv: string;
  authTag: string;
  keyId: string;
}

export interface DecryptionInput {
  encryptedData: Buffer;
  iv: string;
  authTag: string;
  keyId: string;
}

/**
 * Generate a new encryption key and store metadata
 */
export async function generateEncryptionKey(): Promise<{ keyId: string; key: Buffer }> {
  const keyId = `backup-key-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
  const key = crypto.randomBytes(KEY_LENGTH);
  
  // Store key metadata in database
  const db = await getDb();
  if (db) {
    await db.insert(encryptionKeyMetadata).values({
      keyIdentifier: keyId,
      keyType: 'backup_encryption',
      keyOwner: 'system',
      algorithm: ALGORITHM,
      keyStatus: 'active',
    });
  }
  
  return { keyId, key };
}

/**
 * Derive encryption key from master secret using PBKDF2
 * This allows us to regenerate the key from a stored secret
 */
export function deriveKeyFromSecret(secret: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(secret, salt, PBKDF2_ITERATIONS, KEY_LENGTH, PBKDF2_DIGEST);
}

/**
 * Get the master encryption key from environment or generate one
 * In production, this should come from a secure key management service
 */
function getMasterKey(): Buffer {
  // Use JWT_SECRET as the master key source (already exists in env)
  const masterSecret = process.env.JWT_SECRET || 'default-backup-encryption-key';
  const salt = Buffer.from('bca-backup-encryption-salt-v1');
  return deriveKeyFromSecret(masterSecret, salt);
}

/**
 * Encrypt backup data using AES-256-GCM
 */
export async function encryptBackupData(data: string | Buffer): Promise<EncryptionResult> {
  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const keyId = `master-derived-${Date.now()}`;
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  
  const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
  
  const encrypted = Buffer.concat([
    cipher.update(dataBuffer),
    cipher.final(),
  ]);
  
  const authTag = cipher.getAuthTag();
  
  return {
    encryptedData: encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    keyId,
  };
}

/**
 * Decrypt backup data using AES-256-GCM
 */
export async function decryptBackupData(input: DecryptionInput): Promise<Buffer> {
  const key = getMasterKey();
  const iv = Buffer.from(input.iv, 'hex');
  const authTag = Buffer.from(input.authTag, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  
  decipher.setAuthTag(authTag);
  
  const decrypted = Buffer.concat([
    decipher.update(input.encryptedData),
    decipher.final(),
  ]);
  
  return decrypted;
}

/**
 * Encrypt a string and return base64-encoded result with metadata
 */
export async function encryptBackupString(data: string): Promise<{
  encrypted: string;
  iv: string;
  authTag: string;
  keyId: string;
  algorithm: string;
}> {
  const result = await encryptBackupData(data);
  
  return {
    encrypted: result.encryptedData.toString('base64'),
    iv: result.iv,
    authTag: result.authTag,
    keyId: result.keyId,
    algorithm: ALGORITHM,
  };
}

/**
 * Decrypt a base64-encoded encrypted string
 */
export async function decryptBackupString(
  encrypted: string,
  iv: string,
  authTag: string,
  keyId: string
): Promise<string> {
  const encryptedBuffer = Buffer.from(encrypted, 'base64');
  
  const decrypted = await decryptBackupData({
    encryptedData: encryptedBuffer,
    iv,
    authTag,
    keyId,
  });
  
  return decrypted.toString('utf8');
}

/**
 * Verify encryption integrity by attempting to decrypt
 */
export async function verifyEncryption(
  encrypted: string,
  iv: string,
  authTag: string,
  keyId: string
): Promise<boolean> {
  try {
    await decryptBackupString(encrypted, iv, authTag, keyId);
    return true;
  } catch (error) {
    console.error('[BackupEncryption] Verification failed:', error);
    return false;
  }
}

/**
 * Calculate checksum for encrypted data integrity
 */
export function calculateChecksum(data: string | Buffer): string {
  const hash = crypto.createHash('sha256');
  hash.update(Buffer.isBuffer(data) ? data : Buffer.from(data));
  return hash.digest('hex');
}

/**
 * Get active encryption key metadata
 */
export async function getActiveEncryptionKeyMetadata() {
  const db = await getDb();
  if (!db) return null;
  
  const [keyMeta] = await db
    .select()
    .from(encryptionKeyMetadata)
    .where(
      and(
        eq(encryptionKeyMetadata.keyType, 'backup_encryption'),
        eq(encryptionKeyMetadata.keyStatus, 'active')
      )
    )
    .limit(1);
  
  return keyMeta || null;
}

/**
 * Rotate encryption key (mark old as rotated, create new)
 */
export async function rotateEncryptionKey(): Promise<{ newKeyId: string }> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  // Mark all existing backup encryption keys as rotated
  await db
    .update(encryptionKeyMetadata)
    .set({ 
      keyStatus: 'rotated',
      rotatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(encryptionKeyMetadata.keyType, 'backup_encryption'),
        eq(encryptionKeyMetadata.keyStatus, 'active')
      )
    );
  
  // Generate new key
  const { keyId } = await generateEncryptionKey();
  
  return { newKeyId: keyId };
}
