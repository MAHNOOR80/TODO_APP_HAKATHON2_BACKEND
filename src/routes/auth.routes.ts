import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { validate } from '../middleware/validate.middleware';
import { signupSchema, signinSchema } from '../validators/auth.validator';
import { successResponse, errorResponse } from '../utils/response.utils';
import { toUserResponse } from '../models/user.model';
import * as userRepository from '../repositories/user.repository';
import { randomUUID } from 'crypto';

/**
 * Authentication Routes
 * Handles user signup, signin, and signout
 */

const router = Router();

// Simple in-memory session store for Phase 2 foundation
// TODO: Replace with Better Auth in production
const sessions = new Map<string, { userId: string; email: string }>();

/**
 * POST /api/v1/auth/signup
 * Create new user account
 */
router.post('/signup', validate(signupSchema), async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    // Check if email already exists
    const exists = await userRepository.emailExists(email);
    if (exists) {
      res.status(400).json(errorResponse('EMAIL_EXISTS', 'Email already registered'));
      return;
    }

    // Hash password with bcrypt
    const saltRounds = 10;
    console.log('🔐 Hashing password...');
    console.log('   Original password length:', password.length);
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log('   Hashed password:', hashedPassword.substring(0, 30) + '...');
    console.log('   Hash length:', hashedPassword.length);
    console.log('   Is bcrypt hash:', hashedPassword.startsWith('$2b$'));

    // Create user
    const user = await userRepository.createUser(email, hashedPassword, name);

    // Create session
    const sessionId = randomUUID();
    sessions.set(sessionId, { userId: user.id, email: user.email });

    // Set session cookie
    res.cookie('todo_session', sessionId, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: process.env['NODE_ENV'] === 'production' ? 'none' : 'lax', // 'none' required for cross-origin in production
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.status(201).json(successResponse(toUserResponse(user)));
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json(errorResponse('SIGNUP_FAILED', 'Failed to create account'));
  }
});

/**
 * POST /api/v1/auth/signin
 * Sign in existing user
 */
router.post('/signin', validate(signinSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await userRepository.findByEmail(email);
    if (!user) {
      res.status(401).json(errorResponse('INVALID_CREDENTIALS', 'Invalid email or password'));
      return;
    }

    // Verify password with bcrypt
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      res.status(401).json(errorResponse('INVALID_CREDENTIALS', 'Invalid email or password'));
      return;
    }

    // Create session
    const sessionId = randomUUID();
    sessions.set(sessionId, { userId: user.id, email: user.email });

    // Set session cookie
    res.cookie('todo_session', sessionId, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: process.env['NODE_ENV'] === 'production' ? 'none' : 'lax', // 'none' required for cross-origin in production
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.status(200).json(successResponse(toUserResponse(user)));
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json(errorResponse('SIGNIN_FAILED', 'Failed to sign in'));
  }
});

/**
 * POST /api/v1/auth/signout
 * Sign out current user
 */
router.post('/signout', (req: Request, res: Response) => {
  try {
    const sessionId = req.cookies?.['todo_session'];

    if (sessionId) {
      // Remove session
      sessions.delete(sessionId);

      // Clear session cookie (must match cookie settings used when setting it)
      res.clearCookie('todo_session', {
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: process.env['NODE_ENV'] === 'production' ? 'none' : 'lax',
      });
    }

    res.status(200).json(successResponse({ message: 'Signed out successfully' }));
  } catch (error) {
    console.error('Signout error:', error);
    res.status(500).json(errorResponse('SIGNOUT_FAILED', 'Failed to sign out'));
  }
});

/**
 * GET /api/v1/auth/me
 * Get current user info (requires authentication)
 */
router.get('/me', (req: Request, res: Response) => {
  try {
    const sessionId = req.cookies?.['todo_session'];

    if (!sessionId) {
      res.status(401).json(errorResponse('UNAUTHORIZED', 'Not authenticated'));
      return;
    }

    const session = sessions.get(sessionId);
    if (!session) {
      res.status(401).json(errorResponse('UNAUTHORIZED', 'Session expired'));
      return;
    }

    // Get user info
    userRepository.findById(session.userId).then((user) => {
      if (!user) {
        res.status(404).json(errorResponse('USER_NOT_FOUND', 'User not found'));
        return;
      }

      res.status(200).json(successResponse(toUserResponse(user)));
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json(errorResponse('GET_USER_FAILED', 'Failed to get user info'));
  }
});

// Export session store for middleware access
export { sessions };
export default router;
