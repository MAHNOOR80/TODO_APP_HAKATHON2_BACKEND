import { ParameterExtractor } from '../parameter-extractor';
import { IntentType } from '../../types/ai.types';

describe('ParameterExtractor', () => {
  let parameterExtractor: ParameterExtractor;

  beforeEach(() => {
    parameterExtractor = new ParameterExtractor();
  });

  describe('extract', () => {
    it('should extract task title correctly', async () => {
      const message = 'add a task to buy groceries tomorrow';
      const session = {
        sessionId: 'test-session',
        userId: 'test-user',
        context: { recentTasks: [], lastIntent: undefined, pendingConfirmation: false },
        createdAt: new Date(),
        lastActiveAt: new Date(),
        expiresAt: new Date()
      };

      const result = await parameterExtractor.extract(message, session, IntentType.CREATE_TASK);

      expect(result.taskTitle).toBe('buy groceries');
    });

    it('should extract due date correctly', async () => {
      const message = 'add a task to buy groceries tomorrow';
      const session = {
        sessionId: 'test-session',
        userId: 'test-user',
        context: { recentTasks: [], lastIntent: undefined, pendingConfirmation: false },
        createdAt: new Date(),
        lastActiveAt: new Date(),
        expiresAt: new Date()
      };

      const result = await parameterExtractor.extract(message, session, IntentType.CREATE_TASK);

      expect(result.dueDate).toBeDefined();
    });

    it('should extract priority correctly', async () => {
      const message = 'add a task to buy groceries with high priority';
      const session = {
        sessionId: 'test-session',
        userId: 'test-user',
        context: { recentTasks: [], lastIntent: undefined, pendingConfirmation: false },
        createdAt: new Date(),
        lastActiveAt: new Date(),
        expiresAt: new Date()
      };

      const result = await parameterExtractor.extract(message, session, IntentType.CREATE_TASK);

      expect(result.priority).toBe('HIGH');
    });

    it('should extract category correctly', async () => {
      const message = 'add a task to buy groceries in shopping';
      const session = {
        sessionId: 'test-session',
        userId: 'test-user',
        context: { recentTasks: [], lastIntent: undefined, pendingConfirmation: false },
        createdAt: new Date(),
        lastActiveAt: new Date(),
        expiresAt: new Date()
      };

      const result = await parameterExtractor.extract(message, session, IntentType.CREATE_TASK);

      expect(result.category).toBe('Shopping');
    });

    it('should extract tags correctly', async () => {
      const message = 'add a task to buy groceries #shopping #urgent';
      const session = {
        sessionId: 'test-session',
        userId: 'test-user',
        context: { recentTasks: [], lastIntent: undefined, pendingConfirmation: false },
        createdAt: new Date(),
        lastActiveAt: new Date(),
        expiresAt: new Date()
      };

      const result = await parameterExtractor.extract(message, session, IntentType.CREATE_TASK);

      expect(result.tags).toContain('shopping');
      expect(result.tags).toContain('urgent');
    });

    it('should extract recurrence pattern correctly', async () => {
      const message = 'add a task to water plants daily';
      const session = {
        sessionId: 'test-session',
        userId: 'test-user',
        context: { recentTasks: [], lastIntent: undefined, pendingConfirmation: false },
        createdAt: new Date(),
        lastActiveAt: new Date(),
        expiresAt: new Date()
      };

      const result = await parameterExtractor.extract(message, session, IntentType.CREATE_RECURRING_TASK);

      expect(result.recurrencePattern).toBe('DAILY');
    });

    it('should extract reminder offset correctly', async () => {
      const message = 'add a task to call mom and remind me 30 minutes before';
      const session = {
        sessionId: 'test-session',
        userId: 'test-user',
        context: { recentTasks: [], lastIntent: undefined, pendingConfirmation: false },
        createdAt: new Date(),
        lastActiveAt: new Date(),
        expiresAt: new Date()
      };

      const result = await parameterExtractor.extract(message, session, IntentType.CREATE_TASK);

      expect(result.reminderOffset).toBe(30 * 60 * 1000); // 30 minutes in milliseconds
    });
  });

  describe('extractTaskTitle', () => {
    it('should extract title from "add a task to" pattern', () => {
      const message = 'add a task to buy groceries tomorrow';

      const result = (parameterExtractor as any).extractTaskTitle(message);

      expect(result).toBe('buy groceries');
    });

    it('should extract title from "create" pattern', () => {
      const message = 'create a task to schedule meeting';

      const result = (parameterExtractor as any).extractTaskTitle(message);

      expect(result).toBe('schedule meeting');
    });
  });

  describe('extractDueDate', () => {
    it('should extract tomorrow date', () => {
      const message = 'add a task to buy groceries tomorrow';
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const result = (parameterExtractor as any).extractDueDate(message);

      expect(result).toBeDefined();
    });

    it('should extract today date', () => {
      const message = 'add a task to call mom today';

      const result = (parameterExtractor as any).extractDueDate(message);

      expect(result).toBeDefined();
    });
  });

  describe('extractPriority', () => {
    it('should extract high priority', () => {
      const message = 'add a task with high priority';

      const result = (parameterExtractor as any).extractPriority(message);

      expect(result).toBe('HIGH');
    });

    it('should extract low priority', () => {
      const message = 'add a task with low priority';

      const result = (parameterExtractor as any).extractPriority(message);

      expect(result).toBe('LOW');
    });
  });

  describe('extractTags', () => {
    it('should extract multiple tags', () => {
      const message = 'add a task #work #urgent #meeting';

      const result = (parameterExtractor as any).extractTags(message);

      expect(result).toContain('work');
      expect(result).toContain('urgent');
      expect(result).toContain('meeting');
    });

    it('should return empty array if no tags', () => {
      const message = 'add a task to buy groceries';

      const result = (parameterExtractor as any).extractTags(message);

      expect(result).toEqual([]);
    });
  });
});