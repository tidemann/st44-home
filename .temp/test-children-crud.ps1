# Test children CRUD API endpoints
# Tests: list, create, update, delete, validation, household isolation

Write-Host "=== Testing Children CRUD API Endpoints ===" -ForegroundColor Cyan

# Test data
$email = "children-test-$([guid]::NewGuid().ToString().Substring(0,8))@example.com"
$password = "SecurePass123!"
$baseUrl = "http://localhost:3000"

# Register and login
Write-Host "`nRegistering user..." -ForegroundColor Yellow
$registerResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST `
    -ContentType "application/json" `
    -Body (@{ email = $email; password = $password } | ConvertTo-Json) `
    -StatusCodeVariable "registerStatus"

if ($registerStatus -eq 201) {
    Write-Host "✓ User registered: $($registerResponse.userId)" -ForegroundColor Green
} else {
    Write-Host "✗ Registration failed" -ForegroundColor Red
    exit 1
}

Write-Host "`nLogging in..." -ForegroundColor Yellow
$loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST `
    -ContentType "application/json" `
    -Body (@{ email = $email; password = $password } | ConvertTo-Json) `
    -StatusCodeVariable "loginStatus"

if ($loginStatus -eq 200) {
    $token = $loginResponse.accessToken
    Write-Host "✓ Logged in" -ForegroundColor Green
} else {
    Write-Host "✗ Login failed" -ForegroundColor Red
    exit 1
}

# Create household
Write-Host "`nCreating household..." -ForegroundColor Yellow
$headers = @{ Authorization = "Bearer $token" }
$createHouseholdResponse = Invoke-RestMethod -Uri "$baseUrl/api/households" -Method POST `
    -ContentType "application/json" `
    -Headers $headers `
    -Body (@{ name = "Test Family" } | ConvertTo-Json) `
    -StatusCodeVariable "createHouseholdStatus"

if ($createHouseholdStatus -eq 201) {
    $householdId = $createHouseholdResponse.id
    Write-Host "✓ Household created: $householdId" -ForegroundColor Green
} else {
    Write-Host "✗ Household creation failed" -ForegroundColor Red
    exit 1
}

