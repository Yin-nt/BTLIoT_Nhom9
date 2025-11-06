-- Smart Locker System Database Schema
-- Initialize database with all tables for user management, devices, and security

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Devices (Lockers) table
CREATE TABLE IF NOT EXISTS devices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  device_id VARCHAR(50) NOT NULL UNIQUE,
  device_name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  status ENUM('online', 'offline', 'maintenance') DEFAULT 'offline',
  battery_level INT DEFAULT 100,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- User Device Access (who can access which locker)
CREATE TABLE IF NOT EXISTS user_device_access (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  device_id INT NOT NULL,
  access_level ENUM('owner', 'shared', 'temporary') DEFAULT 'owner',
  expires_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_device (user_id, device_id)
);

-- Face embeddings (for face recognition)
CREATE TABLE IF NOT EXISTS face_embeddings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  embedding_vector LONGTEXT NOT NULL, -- JSON array of embeddings
  image_path VARCHAR(255),
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Access logs (audit trail)
CREATE TABLE IF NOT EXISTS access_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  device_id INT NOT NULL,
  user_id INT,
  access_method ENUM('face', 'remote', 'manual') NOT NULL,
  status ENUM('success', 'failed', 'unauthorized') NOT NULL,
  face_confidence FLOAT,
  is_spoofed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_device_id (device_id),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);

-- Alerts and notifications
CREATE TABLE IF NOT EXISTS alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  device_id INT NOT NULL,
  alert_type ENUM('unauthorized_access', 'spoofing_detected', 'device_offline', 'low_battery') NOT NULL,
  message TEXT,
  image_path VARCHAR(255),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_device_status ON devices(status);
CREATE INDEX idx_access_logs_device ON access_logs(device_id);
CREATE INDEX idx_face_embeddings_user ON face_embeddings(user_id);
CREATE INDEX idx_alerts_device ON alerts(device_id);
