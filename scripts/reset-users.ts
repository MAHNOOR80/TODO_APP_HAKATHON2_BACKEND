import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetUsers() {
  try {
    // Get all users to see their password format
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        password: true,
        createdAt: true,
      },
    });

    console.log('Current users:');
    users.forEach(user => {
      console.log(`- Email: ${user.email}`);
      console.log(`  Password format: ${user.password.substring(0, 20)}...`);
      console.log(`  Created: ${user.createdAt}`);
    });

    // Delete all users with non-bcrypt passwords (bcrypt hashes start with $2b$ and are 60 chars)
    const usersToDelete = users.filter(u => !u.password.startsWith('$2b$'));

    if (usersToDelete.length > 0) {
      console.log(`\nDeleting ${usersToDelete.length} users with old password format...`);
      const result = await prisma.user.deleteMany({
        where: {
          id: {
            in: usersToDelete.map(u => u.id),
          },
        },
      });
      console.log(`✅ Deleted ${result.count} users. Please sign up again with your email and password.`);
    } else {
      console.log('\n✅ All users have bcrypt passwords. No cleanup needed.');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetUsers();
