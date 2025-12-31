# Single Task Feature - Rollback Guide

## Overview

This guide provides step-by-step instructions for rolling back the Single Task feature if critical issues are discovered in production.

**Feature Version:** 1.0.0
**Last Updated:** 2025-12-31

---

## When to Roll Back

**Immediately roll back if:**

- ✅ Critical security vulnerability discovered
- ✅ Data corruption or data loss occurring
- ✅ Application crashes preventing core functionality
- ✅ Race conditions causing duplicate assignments
- ✅ Performance degradation > 50% on core endpoints
- ✅ Cross-household data leakage detected

**Do NOT roll back for:**

- ❌ Minor UI bugs (can be hotfixed)
- ❌ Non-critical validation issues
- ❌ Cosmetic issues
- ❌ Single user reports without verification
- ❌ Expected behavior that users don't understand

---

## Quick Rollback Decision Tree

```
Critical issue detected
    ↓
Does it affect data integrity or security?
    ├─ YES → ROLLBACK IMMEDIATELY (follow Emergency Procedure)
    └─ NO → Can it be hotfixed within 1 hour?
            ├─ YES → Apply hotfix, monitor
            └─ NO → ROLLBACK (follow Standard Procedure)
```

---

## Pre-Rollback Checklist

Before starting rollback:

- [ ] Identify exact issue and root cause
- [ ] Document affected users/households
- [ ] Take database snapshot/backup
- [ ] Notify stakeholders (downtime may be required)
- [ ] Determine rollback scope (code only vs code + database)
- [ ] Identify last known good version (commit hash)

---

## Standard Rollback Procedure

### Phase 1: Application Code Rollback (5-10 minutes)

#### Step 1: Identify Last Known Good Version

```bash
# View recent commits
git log --oneline -20

# Find commit before single task feature deployment
# Example: 3a7f9c2 (before single task implementation)
```

**Last Known Good Commit:** `________________`

---

#### Step 2: Create Rollback Branch

```bash
# Create emergency rollback branch
git checkout main
git pull
git checkout -b rollback/single-task-emergency

# Revert to last known good state
git revert --no-commit <commit-hash-1>..<current-commit>
# OR for clean slate:
git reset --hard <last-known-good-commit>
git push origin rollback/single-task-emergency --force
```

---

#### Step 3: Deploy Rolled-Back Code

**Backend:**
```bash
cd apps/backend
npm run build
npm run docker:down
docker-compose build backend
npm run docker:up
```

**Frontend:**
```bash
cd apps/frontend
npm run build
docker-compose build frontend
docker-compose up -d frontend
```

---

#### Step 4: Verify Application Health

```bash
# Check backend health
curl http://localhost:3000/api/health

# Check frontend serving
curl http://localhost:4200

# Check logs for errors
docker logs -f st44-backend --tail 100
```

- [ ] Backend returns 200 OK
- [ ] Frontend serves correctly
- [ ] No critical errors in logs

---

### Phase 2: Database Rollback (10-15 minutes)

**⚠️ CRITICAL: Database rollback is destructive. Only proceed if necessary.**

#### When to Roll Back Database

Roll back database if:
- Data corruption detected in new tables
- Foreign key constraints causing cascading issues
- Performance degradation from new indexes
- Cross-household data leakage from RLS policies

**Do NOT roll back database if:**
- Application code fix resolves issue
- No data corruption or integrity issues
- New tables/columns unused (harmless)

---

#### Step 1: Backup Current Database State

```bash
# Create full database backup
docker exec st44-postgres pg_dump -U postgres st44_production > rollback_backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup created
ls -lh rollback_backup_*.sql
```

- [ ] Backup file created successfully
- [ ] File size > 0 bytes

---

#### Step 2: Rollback Migrations (Reverse Order)

**CRITICAL: Migrations must be rolled back in REVERSE order (044 → 040)**

Connect to database:
```bash
docker exec -it st44-postgres psql -U postgres -d st44_production
```

