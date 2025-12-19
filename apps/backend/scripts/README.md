# Backend Manual Test Scripts

This directory contains PowerShell scripts for manual API integration testing. These scripts test real backend endpoints with actual HTTP requests against a running backend server.

## Purpose

These scripts are **manual testing tools** for local development:

- Quick verification of API endpoints
- Manual integration testing during development
- Debugging and troubleshooting API behavior
- Demonstrating API usage patterns
- Verifying authorization and data isolation

## Prerequisites

1. **Backend server running**: `npm run dev` from `apps/backend/`
2. **Database accessible**: PostgreSQL running (local or Docker)
3. **PowerShell 7+**: Windows PowerShell or PowerShell Core

## Available Scripts

### test-households.ps1

Tests household CRUD endpoints:

- Register user and login
- Create household
- Get household details
- Update household
- List user's households

**Usage:**

```powershell
.\test-households.ps1
```

### test-children-crud.ps1

Comprehensive children CRUD testing:

- List children (empty household)
- Create children (valid data)
- List children (ordered alphabetically)
- Update child information
- Delete child
- Validation tests (empty name, invalid birth year)
- Authorization tests (non-existent IDs)

**Usage:**

```powershell
.\test-children-crud.ps1
```

### test-household-membership.ps1

Tests household membership middleware and authorization:

- User registration (2 users)
- Household creation (user 1)
- Member access (user 1 can access)
- Non-member denial (user 2 cannot access)
- Admin authorization (update operations)
- Invalid ID handling

**Usage:**

```powershell
.\test-household-membership.ps1
```

## How They Work

1. **Self-contained**: Each script creates its own test data (users, households, children)
2. **Colored output**: Green ✓ for success, Red ✗ for failures, Yellow for test names
3. **Error handling**: `$ErrorActionPreference = "Stop"` catches issues early
4. **Cleanup**: Test data uses unique timestamps/GUIDs to avoid conflicts

## Configuration

All scripts use:

- **Base URL**: `http://localhost:3000`
- **API prefix**: `/api/`
- **Auth**: Bearer token authentication

To test against different environments, modify the `$baseUrl` variable at the top of each script.

## Example Output

```
=== Testing Children CRUD API Endpoints ===

Registering user...
✓ User registered: 12345

Logging in...
✓ Logged in

Creating household...
✓ Household created: abc-def-ghi

Test 1: List children (empty household)...
✓ Empty children list returned

Test 2: Create child (Emma, 2015)...
✓ Child created: Emma (2015)
  ID: child-id-123

...

=== All Tests Complete ===
```

## Comparison with Automated Tests

| Aspect          | Manual Scripts (these)        | Automated Tests (Playwright) |
| --------------- | ----------------------------- | ---------------------------- |
| **Purpose**     | Quick verification, debugging | CI/CD, regression testing    |
| **Execution**   | Manual, on-demand             | Automated, on every push     |
| **Environment** | Local dev server              | Test environment (Docker)    |
| **Database**    | Development DB                | Test database (isolated)     |
| **Speed**       | Fast (seconds)                | Slower (full setup)          |
| **Coverage**    | Focused scenarios             | Comprehensive                |
| **Output**      | Console (colored text)        | Reports, screenshots, traces |

## When to Use

**Use these scripts when:**

- Developing new API endpoints
- Debugging authentication issues
- Testing authorization logic
- Verifying data isolation between households
- Checking validation error messages
- Demonstrating API usage to team members

**Use automated tests when:**

- Running full regression suite
- CI/CD pipeline validation
- Comprehensive coverage needed
- Need reports and artifacts
- Testing UI + API integration

## Adding New Scripts

When creating new manual test scripts:

1. **Name**: `test-{feature}.ps1` (e.g., `test-tasks.ps1`)
2. **Structure**:

   ```powershell
   # Test script for {feature}

   $ErrorActionPreference = "Stop"
   $baseUrl = "http://localhost:3000"

   Write-Host "=== Testing {Feature} ===" -ForegroundColor Cyan

   # Setup (register, login, create test data)

   # Test 1: Description
   Write-Host "`nTest 1: ..." -ForegroundColor Yellow
   # ... test code ...
   Write-Host "✓ Success" -ForegroundColor Green

   Write-Host "`n=== All Tests Complete ===" -ForegroundColor Cyan
   ```

3. **Document** in this README
4. **Commit** with meaningful message

## Best Practices

- ✅ Use unique test data (timestamps, GUIDs)
- ✅ Test happy paths AND error cases
- ✅ Verify response status codes AND body content
- ✅ Test authorization (member vs non-member)
- ✅ Clean output with colors and structure
- ❌ Don't hardcode IDs (generate unique data)
- ❌ Don't rely on existing data (create your own)
- ❌ Don't leave test data in production

## Related Documentation

- [Backend Testing Guide](../TESTING.md) - Automated unit and integration tests
- [E2E Testing Guide](../../../docs/E2E_TESTING.md) - Playwright E2E tests
- [API Documentation](../README.md) - API endpoint reference

---

**Last Updated**: 2025-12-19
