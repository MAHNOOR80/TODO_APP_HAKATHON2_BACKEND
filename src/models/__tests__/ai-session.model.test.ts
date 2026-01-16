import { AISessionModel } from '../ai-session.model';
import { IntentType } from '../../types/ai.types';

describe('AISessionModel', () => {
  beforeEach(() => {
    // Clear all sessions before each test
    (AISessionModel as any).sessions = new Map();
  });

  describe('create', () => {
    it('should create a new AI session', async () => {
      const userId = 'test-user';
      const sessionId = 'test-session';

      const session = await AISessionModel.create(userId, sessionId);

      expect(session.userId).toBe(userId);
      expect(session.sessionId).toBe(sessionId);
      expect(session.context).toEqual({
        recentTasks: [],
        lastIntent: undefined,
        pendingConfirmation: false
      });
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.lastActiveAt).toBeInstanceOf(Date);
      expect(session.expiresAt).toBeInstanceOf(Date);
    });

    it('should generate a session ID if none provided', async () => {
      const userId = 'test-user';

      const session = await AISessionModel.create(userId);

      expect(session.userId).toBe(userId);
      expect(session.sessionId).toBeDefined();
      expect(session.sessionId).toMatch(/^sess_/);
    });
  });

  describe('get', () => {
    it('should retrieve an existing session', async () => {
      const userId = 'test-user';
      const sessionId = 'test-session';

      const createdSession = await AISessionModel.create(userId, sessionId);
      const retrievedSession = await AISessionModel.get(sessionId);

      expect(retrievedSession).toEqual(createdSession);
    });

    it('should return null for non-existent session', async () => {
      const nonExistentSessionId = 'non-existent';

      const session = await AISessionModel.get(nonExistentSessionId);

      expect(session).toBeNull();
    });

    it('should return null for expired session', async () => {
      const userId = 'test-user';
      const sessionId = 'test-session';

      // Create an expired session manually
      const expiredSession = {
        sessionId,
        userId,
        context: { recentTasks: [], lastIntent: undefined, pendingConfirmation: false },
        createdAt: new Date(),
        lastActiveAt: new Date(),
        expiresAt: new Date(Date.now() - 1000) // Expired 1 second ago
      };

      (AISessionModel as any).sessions.set(sessionId, expiredSession);

      const retrievedSession = await AISessionModel.get(sessionId);

      expect(retrievedSession).toBeNull();
    });
  });

  describe('update', () => {
    it('should update an existing session', async () => {
      const userId = 'test-user';
      const sessionId = 'test-session';

      const createdSession = await AISessionModel.create(userId, sessionId);
      const updatedSession = { ...createdSession };
      updatedSession.context.lastIntent = IntentType.CREATE_TASK;

      const result = await AISessionModel.update(updatedSession);

      expect(result.context.lastIntent).toBe(IntentType.CREATE_TASK);
      expect(result.lastActiveAt.getTime()).toBeGreaterThan(createdSession.lastActiveAt.getTime());
    });
  });

  describe('delete', () => {
    it('should delete an existing session', async () => {
      const userId = 'test-user';
      const sessionId = 'test-session';

      await AISessionModel.create(userId, sessionId);
      await AISessionModel.delete(sessionId);

      const session = await AISessionModel.get(sessionId);
      expect(session).toBeNull();
    });
  });

  describe('addRecentTask', () => {
    it('should add a task to recent tasks', async () => {
      const userId = 'test-user';
      const sessionId = 'test-session';
      const taskId = 'task-123';

      const session = await AISessionModel.create(userId, sessionId);
      await AISessionModel.addRecentTask(sessionId, taskId);

      const updatedSession = await AISessionModel.get(sessionId);
      expect(updatedSession?.context.recentTasks).toContain(taskId);
    });

    it('should keep only the last 5 tasks', async () => {
      const userId = 'test-user';
      const sessionId = 'test-session';

      const session = await AISessionModel.create(userId, sessionId);

      // Add 6 tasks
      for (let i = 0; i < 6; i++) {
        await AISessionModel.addRecentTask(sessionId, `task-${i}`);
      }

      const updatedSession = await AISessionModel.get(sessionId);
      expect(updatedSession?.context.recentTasks).toHaveLength(5);
      expect(updatedSession?.context.recentTasks).toEqual(['task-5', 'task-4', 'task-3', 'task-2', 'task-1']);
    });
  });

  describe('updateLastIntent', () => {
    it('should update the last intent', async () => {
      const userId = 'test-user';
      const sessionId = 'test-session';
      const intentType = IntentType.CREATE_TASK;

      const session = await AISessionModel.create(userId, sessionId);
      await AISessionModel.updateLastIntent(sessionId, intentType);

      const updatedSession = await AISessionModel.get(sessionId);
      expect(updatedSession?.context.lastIntent).toBe(intentType);
    });
  });

  describe('setPendingConfirmation', () => {
    it('should set pending confirmation status', async () => {
      const userId = 'test-user';
      const sessionId = 'test-session';

      const session = await AISessionModel.create(userId, sessionId);
      await AISessionModel.setPendingConfirmation(sessionId, true);

      const updatedSession = await AISessionModel.get(sessionId);
      expect(updatedSession?.context.pendingConfirmation).toBe(true);
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should remove expired sessions', async () => {
      const userId = 'test-user';
      const sessionId = 'test-session';

      // Create an expired session manually
      const expiredSession = {
        sessionId,
        userId,
        context: { recentTasks: [], lastIntent: undefined, pendingConfirmation: false },
        createdAt: new Date(),
        lastActiveAt: new Date(),
        expiresAt: new Date(Date.now() - 1000) // Expired 1 second ago
      };

      (AISessionModel as any).sessions.set(sessionId, expiredSession);

      await AISessionModel.cleanupExpiredSessions();

      const session = await AISessionModel.get(sessionId);
      expect(session).toBeNull();
    });
  });
});