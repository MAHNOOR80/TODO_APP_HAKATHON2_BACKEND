import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`\n📋 Users in database (${users.length} total):`);
    console.log('='.repeat(70));

    if (users.length === 0) {
      console.log('❌ No users found. Please sign up first.');
    } else {
      users.forEach((user, index) => {
        console.log(`\n${index + 1}. Email: ${user.email}`);
        console.log(`   Name: ${user.name || 'Not set'}`);
        console.log(`   Created: ${user.createdAt}`);
        console.log(`   Password hash: ${user.password.substring(0, 30)}...`);
        console.log(`   Hash type: ${user.password.startsWith('$2b$') ? 'bcrypt ✅' : 'OLD FORMAT ❌'}`);
      });
    }

    console.log('\n' + '='.repeat(70));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listUsers();
