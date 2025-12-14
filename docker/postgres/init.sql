-- Initialize the database
-- NOTE: For existing databases, use migrations in docker/postgres/migrations/
-- This file represents the CURRENT STATE of the schema for fresh installations

-- Schema migrations tracking table
-- This table MUST be created first to track all migrations
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(10) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at 
ON schema_migrations(applied_at);

-- Record migrations as applied (since init.sql creates the current state)
INSERT INTO schema_migrations (version, name, applied_at)
VALUES 
  ('000', 'create_migrations_table', NOW()),
  ('001', 'create_users_table', NOW()),
  ('011', 'create_households_table', NOW()),
  ('012', 'create_household_members_table', NOW()),
  ('013', 'create_children_table', NOW()),
  ('014', 'create_tasks_table', NOW()),
  ('015', 'create_task_assignments_table', NOW())
ON CONFLICT (version) DO NOTHING;

-- Users table for authentication (supports email/password and OAuth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255), -- Nullable for OAuth users
  oauth_provider VARCHAR(50), -- 'google', 'microsoft', etc.
  oauth_provider_id VARCHAR(255), -- User ID from OAuth provider
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT check_auth_method CHECK (
    (password_hash IS NOT NULL) OR 
    (oauth_provider IS NOT NULL AND oauth_provider_id IS NOT NULL)
  )
);

-- Indexes for users table
CREATE INDEX idx_users_email ON users(email);
CREATE UNIQUE INDEX idx_users_oauth ON users(oauth_provider, oauth_provider_id) WHERE oauth_provider IS NOT NULL;

-- Households table (multi-tenant primary identifier)
-- All other tables reference household_id for data isolation
CREATE TABLE IF NOT EXISTS households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Household members junction table (user-household many-to-many with roles)
CREATE TABLE IF NOT EXISTS household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'parent', 'child')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(household_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_household_members_household ON household_members(household_id);
CREATE INDEX IF NOT EXISTS idx_household_members_user ON household_members(user_id);

-- Children table (profiles for household task assignments)
CREATE TABLE IF NOT EXISTS children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  birth_year INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_children_household ON children(household_id);

-- Tasks table (templates/definitions for household chores)
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  points INTEGER DEFAULT 10,
  rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('weekly_rotation', 'repeating', 'daily')),
  rule_config JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tasks_household ON tasks(household_id);

-- Task assignments table (specific task instances assigned to children)
CREATE TABLE IF NOT EXISTS task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_task_assignments_household ON task_assignments(household_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_child ON task_assignments(child_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_due_date ON task_assignments(due_date);

-- Sample items table (for testing)
CREATE TABLE IF NOT EXISTS items (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO items (title, description) VALUES
  ('Sample Item 1', 'This is the first sample item'),
  ('Sample Item 2', 'This is the second sample item'),
  ('Sample Item 3', 'This is the third sample item');

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_households_updated_at
BEFORE UPDATE ON households
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_children_updated_at
BEFORE UPDATE ON children
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_items_updated_at
BEFORE UPDATE ON items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