**Migration 044 Rollback: Remove Expired Status**
```sql
BEGIN;

-- Revert any assignments with 'expired' status to 'overdue'
UPDATE task_assignments SET status = 'overdue' WHERE status = 'expired';

-- Remove 'expired' from constraint
ALTER TABLE task_assignments DROP CONSTRAINT IF EXISTS task_assignments_status_check;
ALTER TABLE task_assignments ADD CONSTRAINT task_assignments_status_check
  CHECK (status IN ('pending', 'completed', 'overdue'));

-- Remove from schema_migrations
DELETE FROM schema_migrations WHERE version = '044';

COMMIT;
```

- [ ] Migration 044 rolled back successfully

---

**Migration 043 Rollback: Drop Task Responses Table**
```sql
BEGIN;

-- Drop table (CASCADE removes dependent objects)
DROP TABLE IF EXISTS task_responses CASCADE;

-- Remove from schema_migrations
DELETE FROM schema_migrations WHERE version = '043';

COMMIT;
```

- [ ] Migration 043 rolled back successfully

---

**Migration 042 Rollback: Drop Task Candidates Table**
```sql
BEGIN;

-- Drop table (CASCADE removes dependent objects)
DROP TABLE IF EXISTS task_candidates CASCADE;

-- Remove from schema_migrations
DELETE FROM schema_migrations WHERE version = '042';

COMMIT;
```

- [ ] Migration 042 rolled back successfully

---

**Migration 041 Rollback: Remove Deadline Column**
```sql
BEGIN;

-- Drop deadline column and index
DROP INDEX IF EXISTS idx_tasks_deadline;
ALTER TABLE tasks DROP COLUMN IF EXISTS deadline;

-- Remove from schema_migrations
DELETE FROM schema_migrations WHERE version = '041';

COMMIT;
```

- [ ] Migration 041 rolled back successfully

---

**Migration 040 Rollback: Remove Single Task Type**
```sql
BEGIN;

-- Delete any tasks with rule_type = 'single'
-- WARNING: This will CASCADE delete assignments, candidates, responses
DELETE FROM tasks WHERE rule_type = 'single';

-- Revert constraint
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_rule_type_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_rule_type_check
  CHECK (rule_type IN ('daily', 'repeating', 'weekly_rotation'));

-- Remove from schema_migrations
DELETE FROM schema_migrations WHERE version = '040';

COMMIT;
```

- [ ] Migration 040 rolled back successfully

---

#### Step 3: Verify Database State

```sql
-- Verify migrations removed
SELECT version, name, applied_at
FROM schema_migrations
WHERE version IN ('040', '041', '042', '043', '044')
ORDER BY version;

-- Should return 0 rows

-- Verify tables dropped
\dt task_candidates
\dt task_responses

-- Should return "Did not find any relation"

-- Verify tasks constraint
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'tasks_rule_type_check';

-- Should NOT include 'single'

-- Verify no orphaned data
SELECT COUNT(*) FROM tasks WHERE rule_type = 'single';

-- Should return 0
```

- [ ] All 5 migrations removed from schema_migrations
- [ ] task_candidates table does not exist
- [ ] task_responses table does not exist
- [ ] deadline column removed from tasks
- [ ] rule_type constraint excludes 'single'
- [ ] No orphaned single tasks

---

### Phase 3: Post-Rollback Verification (5 minutes)

#### Application Functionality Tests

**Test 1: Existing Task Types Still Work**
```bash
# As parent user
1. Create daily task
2. Create repeating task
3. Create weekly rotation task
```

- [ ] Daily task created successfully
- [ ] Repeating task created successfully
- [ ] Weekly rotation task created successfully

---

**Test 2: Child Dashboard**
```bash
# As child user
1. View dashboard
2. Check task assignments
3. Complete a task
```

- [ ] Dashboard loads without errors
- [ ] Tasks display correctly
- [ ] Task completion works

---

**Test 3: API Health**
```bash
# Test core endpoints
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/tasks
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/children/tasks
```

- [ ] /api/tasks returns 200 OK
- [ ] /api/children/tasks returns 200 OK
- [ ] No 500 errors in logs

---

**Test 4: Performance**
```bash
# Measure response times
time curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/tasks
```

- [ ] Response time < 200ms (back to baseline)
- [ ] No slow query warnings in logs

