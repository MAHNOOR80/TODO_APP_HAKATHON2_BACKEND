import { ActionPlanner } from '../action-planner';
import { IntentType, TaskOperation } from '../../types/ai.types';

describe('ActionPlanner', () => {
  let actionPlanner: ActionPlanner;

  beforeEach(() => {
    actionPlanner = new ActionPlanner();
  });

  describe('planActions', () => {
    it('should create correct action plan for CREATE_TASK', () => {
      const intent = {
        type: IntentType.CREATE_TASK,
        confidence: 0.8,
        parameters: {
          taskTitle: 'Buy groceries',
          priority: 'HIGH',
          category: 'Shopping',
          tags: ['urgent'],
          dueDate: new Date().toISOString()
        }
      };

      const session = {
        sessionId: 'test-session',
        userId: 'test-user',
        context: { recentTasks: [], lastIntent: undefined, pendingConfirmation: false },
        createdAt: new Date(),
        lastActiveAt: new Date(),
        expiresAt: new Date()
      };

      const result = actionPlanner.planActions(intent, session);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        operation: TaskOperation.CREATE,
        endpoint: '/tasks',
        method: 'POST',
        payload: {
          title: 'Buy groceries',
          priority: 'high',
          category: 'Shopping',
          tags: ['urgent'],
          dueDate: expect.any(String),
          completed: false,
          recurrencePattern: undefined,
          reminderEnabled: false,
          reminderOffsetMinutes: undefined
        }
      });
    });

    it('should create correct action plan for DELETE_TASK', () => {
      const intent = {
        type: IntentType.DELETE_TASK,
        confidence: 0.9,
        parameters: {
          taskId: 'task-123'
        }
      };

      const session = {
        sessionId: 'test-session',
        userId: 'test-user',
        context: { recentTasks: [], lastIntent: undefined, pendingConfirmation: false },
        createdAt: new Date(),
        lastActiveAt: new Date(),
        expiresAt: new Date()
      };

      const result = actionPlanner.planActions(intent, session);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        operation: TaskOperation.DELETE,
        endpoint: '/tasks/task-123',
        method: 'DELETE'
      });
    });

    it('should create correct action plan for UPDATE_TASK', () => {
      const intent = {
        type: IntentType.UPDATE_TASK,
        confidence: 0.7,
        parameters: {
          taskId: 'task-123',
          taskTitle: 'Updated task',
          priority: 'MEDIUM'
        }
      };

      const session = {
        sessionId: 'test-session',
        userId: 'test-user',
        context: { recentTasks: [], lastIntent: undefined, pendingConfirmation: false },
        createdAt: new Date(),
        lastActiveAt: new Date(),
        expiresAt: new Date()
      };

      const result = actionPlanner.planActions(intent, session);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        operation: TaskOperation.UPDATE,
        endpoint: '/tasks/task-123',
        method: 'PUT',
        payload: {
          title: 'Updated task',
          priority: 'medium'
        }
      });
    });

    it('should create correct action plan for MARK_COMPLETE', () => {
      const intent = {
        type: IntentType.MARK_COMPLETE,
        confidence: 0.8,
        parameters: {
          taskId: 'task-123'
        }
      };

      const session = {
        sessionId: 'test-session',
        userId: 'test-user',
        context: { recentTasks: [], lastIntent: undefined, pendingConfirmation: false },
        createdAt: new Date(),
        lastActiveAt: new Date(),
        expiresAt: new Date()
      };

      const result = actionPlanner.planActions(intent, session);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        operation: TaskOperation.MARK_COMPLETE,
        endpoint: '/tasks/task-123/complete',
        method: 'PATCH'
      });
    });

    it('should create correct action plan for SEARCH_TASKS', () => {
      const intent = {
        type: IntentType.SEARCH_TASKS,
        confidence: 0.6,
        parameters: {
          taskTitle: 'groceries',
          priority: 'HIGH'
        }
      };

      const session = {
        sessionId: 'test-session',
        userId: 'test-user',
        context: { recentTasks: [], lastIntent: undefined, pendingConfirmation: false },
        createdAt: new Date(),
        lastActiveAt: new Date(),
        expiresAt: new Date()
      };

      const result = actionPlanner.planActions(intent, session);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        operation: TaskOperation.SEARCH,
        endpoint: '/tasks?search=groceries&priority=high',
        method: 'GET'
      });
    });
  });

  describe('validateActionPlan', () => {
    it('should return true for valid action plan', () => {
      const plan = [{
        operation: TaskOperation.CREATE,
        endpoint: '/tasks',
        method: 'POST',
        payload: { title: 'Test task' }
      }];

      const result = actionPlanner.validateActionPlan(plan);

      expect(result).toBe(true);
    });

    it('should return false for invalid method', () => {
      const plan = [{
        operation: TaskOperation.CREATE,
        endpoint: '/tasks',
        method: 'INVALID_METHOD' as any,
        payload: { title: 'Test task' }
      }];

      const result = actionPlanner.validateActionPlan(plan);

      expect(result).toBe(false);
    });

    it('should return false for missing required fields', () => {
      const plan = [{
        operation: TaskOperation.CREATE,
        endpoint: '/tasks'
        // Missing method
      }];

      const result = actionPlanner.validateActionPlan(plan);

      expect(result).toBe(false);
    });

    it('should return false for invalid endpoint format', () => {
      const plan = [{
        operation: TaskOperation.CREATE,
        endpoint: 'tasks', // Missing leading slash
        method: 'POST'
      }];

      const result = actionPlanner.validateActionPlan(plan);

      expect(result).toBe(false);
    });
  });
});