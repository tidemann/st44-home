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
  ('022', 'add_user_id_to_children', NOW()),
  ('023', 'add_rewards_system', NOW()),
  ('038', 'create_password_reset_tokens_table', NOW()),
  ('039', 'add_name_to_users', NOW()),
  ('040', 'add_user_name_fields', NOW()),
  ('046', 'fix_child_household_mismatches', NOW()),
  ('047', 'add_child_household_consistency_check', NOW()),
  ('048', 'fix_multi_household_child_assignments', NOW())
ON CONFLICT (version) DO NOTHING;

-- Users table for authentication (supports email/password and OAuth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255), -- Legacy display name (kept for backwards compatibility)
  first_name VARCHAR(100), -- User's first name
  last_name VARCHAR(100), -- User's last name
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

-- Password reset tokens table (for password recovery flow)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

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
  rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('weekly_rotation', 'repeating', 'daily', 'single')),
  rule_config JSONB,
  deadline TIMESTAMP WITH TIME ZONE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tasks_household ON tasks(household_id);
CREATE INDEX IF NOT EXISTS idx_tasks_active ON tasks(household_id, active);

-- Task candidates table (children who can accept/decline single tasks)
CREATE TABLE IF NOT EXISTS task_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(task_id, child_id)
);

CREATE INDEX IF NOT EXISTS idx_task_candidates_task ON task_candidates(task_id);
CREATE INDEX IF NOT EXISTS idx_task_candidates_child ON task_candidates(child_id);
CREATE INDEX IF NOT EXISTS idx_task_candidates_household ON task_candidates(household_id);

-- Task responses table (accept/decline responses for single tasks)
CREATE TABLE IF NOT EXISTS task_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  response VARCHAR(20) NOT NULL CHECK (response IN ('accepted', 'declined')),
  responded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(task_id, child_id)
);

CREATE INDEX IF NOT EXISTS idx_task_responses_task ON task_responses(task_id);
CREATE INDEX IF NOT EXISTS idx_task_responses_child ON task_responses(child_id);
CREATE INDEX IF NOT EXISTS idx_task_responses_household ON task_responses(household_id);

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

-- Rewards table (parents create rewards for household)
CREATE TABLE IF NOT EXISTS rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  points_cost INTEGER NOT NULL CHECK (points_cost > 0),
  quantity INTEGER, -- NULL = unlimited, >0 = limited stock
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rewards_household ON rewards(household_id);
CREATE INDEX IF NOT EXISTS idx_rewards_active ON rewards(household_id, active);

-- Reward redemptions table (track when children redeem rewards)
CREATE TABLE IF NOT EXISTS reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  points_spent INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'fulfilled', 'rejected')),
  redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fulfilled_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_reward_redemptions_child ON reward_redemptions(child_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_reward ON reward_redemptions(reward_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_household_status ON reward_redemptions(household_id, status);

-- View for child points balance (earned from task completions minus spent on redemptions)
-- Uses subqueries to pre-aggregate each table to avoid Cartesian product issues
CREATE OR REPLACE VIEW child_points_balance AS
SELECT
  c.id as child_id,
  c.household_id,
  COALESCE(tc_agg.total_earned, 0) as points_earned,
  COALESCE(rr_agg.total_spent, 0) as points_spent,
  COALESCE(tc_agg.total_earned, 0) - COALESCE(rr_agg.total_spent, 0) as points_balance
FROM children c
LEFT JOIN (
  -- Pre-aggregate task completions per child
  SELECT child_id, SUM(points_earned) as total_earned
  FROM task_completions
  GROUP BY child_id
) tc_agg ON c.id = tc_agg.child_id
LEFT JOIN (
  -- Pre-aggregate non-rejected redemptions per child
  SELECT child_id, SUM(points_spent) as total_spent
  FROM reward_redemptions
  WHERE status != 'rejected'
  GROUP BY child_id
) rr_agg ON c.id = rr_agg.child_id;

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

CREATE TRIGGER update_rewards_updated_at
BEFORE UPDATE ON rewards
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_items_updated_at
BEFORE UPDATE ON items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Child Household Consistency Enforcement
-- ============================================================================
-- Ensures children with user accounts always belong to the same household as their user
-- This prevents data inconsistency bugs where DELETE operations fail with 404

-- Function to check child household consistency on INSERT/UPDATE
CREATE OR REPLACE FUNCTION check_child_household_consistency()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check if user_id is set (linked children)
  IF NEW.user_id IS NOT NULL THEN
    -- Verify the user belongs to this household
    IF NOT EXISTS (
      SELECT 1
      FROM household_members
      WHERE user_id = NEW.user_id
        AND household_id = NEW.household_id
    ) THEN
      RAISE EXCEPTION 'Child user_id % must belong to household % in household_members',
        NEW.user_id, NEW.household_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on children table
DROP TRIGGER IF EXISTS enforce_child_household_consistency ON children;
CREATE TRIGGER enforce_child_household_consistency
  BEFORE INSERT OR UPDATE ON children
  FOR EACH ROW
  WHEN (NEW.user_id IS NOT NULL)
  EXECUTE FUNCTION check_child_household_consistency();

-- Function to prevent moving a user to different household if they have linked children
CREATE OR REPLACE FUNCTION prevent_child_user_household_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check on UPDATE when household_id changes
  IF TG_OP = 'UPDATE' AND OLD.household_id != NEW.household_id THEN
    -- Check if this user is linked to any children
    IF EXISTS (
      SELECT 1
      FROM children
      WHERE user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'Cannot move user % to different household because they are linked to children. Update children.household_id first.',
        NEW.user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on household_members table
DROP TRIGGER IF EXISTS prevent_child_user_household_change ON household_members;
CREATE TRIGGER prevent_child_user_household_change
  BEFORE UPDATE ON household_members
  FOR EACH ROW
  EXECUTE FUNCTION prevent_child_user_household_change();

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
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS rewards_isolation ON rewards;
CREATE POLICY rewards_isolation ON rewards
FOR ALL
USING (household_id = current_setting('app.current_household_id', TRUE)::UUID);

DROP POLICY IF EXISTS reward_redemptions_isolation ON reward_redemptions;
CREATE POLICY reward_redemptions_isolation ON reward_redemptions
FOR ALL
USING (household_id = current_setting('app.current_household_id', TRUE)::UUID);
