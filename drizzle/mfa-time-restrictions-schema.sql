-- MFA Time-Based Restrictions Table
-- Allows admins to configure when users must use MFA based on time windows

CREATE TABLE IF NOT EXISTS mfa_time_restrictions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  restrictionType ENUM('always', 'business_hours', 'after_hours', 'custom_schedule', 'never') NOT NULL DEFAULT 'always',
  
  -- Time range (in 24-hour format, e.g., '09:00', '17:00')
  startTime VARCHAR(5),  -- e.g., '09:00'
  endTime VARCHAR(5),    -- e.g., '17:00'
  
  -- Days of week (JSON array, e.g., '["monday", "tuesday", "wednesday", "thursday", "friday"]')
  daysOfWeek TEXT,
  
  -- Timezone (e.g., 'America/Vancouver', 'America/Toronto')
  timezone VARCHAR(50) DEFAULT 'UTC',
  
  -- Status
  isActive TINYINT DEFAULT 1 NOT NULL,
  
  -- Metadata
  description TEXT,
  createdBy INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  
  -- Indexes
  INDEX idx_user_active (userId, isActive),
  INDEX idx_restriction_type (restrictionType),
  
  -- Foreign key
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Sample data for testing
-- Business hours MFA (Monday-Friday, 9 AM - 5 PM Pacific Time)
-- INSERT INTO mfa_time_restrictions (userId, restrictionType, startTime, endTime, daysOfWeek, timezone, description, createdBy)
-- VALUES (1, 'business_hours', '09:00', '17:00', '["monday","tuesday","wednesday","thursday","friday"]', 'America/Vancouver', 'MFA required during business hours', 1);

-- After-hours MFA (Monday-Friday, 5 PM - 9 AM Pacific Time, plus weekends)
-- INSERT INTO mfa_time_restrictions (userId, restrictionType, startTime, endTime, daysOfWeek, timezone, description, createdBy)
-- VALUES (2, 'after_hours', '17:00', '09:00', '["monday","tuesday","wednesday","thursday","friday"]', 'America/Vancouver', 'MFA required after hours', 1);

-- Always require MFA
-- INSERT INTO mfa_time_restrictions (userId, restrictionType, description, createdBy)
-- VALUES (3, 'always', 'MFA always required', 1);

-- Never require MFA
-- INSERT INTO mfa_time_restrictions (userId, restrictionType, description, createdBy)
-- VALUES (4, 'never', 'MFA not required', 1);
