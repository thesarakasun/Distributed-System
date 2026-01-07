-- Distributed Shared Note-Taking System
-- Database Initialization Script
-- PostgreSQL 15+

-- Create Users Table
CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('Admin', 'User', 'Guest')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Notes Table with integrated locking mechanism
CREATE TABLE IF NOT EXISTS notes (
  note_id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  owner_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  locked_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  lock_timestamp TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Sessions Table for centralized session management
CREATE TABLE IF NOT EXISTS sessions (
  session_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  token VARCHAR(500) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes for Performance Optimization
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_notes_owner ON notes(owner_id);
CREATE INDEX IF NOT EXISTS idx_notes_locked_by ON notes(locked_by);
CREATE INDEX IF NOT EXISTS idx_notes_lock_timestamp ON notes(lock_timestamp);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON sessions(last_activity);

-- Insert Seed Data for Testing
-- Password for all users: "password123" (hashed with bcrypt cost factor 10)
INSERT INTO users (username, password_hash, role) VALUES
('admin', '$2b$10$9kwsasXZVCDItMUNeSWEdukbsB6aPhNvi6X.VLTqIaVeExYPQcjMy', 'Admin'),
('john', '$2b$10$9kwsasXZVCDItMUNeSWEdukbsB6aPhNvi6X.VLTqIaVeExYPQcjMy', 'User'),
('jane', '$2b$10$9kwsasXZVCDItMUNeSWEdukbsB6aPhNvi6X.VLTqIaVeExYPQcjMy', 'User'),
('guest', '$2b$10$9kwsasXZVCDItMUNeSWEdukbsB6aPhNvi6X.VLTqIaVeExYPQcjMy', 'Guest')
ON CONFLICT (username) DO NOTHING;

-- Insert Sample Notes
INSERT INTO notes (title, content, owner_id) VALUES
('Welcome Note', 'Welcome to the Distributed Shared Note-Taking System! This is a sample note.', 1),
('Meeting Notes', 'Discuss project requirements and timeline.', 2),
('Todo List', 'Tasks to complete this week.', 2),
('Project Ideas', 'Brainstorming for new features.', 3)
ON CONFLICT DO NOTHING;

-- Create Function to Update updated_at Timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create Trigger for Notes Table
DROP TRIGGER IF EXISTS update_notes_updated_at ON notes;
CREATE TRIGGER update_notes_updated_at
    BEFORE UPDATE ON notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create Function to Clean Up Expired Sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Create Function to Release Expired Locks
CREATE OR REPLACE FUNCTION cleanup_expired_locks()
RETURNS void AS $$
BEGIN
    -- Release locks from expired sessions
    UPDATE notes 
    SET locked_by = NULL, lock_timestamp = NULL 
    WHERE locked_by IN (
        SELECT user_id FROM sessions 
        WHERE last_activity < (CURRENT_TIMESTAMP - INTERVAL '30 minutes')
    );
    
    -- Release locks that exceeded timeout (5 minutes)
    UPDATE notes 
    SET locked_by = NULL, lock_timestamp = NULL 
    WHERE lock_timestamp < (CURRENT_TIMESTAMP - INTERVAL '5 minutes') 
    AND locked_by IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Grant Permissions (if needed)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO admin;

-- Display Success Message
DO $$
BEGIN
    RAISE NOTICE 'Database initialized successfully!';
    RAISE NOTICE 'Sample users created:';
    RAISE NOTICE '  - admin (Admin role)';
    RAISE NOTICE '  - john (User role)';
    RAISE NOTICE '  - jane (User role)';
    RAISE NOTICE '  - guest (Guest role)';
    RAISE NOTICE 'Default password for all users: password123';
END $$;
