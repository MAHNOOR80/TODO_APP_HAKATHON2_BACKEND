import { IntentDetector } from '../intent-detector';
import { IntentType } from '../../types/ai.types';

describe('IntentDetector', () => {
  let intentDetector: IntentDetector;

  beforeEach(() => {
    intentDetector = new IntentDetector();
  });

  describe('detectIntent', () => {
    it('should detect CREATE_TASK intent', async () => {
      const message = 'Add a task to buy groceries';
      const session = {
        sessionId: 'test-session',
        userId: 'test-user',
        context: { recentTasks: [], lastIntent: undefined, pendingConfirmation: false },
        createdAt: new Date(),
        lastActiveAt: new Date(),
        expiresAt: new Date()
      };

      const result = await intentDetector.detectIntent(message, session);

      expect(result.type).toBe(IntentType.CREATE_TASK);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect DELETE_TASK intent', async () => {
      const message = 'Delete my last task';
      const session = {
        sessionId: 'test-session',
        userId: 'test-user',
        context: { recentTasks: ['task-1'], lastIntent: undefined, pendingConfirmation: false },
        createdAt: new Date(),
        lastActiveAt: new Date(),
        expiresAt: new Date()
      };

      const result = await intentDetector.detectIntent(message, session);

      expect(result.type).toBe(IntentType.DELETE_TASK);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect MARK_COMPLETE intent', async () => {
      const message = 'Mark my meeting as complete';
      const session = {
        sessionId: 'test-session',
        userId: 'test-user',
        context: { recentTasks: [], lastIntent: undefined, pendingConfirmation: false },
        createdAt: new Date(),
        lastActiveAt: new Date(),
        expiresAt: new Date()
      };

      const result = await intentDetector.detectIntent(message, session);

      expect(result.type).toBe(IntentType.MARK_COMPLETE);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect SEARCH_TASKS intent', async () => {
      const message = 'Show me my tasks';
      const session = {
        sessionId: 'test-session',
        userId: 'test-user',
        context: { recentTasks: [], lastIntent: undefined, pendingConfirmation: false },
        createdAt: new Date(),
        lastActiveAt: new Date(),
        expiresAt: new Date()
      };

      const result = await intentDetector.detectIntent(message, session);

      expect(result.type).toBe(IntentType.SEARCH_TASKS);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect SET_PRIORITY intent', async () => {
      const message = 'Set priority to high';
      const session = {
        sessionId: 'test-session',
        userId: 'test-user',
        context: { recentTasks: ['task-1'], lastIntent: undefined, pendingConfirmation: false },
        createdAt: new Date(),
        lastActiveAt: new Date(),
        expiresAt: new Date()
      };

      const result = await intentDetector.detectIntent(message, session);

      expect(result.type).toBe(IntentType.SET_PRIORITY);
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('classifyIntent', () => {
    it('should correctly classify create task intent', () => {
      const message = 'add a task to call mom';
      const session = {
        sessionId: 'test-session',
        userId: 'test-user',
        context: { recentTasks: [], lastIntent: undefined, pendingConfirmation: false },
        createdAt: new Date(),
        lastActiveAt: new Date(),
        expiresAt: new Date()
      };

      const result = (intentDetector as any).classifyIntent(message, session);

      expect(result).toBe(IntentType.CREATE_TASK);
    });

    it('should correctly classify delete task intent', () => {
      const message = 'delete the meeting task';
      const session = {
        sessionId: 'test-session',
        userId: 'test-user',
        context: { recentTasks: [], lastIntent: undefined, pendingConfirmation: false },
        createdAt: new Date(),
        lastActiveAt: new Date(),
        expiresAt: new Date()
      };

      const result = (intentDetector as any).classifyIntent(message, session);

      expect(result).toBe(IntentType.DELETE_TASK);
    });
  });

  describe('extractParameters', () => {
    it('should extract task title from message', () => {
      const message = 'add a task to buy groceries tomorrow';
      const session = {
        sessionId: 'test-session',
        userId: 'test-user',
        context: { recentTasks: [], lastIntent: undefined, pendingConfirmation: false },
        createdAt: new Date(),
        lastActiveAt: new Date(),
        expiresAt: new Date()
      };

      const result = (intentDetector as any).extractParameters(message, session, IntentType.CREATE_TASK);

      expect(result.taskTitle).toBe('buy groceries');
    });

    it('should extract due date from message', () => {
      const message = 'add a task to buy groceries tomorrow';
      const session = {
        sessionId: 'test-session',
        userId: 'test-user',
        context: { recentTasks: [], lastIntent: undefined, pendingConfirmation: false },
        createdAt: new Date(),
        lastActiveAt: new Date(),
        expiresAt: new Date()
      };

      const result = (intentDetector as any).extractParameters(message, session, IntentType.CREATE_TASK);

      expect(result.dueDate).toBeDefined();
    });
  });
});