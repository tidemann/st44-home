# Critical Bug: Login Handler Double-Execution

**Issue**: #504
**Status**: UNRESOLVED - Workaround needed
**Severity**: Critical - Causes test failures in CI
**Date Discovered**: 2026-01-04

## Summary

The login handler (`/api/auth/login`) executes **twice** for each request after the first one in a test run, causing "Reply was already sent" errors in CI. This is a deep async/promise issue that appears to involve Fastify 5.x's request/reply lifecycle or the pg connection pool.

## Reproduction

### Minimal Test Case

Created in `apps/backend/src/routes/auth.minimal-repro.test.ts`:

```typescript
test('multiple sequential logins should each execute once', async () => {
  // First login: executes once ✅
  // Second login: executes TWICE ❌
  // Third login: executes TWICE ❌
  // Pattern: handler re-executes ~20ms after request completion
});
```

### Execution Pattern

```
Timeline for Request N:
1. Request N starts (req-N)
2. Handler executes successfully
3. Response sent (statusCode 200)
4. "request completed" logged
5. Request N+1 starts (req-N+1)
6. ~20ms later: Request N's handler EXECUTES AGAIN ❌
7. Second execution logs "Successful login"
8. Second execution tries to send → "Reply was already sent" error
```

### Key Evidence

From CI logs:

```
{"level":30,"time":1767490113197,"pid":3130,"reqId":"req-3","res":{"statusCode":200},"responseTime":261.95,"msg":"request completed"}
{"level":30,"time":1767490113197,"reqId":"req-4","req":{"method":"POST","url":"/api/auth/login"...},"msg":"incoming request"}
{"level":30,"time":1767490113223,"userId":"47a02ccd...","msg":"Successful login"} ← req-3 handler AGAIN
{"level":40,"time":1767490113223,"reqId":"req-3","err":{"type":"FastifyError","message":"Reply was already sent"...}}
```

## Technical Details

### Stack Trace Pattern

All double-executions show:

```
at Object.<anonymous> (/home/runner/work/st44-home/st44-home/apps/backend/src/routes/auth.ts:288:32)
at process.processTicksAndRejections (node:internal/process/task_queues:103:5)
```

The `process.processTicksAndRejections` indicates the duplicate execution happens **asynchronously in the microtask queue**, not as a direct function call.

### Affected Code

`apps/backend/src/routes/auth.ts` lines 208-290 (login handler):

```typescript
fastify.post('/login', { schema, preHandler: rateLimiters.login }, async (request, reply) => {
  const { email, password } = request.body;

  try {
    // 1. Query user from database
    const result = await pool.query('SELECT ...', [email]);

    // 2. Compare password with bcrypt
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    // 3. Query household_members
    const householdResult = await pool.query('SELECT ...', [user.id]);

    // 4. Generate tokens (sync JWT operations)
    const accessToken = generateAccessToken(...);
    const refreshToken = generateRefreshToken(user.id);

    // 5. Log success
    fastify.log.info({ userId: user.id }, 'Successful login'); // ← Logs TWICE

    // 6. Send response
    return reply.code(200).send({ ... }); // ← Executes TWICE, second fails
  } catch (error) {
    // Error handling...
  }
});
```

### Environment

- **Occurs**: GitHub Actions CI (Ubuntu runners)
- **Does NOT occur**: Local Windows development (same pattern but masked by database connection errors)
- **Fastify**: v5.x
- **Node.js**: v20.x in CI
- **Database**: PostgreSQL via `pg.Pool`
- **Test Framework**: Node.js built-in test runner

## Root Cause Hypothesis

### Most Likely: Connection Pool Callback Issue

The timing pattern (double-execution triggers when NEXT request starts) strongly suggests:

1. Database query callbacks are being **queued** instead of properly consumed
2. When a new request starts a database operation, it **triggers queued callbacks** from previous requests
3. These callbacks re-execute the handler's continuation after the `await pool.query()`

### Supporting Evidence

- Double-execution happens ~20ms after next request **starts** (not completes)
- Only happens after database migrations added triggers (made queries slower)
- Stack trace shows `process.processTicksAndRejections` (promise/callback queue)
- Pattern is consistent: every request after the first one doubles

### Why Database Triggers Exposed It

Migration 047 added triggers that slow down queries:

