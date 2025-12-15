/**
 * Wait for E2E test services to become healthy before running tests
 * Polls backend and frontend health endpoints with exponential backoff
 *
 * Environment variables:
 * - E2E_BACKEND_URL: Backend URL (default: http://localhost:3001)
 * - E2E_FRONTEND_URL: Frontend URL (default: http://localhost:4201)
 * - E2E_TIMEOUT: Maximum wait time in seconds (default: 60)
 * - E2E_POLL_INTERVAL: Initial poll interval in ms (default: 1000)
 */

const E2E_BACKEND_URL = process.env.E2E_BACKEND_URL || 'http://localhost:3001';
const E2E_FRONTEND_URL = process.env.E2E_FRONTEND_URL || 'http://localhost:4201';
const E2E_TIMEOUT = parseInt(process.env.E2E_TIMEOUT || '60', 10) * 1000; // Convert to ms
const E2E_POLL_INTERVAL = parseInt(process.env.E2E_POLL_INTERVAL || '1000', 10);

/**
 * Check if a service is healthy
 * @param {string} url - Service URL to check
 * @param {string} name - Service name for logging
 * @returns {Promise<boolean>} - True if healthy, false otherwise
 */
async function checkService(url, name) {
  try {
    const response = await fetch(url);
    if (response.ok) {
      console.log(`✅ ${name} is healthy (${response.status})`);
      return true;
    } else {
      console.log(`⏳ ${name} returned ${response.status}, waiting...`);
      return false;
    }
  } catch (error) {
    console.log(`⏳ ${name} not ready yet: ${error.message}`);
    return false;
  }
}

/**
 * Wait for backend health endpoint
 * @returns {Promise<boolean>}
 */
async function waitForBackend() {
  return checkService(`${E2E_BACKEND_URL}/health`, 'Backend');
}

/**
 * Wait for frontend to serve content
 * @returns {Promise<boolean>}
 */
async function waitForFrontend() {
  return checkService(E2E_FRONTEND_URL, 'Frontend');
}

/**
 * Wait for all services with exponential backoff
 */
async function waitForAllServices() {
  console.log('🔍 Waiting for E2E test services to become healthy...');
  console.log(`   Backend: ${E2E_BACKEND_URL}`);
  console.log(`   Frontend: ${E2E_FRONTEND_URL}`);
  console.log(`   Timeout: ${E2E_TIMEOUT / 1000}s\n`);

  const startTime = Date.now();
  let attempt = 0;
  let backendReady = false;
  let frontendReady = false;

  while (Date.now() - startTime < E2E_TIMEOUT) {
    attempt++;
    console.log(`Attempt ${attempt}:`);

    // Check services in parallel
    const [backendStatus, frontendStatus] = await Promise.all([
      backendReady ? Promise.resolve(true) : waitForBackend(),
      frontendReady ? Promise.resolve(true) : waitForFrontend(),
    ]);

    backendReady = backendStatus;
    frontendReady = frontendStatus;

    // If all services ready, we're done
    if (backendReady && frontendReady) {
      console.log('\n🎉 All services are healthy and ready for testing!');
      console.log(`   Total wait time: ${Math.round((Date.now() - startTime) / 1000)}s\n`);
      return true;
    }

    // Calculate next wait interval with exponential backoff (max 5s)
    const waitTime = Math.min(E2E_POLL_INTERVAL * Math.pow(1.5, attempt - 1), 5000);
    console.log(`   Waiting ${Math.round(waitTime / 1000)}s before next check...\n`);
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  // Timeout reached
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.error(`\n❌ Timeout waiting for services after ${elapsed}s`);
  console.error('   Services not ready:');
  if (!backendReady) console.error(`   - Backend: ${E2E_BACKEND_URL}/health`);
  if (!frontendReady) console.error(`   - Frontend: ${E2E_FRONTEND_URL}`);
  console.error('\nTroubleshooting:');
  console.error('   1. Check if Docker services are running:');
  console.error('      docker-compose -f ../../docker-compose.e2e-local.yml ps');
  console.error('   2. Check service logs:');
  console.error('      npm run test:e2e:logs');
  console.error('   3. Manually verify service accessibility:');
  console.error(`      curl ${E2E_BACKEND_URL}/health`);
  console.error(`      curl ${E2E_FRONTEND_URL}`);
  console.error('   4. Restart services:');
  console.error('      npm run test:e2e:stop && npm run test:e2e:start\n');

  return false;
}

// Main execution
waitForAllServices()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
