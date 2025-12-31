import { getPrismaClient } from '../config/database.config';
import { Task, CreateTaskInput, UpdateTaskInput } from '../models/task.model';
import { Priority } from '../models/types';

/**
 * Task Repository
 * Data access layer for Task entity with user isolation
 */

const prisma = getPrismaClient();

/**
 * Create a new task for a user
 */
export async function create(userId: string, input: CreateTaskInput): Promise<Task> {
  // Normalize recurrence pattern: only allow valid values, convert empty/invalid to null
  let normalizedRecurrence: string | null = null;
  if (input.recurrencePattern &&
      (input.recurrencePattern === 'daily' ||
       input.recurrencePattern === 'weekly' ||
       input.recurrencePattern === 'monthly')) {
    normalizedRecurrence = input.recurrencePattern;
  }

  const task = await prisma.task.create({
    data: {
      userId,
      title: input.title,
      description: input.description || null,
      priority: (input.priority as Priority) || Priority.MEDIUM,
      tags: input.tags || [],
      category: input.category || null,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      recurrencePattern: normalizedRecurrence,
      reminderEnabled: input.reminderEnabled || false,
      reminderOffsetMinutes: input.reminderOffsetMinutes || null,
    },
  });

  return task as Task;
}

/**
 * Find all tasks for a user with optional filters
 */
export async function findAll(
  userId: string,
  filters?: {
    search?: string;
    completed?: boolean;
    priority?: string;
    tag?: string;
    sort?: string;
    order?: string;
  }
): Promise<Task[]> {
  const where: any = { userId };

  // Apply filters
  if (filters?.completed !== undefined) {
    where.completed = filters.completed;
  }

  if (filters?.priority) {
    where.priority = filters.priority;
  }

  if (filters?.tag) {
    where.tags = { has: filters.tag };
  }

  if (filters?.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  // Determine sort order
  const orderBy: any = {};
  if (filters?.sort) {
    const sortField = filters.sort === 'due_date' ? 'dueDate' : filters.sort;
    orderBy[sortField] = filters?.order === 'desc' ? 'desc' : 'asc';
  } else {
    orderBy.createdAt = 'desc'; // Default: newest first
  }

  const tasks = await prisma.task.findMany({
    where,
    orderBy,
  });

  return tasks as Task[];
}

/**
 * Find task by ID with user ownership check
 */
export async function findById(taskId: string, userId: string): Promise<Task | null> {
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      userId, // Enforce user isolation
    },
  });

  return task as Task | null;
}

/**
 * Update task with user ownership check
 */
export async function update(
  taskId: string,
  userId: string,
  input: UpdateTaskInput
): Promise<Task | null> {
  // First check ownership
  const existing = await findById(taskId, userId);
  if (!existing) {
    return null;
  }

  // Normalize recurrence pattern if provided
  let normalizedRecurrence: string | null | undefined = undefined;
  if (input.recurrencePattern !== undefined) {
    if (input.recurrencePattern &&
        (input.recurrencePattern === 'daily' ||
         input.recurrencePattern === 'weekly' ||
         input.recurrencePattern === 'monthly')) {
      normalizedRecurrence = input.recurrencePattern;
    } else {
      normalizedRecurrence = null;
    }
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.priority !== undefined && { priority: input.priority as Priority }),
      ...(input.tags !== undefined && { tags: input.tags }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.dueDate !== undefined && {
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
      }),
      ...(normalizedRecurrence !== undefined && {
        recurrencePattern: normalizedRecurrence,
      }),
      ...(input.reminderEnabled !== undefined && {
        reminderEnabled: input.reminderEnabled,
      }),
      ...(input.reminderOffsetMinutes !== undefined && {
        reminderOffsetMinutes: input.reminderOffsetMinutes,
      }),
    },
  });

  return task as Task;
}

/**
 * Delete task with user ownership check
 */
export async function deleteTask(taskId: string, userId: string): Promise<boolean> {
  // First check ownership
  const existing = await findById(taskId, userId);
  if (!existing) {
    return false;
  }

  await prisma.task.delete({
    where: { id: taskId },
  });

  return true;
}

/**
 * Mark task as complete
 */
export async function markComplete(taskId: string, userId: string): Promise<Task | null> {
  const existing = await findById(taskId, userId);
  if (!existing) {
    return null;
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: { completed: true },
  });

  return task as Task;
}

/**
 * Mark task as incomplete
 */
export async function markIncomplete(taskId: string, userId: string): Promise<Task | null> {
  const existing = await findById(taskId, userId);
  if (!existing) {
    return null;
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: { completed: false },
  });

  return task as Task;
}
