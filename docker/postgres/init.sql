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
  ('015', 'create_task_assignments_table', NOW()),
  ('016', 'create_task_completions_table', NOW()),
  ('017', 'add_performance_indexes', NOW()),
  ('018', 'implement_row_level_security', NOW()),
  ('021', 'rename_due_date_to_date', NOW()),
  ('022', 'add_user_id_to_children', NOW())
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
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email); -- Updated to UNIQUE in migration 017
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_oauth ON users(oauth_provider, oauth_provider_id) WHERE oauth_provider IS NOT NULL;

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

-- Invitations table (household invitation system)
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'parent',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT invitations_role_check CHECK (role IN ('admin', 'parent')),
  CONSTRAINT invitations_status_check CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
  CONSTRAINT invitations_expiry_check CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_invitations_household ON invitations(household_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(invited_email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);

-- Children table (profiles for household task assignments)
CREATE TABLE IF NOT EXISTS children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Added in migration 022 for child authentication
  name VARCHAR(255) NOT NULL,
  birth_year INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_children_household ON children(household_id);
CREATE INDEX IF NOT EXISTS idx_children_household_name ON children(household_id, name); -- Added in migration 017 for search optimization
CREATE INDEX IF NOT EXISTS idx_children_user_id ON children(user_id); -- Added in migration 022 for auth performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_children_user_household_unique ON children(user_id, household_id) WHERE user_id IS NOT NULL; -- Added in migration 022 to prevent duplicate child profiles

-- Tasks table (templates/definitions for household chores)
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  points INTEGER DEFAULT 10,
  rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('weekly_rotation', 'repeating', 'daily')),
  rule_config JSONB,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tasks_household ON tasks(household_id);
CREATE INDEX IF NOT EXISTS idx_tasks_active ON tasks(household_id, active);

-- Task assignments table (specific task instances assigned to children)
CREATE TABLE IF NOT EXISTS task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE, -- Nullable for household-wide tasks
  date DATE NOT NULL, -- Renamed from due_date (migration 021)
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_task_assignments_household ON task_assignments(household_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_child ON task_assignments(child_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_date ON task_assignments(date);
-- Composite indexes added in migration 017 for query optimization
CREATE INDEX IF NOT EXISTS idx_task_assignments_child_date_status ON task_assignments(child_id, date, status);
CREATE INDEX IF NOT EXISTS idx_task_assignments_household_status_date ON task_assignments(household_id, status, date);
-- Partial unique indexes for idempotency (migration 021)
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_assignments_task_child_date_unique ON task_assignments(task_id, child_id, date) WHERE child_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_assignments_task_date_unique ON task_assignments(task_id, date) WHERE child_id IS NULL;

-- Task completions table (historical record of completed tasks, append-only)
CREATE TABLE IF NOT EXISTS task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  task_assignment_id UUID NOT NULL REFERENCES task_assignments(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  points_earned INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_task_completions_household ON task_completions(household_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_child ON task_completions(child_id);

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

CREATE TRIGGER update_invitations_updated_at
BEFORE UPDATE ON invitations
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

-- ============================================================================
-- Row-Level Security (RLS) Policies
-- ============================================================================
-- Defense-in-depth: RLS provides database-level data isolation
-- Even if application code bypasses filtering, database enforces household isolation

-- Enable RLS on all tenant-scoped tables
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (application sets app.current_household_id per request)
-- Note: PostgreSQL 17 doesn't support IF NOT EXISTS for CREATE POLICY, so drop first
DROP POLICY IF EXISTS households_isolation ON households;
CREATE POLICY households_isolation ON households
FOR ALL
USING (id = current_setting('app.current_household_id', TRUE)::UUID);

DROP POLICY IF EXISTS household_members_isolation ON household_members;
CREATE POLICY household_members_isolation ON household_members
FOR ALL
USING (household_id = current_setting('app.current_household_id', TRUE)::UUID);

DROP POLICY IF EXISTS invitations_isolation ON invitations;
CREATE POLICY invitations_isolation ON invitations
FOR ALL
USING (household_id = current_setting('app.current_household_id', TRUE)::UUID);

DROP POLICY IF EXISTS children_isolation ON children;
CREATE POLICY children_isolation ON children
FOR ALL
USING (household_id = current_setting('app.current_household_id', TRUE)::UUID);

DROP POLICY IF EXISTS tasks_isolation ON tasks;
CREATE POLICY tasks_isolation ON tasks
FOR ALL
USING (household_id = current_setting('app.current_household_id', TRUE)::UUID);

DROP POLICY IF EXISTS task_assignments_isolation ON task_assignments;
CREATE POLICY task_assignments_isolation ON task_assignments
FOR ALL
USING (household_id = current_setting('app.current_household_id', TRUE)::UUID);

DROP POLICY IF EXISTS task_completions_isolation ON task_completions;
CREATE POLICY task_completions_isolation ON task_completions
FOR ALL
USING (household_id = current_setting('app.current_household_id', TRUE)::UUID);
