import { Request, Response, NextFunction } from 'express';
import { sessions } from '../routes/auth.routes';

/**
 * Authentication Middleware
 * Verifies user session and attaches user ID to request
 */

// Extend Express Request to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/**
 * Require authentication middleware
 * Returns 401 if user not authenticated
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const sessionId = req.cookies?.todo_session;

  if (!sessionId) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
    return;
  }

  // Verify session exists
  const session = sessions.get(sessionId);
  if (!session) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Session expired or invalid',
      },
    });
    return;
  }

  // Attach userId to request
  req.userId = session.userId;

  next();
}

/**
 * Optional authentication middleware
 * Attaches userId if authenticated, but allows request to proceed regardless
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const sessionId = req.cookies?.todo_session;

  if (sessionId) {
    const session = sessions.get(sessionId);
    if (session) {
      req.userId = session.userId;
    }
  }

  next();
}
