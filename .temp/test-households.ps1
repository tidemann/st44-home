# Test script for household CRUD endpoints

$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:3000"

Write-Host "=== Testing Household CRUD Endpoints ===" -ForegroundColor Cyan

# 1. Register a test user
Write-Host "`n1. Registering test user..." -ForegroundColor Yellow
$email = "test-household-$(Get-Date -Format 'yyyyMMddHHmmss')@example.com"
$password = "Test1234!"

$registerResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method Post -Body (@{
    email = $email
    password = $password
} | ConvertTo-Json) -ContentType "application/json"

Write-Host "✓ User registered: $($registerResponse.email)" -ForegroundColor Green

# 2. Login to get token
Write-Host "`n2. Logging in..." -ForegroundColor Yellow
$loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body (@{
    email = $email
    password = $password
} | ConvertTo-Json) -ContentType "application/json"

$token = $loginResponse.accessToken
Write-Host "✓ Logged in, token obtained" -ForegroundColor Green

# 3. Create household
Write-Host "`n3. Creating household..." -ForegroundColor Yellow
$createResponse = Invoke-RestMethod -Uri "$baseUrl/api/households" -Method Post -Headers @{
    Authorization = "Bearer $token"
} -Body (@{
    name = "Test Family $(Get-Date -Format 'HHmmss')"
} | ConvertTo-Json) -ContentType "application/json"

$householdId = $createResponse.id
Write-Host "✓ Household created: $($createResponse.name) (ID: $householdId)" -ForegroundColor Green

# 4. Get household details
Write-Host "`n4. Getting household details..." -ForegroundColor Yellow
$getResponse = Invoke-RestMethod -Uri "$baseUrl/api/households/$householdId" -Method Get -Headers @{
    Authorization = "Bearer $token"
}
Write-Host "✓ Household details: $($getResponse.name)" -ForegroundColor Green

# 5. Update household
Write-Host "`n5. Updating household name..." -ForegroundColor Yellow
$updateResponse = Invoke-RestMethod -Uri "$baseUrl/api/households/$householdId" -Method Put -Headers @{
    Authorization = "Bearer $token"
} -Body (@{
    name = "Updated Family Name"
} | ConvertTo-Json) -ContentType "application/json"
Write-Host "✓ Household updated: $($updateResponse.name)" -ForegroundColor Green

# 6. List households
Write-Host "`n6. Listing all households..." -ForegroundColor Yellow
$listResponse = Invoke-RestMethod -Uri "$baseUrl/api/households" -Method Get -Headers @{
    Authorization = "Bearer $token"
}
Write-Host "✓ Found $($listResponse.households.Count) household(s)" -ForegroundColor Green
$listResponse.households | ForEach-Object {
    Write-Host "  - $($_.name) (Role: $($_.role))"
}

Write-Host "`n=== All tests passed! ===" -ForegroundColor Green
