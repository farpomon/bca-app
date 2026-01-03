-- MFA Method Switching Table
CREATE TABLE IF NOT EXISTS `mfa_method_switch_requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL,
  `currentMethod` ENUM('totp', 'sms', 'email') NOT NULL,
  `newMethod` ENUM('totp', 'sms', 'email') NOT NULL,
  `newMethodSecret` VARCHAR(255),
  `newMethodVerified` INT DEFAULT 0 NOT NULL,
  `status` ENUM('pending', 'completed', 'cancelled', 'expired') DEFAULT 'pending' NOT NULL,
  `expiresAt` TIMESTAMP NOT NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `completedAt` TIMESTAMP NULL,
  INDEX `idx_user_status` (`userId`, `status`),
  INDEX `idx_expires` (`expiresAt`)
);

-- MFA Recovery Requests Table
CREATE TABLE IF NOT EXISTS `mfa_recovery_requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL,
  `reason` TEXT NOT NULL,
  `identityVerification` TEXT,
  `status` ENUM('pending', 'approved', 'rejected', 'completed', 'expired') DEFAULT 'pending' NOT NULL,
  `recoveryCode` VARCHAR(255),
  `recoveryCodeExpiresAt` TIMESTAMP NULL,
  `submittedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `reviewedAt` TIMESTAMP NULL,
  `reviewedBy` INT,
  `adminNotes` TEXT,
  `rejectionReason` TEXT,
  `completedAt` TIMESTAMP NULL,
  `ipAddress` VARCHAR(45),
  `userAgent` TEXT,
  INDEX `idx_user_status` (`userId`, `status`),
  INDEX `idx_status` (`status`),
  INDEX `idx_submitted` (`submittedAt`)
);
