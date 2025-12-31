import { z } from 'zod';

/**
 * Authentication Input Validation Schemas
 * Uses Zod for type-safe validation
 */

// Signup request validation
export const signupSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .min(1, 'Email is required')
    .max(255, 'Email must be less than 255 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    ),
  name: z
    .string()
    .max(255, 'Name must be less than 255 characters')
    .optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;

// Signin request validation
export const signinSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .min(1, 'Email is required'),
  password: z
    .string()
    .min(1, 'Password is required'),
});

export type SigninInput = z.infer<typeof signinSchema>;
