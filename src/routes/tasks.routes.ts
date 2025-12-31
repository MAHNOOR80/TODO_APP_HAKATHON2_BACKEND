import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createTaskSchema, updateTaskSchema } from '../validators/task.validator';
import { successResponse, errorResponse } from '../utils/response.utils';
import { toTaskResponse } from '../models/task.model';
import * as taskService from '../services/task.service';

/**
 * Task Routes
 * All task CRUD operations (requires authentication)
 */

const router = Router();

// All task routes require authentication
router.use(requireAuth);

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
