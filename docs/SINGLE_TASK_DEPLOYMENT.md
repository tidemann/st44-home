# Single Task Feature - Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the Single Task feature to staging and production environments.

**Feature Version:** 1.0.0
**GitHub Issues:** #400-#414
**Estimated Deployment Time:** 30 minutes

---

## Pre-Deployment Checklist

- [ ] All 15 GitHub issues closed and tested locally
- [ ] Database migrations tested on local environment
- [ ] Backend tests passing (`npm run test:backend`)
- [ ] Frontend builds successfully (`npm run build:frontend`)
- [ ] Type checking passes (`npm run type-check`)
- [ ] Code review completed
- [ ] Backup of production database taken
- [ ] Deployment window scheduled (recommend low-traffic period)

---

## Deployment Steps

### Step 1: Database Migration (5 minutes)

**CRITICAL:** Migrations must run BEFORE deploying application code.

#### 1.1 Connect to Database

```bash
# For staging
docker exec -it st44-postgres psql -U postgres -d st44_staging

# For production
docker exec -it st44-postgres psql -U postgres -d st44_production
```

#### 1.2 Run Migrations in Order

**Migration Order is Critical:**

```sql
-- 1. Add 'single' task type
\i docker/postgres/migrations/040_add_single_task_type.sql

-- 2. Add deadline field
\i docker/postgres/migrations/041_add_task_deadline.sql

-- 3. Create task_candidates table
\i docker/postgres/migrations/042_create_task_candidates.sql

-- 4. Create task_responses table
\i docker/postgres/migrations/043_create_task_responses.sql

-- 5. Add 'expired' status
\i docker/postgres/migrations/044_add_expired_status.sql
```

#### 1.3 Verify Migrations

```sql
-- Check schema_migrations table
SELECT version, name, applied_at
FROM schema_migrations
WHERE version IN ('040', '041', '042', '043', '044')
ORDER BY version;

-- Should return 5 rows

-- Verify new tables exist
\dt task_candidates
\dt task_responses

-- Verify task types include 'single'
SELECT DISTINCT rule_type FROM tasks;

-- Verify assignment statuses include 'expired'
-- (Check constraint in task_assignments table)
```

---

### Step 2: Deploy Backend (10 minutes)

#### 2.1 Build Types Package

```bash
cd packages/types
npm run build
```

#### 2.2 Build Backend

```bash
cd apps/backend
npm run build
```

#### 2.3 Run Backend Tests

```bash
npm test
```

**Expected Output:**
- All existing tests pass
- New task-response.repository tests pass (15+ tests)

#### 2.4 Deploy Backend Service

```bash
# Stop current backend
npm run docker:down

# Rebuild with new code
docker-compose build backend

# Start backend
npm run docker:up
```

#### 2.5 Verify Backend Health

```bash
curl http://localhost:3000/api/health

# Expected: {"status":"ok","timestamp":"..."}
```

#### 2.6 Test Single Task Endpoints

```bash
# Test endpoint registration (should return 404, not 405)
curl -X GET http://localhost:3000/api/children/available-tasks

# Expected: 401 Unauthorized (endpoint exists but requires auth)
```

---

### Step 3: Deploy Frontend (10 minutes)

#### 3.1 Build Frontend

```bash
cd apps/frontend
npm run build
```

**Verify Build:**
- No TypeScript errors
- No build warnings
- Output directory created: `dist/`

#### 3.2 Deploy Frontend Bundle

```bash
# Copy build artifacts to web server
# (Adjust paths based on your deployment method)

# For Docker deployment:
docker-compose build frontend
docker-compose up -d frontend
```

#### 3.3 Verify Frontend

```bash
# Check frontend is serving
curl http://localhost:4200

# Should return HTML
```

---

### Step 4: Smoke Tests (5 minutes)

Run these manual tests immediately after deployment:

#### 4.1 Create Single Task (Parent)

1. Log in as parent user
2. Navigate to Tasks page
3. Click "Create Task"
4. Select "Single" task type
5. Fill in:
   - Name: "Test Single Task"
   - Description: "Deployment test"
   - Points: 50
   - Deadline: Tomorrow
   - Candidates: Select 2+ children
6. Submit
7. Verify task appears in task list

#### 4.2 View Available Task (Child)

1. Log out
2. Log in as child user (one of the candidates)
3. Navigate to dashboard
4. Verify "Available Tasks" section appears
5. Verify test task is listed with:
   - Deadline badge
   - Accept/Decline buttons
   - Points display

#### 4.3 Accept Task (Child)

1. Click "Accept" button
2. Verify:
   - Task moves to regular tasks list
   - No error messages
   - Points are correct

#### 4.4 Verify Acceptance (Parent)

1. Log in as parent
2. Check that task is no longer in "Available" for other children
3. Verify assignment was created

---

### Step 5: Monitoring (Ongoing)

