/**
 * Tests for Backup Encryption Service
 * Tests AES-256-GCM encryption and decryption functionality
 */

import { describe, expect, it } from "vitest";
import {
  encryptBackupString,
  decryptBackupString,
  calculateChecksum,
} from "./backupEncryption";

describe("backupEncryption", () => {
  describe("encryptBackupString", () => {
    it("should encrypt a string and return encrypted data with metadata", async () => {
      const plaintext = JSON.stringify({ test: "data", count: 123 });
      
      const result = await encryptBackupString(plaintext);
      
      expect(result).toHaveProperty("encrypted");
      expect(result).toHaveProperty("iv");
      expect(result).toHaveProperty("authTag");
      expect(result).toHaveProperty("algorithm");
      expect(result).toHaveProperty("keyId");
      
      expect(result.algorithm).toBe("aes-256-gcm");
      expect(result.encrypted).not.toBe(plaintext);
      expect(result.iv.length).toBeGreaterThan(0);
      expect(result.authTag.length).toBeGreaterThan(0);
    });

    it("should produce different ciphertext for same plaintext (due to random IV)", async () => {
      const plaintext = "same data";
      
      const result1 = await encryptBackupString(plaintext);
      const result2 = await encryptBackupString(plaintext);
      
      expect(result1.encrypted).not.toBe(result2.encrypted);
      expect(result1.iv).not.toBe(result2.iv);
    });

    it("should handle empty string", async () => {
      const result = await encryptBackupString("");
      
      expect(result).toHaveProperty("encrypted");
      expect(result).toHaveProperty("iv");
      expect(result).toHaveProperty("authTag");
      // Empty string encrypts to empty encrypted field but still has valid metadata
      expect(result.iv.length).toBeGreaterThan(0);
      expect(result.authTag.length).toBeGreaterThan(0);
    });

    it("should handle large data", async () => {
      const largeData = JSON.stringify({
        records: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Record ${i}`,
          data: "x".repeat(100),
        })),
      });
      
      const result = await encryptBackupString(largeData);
      
      expect(result).toHaveProperty("encrypted");
      expect(result.encrypted.length).toBeGreaterThan(0);
    });
  });

  describe("decryptBackupString", () => {
    it("should decrypt encrypted data back to original plaintext", async () => {
      const originalData = JSON.stringify({
        users: [{ id: 1, name: "Test User" }],
        projects: [{ id: 1, title: "Test Project" }],
      });
      
      const encrypted = await encryptBackupString(originalData);
      const decrypted = await decryptBackupString(
        encrypted.encrypted,
        encrypted.iv,
        encrypted.authTag,
        encrypted.keyId
      );
      
      expect(decrypted).toBe(originalData);
    });

    it("should correctly decrypt JSON data", async () => {
      const testObject = {
        version: "1.0",
        tables: ["users", "projects"],
        data: {
          users: [{ id: 1, name: "Admin" }],
        },
      };
      const originalData = JSON.stringify(testObject);
      
      const encrypted = await encryptBackupString(originalData);
      const decrypted = await decryptBackupString(
        encrypted.encrypted,
        encrypted.iv,
        encrypted.authTag,
        encrypted.keyId
      );
      
      const parsed = JSON.parse(decrypted);
      expect(parsed).toEqual(testObject);
    });

    it("should handle special characters", async () => {
      const specialData = "Special chars: äöü ñ 中文 🎉 <>&\"'";
      
      const encrypted = await encryptBackupString(specialData);
      const decrypted = await decryptBackupString(
        encrypted.encrypted,
        encrypted.iv,
        encrypted.authTag,
        encrypted.keyId
      );
      
      expect(decrypted).toBe(specialData);
    });

    it("should throw error for tampered ciphertext", async () => {
      const originalData = "sensitive data";
      const encrypted = await encryptBackupString(originalData);
      
      // Tamper with the encrypted data
      const tamperedEncrypted = encrypted.encrypted.slice(0, -4) + "XXXX";
      
      await expect(decryptBackupString(
        tamperedEncrypted,
        encrypted.iv,
        encrypted.authTag,
        encrypted.keyId
      )).rejects.toThrow();
    });

    it("should throw error for invalid auth tag", async () => {
      const originalData = "test data";
      const encrypted = await encryptBackupString(originalData);
      
      await expect(decryptBackupString(
        encrypted.encrypted,
        encrypted.iv,
        "invalidauthtagvalue",
        encrypted.keyId
      )).rejects.toThrow();
    });
  });

  describe("calculateChecksum", () => {
    it("should calculate consistent checksum for same data", () => {
      const data = "test data for checksum";
      
      const checksum1 = calculateChecksum(data);
      const checksum2 = calculateChecksum(data);
      
      expect(checksum1).toBe(checksum2);
    });

    it("should produce different checksums for different data", () => {
      const checksum1 = calculateChecksum("data1");
      const checksum2 = calculateChecksum("data2");
      
      expect(checksum1).not.toBe(checksum2);
    });

    it("should return a hex string", () => {
      const checksum = calculateChecksum("test");
      
      expect(checksum).toMatch(/^[a-f0-9]+$/);
    });

    it("should handle empty string", () => {
      const checksum = calculateChecksum("");
      
      expect(checksum).toBeDefined();
      expect(typeof checksum).toBe("string");
    });
  });

  describe("round-trip encryption", () => {
    it("should successfully encrypt and decrypt backup data structure", async () => {
      const backupData = {
        version: "1.0",
        encrypted: true,
        createdAt: new Date().toISOString(),
        tables: ["users", "projects", "assessments"],
        recordCounts: { users: 10, projects: 5, assessments: 25 },
        totalRecords: 40,
        data: {
          users: Array.from({ length: 10 }, (_, i) => ({
            id: i + 1,
            name: `User ${i + 1}`,
            email: `user${i + 1}@example.com`,
          })),
          projects: Array.from({ length: 5 }, (_, i) => ({
            id: i + 1,
            title: `Project ${i + 1}`,
            status: "active",
          })),
          assessments: Array.from({ length: 25 }, (_, i) => ({
            id: i + 1,
            projectId: (i % 5) + 1,
            score: Math.random() * 100,
          })),
        },
      };

      const jsonData = JSON.stringify(backupData);
      const encrypted = await encryptBackupString(jsonData);
      const decrypted = await decryptBackupString(
        encrypted.encrypted,
        encrypted.iv,
        encrypted.authTag,
        encrypted.keyId
      );
      const parsed = JSON.parse(decrypted);

      expect(parsed.version).toBe(backupData.version);
      expect(parsed.tables).toEqual(backupData.tables);
      expect(parsed.data.users.length).toBe(10);
      expect(parsed.data.projects.length).toBe(5);
      expect(parsed.data.assessments.length).toBe(25);
    });
  });
});
