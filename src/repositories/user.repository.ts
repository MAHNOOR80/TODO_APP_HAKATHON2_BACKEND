import { getPrismaClient } from '../config/database.config';
import { User } from '../models/user.model';

/**
 * User Repository
 * Data access layer for User entity
 */

const prisma = getPrismaClient();

/**
 * Create a new user in the database
 * @param email - User email (must be unique)
 * @param hashedPassword - Password hash (bcrypt hashed)
 * @param name - Optional user name
 */
export async function createUser(
  email: string,
  hashedPassword: string,
  name?: string
): Promise<User> {
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: name || null,
    },
  });

  return user;
}

/**
 * Find user by email
 * @param email - User email to search for
 */
export async function findByEmail(email: string): Promise<User | null> {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  return user;
}

/**
 * Find user by ID
 * @param id - User UUID
 */
export async function findById(id: string): Promise<User | null> {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  return user;
}

/**
 * Check if email already exists
 * @param email - Email to check
 */
export async function emailExists(email: string): Promise<boolean> {
  const user = await findByEmail(email);
  return user !== null;
}
