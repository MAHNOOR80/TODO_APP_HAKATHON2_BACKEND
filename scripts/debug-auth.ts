import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function debugAuth() {
  try {
    const email = process.argv[2];
    const password = process.argv[3];

    if (!email || !password) {
      console.log('Usage: npx ts-node scripts/debug-auth.ts <email> <password>');
      process.exit(1);
    }

    console.log(`\n🔍 Debugging authentication for: ${email}`);
    console.log('='.repeat(60));

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log('❌ User not found in database');
      console.log('\nAll users in database:');
      const allUsers = await prisma.user.findMany({
        select: { email: true, createdAt: true },
      });
      allUsers.forEach(u => {
        console.log(`  - ${u.email} (created: ${u.createdAt})`);
      });
      process.exit(1);
    }

    console.log('✅ User found in database');
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name || 'Not set'}`);
    console.log(`   Created: ${user.createdAt}`);
    console.log(`   Password hash: ${user.password.substring(0, 30)}...`);
    console.log(`   Hash length: ${user.password.length} chars`);
    console.log(`   Is bcrypt hash: ${user.password.startsWith('$2b$') ? 'YES ✅' : 'NO ❌'}`);

    console.log('\n🔐 Testing password comparison...');
    console.log(`   Input password: "${password}"`);
    console.log(`   Input password length: ${password.length} chars`);

    // Test bcrypt comparison
    const isValid = await bcrypt.compare(password, user.password);

    console.log(`\n📊 Result: ${isValid ? '✅ MATCH - Password is correct!' : '❌ NO MATCH - Password is incorrect'}`);

    if (!isValid) {
      console.log('\n🔧 Debugging steps:');
      console.log('   1. Make sure you are using the EXACT password you used during signup');
      console.log('   2. Check for extra spaces or typos');
      console.log('   3. Passwords are case-sensitive');
      console.log('\n💡 To fix: Delete this account and sign up again with a new password');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugAuth();
