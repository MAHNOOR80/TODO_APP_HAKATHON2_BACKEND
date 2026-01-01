import { PrismaClient } from '@prisma/client';

// Singleton Prisma Client instance
let prisma: PrismaClient;

/**
 * Get Prisma Client instance
 * Uses singleton pattern to prevent multiple instances
 * Configured for Neon Serverless PostgreSQL connection pooling
 */
export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env['NODE_ENV'] === 'development' ? ['query', 'error', 'warn'] : ['error'],
      datasources: {
        db: {
          url: process.env['DATABASE_URL'],
        },
      },
    });

    // Handle connection errors gracefully for Neon serverless
    prisma.$connect().catch((err) => {
      console.error('Failed to connect to database:', err);
    });
  }
  return prisma;
}

/**
 * Disconnect Prisma Client
 * Call this on application shutdown
 */
export async function disconnectDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
  }
}

/**
 * Test database connection
 * Returns true if connection successful, false otherwise
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const client = getPrismaClient();
    await client.$connect();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}
