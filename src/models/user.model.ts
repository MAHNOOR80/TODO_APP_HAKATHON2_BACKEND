/**
 * User Model Interface
 * Represents a user in the system
 */

export interface User {
  id: string;
  email: string;
  password: string; // Hashed password (never exposed in API responses)
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  email: string;
  name?: string;
  password: string; // Will be hashed by Better Auth
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string | null;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

/**
 * Convert User model to API response format
 */
export function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