#### 5.1 Monitor Error Logs

```bash
# Backend logs
docker logs -f st44-backend

# Watch for errors related to:
# - single-tasks routes
# - task-response repository
# - Database constraint violations
```

#### 5.2 Monitor Database Performance

```sql
-- Check for slow queries on new tables
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
WHERE query LIKE '%task_candidates%' OR query LIKE '%task_responses%'
ORDER BY mean_time DESC
LIMIT 10;
```

#### 5.3 Monitor API Response Times

```bash
# Check /api/children/available-tasks response time
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/children/available-tasks

# Should be < 200ms
```

---

## Post-Deployment Validation

### Database Health Checks

```sql
-- Verify RLS policies are active
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('task_candidates', 'task_responses');

-- Should show rowsecurity = true

-- Check for orphaned records (should be 0)
SELECT COUNT(*) FROM task_candidates tc
WHERE NOT EXISTS (SELECT 1 FROM tasks t WHERE t.id = tc.task_id);

SELECT COUNT(*) FROM task_responses tr
WHERE NOT EXISTS (SELECT 1 FROM tasks t WHERE t.id = tr.task_id);
```

### API Health Checks

Test all 7 new endpoints with authenticated requests:

```bash
# Replace TOKEN with valid JWT
TOKEN="your-jwt-token"

# 1. Available tasks (child endpoint)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/children/available-tasks

# 2. Failed tasks (parent endpoint)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/households/HOUSEHOLD_ID/single-tasks/failed

# 3. Expired tasks (parent endpoint)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/households/HOUSEHOLD_ID/single-tasks/expired
```

### Performance Validation

Expected performance benchmarks:

| Endpoint | Max Response Time |
|----------|-------------------|
| GET /children/available-tasks | 150ms |
| GET /households/:id/single-tasks/failed | 200ms |
| POST /households/:id/tasks/:id/accept | 100ms |
| POST /households/:id/tasks/:id/decline | 80ms |

---

## Rollback Procedure

If critical issues are discovered, follow the rollback procedure in `ROLLBACK.md`.

**Quick Rollback Steps:**

1. Revert application code to previous version
2. Restart services
3. (Optional) Roll back database migrations if necessary

**Note:** Database migrations are backward compatible. Rolling back migrations is only necessary if data corruption occurs.

---

## Known Issues & Mitigations

### Issue 1: Race Condition on Accept
**Symptom:** Two children accept simultaneously, one gets 409 error
**Expected Behavior:** This is correct - only first child should succeed
**Mitigation:** None needed - working as designed

### Issue 2: Deadline in Past Warning
**Symptom:** Validation error when creating single task with past deadline
**Expected Behavior:** This is correct - deadlines must be in future
**Mitigation:** None needed - working as designed

---

## Success Criteria

Deployment is successful when:

- ✅ All 5 migrations applied successfully
- ✅ Backend health check returns 200 OK
- ✅ Frontend builds and serves without errors
- ✅ Parent can create single task with deadline
- ✅ Child can see available tasks
- ✅ Child can accept/decline tasks
- ✅ Failed tasks appear in parent dashboard
- ✅ No error logs related to single tasks
- ✅ Response times meet performance benchmarks

---

## Support & Troubleshooting

### Common Issues

**1. Migration fails with "constraint already exists"**
```sql
-- Check if migration already ran
SELECT * FROM schema_migrations WHERE version = '040';
-- If exists, skip that migration
```

**2. Frontend shows TypeScript errors**
```bash
# Rebuild types package
cd packages/types && npm run build
cd apps/frontend && npm install
```

**3. "Child profile not found" error**
```sql
-- Verify child has user_id set
SELECT id, user_id FROM children WHERE user_id IS NOT NULL;
```

### Emergency Contacts

- **Database Issues:** DBA Team
- **Backend Issues:** Backend Team Lead
- **Frontend Issues:** Frontend Team Lead
- **Infrastructure:** DevOps Team

---

## Appendix A: Migration File Checksums

Verify migration file integrity before deployment:

```bash
# Generate checksums
sha256sum docker/postgres/migrations/040_add_single_task_type.sql
sha256sum docker/postgres/migrations/041_add_task_deadline.sql
sha256sum docker/postgres/migrations/042_create_task_candidates.sql
sha256sum docker/postgres/migrations/043_create_task_responses.sql
sha256sum docker/postgres/migrations/044_add_expired_status.sql
```

Expected checksums: (Generate these before deployment)

---

## Appendix B: Feature Flags (Optional)

If using feature flags:

```javascript
// Enable single task feature
featureFlags.enableSingleTasks = true;

// Gradual rollout by household
featureFlags.singleTasksHouseholds = [
  'household-uuid-1',
  'household-uuid-2',
  // Add more as confident
];
```

---

**Deployment Version:** 1.0.0
**Last Updated:** 2025-12-31
**Next Review:** After 7 days in production
