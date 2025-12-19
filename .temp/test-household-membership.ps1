# Test household membership middleware
# Tests: authentication, membership validation, role-based authorization

Write-Host "=== Testing Household Membership Middleware ===" -ForegroundColor Cyan

# Test data
$email1 = "member-test-$([guid]::NewGuid().ToString().Substring(0,8))@example.com"
$email2 = "nonmember-test-$([guid]::NewGuid().ToString().Substring(0,8))@example.com"
$password = "SecurePass123!"
$baseUrl = "http://localhost:3000"

# Register user 1 (will be household admin)
Write-Host "`nRegistering user 1 (admin)..." -ForegroundColor Yellow
$registerResponse1 = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST `
    -ContentType "application/json" `
    -Body (@{ email = $email1; password = $password } | ConvertTo-Json) `
    -StatusCodeVariable "registerStatus1"

if ($registerStatus1 -eq 201) {
    Write-Host "✓ User 1 registered: $($registerResponse1.userId)" -ForegroundColor Green
} else {
    Write-Host "✗ User 1 registration failed" -ForegroundColor Red
    exit 1
}

# Login user 1
Write-Host "`nLogging in user 1..." -ForegroundColor Yellow
$loginResponse1 = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST `
    -ContentType "application/json" `
    -Body (@{ email = $email1; password = $password } | ConvertTo-Json) `
    -StatusCodeVariable "loginStatus1"

if ($loginStatus1 -eq 200) {
    $token1 = $loginResponse1.accessToken
    Write-Host "✓ User 1 logged in" -ForegroundColor Green
} else {
    Write-Host "✗ User 1 login failed" -ForegroundColor Red
    exit 1
}

# Register user 2 (will not be household member)
Write-Host "`nRegistering user 2 (non-member)..." -ForegroundColor Yellow
$registerResponse2 = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST `
    -ContentType "application/json" `
    -Body (@{ email = $email2; password = $password } | ConvertTo-Json) `
    -StatusCodeVariable "registerStatus2"

if ($registerStatus2 -eq 201) {
    Write-Host "✓ User 2 registered: $($registerResponse2.userId)" -ForegroundColor Green
} else {
    Write-Host "✗ User 2 registration failed" -ForegroundColor Red
    exit 1
}

# Login user 2
Write-Host "`nLogging in user 2..." -ForegroundColor Yellow
$loginResponse2 = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST `
    -ContentType "application/json" `
    -Body (@{ email = $email2; password = $password } | ConvertTo-Json) `
    -StatusCodeVariable "loginStatus2"

if ($loginStatus2 -eq 200) {
    $token2 = $loginResponse2.accessToken
    Write-Host "✓ User 2 logged in" -ForegroundColor Green
} else {
    Write-Host "✗ User 2 login failed" -ForegroundColor Red
    exit 1
}

# User 1 creates household
Write-Host "`nUser 1 creating household..." -ForegroundColor Yellow
$headers1 = @{ Authorization = "Bearer $token1" }
$createResponse = Invoke-RestMethod -Uri "$baseUrl/api/households" -Method POST `
    -ContentType "application/json" `
    -Headers $headers1 `
    -Body (@{ name = "Test Family" } | ConvertTo-Json) `
    -StatusCodeVariable "createStatus"

if ($createStatus -eq 201) {
    $householdId = $createResponse.id
    Write-Host "✓ Household created: $householdId" -ForegroundColor Green
    Write-Host "  Role: $($createResponse.role)" -ForegroundColor Gray
} else {
    Write-Host "✗ Household creation failed" -ForegroundColor Red
    exit 1
}

