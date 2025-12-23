import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

// Extend FastifyRequest type to include user info
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      userId: string;
      email: string;
      role?: string;
    };
  }
}

interface AccessTokenPayload {
  userId: string;
  email: string;
  role?: string;
  type: string;
  iat: number;
  exp: number;
}

export async function authenticateUser(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({
        error: 'Missing or invalid authorization header',
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Verify token with JWT_SECRET
    const decoded = jwt.verify(token, JWT_SECRET) as AccessTokenPayload;

    // Verify it's an access token (not refresh token)
    if (decoded.type !== 'access') {
      request.log.warn('Attempted to use non-access token for authentication');
      return reply.code(401).send({
        error: 'Invalid token type',
      });
    }

    // Attach user info to request
    request.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    // Middleware successful - continue to route handler
  } catch (error: unknown) {
    // Handle JWT-specific errors
    if (error instanceof jwt.TokenExpiredError) {
      return reply.code(401).send({
        error: 'Token expired',
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      request.log.warn({ error: (error as Error).message }, 'Invalid token');
      return reply.code(401).send({
        error: 'Invalid token',
      });
    }

    // Log error but don't expose internal details
    request.log.error(error, 'Authentication error');
    return reply.code(500).send({
      error: 'Authentication failed',
    });
  }
}
