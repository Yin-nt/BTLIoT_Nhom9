USE smart_cabinet;

-- Insert admin user (password: admin123)
INSERT INTO users (username, email, password_hash, role) VALUES
('Admin', 'admin@smartcabinet.com', '$2a$10$8K1p/a0dL3.qdh2VCYZ4qOzFzLcXPfS/g9ykZ0QkXvYR8YqR3HLfS', 'admin');

-- Insert test user (password: user123)
INSERT INTO users (username, email, password_hash, role) VALUES
('John Doe', 'john@example.com', '$2a$10$8K1p/a0dL3.qdh2VCYZ4qOzFzLcXPfS/g9ykZ0QkXvYR8YqR3HLfS', 'user');

-- Insert sample cabinets
INSERT INTO cabinets (cabinet_id, name, location, status, lock_status) VALUES
('CAB001', 'Main Entrance Cabinet', 'Building A - Floor 1', 'online', 'locked'),
('CAB002', 'Storage Room Cabinet', 'Building B - Floor 2', 'offline', 'locked'),
('CAB003', 'Office Cabinet', 'Building A - Floor 3', 'online', 'unlocked');
