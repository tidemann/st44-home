-- Migration: 023_add_rewards_system
-- Description: Add rewards and reward_redemptions tables for points redemption system
-- Date: 2025-12-24
-- Related Task: GitHub Issue #168 - Rewards and points redemption system
-- Author: Database Agent

BEGIN;

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
CREATE OR REPLACE VIEW child_points_balance AS
SELECT
  c.id as child_id,
  c.household_id,
  COALESCE(SUM(tc.points_earned), 0) as points_earned,
  COALESCE(SUM(rr.points_spent), 0) as points_spent,
  COALESCE(SUM(tc.points_earned), 0) - COALESCE(SUM(rr.points_spent), 0) as points_balance
FROM children c
LEFT JOIN task_completions tc ON c.id = tc.child_id
LEFT JOIN reward_redemptions rr ON c.id = rr.child_id AND rr.status != 'rejected'
GROUP BY c.id, c.household_id;

-- Enable RLS on new tables for household isolation
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS rewards_isolation ON rewards;
CREATE POLICY rewards_isolation ON rewards
FOR ALL
USING (household_id = current_setting('app.current_household_id', TRUE)::UUID);

DROP POLICY IF EXISTS reward_redemptions_isolation ON reward_redemptions;
CREATE POLICY reward_redemptions_isolation ON reward_redemptions
FOR ALL
USING (household_id = current_setting('app.current_household_id', TRUE)::UUID);

-- Create trigger for rewards updated_at
CREATE TRIGGER update_rewards_updated_at
BEFORE UPDATE ON rewards
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Record the migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('023', 'add_rewards_system', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ROLLBACK NOTES (for reference, not executed):
-- If you need to undo this migration, create a new migration that reverses these changes.
-- Never modify this file once it's committed.
-- Example rollback (as new migration):
-- DROP VIEW IF EXISTS child_points_balance;
-- DROP TABLE IF EXISTS reward_redemptions;
-- DROP TABLE IF EXISTS rewards;
