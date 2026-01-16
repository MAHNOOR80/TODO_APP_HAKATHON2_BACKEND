import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createTaskSchema, updateTaskSchema } from '../validators/task.validator';
import { successResponse, errorResponse } from '../utils/response.utils';
import { toTaskResponse } from '../models/task.model';
import * as taskService from '../services/task.service';
import { Task } from '../models/task.model';

/**
 * Task Routes
 * All task CRUD operations (requires authentication)
 */

const router = Router();

// All task routes require authentication
router.use(requireAuth);

// --- HELPER: Find task by title ---
async function findTaskByTitle(userId: string, title: string): Promise<Task | null> {
  // We search for tasks with a flexible search term
  const allTasks = await taskService.getTasks(userId, { search: title });
  // Then we look for an exact (case-insensitive) match to be safe
  return allTasks.find(t => t.title.toLowerCase() === title.toLowerCase()) || null;
}

// --- STANDARD GET / POST ---

/**
 * GET /api/v1/tasks
 * Get all user tasks with optional filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const filters = {
      search: req.query.search as string | undefined,
      completed: req.query.completed === 'true' ? true : req.query.completed === 'false' ? false : undefined,
      priority: req.query.priority as string | undefined,
      tag: req.query.tag as string | undefined,
      sort: req.query.sort as string | undefined,
      order: req.query.order as string | undefined,
    };

    const tasks = await taskService.getTasks(userId, filters);
    const taskResponses = tasks.map(toTaskResponse);

    res.status(200).json(successResponse(taskResponses));
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json(errorResponse('GET_TASKS_FAILED', 'Failed to get tasks'));
  }
});

/**
 * POST /api/v1/tasks
 * Create new task
 */
router.post('/', validate(createTaskSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const task = await taskService.createTask(userId, req.body);

    res.status(201).json(successResponse(toTaskResponse(task)));
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json(errorResponse('CREATE_TASK_FAILED', 'Failed to create task'));
  }
});

// --- MAGIC ENDPOINTS FOR AI (Must come BEFORE /:id) ---

/**
 * DELETE /api/v1/tasks/by-title
 * Delete a task by looking up its title
 */
router.delete('/by-title', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const title = req.query.title as string;
    
    if (!title) {
        res.status(400).json(errorResponse('MISSING_TITLE', 'Title query param required'));
        return;
    }

    const task = await findTaskByTitle(userId, title);
    if (!task) {
        res.status(404).json(errorResponse('TASK_NOT_FOUND', `Task "${title}" not found`));
        return;
    }

    const deleted = await taskService.deleteTask(task.id, userId);
    res.status(200).json(successResponse({ deleted: true, title }));
  } catch (error) {
    console.error('Delete by title error:', error);
    res.status(500).json(errorResponse('DELETE_FAILED', 'Failed to delete task'));
  }
});

/**
 * PATCH /api/v1/tasks/by-title/complete
 */
router.patch('/by-title/complete', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const title = req.query.title as string;
    
    if (!title) { 
        res.status(400).json(errorResponse('MISSING_TITLE', 'Title required'));
        return;
    }

    const task = await findTaskByTitle(userId, title);
    if (!task) {
        res.status(404).json(errorResponse('TASK_NOT_FOUND', `Task "${title}" not found`));
        return;
    }

    const updated = await taskService.markComplete(task.id, userId);
    res.status(200).json(successResponse(toTaskResponse(updated!)));
  } catch (error) {
    res.status(500).json(errorResponse('UPDATE_FAILED', 'Failed to mark complete'));
  }
});

/**
 * PATCH /api/v1/tasks/by-title/incomplete
 */
