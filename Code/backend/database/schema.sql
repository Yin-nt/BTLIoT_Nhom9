CREATE DATABASE IF NOT EXISTS smart_cabinet;
USE smart_cabinet;

-- Users table
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(200) NULL,
  role ENUM('admin', 'user') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- User face images table (5-20 images per user for registration)
CREATE TABLE user_face_images (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Face embeddings table (one embedding per image)
CREATE TABLE face_embeddings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  image_id INT NOT NULL,
  embedding JSON NOT NULL COMMENT '512-dimensional vector from ArcFace',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (image_id) REFERENCES user_face_images(id) ON DELETE CASCADE,
  INDEX idx_image_id (image_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Cabinets table
CREATE TABLE cabinets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  cabinet_id VARCHAR(50) UNIQUE NOT NULL COMMENT 'Unique identifier like CAB001',
  name VARCHAR(200) NOT NULL,
  location VARCHAR(300),
  status ENUM('online', 'offline') DEFAULT 'offline',
  lock_status ENUM('locked', 'unlocked') DEFAULT 'locked',
  last_seen TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cabinet_id (cabinet_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Access logs table
CREATE TABLE access_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  cabinet_id INT NOT NULL,
  user_id INT NULL COMMENT 'NULL if face not recognized',
  access_type ENUM('face', 'remote', 'manual') NOT NULL,
  success BOOLEAN NOT NULL,
  image_url VARCHAR(500) NULL COMMENT 'Face verification image',
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cabinet_id) REFERENCES cabinets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_cabinet_id (cabinet_id),
  INDEX idx_user_id (user_id),
  INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE device_pairings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  pairing_code VARCHAR(20) UNIQUE NOT NULL COMMENT '6-digit pairing code',
  cabinet_id INT NULL COMMENT 'NULL until paired',
  device_mac VARCHAR(50) NULL COMMENT 'ESP32 MAC address',
  expires_at TIMESTAMP NOT NULL,
  paired_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cabinet_id) REFERENCES cabinets(id) ON DELETE CASCADE,
  INDEX idx_pairing_code (pairing_code),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

select * from users;
select * from user_face_images;
select * from face_embeddings;
select * from cabinets;
select * from access_logs ;
select * from device_pairings;