---

#### Step 4: Monitor for Issues

**Monitor for 30 minutes after rollback:**

```bash
# Watch backend logs
docker logs -f st44-backend

# Watch database logs
docker logs -f st44-postgres

# Monitor error rates
# (use your monitoring tool: New Relic, Datadog, etc.)
```

**Look for:**
- [ ] No 500 errors
- [ ] No database constraint violations
- [ ] No user-reported issues
- [ ] Response times normal

---

## Emergency Rollback Procedure (< 5 minutes)

**Use this for critical security or data integrity issues requiring immediate action.**

### Step 1: Immediate Code Rollback

```bash
# Revert to last known good commit (FORCE PUSH)
git checkout main
git reset --hard <last-known-good-commit>
git push origin main --force

# Redeploy immediately
npm run docker:down
npm run docker:up
```

**Time: 2-3 minutes**

---

### Step 2: Disable Feature Flag (If Implemented)

If feature flags are in use:

```bash
# Set feature flag to false
# (Implementation depends on your feature flag system)
```

---

### Step 3: Database Cleanup (If Needed)

**Only if data corruption detected:**

```sql
-- Quick cleanup without full rollback
BEGIN;

-- Delete all single tasks (CASCADE deletes candidates/responses)
DELETE FROM tasks WHERE rule_type = 'single';

COMMIT;
```

**Time: 1 minute**

---

## Partial Rollback Scenarios

### Scenario 1: Frontend Issues Only

**Issue:** Frontend bug, backend working fine

**Rollback:**
- Roll back frontend code only
- Keep backend and database unchanged
- Redeploy frontend

**Benefit:** Minimal disruption, backend continues to work

---

### Scenario 2: Backend API Issues Only

**Issue:** Backend endpoint bug, frontend and database OK

**Rollback:**
- Roll back backend code only
- Keep database and frontend unchanged
- Redeploy backend

**Benefit:** Frontend can gracefully handle API errors

---

### Scenario 3: Database Performance Issues

**Issue:** New indexes causing slow queries

**Rollback:**
- Drop problematic indexes only
- Keep tables and data
- No code rollback needed

```sql
DROP INDEX IF EXISTS idx_task_candidates_task;
DROP INDEX IF EXISTS idx_task_candidates_child;
DROP INDEX IF EXISTS idx_task_responses_task;
-- etc.
```

**Benefit:** Preserves feature, improves performance

---

## Data Preservation During Rollback

### Exporting Single Task Data Before Rollback

If you want to preserve single task data for later analysis:

```sql
-- Export single tasks
COPY (SELECT * FROM tasks WHERE rule_type = 'single')
TO '/tmp/single_tasks_backup.csv' CSV HEADER;

-- Export candidates
COPY (SELECT * FROM task_candidates)
TO '/tmp/task_candidates_backup.csv' CSV HEADER;

-- Export responses
COPY (SELECT * FROM task_responses)
TO '/tmp/task_responses_backup.csv' CSV HEADER;
```

**Store backups safely for post-mortem analysis.**

---

## Communication Templates

### Stakeholder Notification (Before Rollback)

**Subject:** URGENT: Rolling back Single Task feature due to critical issue

**Body:**
```
Team,

We have identified a critical issue with the Single Task feature deployed on [DATE]:

Issue: [DESCRIPTION]
Impact: [USER IMPACT]
Severity: [Critical/High]

We are initiating an emergency rollback to restore service stability.

Expected downtime: [DURATION]
ETA for resolution: [TIME]

Users affected: [COUNT/DESCRIPTION]

We will provide updates every 15 minutes.

- [YOUR NAME]
```

---

### User Notification (During Rollback)

**Subject:** Scheduled Maintenance - Brief Service Disruption

**Body:**
```
Dear Users,

We are performing emergency maintenance to resolve a technical issue.

Expected duration: 15 minutes
Services affected: Task creation and assignment

Your data is safe and all existing tasks will continue to work normally.

We apologize for the inconvenience.

- The ST44 Team
```

---

### Post-Rollback Report

**Subject:** Rollback Complete - Service Restored