```sql
CREATE TRIGGER enforce_child_household_consistency
  BEFORE INSERT OR UPDATE ON children
  FOR EACH ROW WHEN (NEW.user_id IS NOT NULL)
  EXECUTE FUNCTION check_child_household_consistency();
```

Slower queries → changed async timing → exposed latent callback issue.

## Failed Fix Attempts

### Attempt 1: Fix Fastify Response Pattern ❌

**Change**: `reply.code(X); return {...}` → `return reply.code(X).send({...})`

**Result**: No effect on double-execution

**Why it failed**: The issue isn't with the Fastify pattern itself, but with the handler being called twice.

### Attempt 2: Add reply.sent Guards in Error Handlers ❌

**Change**: Added `if (!reply.sent)` before sending errors

**Result**: No effect on double-execution (errors happen in success path, not error handlers)

### Attempt 3: Add reply.sent Guard at Handler Start ❌

**Change**:

```typescript
async (request, reply) => {
  if (reply.sent) {
    fastify.log.warn('Login handler called but reply already sent - skipping');
    return;
  }
  // ... rest of handler
};
```

**Result**: **GUARD NEVER TRIGGERED**

**Critical Discovery**: `reply.sent` is **FALSE** on the second execution, even though a reply was already sent! This means:

- The `reply` object is being **reset or recreated**
- OR the second execution gets a **different reply object**
- OR `reply.sent` is not being properly set by Fastify

This is a major clue pointing to Fastify internals.

### Attempt 4: Detailed Instrumentation 📊

**Change**: Added execution IDs and debug logs at every step

**Result**: Confirmed double-execution pattern but didn't prevent it

## Current State

### Test Results

- ✅ **Frontend tests**: PASS
- ❌ **Backend tests**: FAIL (99+ "Reply was already sent" errors)
- ✅ **Locally**: Tests show 0 "Reply was already sent" when DB isn't running (fail for other reasons)
- ❌ **CI**: Consistent failures

### Impact

- **Blocking**: CI pipeline fails on every commit to main
- **Workaround**: None currently effective
- **Production**: Unknown if this affects production (tests use `app.inject()`, production uses HTTP)

## Next Steps

### Immediate Actions Needed

1. **Test with Fastify 4.x**: Downgrade to see if this is Fastify 5-specific
2. **Test without pg.Pool**: Use direct pg.Client to isolate pool issue
3. **Simplify handler**: Remove bcrypt/JWT to isolate database operations
4. **Check Fastify Issues**: Search for similar "reply.sent" false positive bugs

### Long-term Investigation

1. **Create upstream bug report** with minimal reproduction
2. **Instrument Fastify internals**: Add logging to Fastify's reply lifecycle
3. **Profile async execution**: Use Node.js --inspect to trace microtask queue
4. **Alternative**: Rewrite tests to not use `app.inject()` (use real HTTP)

### Potential Workarounds

1. **Mutex/Lock**: Add request-level locking to prevent concurrent execution
2. **Deduplicate**: Track request IDs and skip if already processed
3. **Separate pool**: Use different connection pool for tests
4. **Mock database**: Replace real DB with in-memory mock for tests

## Related Files

- `apps/backend/src/routes/auth.ts` - Affected handler
- `apps/backend/src/routes/auth.minimal-repro.test.ts` - Reproduction test
- `apps/backend/src/database.ts` - Connection pool configuration
- `docker/postgres/migrations/047_*.sql` - Triggers that exposed the bug
- `apps/backend/src/middleware/request-logger.ts` - Initially suspected (cleared)

## References

- **Issue**: #504
- **First failure**: Commit `a0da8a4` (database migrations)
- **Bug introduced**: Commit `7c12640` (latent, only manifested later)
- **CI Run with repro**: https://github.com/tidemann/st44-home/actions/runs/20685599547

## Investigation Log

**2026-01-04 00:00** - Initial investigation started
**2026-01-04 00:30** - Identified pattern: second request triggers double-execution
**2026-01-04 01:00** - Created minimal reproduction test
**2026-01-04 01:20** - Confirmed double-execution in ALL tests, not just minimal repro
**2026-01-04 01:30** - Discovered `reply.sent` guard doesn't work (reply object reset)
**2026-01-04 01:40** - Documented findings in this file

---

**Note**: This is a deep, complex bug requiring either upstream Fastify/pg fixes or significant architectural changes to work around. Recommend creating upstream issue with minimal reproduction before attempting workarounds.
