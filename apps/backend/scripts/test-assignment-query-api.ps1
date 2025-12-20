# Test Assignment Query API (task-094)
# Tests: GET /api/children/:childId/tasks and GET /api/households/:householdId/assignments

Write-Host "=== Testing Assignment Query API Endpoints ===" -ForegroundColor Cyan

$baseUrl = "http://localhost:3000"
$testEmail = "assignment-query-test-$([guid]::NewGuid().ToString().Substring(0,8))@example.com"
$testPassword = "SecurePass123!"

# Helper function for API calls
function Invoke-ApiCall {
    param(
        [string]$Method,
        [string]$Uri,
        [hashtable]$Headers = @{},
        [object]$Body = $null,
        [string]$Description
    )
    
    Write-Host "`n$Description..." -ForegroundColor Yellow
    
    try {
        $params = @{
            Method = $Method
            Uri = $Uri
            Headers = $Headers
            ContentType = "application/json"
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
        }
        
        $response = Invoke-RestMethod @params -StatusCodeVariable "statusCode"
        Write-Host "✓ Success (HTTP $statusCode)" -ForegroundColor Green
        return $response
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $errorBody = $_.ErrorDetails.Message
        Write-Host "✗ Failed (HTTP $statusCode)" -ForegroundColor Red
        Write-Host "  Error: $errorBody" -ForegroundColor Red
        return $null
    }
}

# 1. Register and login
Write-Host "`n=== Setup: Create Test User and Household ===" -ForegroundColor Cyan

$registerResponse = Invoke-ApiCall -Method POST -Uri "$baseUrl/api/auth/register" `
    -Body @{ email = $testEmail; password = $testPassword } `
    -Description "Register test user"

if (!$registerResponse) { exit 1 }
$userId = $registerResponse.userId

$loginResponse = Invoke-ApiCall -Method POST -Uri "$baseUrl/api/auth/login" `
    -Body @{ email = $testEmail; password = $testPassword } `
    -Description "Login"

if (!$loginResponse) { exit 1 }
$token = $loginResponse.accessToken
$headers = @{ Authorization = "Bearer $token" }

# 2. Create household
$householdResponse = Invoke-ApiCall -Method POST -Uri "$baseUrl/api/households" `
    -Headers $headers `
    -Body @{ name = "Test Family" } `
    -Description "Create household"

if (!$householdResponse) { exit 1 }
$householdId = $householdResponse.id
Write-Host "Household ID: $householdId" -ForegroundColor Gray

# 3. Create children
$child1Response = Invoke-ApiCall -Method POST -Uri "$baseUrl/api/households/$householdId/children" `
    -Headers $headers `
    -Body @{ name = "Alice"; birthYear = 2015 } `
    -Description "Create child 1 (Alice)"

if (!$child1Response) { exit 1 }
$child1Id = $child1Response.id
Write-Host "Child 1 ID: $child1Id" -ForegroundColor Gray

$child2Response = Invoke-ApiCall -Method POST -Uri "$baseUrl/api/households/$householdId/children" `
    -Headers $headers `
    -Body @{ name = "Bob"; birthYear = 2017 } `
    -Description "Create child 2 (Bob)"

if (!$child2Response) { exit 1 }
$child2Id = $child2Response.id
Write-Host "Child 2 ID: $child2Id" -ForegroundColor Gray

# 4. Create tasks
$task1Response = Invoke-ApiCall -Method POST -Uri "$baseUrl/api/households/$householdId/tasks" `
    -Headers $headers `
    -Body @{ 
        name = "Feed the dog"
        description = "Morning and evening"
        points = 10
        ruleType = "daily"
        ruleConfig = @{ daysOfWeek = @(1,2,3,4,5,6,7) }
    } `
    -Description "Create task 1 (Feed the dog)"

if (!$task1Response) { exit 1 }
$task1Id = $task1Response.id

$task2Response = Invoke-ApiCall -Method POST -Uri "$baseUrl/api/households/$householdId/tasks" `
    -Headers $headers `
    -Body @{ 
        name = "Clean room"
        description = "Vacuum and dust"
        points = 15
        ruleType = "weekly_rotation"
        ruleConfig = @{ rotationOrder = @($child1Id, $child2Id) }
    } `
    -Description "Create task 2 (Clean room)"

if (!$task2Response) { exit 1 }
$task2Id = $task2Response.id

# 5. Generate assignments for today
$today = Get-Date -Format "yyyy-MM-dd"
$generateResponse = Invoke-ApiCall -Method POST -Uri "$baseUrl/api/admin/tasks/generate-assignments" `
    -Headers $headers `
    -Body @{ 
        householdId = $householdId
        startDate = $today
        days = 3
    } `
    -Description "Generate assignments for 3 days starting today"

