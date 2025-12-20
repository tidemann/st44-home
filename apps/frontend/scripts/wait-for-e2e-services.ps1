# Wait for E2E services to be fully ready
# This script waits for both backend and frontend to be serving requests

Write-Host "Waiting for E2E services to be ready..." -ForegroundColor Cyan

# Wait for backend
Write-Host "Checking backend health..." -ForegroundColor Yellow
$backendReady = $false
$maxAttempts = 30
$attempt = 0

while (-not $backendReady -and $attempt -lt $maxAttempts) {
    $attempt++
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            $backendReady = $true
            Write-Host "âœ" Backend is ready" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "  Attempt $attempt/$maxAttempts - Backend not ready yet..." -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
}

if (-not $backendReady) {
    Write-Host "âœ— Backend failed to start after $maxAttempts attempts" -ForegroundColor Red
    exit 1
}

# Wait for frontend (check that it returns HTML, not just connection)
Write-Host "Checking frontend..." -ForegroundColor Yellow
$frontendReady = $false
$attempt = 0

while (-not $frontendReady -and $attempt -lt $maxAttempts) {
    $attempt++
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:4201" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        if ($response.StatusCode -eq 200 -and $response.Content -match "<app-root>") {
            $frontendReady = $true
            Write-Host "âœ" Frontend is ready" -ForegroundColor Green
        }
        else {
            Write-Host "  Attempt $attempt/$maxAttempts - Frontend returned but no app-root found..." -ForegroundColor Gray
            Start-Sleep -Seconds 2
        }
    }
    catch {
        Write-Host "  Attempt $attempt/$maxAttempts - Frontend not ready yet..." -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
}

if (-not $frontendReady) {
    Write-Host "âœ— Frontend failed to start after $maxAttempts attempts" -ForegroundColor Red
    exit 1
}

Write-Host "`nâœ" All E2E services are ready!" -ForegroundColor Green
Write-Host "Backend: http://localhost:3001" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:4201" -ForegroundColor Cyan
