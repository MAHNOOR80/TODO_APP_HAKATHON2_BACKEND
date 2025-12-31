/**
 * Database Cleanup Script: Fix Invalid Recurrence Patterns
 * This script finds and fixes tasks with invalid recurrence patterns
 */

import { getPrismaClient } from '../src/config/database.config';

const prisma = getPrismaClient();

const VALID_PATTERNS = ['daily', 'weekly', 'monthly'];

async function fixRecurrencePatterns() {
  console.log('🔍 Scanning for tasks with invalid recurrence patterns...\n');

  try {
    // Find all tasks with non-null recurrence patterns
    const allTasks = await prisma.task.findMany({
      where: {
        recurrencePattern: {
          not: null,
        },
      },
      select: {
        id: true,
        title: true,
        recurrencePattern: true,
        userId: true,
      },
    });

    console.log(`Found ${allTasks.length} tasks with recurrence patterns set\n`);

    // Filter tasks with invalid patterns
    const invalidTasks = allTasks.filter(
      (task) => !VALID_PATTERNS.includes(task.recurrencePattern!)
    );

    if (invalidTasks.length === 0) {
      console.log('✅ All tasks have valid recurrence patterns!');
      return;
    }

    console.log(`⚠️  Found ${invalidTasks.length} tasks with invalid recurrence patterns:\n`);

    invalidTasks.forEach((task) => {
      console.log(
        `  - ID: ${task.id}\n    Title: "${task.title}"\n    Invalid Pattern: "${task.recurrencePattern}"\n`
      );
    });

    // Fix invalid patterns by setting them to null
    console.log('🔧 Fixing invalid recurrence patterns...\n');

    const result = await prisma.task.updateMany({
      where: {
        id: {
          in: invalidTasks.map((t) => t.id),
        },
      },
      data: {
        recurrencePattern: null,
      },
    });

    console.log(`✅ Fixed ${result.count} tasks\n`);
    console.log('Summary:');
    console.log(`  - Total tasks scanned: ${allTasks.length}`);
    console.log(`  - Valid patterns: ${allTasks.length - invalidTasks.length}`);
    console.log(`  - Invalid patterns fixed: ${result.count}`);
  } catch (error) {
    console.error('❌ Error fixing recurrence patterns:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fixRecurrencePatterns()
  .then(() => {
    console.log('\n✨ Database cleanup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Database cleanup failed:', error);
    process.exit(1);
  });
