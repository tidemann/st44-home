# Rewards and Points Redemption System - Implementation Summary

## GitHub Issue #168

This document summarizes the implementation of the rewards and points redemption system.

## Completed Work

### 1. Database Schema (Migration 023)

**Files Created:**

- `docker/postgres/migrations/023_add_rewards_system.sql`
- Updated `docker/postgres/init.sql`

**Tables Created:**

- `rewards` - Stores rewards that parents create for their household
  - id, household_id, name, description, points_cost, quantity, active, timestamps
- `reward_redemptions` - Tracks when children redeem rewards
  - id, household_id, reward_id, child_id, points_spent, status, redeemed_at, fulfilled_at
- `child_points_balance` VIEW - Calculates earned points - spent points

**Status:** Complete and idempotent

### 2. Shared Types (@st44/types)

**Files Created:**

- `packages/types/src/schemas/reward.schema.ts`
- Updated `packages/types/src/schemas/index.ts`

**Schemas Defined:**

- `RewardSchema` - Reward entity
- `RewardRedemptionSchema` - Redemption entity
- `ChildPointsBalanceSchema` - Points balance view
- `CreateRewardRequestSchema` - Create reward validation
- `UpdateRewardRequestSchema` - Update reward validation
- `RedeemRewardRequestSchema` - Redeem reward validation
- `ChildRewardsResponseSchema` - Child rewards list response
- `RedeemRewardResponseSchema` - Redemption response

**Status:** Complete with full TypeScript types and runtime validation

### 3. Backend API (Fastify)

**Files Created:**

- `apps/backend/src/routes/rewards.ts`
- Updated `apps/backend/src/server.ts` to register routes

**Endpoints Implemented:**

#### Parent/Admin Endpoints:

- `POST /api/households/:householdId/rewards` - Create reward
- `GET /api/households/:householdId/rewards` - List rewards (supports ?active=true filter)
- `GET /api/households/:householdId/rewards/:rewardId` - Get reward details
- `PUT /api/households/:householdId/rewards/:rewardId` - Update reward
- `DELETE /api/households/:householdId/rewards/:rewardId` - Soft delete reward
- `GET /api/households/:householdId/redemptions` - List redemptions (supports ?status=pending)
- `POST /api/households/:householdId/redemptions/:redemptionId/approve` - Approve redemption
- `POST /api/households/:householdId/redemptions/:redemptionId/fulfill` - Mark as fulfilled
- `POST /api/households/:householdId/redemptions/:redemptionId/reject` - Reject (refunds points)

#### Child Endpoints:

- `GET /api/children/me/rewards` - Get available rewards and points balance
- `POST /api/children/me/rewards/:rewardId/redeem` - Redeem a reward

**Key Features:**

- Transaction-safe redemption (row locking, atomic operations)
- Points balance validation (prevents overspending)
- Quantity management (optional stock limits)
- Status workflow (pending → approved → fulfilled or rejected)
- Rejection refunds points automatically
- Full OpenAPI/Swagger documentation

**Status:** Complete with all CRUD operations and redemption workflows

### 4. Frontend (Angular)

**Files Created:**

- `apps/frontend/src/app/services/reward.service.ts` - Rewards service with signals
- `apps/frontend/src/app/pages/rewards-management/rewards-management.ts` - Parent management component

**Service Features:**

- Signals-based reactive state management
- CRUD operations for rewards
- Redemption management (approve/fulfill/reject)
- Child rewards view and redemption
- Points balance tracking
- Computed signals for filtered lists (active/inactive, pending/approved/fulfilled)

**Component Features (Partial):**

- Rewards list view
- Create/edit/delete rewards
- View redemptions by status
- Approve/reject/fulfill redemption actions

**Status:** Service complete, components partially implemented (require HTML/CSS)

## Remaining Work

### Frontend UI (HTML/CSS)

The following templates and styles need to be created:

1. **Rewards Management Page (Parent)**
   - `apps/frontend/src/app/pages/rewards-management/rewards-management.html`
   - `apps/frontend/src/app/pages/rewards-management/rewards-management.css`
   - Features needed:
     - Tab navigation (Rewards / Redemptions)
     - Rewards list with create/edit/delete controls
     - Redemptions list with approve/reject/fulfill buttons
     - Form for creating/editing rewards

