-- Seed database with demo data
-- Admin user
INSERT INTO users (email, password_hash, full_name, role, is_active) VALUES
('admin@smartlocker.com', '$2a$10$example_hash_admin', 'Admin User', 'admin', TRUE);

-- Demo users
INSERT INTO users (email, password_hash, full_name, role, is_active) VALUES
('user1@example.com', '$2a$10$example_hash_user1', 'John Doe', 'user', TRUE),
('user2@example.com', '$2a$10$example_hash_user2', 'Jane Smith', 'user', TRUE),
('user3@example.com', '$2a$10$example_hash_user3', 'Bob Johnson', 'user', TRUE);

-- Demo devices
INSERT INTO devices (device_id, device_name, location, status, battery_level, created_by) VALUES
('AA:BB:CC:DD:EE:01', 'Locker 01', 'Floor 2, Room 201', 'online', 95, 1),
('AA:BB:CC:DD:EE:02', 'Locker 02', 'Floor 2, Room 202', 'online', 88, 1),
('AA:BB:CC:DD:EE:03', 'Locker 03', 'Floor 3, Room 301', 'offline', 45, 1);

-- Demo access permissions
INSERT INTO user_device_access (user_id, device_id, access_level) VALUES
(2, 1, 'owner'),
(2, 2, 'shared'),
(3, 2, 'owner'),
(4, 3, 'owner');