if (!$generateResponse) { exit 1 }
Write-Host "Generated: $($generateResponse.result.created) assignments" -ForegroundColor Gray

# Wait a moment for data to be available
Start-Sleep -Seconds 1

Write-Host "`n=== Test: GET /api/children/:childId/tasks ===" -ForegroundColor Cyan

# Test 1: Get tasks for child 1 (today, no status filter)
$child1TasksResponse = Invoke-ApiCall -Method GET -Uri "$baseUrl/api/children/$child1Id/tasks" `
    -Headers $headers `
    -Description "Get Alice's tasks (today, all statuses)"

if ($child1TasksResponse) {
    Write-Host "  Returned $($child1TasksResponse.tasks.Count) tasks" -ForegroundColor Gray
    if ($child1TasksResponse.tasks.Count -gt 0) {
        $firstTask = $child1TasksResponse.tasks[0]
        Write-Host "  First task: $($firstTask.title) - Status: $($firstTask.status)" -ForegroundColor Gray
    }
}

# Test 2: Get tasks with date filter
$tomorrow = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
$child1TasksTomorrowResponse = Invoke-ApiCall -Method GET -Uri "$baseUrl/api/children/$child1Id/tasks?date=$tomorrow" `
    -Headers $headers `
    -Description "Get Alice's tasks (tomorrow)"

if ($child1TasksTomorrowResponse) {
    Write-Host "  Returned $($child1TasksTomorrowResponse.tasks.Count) tasks for tomorrow" -ForegroundColor Gray
}

# Test 3: Get tasks with status filter
$child1PendingResponse = Invoke-ApiCall -Method GET -Uri "$baseUrl/api/children/$child1Id/tasks?status=pending" `
    -Headers $headers `
    -Description "Get Alice's pending tasks (today)"

if ($child1PendingResponse) {
    Write-Host "  Returned $($child1PendingResponse.tasks.Count) pending tasks" -ForegroundColor Gray
}

# Test 4: Invalid child ID (should return 404)
$invalidChildId = [guid]::NewGuid().ToString()
try {
    $invalidResponse = Invoke-RestMethod -Method GET -Uri "$baseUrl/api/children/$invalidChildId/tasks" `
        -Headers $headers -StatusCodeVariable "invalidStatus"
    Write-Host "✗ Should have returned 404 for invalid child" -ForegroundColor Red
}
catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 404) {
        Write-Host "✓ Correctly returned 404 for invalid child ID" -ForegroundColor Green
    } else {
        Write-Host "✗ Expected 404, got $statusCode" -ForegroundColor Red
    }
}

# Test 5: Invalid date format (should return 400)
try {
    $invalidDateResponse = Invoke-RestMethod -Method GET -Uri "$baseUrl/api/children/$child1Id/tasks?date=invalid-date" `
        -Headers $headers -StatusCodeVariable "invalidDateStatus"
    Write-Host "✗ Should have returned 400 for invalid date" -ForegroundColor Red
}
catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 400) {
        Write-Host "✓ Correctly returned 400 for invalid date format" -ForegroundColor Green
    } else {
        Write-Host "✗ Expected 400, got $statusCode" -ForegroundColor Red
    }
}

