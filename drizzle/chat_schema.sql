-- AI Chat Sessions and Messages Tables

-- Chat sessions table - tracks conversation contexts
CREATE TABLE IF NOT EXISTS chat_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  sessionType ENUM('project', 'asset', 'company') NOT NULL,
  contextId INT NULL, -- projectId or assetId (NULL for company-level)
  companyId INT NULL, -- for company-level isolation
  title VARCHAR(255) NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  lastMessageAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_session (userId, sessionType),
  INDEX idx_context (sessionType, contextId),
  INDEX idx_company (companyId)
);

-- Chat messages table - stores conversation history
CREATE TABLE IF NOT EXISTS chat_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sessionId INT NOT NULL,
  role ENUM('user', 'assistant', 'system') NOT NULL,
  content TEXT NOT NULL,
  metadata JSON NULL, -- store context data, citations, confidence scores
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sessionId) REFERENCES chat_sessions(id) ON DELETE CASCADE,
  INDEX idx_session (sessionId, createdAt)
);

-- Chat context cache - stores retrieved context for faster responses
CREATE TABLE IF NOT EXISTS chat_context_cache (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sessionId INT NOT NULL,
  contextType VARCHAR(50) NOT NULL, -- 'assessments', 'deficiencies', 'photos', 'costs', etc.
  contextData JSON NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expiresAt TIMESTAMP NULL,
  FOREIGN KEY (sessionId) REFERENCES chat_sessions(id) ON DELETE CASCADE,
  INDEX idx_session_type (sessionId, contextType)
);