# Test 1: User 1 (admin) can GET household details
Write-Host "`nTest 1: User 1 (admin) GET household details..." -ForegroundColor Yellow
try {
    $getResponse = Invoke-RestMethod -Uri "$baseUrl/api/households/$householdId" -Method GET `
        -Headers $headers1 `
        -StatusCodeVariable "getStatus"
    
    if ($getStatus -eq 200 -and $getResponse.role -eq "admin") {
        Write-Host "✓ Admin can access household details" -ForegroundColor Green
        Write-Host "  Name: $($getResponse.name)" -ForegroundColor Gray
        Write-Host "  Role: $($getResponse.role)" -ForegroundColor Gray
    } else {
        Write-Host "✗ Unexpected response" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Request failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: User 2 (non-member) CANNOT GET household details
Write-Host "`nTest 2: User 2 (non-member) GET household details (should fail)..." -ForegroundColor Yellow
$headers2 = @{ Authorization = "Bearer $token2" }
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/households/$householdId" -Method GET `
        -Headers $headers2 `
        -StatusCodeVariable "status" `
        -SkipHttpErrorCheck
    
    if ($status -eq 403) {
        Write-Host "✓ Non-member correctly denied access (403)" -ForegroundColor Green
        Write-Host "  Error: $($response.message)" -ForegroundColor Gray
    } else {
        Write-Host "✗ Expected 403, got $status" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Request failed unexpectedly: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: User 1 (admin) can UPDATE household
Write-Host "`nTest 3: User 1 (admin) UPDATE household name..." -ForegroundColor Yellow
try {
    $updateResponse = Invoke-RestMethod -Uri "$baseUrl/api/households/$householdId" -Method PUT `
        -ContentType "application/json" `
        -Headers $headers1 `
        -Body (@{ name = "Updated Family Name" } | ConvertTo-Json) `
        -StatusCodeVariable "updateStatus"
    
    if ($updateStatus -eq 200 -and $updateResponse.name -eq "Updated Family Name") {
        Write-Host "✓ Admin can update household" -ForegroundColor Green
        Write-Host "  New name: $($updateResponse.name)" -ForegroundColor Gray
    } else {
        Write-Host "✗ Unexpected response" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Request failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: User 2 (non-member) CANNOT UPDATE household
Write-Host "`nTest 4: User 2 (non-member) UPDATE household (should fail)..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/households/$householdId" -Method PUT `
        -ContentType "application/json" `
        -Headers $headers2 `
        -Body (@{ name = "Hacker Family" } | ConvertTo-Json) `
        -StatusCodeVariable "status" `
        -SkipHttpErrorCheck
    
    if ($status -eq 403) {
        Write-Host "✓ Non-member correctly denied update (403)" -ForegroundColor Green
        Write-Host "  Error: $($response.message)" -ForegroundColor Gray
    } else {
        Write-Host "✗ Expected 403, got $status" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Request failed unexpectedly: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Invalid household ID format
Write-Host "`nTest 5: Invalid household ID format (should fail)..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/households/invalid-id" -Method GET `
        -Headers $headers1 `
        -StatusCodeVariable "status" `
        -SkipHttpErrorCheck
    
    if ($status -eq 400) {
        Write-Host "✓ Invalid UUID correctly rejected (400)" -ForegroundColor Green
        Write-Host "  Error: $($response.message)" -ForegroundColor Gray
    } else {
        Write-Host "✗ Expected 400, got $status" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Request failed unexpectedly: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 6: Non-existent household ID
Write-Host "`nTest 6: Non-existent household ID (should fail)..." -ForegroundColor Yellow
$fakeId = "00000000-0000-0000-0000-000000000000"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/households/$fakeId" -Method GET `
        -Headers $headers1 `
        -StatusCodeVariable "status" `
        -SkipHttpErrorCheck
    
    if ($status -eq 403) {
        Write-Host "✓ Non-existent household correctly rejected (403)" -ForegroundColor Green
        Write-Host "  Error: $($response.message)" -ForegroundColor Gray
    } else {
        Write-Host "✗ Expected 403, got $status" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Request failed unexpectedly: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== All Tests Complete ===" -ForegroundColor Cyan