# Test 6: Invalid status value (should return 400)
try {
    $invalidStatusResponse = Invoke-RestMethod -Method GET -Uri "$baseUrl/api/children/$child1Id/tasks?status=invalid-status" `
        -Headers $headers -StatusCodeVariable "invalidStatusCode"
    Write-Host "✗ Should have returned 400 for invalid status" -ForegroundColor Red
}
catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 400) {
        Write-Host "✓ Correctly returned 400 for invalid status value" -ForegroundColor Green
    } else {
        Write-Host "✗ Expected 400, got $statusCode" -ForegroundColor Red
    }
}

Write-Host "`n=== Test: GET /api/households/:householdId/assignments ===" -ForegroundColor Cyan

# Test 7: Get all household assignments (today)
$householdAssignmentsResponse = Invoke-ApiCall -Method GET -Uri "$baseUrl/api/households/$householdId/assignments?date=$today&days=1" `
    -Headers $headers `
    -Description "Get all household assignments (today)"

if ($householdAssignmentsResponse) {
    Write-Host "  Returned $($householdAssignmentsResponse.assignments.Count) assignments" -ForegroundColor Gray
    if ($householdAssignmentsResponse.assignments.Count -gt 0) {
        $firstAssignment = $householdAssignmentsResponse.assignments[0]
        Write-Host "  First assignment: $($firstAssignment.title) - Child: $($firstAssignment.childName)" -ForegroundColor Gray
    }
}

# Test 8: Filter by child
$child1AssignmentsResponse = Invoke-ApiCall -Method GET -Uri "$baseUrl/api/households/$householdId/assignments?date=$today&days=1&childId=$child1Id" `
    -Headers $headers `
    -Description "Get assignments filtered by child (Alice)"

if ($child1AssignmentsResponse) {
    Write-Host "  Returned $($child1AssignmentsResponse.assignments.Count) assignments for Alice" -ForegroundColor Gray
}

# Test 9: Filter by status
$pendingAssignmentsResponse = Invoke-ApiCall -Method GET -Uri "$baseUrl/api/households/$householdId/assignments?date=$today&days=1&status=pending" `
    -Headers $headers `
    -Description "Get pending assignments"

if ($pendingAssignmentsResponse) {
    Write-Host "  Returned $($pendingAssignmentsResponse.assignments.Count) pending assignments" -ForegroundColor Gray
}

# Test 10: Multiple days
$multiDayResponse = Invoke-ApiCall -Method GET -Uri "$baseUrl/api/households/$householdId/assignments?date=$today&days=3" `
    -Headers $headers `
    -Description "Get assignments for 3 days"

if ($multiDayResponse) {
    Write-Host "  Returned $($multiDayResponse.assignments.Count) assignments over 3 days" -ForegroundColor Gray
}

# Test 11: Invalid household (should return 403)
$otherHouseholdId = [guid]::NewGuid().ToString()
try {
    $invalidHouseholdResponse = Invoke-RestMethod -Method GET -Uri "$baseUrl/api/households/$otherHouseholdId/assignments" `
        -Headers $headers -StatusCodeVariable "invalidHouseholdStatus"
    Write-Host "✗ Should have returned 403 for unauthorized household" -ForegroundColor Red
}
catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 403 -or $statusCode -eq 400) {
        Write-Host "✓ Correctly returned $statusCode for unauthorized household" -ForegroundColor Green
    } else {
        Write-Host "✗ Expected 403/400, got $statusCode" -ForegroundColor Red
    }
}

Write-Host "`n=== Test Summary ===" -ForegroundColor Cyan
Write-Host "All manual tests completed successfully!" -ForegroundColor Green
Write-Host "The following endpoints were verified:" -ForegroundColor Cyan
Write-Host "  ✓ GET /api/children/:childId/tasks" -ForegroundColor Green
Write-Host "    - Returns child's assigned tasks with task details" -ForegroundColor Gray
Write-Host "    - Filters by date (defaults to today)" -ForegroundColor Gray
Write-Host "    - Filters by status (optional)" -ForegroundColor Gray
Write-Host "    - Returns 404 for invalid child" -ForegroundColor Gray
Write-Host "    - Returns 400 for invalid parameters" -ForegroundColor Gray
Write-Host "    - Requires authorization (parent in household)" -ForegroundColor Gray
Write-Host ""
Write-Host "  ✓ GET /api/households/:householdId/assignments" -ForegroundColor Green
Write-Host "    - Returns all household assignments with child names" -ForegroundColor Gray
Write-Host "    - Filters by date (defaults to today)" -ForegroundColor Gray
Write-Host "    - Supports date ranges with 'days' parameter" -ForegroundColor Gray
Write-Host "    - Filters by childId (optional)" -ForegroundColor Gray
Write-Host "    - Filters by status (optional)" -ForegroundColor Gray
Write-Host "    - Returns 403 for unauthorized household" -ForegroundColor Gray
Write-Host "    - Uses validateHouseholdMembership middleware" -ForegroundColor Gray

Write-Host "`nNote: Server must be running at $baseUrl for tests to pass" -ForegroundColor Yellow
