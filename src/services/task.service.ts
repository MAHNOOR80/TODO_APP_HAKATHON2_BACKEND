import * as taskRepository from '../repositories/task.repository';
import { Task, CreateTaskInput, UpdateTaskInput } from '../models/task.model';
import {
  calculateNextDueDate,
  shouldCreateRecurringInstance,
  RecurrencePattern,
} from './recurrence.service';

/**
 * Task Service
 * Business logic layer for task operations
 */

/**
 * Create a new task
 */
export async function createTask(userId: string, input: CreateTaskInput): Promise<Task> {
  return taskRepository.create(userId, input);
}

/**
 * Get all tasks for a user with optional filters
 */
export async function getTasks(
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
  return taskRepository.findAll(userId, filters);
}

/**
 * Get task by ID
 */
export async function getTaskById(taskId: string, userId: string): Promise<Task | null> {
  return taskRepository.findById(taskId, userId);
}

/**
 * Update task
 */
export async function updateTask(
  taskId: string,
  userId: string,
  input: UpdateTaskInput
): Promise<Task | null> {
  return taskRepository.update(taskId, userId, input);
}

/**
 * Delete task
 */
export async function deleteTask(taskId: string, userId: string): Promise<boolean> {
  return taskRepository.deleteTask(taskId, userId);
}

/**
 * Toggle task completion status
 * If task is recurring and has a due date, creates a new instance with next due date
 */
export async function markComplete(taskId: string, userId: string): Promise<Task | null> {
  // First, get the task to check if it's recurring
  const task = await taskRepository.findById(taskId, userId);

  if (!task) {
    console.log(`[markComplete] Task not found: ${taskId}`);
    return null;
  }

  console.log(`[markComplete] Marking task as complete: ${taskId}, title: "${task.title}", recurrence: ${task.recurrencePattern}, dueDate: ${task.dueDate}`);

  // Mark the current task as complete
  const completedTask = await taskRepository.markComplete(taskId, userId);

  if (!completedTask) {
    console.log(`[markComplete] Failed to mark task as complete: ${taskId}`);
    return null;
  }

  console.log(`[markComplete] Task marked as complete successfully: ${taskId}, completed: ${completedTask.completed}`);

  // Check if this is a recurring task that should create a new instance
  const shouldRecur = shouldCreateRecurringInstance(task.recurrencePattern, task.dueDate);
  console.log(`[markComplete] Should create recurring instance: ${shouldRecur}`);

  if (shouldRecur) {
    // Calculate the next due date
    const nextDueDate = calculateNextDueDate(
      task.dueDate!,
      task.recurrencePattern as RecurrencePattern
    );

    console.log(`[markComplete] Creating new recurring instance with due date: ${nextDueDate}`);

    // Create a new task instance with the same properties but new due date
    const newTask = await taskRepository.create(userId, {
      title: task.title,
      description: task.description || undefined,
      priority: task.priority,
      tags: task.tags,
      category: task.category || undefined,
      dueDate: nextDueDate,
      recurrencePattern: task.recurrencePattern,
      reminderEnabled: task.reminderEnabled,
      reminderOffsetMinutes: task.reminderOffsetMinutes || undefined,
    });

    console.log(`[markComplete] Created new recurring instance: ${newTask.id}, completed: ${newTask.completed}`);
  }

  // IMPORTANT: Return the completed task, not the new recurring instance
  return completedTask;
}

/**
 * Mark task as incomplete
 */
export async function markIncomplete(taskId: string, userId: string): Promise<Task | null> {
  return taskRepository.markIncomplete(taskId, userId);
}