**Body:**
```
Rollback completed successfully at [TIME].

Summary:
- Issue identified: [DESCRIPTION]
- Rollback scope: [Code/Database/Both]
- Services restored: [LIST]
- Data loss: [None/Minimal/Description]
- Affected users: [COUNT]

Current status: All services operational
Monitoring: Ongoing for 24 hours

Next steps:
1. Root cause analysis
2. Fix implementation
3. Enhanced testing
4. Redeployment plan

Timeline for fix: [ESTIMATE]

- [YOUR NAME]
```

---

## Post-Rollback Actions

After successful rollback:

### Immediate (Within 1 hour)

- [ ] Document exact issue that caused rollback
- [ ] Notify all stakeholders of rollback completion
- [ ] Verify all systems operational
- [ ] Export logs for analysis
- [ ] Create incident report

### Short-term (Within 24 hours)

- [ ] Conduct root cause analysis
- [ ] Identify fix strategy
- [ ] Update tests to catch this issue
- [ ] Plan redeployment approach
- [ ] Review rollback procedure effectiveness

### Long-term (Within 1 week)

- [ ] Implement fix with additional safeguards
- [ ] Enhanced testing in staging
- [ ] Gradual rollout plan (feature flags, canary deployment)
- [ ] Update documentation with lessons learned
- [ ] Team retrospective

---

## Rollback Testing

**Regularly test rollback procedures in staging environment:**

```bash
# Quarterly rollback drill
1. Deploy single task feature to staging
2. Create test data (single tasks, candidates, responses)
3. Execute rollback procedure (this guide)
4. Verify all steps work correctly
5. Update guide based on findings
```

**Last Rollback Drill:** _______________
**Next Scheduled Drill:** _______________

---

## Known Rollback Issues

### Issue 1: Long-Running Transactions

**Symptom:** Migration rollback hangs during table drop

**Cause:** Active connections holding locks

**Solution:**
```sql
-- Terminate blocking connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'st44_production'
  AND pid <> pg_backend_pid()
  AND state = 'active';

-- Then retry rollback
DROP TABLE task_responses CASCADE;
```

---

### Issue 2: Cascade Deletes Affecting Other Tables

**Symptom:** Deleting single tasks cascades to unexpected tables

**Cause:** Foreign key relationships

**Solution:**
```sql
-- Check what will be deleted before committing
BEGIN;
DELETE FROM tasks WHERE rule_type = 'single';
-- Review output, then:
ROLLBACK; -- if unexpected
-- OR
COMMIT;   -- if expected
```

---

## Rollback Checklist Summary

**Quick Reference:**

- [ ] Identify issue and root cause
- [ ] Take database backup
- [ ] Notify stakeholders
- [ ] Rollback application code
- [ ] Verify application health
- [ ] Rollback database (if needed)
- [ ] Verify database state
- [ ] Test core functionality
- [ ] Monitor for 30 minutes
- [ ] Document incident
- [ ] Plan fix and redeployment

---

## Support Contacts

**Emergency Escalation:**
- Database Team: _______________
- Backend Team: _______________
- DevOps Team: _______________
- On-Call Engineer: _______________

**Escalation Path:**
1. Team Lead (first 15 minutes)
2. Engineering Manager (if not resolved in 30 minutes)
3. CTO (if critical data loss or security breach)

---

## Appendix: Database Backup Restoration

If rollback fails and database becomes corrupted:

```bash
# Restore from backup
docker exec -i st44-postgres psql -U postgres -d postgres -c "DROP DATABASE st44_production;"
docker exec -i st44-postgres psql -U postgres -d postgres -c "CREATE DATABASE st44_production;"
docker exec -i st44-postgres psql -U postgres -d st44_production < rollback_backup_YYYYMMDD_HHMMSS.sql

# Verify restoration
docker exec -it st44-postgres psql -U postgres -d st44_production -c "\dt"
```

**⚠️ Only use as last resort. All data created after backup will be lost.**

---

**Rollback Guide Version:** 1.0.0
**Last Tested:** _______________
**Last Updated:** 2025-12-31
**Next Review:** After first production deployment
