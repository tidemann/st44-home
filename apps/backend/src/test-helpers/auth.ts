import type { FastifyInstance } from 'fastify';

/**
 * Register a user and login to get tokens
 * The register endpoint doesn't return tokens, so we must login after
 */
export async function registerAndLogin(
  app: FastifyInstance,
  email: string,
  password: string,
): Promise<{ accessToken: string; refreshToken: string; userId: string }> {
  // Register
  await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password },
  });

  // Login to get tokens
  const loginResponse = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email, password },
  });

  const loginData = JSON.parse(loginResponse.body);
  return {
    accessToken: loginData.accessToken,
    refreshToken: loginData.refreshToken,
    userId: loginData.userId,
  };
}
