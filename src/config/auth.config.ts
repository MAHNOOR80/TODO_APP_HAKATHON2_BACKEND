/**
 * Better Auth Configuration
 * Session-based authentication with httpOnly cookies
 */

export interface AuthConfig {
  secret: string;
  sessionMaxAge: number;
  cookieName: string;
  secureCookie: boolean;
}

export function getAuthConfig(): AuthConfig {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET environment variable is required');
  }

  return {
    secret,
    sessionMaxAge: parseInt(process.env.SESSION_MAX_AGE || '2592000', 10), // 30 days default
    cookieName: 'todo_session',
    secureCookie: process.env.NODE_ENV === 'production',
  };
}

export const authConfig = getAuthConfig();