router.patch('/by-title/incomplete', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const title = req.query.title as string;
    
    if (!title) {
        res.status(400).json(errorResponse('MISSING_TITLE', 'Title required'));
        return;
    }

    const task = await findTaskByTitle(userId, title);
    if (!task) {
        res.status(404).json(errorResponse('TASK_NOT_FOUND', `Task "${title}" not found`));
        return;
    }

    const updated = await taskService.markIncomplete(task.id, userId);
    res.status(200).json(successResponse(toTaskResponse(updated!)));
  } catch (error) {
    res.status(500).json(errorResponse('UPDATE_FAILED', 'Failed to mark incomplete'));
  }
});

/**
 * PUT /api/v1/tasks/by-title
 * Update details like tags, priority, etc using title lookup
 */
router.put('/by-title', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const currentTitle = req.query.title as string;
    
    if (!currentTitle) {
        res.status(400).json(errorResponse('MISSING_TITLE', 'Title required'));
        return;
    }

    const task = await findTaskByTitle(userId, currentTitle);
    if (!task) {
        res.status(404).json(errorResponse('TASK_NOT_FOUND', `Task "${currentTitle}" not found`));
        return;
    }

    const updated = await taskService.updateTask(task.id, userId, req.body);
    res.status(200).json(successResponse(toTaskResponse(updated!)));
  } catch (error) {
    res.status(500).json(errorResponse('UPDATE_FAILED', 'Failed to update task'));
  }
});

// --- EXISTING ID-BASED ENDPOINTS ---

/**
 * GET /api/v1/tasks/:id
 * Get single task by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const taskId = req.params.id;

    const task = await taskService.getTaskById(taskId, userId);

    if (!task) {
      res.status(404).json(errorResponse('TASK_NOT_FOUND', 'Task not found'));
      return;
    }

    res.status(200).json(successResponse(toTaskResponse(task)));
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json(errorResponse('GET_TASK_FAILED', 'Failed to get task'));
  }
});

/**
 * PUT /api/v1/tasks/:id
 * Update task
 */
router.put('/:id', validate(updateTaskSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const taskId = req.params.id;

    const task = await taskService.updateTask(taskId, userId, req.body);

    if (!task) {
      res.status(404).json(errorResponse('TASK_NOT_FOUND', 'Task not found'));
      return;
    }

    res.status(200).json(successResponse(toTaskResponse(task)));
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json(errorResponse('UPDATE_TASK_FAILED', 'Failed to update task'));
  }
});

/**
 * DELETE /api/v1/tasks/:id
 * Delete task
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const taskId = req.params.id;

    const deleted = await taskService.deleteTask(taskId, userId);

    if (!deleted) {
      res.status(404).json(errorResponse('TASK_NOT_FOUND', 'Task not found'));
      return;
    }

    res.status(200).json(successResponse({ deleted: true, id: taskId }));
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json(errorResponse('DELETE_TASK_FAILED', 'Failed to delete task'));
  }
});

/**
 * PATCH /api/v1/tasks/:id/complete
 * Mark task as complete
 */
router.patch('/:id/complete', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const taskId = req.params.id;

    const task = await taskService.markComplete(taskId, userId);

    if (!task) {
      res.status(404).json(errorResponse('TASK_NOT_FOUND', 'Task not found'));
      return;
    }

    res.status(200).json(successResponse(toTaskResponse(task)));
  } catch (error) {
    console.error('Mark complete error:', error);
    res.status(500).json(errorResponse('MARK_COMPLETE_FAILED', 'Failed to mark task complete'));
  }
});

/**
 * PATCH /api/v1/tasks/:id/incomplete
 * Mark task as incomplete
 */
router.patch('/:id/incomplete', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const taskId = req.params.id;

    const task = await taskService.markIncomplete(taskId, userId);

    if (!task) {
      res.status(404).json(errorResponse('TASK_NOT_FOUND', 'Task not found'));
      return;
    }

    res.status(200).json(successResponse(toTaskResponse(task)));
  } catch (error) {
    console.error('Mark incomplete error:', error);
    res.status(500).json(errorResponse('MARK_INCOMPLETE_FAILED', 'Failed to mark task incomplete'));
  }
});

export default router;