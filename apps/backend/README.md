# Backend API

Fastify-based REST API for the ST44 application (Diddit! family task management).

## Development

```bash
npm install
npm run dev
```

## Environment Variables

- `PORT` - Server port (default: 3000)
- `HOST` - Server host (default: 0.0.0.0)
- `DB_HOST` - PostgreSQL host (default: localhost)
- `DB_PORT` - PostgreSQL port (default: 5432)
- `DB_NAME` - Database name (default: st44)
- `DB_USER` - Database user (default: postgres)
- `DB_PASSWORD` - Database password (default: postgres)
- `CORS_ORIGIN` - CORS origin (default: \*)
- `JWT_SECRET` - JWT signing secret (default: dev-secret-change-in-production)
- `GOOGLE_CLIENT_ID` - Google OAuth client ID (required for Google Sign-In)
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret (optional, not used in current implementation)

## API Endpoints

### Single Task Endpoints

Single tasks are one-time, assignment-based tasks where children can accept or decline. Once one child accepts, the task is assigned to them.

#### Child-Facing Endpoints

##### Get Available Tasks

```
GET /api/children/available-tasks
```

Returns tasks the authenticated child can accept or decline.

**Response (200):**

```json
{
  "tasks": [
    {
      "id": "uuid",
      "name": "Clean the garage",
      "description": "One-time deep clean",
      "points": 50,
      "deadline": "2024-01-15T18:00:00Z",
      "candidateCount": 3,
      "declineCount": 1
    }
  ]
}
```

##### Accept a Task

```
POST /api/households/:householdId/tasks/:taskId/accept
```

Child accepts a single task. Uses database transactions with row locking to prevent race conditions.

**Response (201):**

```json
{
  "assignment": {
    "id": "uuid",
    "taskId": "uuid",
    "childId": "uuid",
    "date": "2024-01-15",
    "status": "pending"
  }
}
```

**Errors:**

- `409 Conflict` - Another child has already accepted the task
- `403 Forbidden` - Child is not a candidate for this task
- `404 Not Found` - Task not found

##### Decline a Task

```
POST /api/households/:householdId/tasks/:taskId/decline
```

Child declines a single task.

**Response (200):**

```json
{ "success": true }
```

##### Undo Decline

```
DELETE /api/households/:householdId/tasks/:taskId/responses/:childId
```

Child undoes their decline response. Task will reappear in available tasks list.

**Response (200):**

```json
{ "success": true }
```

#### Parent-Facing Endpoints

##### Get Failed Tasks

```
GET /api/households/:householdId/single-tasks/failed
```

Returns tasks where all candidates have declined. Parent-only.

**Response (200):**

```json
{
  "tasks": [
    {
      "id": "uuid",
      "name": "Task name",
      "description": "Description",
      "points": 10,
      "deadline": "2024-01-15T18:00:00Z",
      "candidateCount": 3,
      "declineCount": 3
    }
  ]
}
```

##### Get Expired Tasks

```
GET /api/households/:householdId/single-tasks/expired
```

Returns tasks past their deadline with no acceptance. Parent-only.

**Response (200):** Same structure as failed tasks.

##### Get Task Candidates

```
GET /api/households/:householdId/tasks/:taskId/candidates
```

Returns candidate list with their response status. Parent-only.

**Response (200):**

```json
{
  "candidates": [
    {
      "childId": "uuid",
      "childName": "Alice",
      "response": "accepted",
      "respondedAt": "2024-01-15T10:00:00Z"
    },
    {
      "childId": "uuid",
      "childName": "Bob",
      "response": "declined",
      "respondedAt": "2024-01-15T09:30:00Z"
    },
    {
      "childId": "uuid",
      "childName": "Charlie",
      "response": null,
      "respondedAt": null
    }
  ]
}
```

### Task Rule Types

Tasks can have different assignment patterns:

| Rule Type         | Description                                             |
| ----------------- | ------------------------------------------------------- |
| `daily`           | Automatically assigned to configured children every day |
| `repeating`       | Assigned on specific days of the week                   |
| `weekly_rotation` | Rotates between children each week                      |
| `single`          | One-time task with accept/decline workflow              |

### Creating a Single Task

Use the existing task creation endpoint with `ruleType: 'single'`:

```
POST /api/households/:householdId/tasks
```

**Request Body:**

```json
{
  "name": "Clean the garage",
  "description": "One-time deep cleaning",
  "points": 50,
  "ruleType": "single",
  "deadline": "2024-01-15T18:00:00Z",
  "ruleConfig": {
    "assignedChildren": ["child-uuid-1", "child-uuid-2"]
  }
}
```

**Notes:**

- `deadline` is optional but recommended for single tasks
- `ruleConfig.assignedChildren` specifies which children are candidates
- At least one child must be selected as a candidate

## Testing

```bash
# Run all backend tests
npm test

# Run single test file
npx tsx --test src/routes/single-tasks.test.ts

# Run with test database
TEST_DB_HOST=st44-db-test TEST_DB_PORT=5432 npm test
```