2. **Child Rewards Store Page**
   - `apps/frontend/src/app/pages/child-rewards/child-rewards.ts`
   - `apps/frontend/src/app/pages/child-rewards/child-rewards.html`
   - `apps/frontend/src/app/pages/child-rewards/child-rewards.css`
   - Features needed:
     - Points balance display (prominent)
     - Available rewards grid/list
     - Redeem buttons (disabled if insufficient points or out of stock)
     - Redemption history

3. **Routing Configuration**
   - Add routes to `apps/frontend/src/app/app.routes.ts`:
     - `/rewards` - Parent rewards management
     - `/my-rewards` - Child rewards store

4. **Navigation Links**
   - Add "Rewards" link to parent dashboard navigation
   - Add "My Rewards" link to child dashboard navigation

### Testing

1. **Backend Tests**
   - `apps/backend/src/routes/rewards.test.ts`
   - Test redemption transaction safety
   - Test points validation
   - Test quantity management
   - Test rejection refunds

2. **E2E Tests**
   - `apps/frontend/e2e/features/rewards.spec.ts`
   - Test reward creation → child redemption → parent approval flow

## Migration Instructions

### For Existing Databases:

```bash
# Apply migration 023
docker exec -i st44-db psql -U postgres -d st44 < docker/postgres/migrations/023_add_rewards_system.sql

# Verify migration
docker exec -it st44-db psql -U postgres -d st44 -c "SELECT * FROM schema_migrations WHERE version = '023';"

# Check tables
docker exec -it st44-db psql -U postgres -d st44 -c "\d rewards"
docker exec -it st44-db psql -U postgres -d st44 -c "\d reward_redemptions"
docker exec -it st44-db psql -U postgres -d st44 -c "\d child_points_balance"
```

### For Fresh Installations:

The migration is included in `init.sql`, so no manual steps needed.

## Example Usage

### Parent: Create a Reward

```typescript
// POST /api/households/{householdId}/rewards
{
  "name": "30 min screen time",
  "description": "Extra 30 minutes on tablet or TV",
  "pointsCost": 50,
  "quantity": null  // unlimited
}
```

### Child: View Available Rewards

```typescript
// GET /api/children/me/rewards
{
  "pointsBalance": 150,
  "rewards": [
    {
      "id": "uuid",
      "name": "30 min screen time",
      "pointsCost": 50,
      "available": true,
      "canAfford": true
    }
  ]
}
```

### Child: Redeem Reward

```typescript
// POST /api/children/me/rewards/{rewardId}/redeem
{
  "redemption": {
    "id": "uuid",
    "status": "pending",
    "pointsSpent": 50,
    "redeemedAt": "2025-12-24T12:00:00Z"
  },
  "newBalance": 100
}
```

### Parent: Approve Redemption

```typescript
// POST /api/households/{householdId}/redemptions/{redemptionId}/approve
{
  "id": "uuid",
  "status": "approved",
  "pointsSpent": 50
}
```

## Deployment Checklist

- [x] Migration file created (023)
- [x] Migration is idempotent
- [x] init.sql updated
- [x] RLS policies added
- [x] Zod schemas created
- [x] Backend routes implemented
- [x] Routes registered in server.ts
- [x] Swagger tags added
- [x] Frontend service created
- [ ] Frontend components completed (HTML/CSS)
- [ ] Routes configured
- [ ] Tests written
- [ ] All checks pass (type-check, format, test, build)
- [ ] PR created

## Next Steps

1. Complete frontend HTML/CSS templates
2. Add routing configuration
3. Write backend and E2E tests
4. Run all local checks
5. Create PR with "Closes #168"
6. Manual QA testing of full redemption flow

## Notes

- Points are calculated from `task_completions.points_earned` - `reward_redemptions.points_spent`
- Rejected redemptions don't count towards points_spent (filtered in VIEW)
- Redemption is transaction-safe with row locking to prevent race conditions
- Quantity decrements are atomic and prevent overselling
- All APIs are fully documented in Swagger at `/api/docs`