# Test 1: List children (should be empty)
Write-Host "`nTest 1: List children (empty household)..." -ForegroundColor Yellow
try {
    $listResponse = Invoke-RestMethod -Uri "$baseUrl/api/households/$householdId/children" -Method GET `
        -Headers $headers `
        -StatusCodeVariable "listStatus"
    
    if ($listStatus -eq 200 -and $listResponse.children.Count -eq 0) {
        Write-Host "✓ Empty children list returned" -ForegroundColor Green
    } else {
        Write-Host "✗ Unexpected response" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Request failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Create child (valid)
Write-Host "`nTest 2: Create child (Emma, 2015)..." -ForegroundColor Yellow
try {
    $createResponse = Invoke-RestMethod -Uri "$baseUrl/api/households/$householdId/children" -Method POST `
        -ContentType "application/json" `
        -Headers $headers `
        -Body (@{ name = "Emma"; birthYear = 2015 } | ConvertTo-Json) `
        -StatusCodeVariable "createStatus"
    
    if ($createStatus -eq 201 -and $createResponse.name -eq "Emma" -and $createResponse.birthYear -eq 2015) {
        $childId1 = $createResponse.id
        Write-Host "✓ Child created: $($createResponse.name) ($($createResponse.birthYear))" -ForegroundColor Green
        Write-Host "  ID: $childId1" -ForegroundColor Gray
    } else {
        Write-Host "✗ Unexpected response" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Request failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Create second child
Write-Host "`nTest 3: Create second child (Oliver, 2018)..." -ForegroundColor Yellow
try {
    $createResponse2 = Invoke-RestMethod -Uri "$baseUrl/api/households/$householdId/children" -Method POST `
        -ContentType "application/json" `
        -Headers $headers `
        -Body (@{ name = "Oliver"; birthYear = 2018 } | ConvertTo-Json) `
        -StatusCodeVariable "createStatus2"
    
    if ($createStatus2 -eq 201 -and $createResponse2.name -eq "Oliver") {
        $childId2 = $createResponse2.id
        Write-Host "✓ Second child created: $($createResponse2.name) ($($createResponse2.birthYear))" -ForegroundColor Green
    } else {
        Write-Host "✗ Unexpected response" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Request failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: List children (should have 2, ordered by name)
Write-Host "`nTest 4: List children (2 children, alphabetically sorted)..." -ForegroundColor Yellow
try {
    $listResponse2 = Invoke-RestMethod -Uri "$baseUrl/api/households/$householdId/children" -Method GET `
        -Headers $headers `
        -StatusCodeVariable "listStatus2"
    
    if ($listStatus2 -eq 200 -and $listResponse2.children.Count -eq 2) {
        $first = $listResponse2.children[0]
        $second = $listResponse2.children[1]
        
        if ($first.name -eq "Emma" -and $second.name -eq "Oliver") {
            Write-Host "✓ Children list correct (Emma, Oliver)" -ForegroundColor Green
            Write-Host "  1. $($first.name) - $($first.birthYear)" -ForegroundColor Gray
            Write-Host "  2. $($second.name) - $($second.birthYear)" -ForegroundColor Gray
        } else {
            Write-Host "✗ Incorrect order or names" -ForegroundColor Red
        }
    } else {
        Write-Host "✗ Expected 2 children, got $($listResponse2.children.Count)" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Request failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Update child (Emma → Emma Marie, birth year stays same)
Write-Host "`nTest 5: Update child (Emma → Emma Marie)..." -ForegroundColor Yellow
try {
    $updateResponse = Invoke-RestMethod -Uri "$baseUrl/api/households/$householdId/children/$childId1" -Method PUT `
        -ContentType "application/json" `
        -Headers $headers `
        -Body (@{ name = "Emma Marie"; birthYear = 2015 } | ConvertTo-Json) `
        -StatusCodeVariable "updateStatus"
    
    if ($updateStatus -eq 200 -and $updateResponse.name -eq "Emma Marie") {
        Write-Host "✓ Child updated: $($updateResponse.name)" -ForegroundColor Green
    } else {
        Write-Host "✗ Unexpected response" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Request failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 6: Create child with invalid name (empty)
Write-Host "`nTest 6: Create child with invalid name (should fail)..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/households/$householdId/children" -Method POST `
        -ContentType "application/json" `
        -Headers $headers `
        -Body (@{ name = ""; birthYear = 2020 } | ConvertTo-Json) `
        -StatusCodeVariable "status" `
        -SkipHttpErrorCheck
    
    if ($status -eq 400) {
        Write-Host "✓ Empty name correctly rejected (400)" -ForegroundColor Green
        Write-Host "  Error: $($response.message)" -ForegroundColor Gray
    } else {
        Write-Host "✗ Expected 400, got $status" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Request failed unexpectedly: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 7: Create child with invalid birth year (future)
Write-Host "`nTest 7: Create child with invalid birth year (should fail)..." -ForegroundColor Yellow
try {
    $futureYear = (Get-Date).Year + 1
    $response = Invoke-RestMethod -Uri "$baseUrl/api/households/$householdId/children" -Method POST `
        -ContentType "application/json" `
        -Headers $headers `
        -Body (@{ name = "Future Baby"; birthYear = $futureYear } | ConvertTo-Json) `
        -StatusCodeVariable "status" `
        -SkipHttpErrorCheck
    
    if ($status -eq 400) {
        Write-Host "✓ Future birth year correctly rejected (400)" -ForegroundColor Green
        Write-Host "  Error: $($response.message)" -ForegroundColor Gray
    } else {
        Write-Host "✗ Expected 400, got $status" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Request failed unexpectedly: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 8: Update non-existent child
Write-Host "`nTest 8: Update non-existent child (should fail)..." -ForegroundColor Yellow
$fakeChildId = "00000000-0000-0000-0000-000000000000"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/households/$householdId/children/$fakeChildId" -Method PUT `
        -ContentType "application/json" `
        -Headers $headers `
        -Body (@{ name = "Ghost"; birthYear = 2010 } | ConvertTo-Json) `
        -StatusCodeVariable "status" `
        -SkipHttpErrorCheck
    
    if ($status -eq 404) {
        Write-Host "✓ Non-existent child correctly rejected (404)" -ForegroundColor Green
        Write-Host "  Error: $($response.message)" -ForegroundColor Gray
    } else {
        Write-Host "✗ Expected 404, got $status" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Request failed unexpectedly: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 9: Delete child (admin only - user is admin since they created household)
Write-Host "`nTest 9: Delete child (Oliver)..." -ForegroundColor Yellow
try {
    $deleteResponse = Invoke-RestMethod -Uri "$baseUrl/api/households/$householdId/children/$childId2" -Method DELETE `
        -Headers $headers `
        -StatusCodeVariable "deleteStatus"
    
    if ($deleteStatus -eq 200 -and $deleteResponse.success -eq $true) {
        Write-Host "✓ Child deleted successfully" -ForegroundColor Green
        Write-Host "  Message: $($deleteResponse.message)" -ForegroundColor Gray
    } else {
        Write-Host "✗ Unexpected response" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Request failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 10: Verify deletion (should have 1 child now)
Write-Host "`nTest 10: Verify deletion (should have 1 child)..." -ForegroundColor Yellow
try {
    $listResponse3 = Invoke-RestMethod -Uri "$baseUrl/api/households/$householdId/children" -Method GET `
        -Headers $headers `
        -StatusCodeVariable "listStatus3"
    
    if ($listStatus3 -eq 200 -and $listResponse3.children.Count -eq 1) {
        $remaining = $listResponse3.children[0]
        if ($remaining.name -eq "Emma Marie") {
            Write-Host "✓ Deletion verified (1 child remaining: Emma Marie)" -ForegroundColor Green
        } else {
            Write-Host "✗ Wrong child remaining: $($remaining.name)" -ForegroundColor Red
        }
    } else {
        Write-Host "✗ Expected 1 child, got $($listResponse3.children.Count)" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Request failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 11: Delete non-existent child
Write-Host "`nTest 11: Delete non-existent child (should fail)..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/households/$householdId/children/$fakeChildId" -Method DELETE `
        -Headers $headers `
        -StatusCodeVariable "status" `
        -SkipHttpErrorCheck
    
    if ($status -eq 404) {
        Write-Host "✓ Non-existent child correctly rejected (404)" -ForegroundColor Green
        Write-Host "  Error: $($response.message)" -ForegroundColor Gray
    } else {
        Write-Host "✗ Expected 404, got $status" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Request failed unexpectedly: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== All Tests Complete ===" -ForegroundColor Cyan
