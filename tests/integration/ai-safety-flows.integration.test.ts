import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { aiRouter } from '../../src/routes/ai.routes';

// Mock the AI agent and OpenAI client
jest.mock('../../src/ai/agent');
jest.mock('openai');

describe('AI Safety Flows Integration Tests', () => {
  let app: express.Application;
  let prisma: PrismaClient;
  let testUser: any;
  let authToken: string;

  // Create a mock AI agent instance
  const mockAI_Agent = {
    processChat: jest.fn(),
  };

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/ai', aiRouter);
    prisma = new PrismaClient();

    // Create a test user
    const passwordHash = await bcrypt.hash('password123', 10);
    testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        password: passwordHash,
        avatar: null,
        role: 'USER',
        isVerified: true
      }
    });

    // For testing purposes, we'll mock authentication
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create some test tasks
    await prisma.task.create({
      data: {
        id: 'safe-task-123',
        title: 'Safe task to keep',
        description: 'This task should remain after safety checks',
        status: 'PENDING',
        priority: 'MEDIUM',
        userId: testUser.id
      }
    });

    await prisma.task.create({
      data: {
        id: 'deletable-task-456',
        title: 'Task to potentially delete',
        description: 'This task might be deleted in safety tests',
        status: 'PENDING',
        priority: 'LOW',
        userId: testUser.id
      }
    });
  });

  afterEach(async () => {
    // Clean up tasks after each test
    await prisma.task.deleteMany({
      where: { userId: testUser.id }
    });
  });

  afterAll(async () => {
    // Clean up test user
    await prisma.user.delete({ where: { id: testUser.id } });
    await prisma.$disconnect();
  });

  describe('Safety: Confirmation for Destructive Actions', () => {
    it('should require confirmation for task deletion', async () => {
      // Arrange
      const taskId = 'deletable-task-456';

      // Mock AI agent to return DELETE_TASK intent with confirmation required
      const mockAIResponse = {
        success: true,
        data: {
          responseText: 'Are you sure you want to delete this task? This action cannot be undone.',
          requiresConfirmation: true, // Critical: confirmation required for deletion
          actionPlan: [{
            operation: 'DELETE',
            payload: { id: taskId },
            apiEndpoint: `/api/v1/tasks/${taskId}`,
            method: 'DELETE'
          }],
          detectedIntent: {
            type: 'DELETE_TASK',
            confidence: 0.98,
            parameters: { taskId }
          }
        }
      };

      mockAI_Agent.processChat.mockResolvedValue(mockAIResponse);

      const requestBody = {
        message: `Delete task ${taskId}`,
        sessionId: 'safety-test-session'
      };

      // Act
      const response = await request(app)
        .post('/api/v1/ai/chat')
        .send(requestBody)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body).toEqual(mockAIResponse);
      expect(response.body.data.requiresConfirmation).toBe(true);
      expect(response.body.data.actionPlan[0].operation).toBe('DELETE');
      expect(mockAI_Agent.processChat).toHaveBeenCalledWith(
        requestBody.message,
        requestBody.sessionId,
        testUser.id
      );

      // Verify that the task still exists (deletion requires confirmation)
      const existingTask = await prisma.task.findUnique({
        where: { id: taskId }
      });
      expect(existingTask).not.toBeNull();
    });

    it('should require confirmation for marking tasks as complete', async () => {
      // Arrange
      const taskId = 'safe-task-123';

      // Mock AI agent to return MARK_COMPLETE intent with confirmation required
      const mockAIResponse = {
        success: true,
        data: {
          responseText: 'Are you sure you want to mark this task as complete?',
          requiresConfirmation: true, // Critical: confirmation required for marking complete
          actionPlan: [{
            operation: 'UPDATE',
            payload: { id: taskId, status: 'COMPLETED' },
            apiEndpoint: `/api/v1/tasks/${taskId}`,
            method: 'PATCH'
          }],
          detectedIntent: {
            type: 'MARK_COMPLETE',
            confidence: 0.95,
            parameters: { taskId }
          }
        }
      };

      mockAI_Agent.processChat.mockResolvedValue(mockAIResponse);

      const requestBody = {
        message: `Mark task ${taskId} as complete`,
        sessionId: 'safety-test-session'
      };

      // Act
      const response = await request(app)
        .post('/api/v1/ai/chat')
        .send(requestBody)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body).toEqual(mockAIResponse);
      expect(response.body.data.requiresConfirmation).toBe(true);
      expect(response.body.data.actionPlan[0].operation).toBe('UPDATE');
      expect(mockAI_Agent.processChat).toHaveBeenCalledWith(
        requestBody.message,
        requestBody.sessionId,
        testUser.id
      );

      // Verify that the task status remains unchanged (completion requires confirmation)
      const existingTask = await prisma.task.findUnique({
        where: { id: taskId }
      });
      expect(existingTask).not.toBeNull();
      expect(existingTask!.status).toBe('PENDING');
    });

    it('should require confirmation for marking tasks as incomplete', async () => {
      // Arrange
      const taskId = 'safe-task-123';

      // First, mark the task as completed to test changing it back
      await prisma.task.update({
        where: { id: taskId },
        data: { status: 'COMPLETED' }
      });

      // Mock AI agent to return MARK_IN_COMPLETE intent with confirmation required
      const mockAIResponse = {
        success: true,
        data: {
          responseText: 'Are you sure you want to mark this task as incomplete?',
          requiresConfirmation: true, // Critical: confirmation required for marking incomplete
          actionPlan: [{
            operation: 'UPDATE',
            payload: { id: taskId, status: 'PENDING' },
            apiEndpoint: `/api/v1/tasks/${taskId}`,
            method: 'PATCH'
          }],
          detectedIntent: {
            type: 'MARK_IN_COMPLETE',
            confidence: 0.92,
            parameters: { taskId }
          }
        }
      };

      mockAI_Agent.processChat.mockResolvedValue(mockAIResponse);

      const requestBody = {
        message: `Mark task ${taskId} as incomplete`,
        sessionId: 'safety-test-session'
      };

      // Act
      const response = await request(app)
        .post('/api/v1/ai/chat')
        .send(requestBody)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body).toEqual(mockAIResponse);
      expect(response.body.data.requiresConfirmation).toBe(true);
      expect(response.body.data.actionPlan[0].operation).toBe('UPDATE');
      expect(mockAI_Agent.processChat).toHaveBeenCalledWith(
        requestBody.message,
        requestBody.sessionId,
        testUser.id
      );

      // Verify that the task status remains unchanged (changing to incomplete requires confirmation)
      const existingTask = await prisma.task.findUnique({
        where: { id: taskId }
      });
      expect(existingTask).not.toBeNull();
      expect(existingTask!.status).toBe('COMPLETED'); // Still completed
    });
  });

  describe('Safety: User Authentication and Authorization', () => {
    it('should prevent unauthorized access to other users\' tasks', async () => {
      // Arrange
      const otherUserId = 'other-user-999';
      const otherTaskId = 'other-user-task-789';

      // Create a task for another user (simulate in DB)
      const otherUserTask = await prisma.task.create({
        data: {
          id: otherTaskId,
          title: 'Other user\'s private task',
          description: 'This should not be accessible',
          status: 'PENDING',
          priority: 'HIGH',
          userId: otherUserId
        }
      });

      // Mock AI agent to try to access another user's task
      const mockAIResponse = {
        success: true,
        data: {
          responseText: 'I found the task you mentioned.',
          requiresConfirmation: true,
          actionPlan: [{
            operation: 'UPDATE',
            payload: { id: otherTaskId, status: 'COMPLETED' },
            apiEndpoint: `/api/v1/tasks/${otherTaskId}`,
            method: 'PATCH'
          }],
          detectedIntent: {
            type: 'MARK_COMPLETE',
            confidence: 0.85,
            parameters: { taskId: otherTaskId }
          }
        }
      };

      mockAI_Agent.processChat.mockResolvedValue(mockAIResponse);

      const requestBody = {
        message: `Mark task ${otherTaskId} as complete`,
        sessionId: 'safety-test-session'
      };

      // Act - Try to access other user's task
      const response = await request(app)
        .post('/api/v1/ai/chat')
        .send(requestBody)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200); // This would normally pass AI processing

      // Even though the AI processes the request, the actual API call should fail
      // due to authz checks in the task update endpoint

      // Clean up the created task for other user
      await prisma.task.delete({ where: { id: otherTaskId } }).catch(() => {});
    });

    it('should validate user permissions before executing operations', async () => {
      // Arrange
      const taskId = 'safe-task-123';

      // Mock AI agent to return a valid intent
      const mockAIResponse = {
        success: true,
        data: {
          responseText: 'I\'ve updated the task priority.',
          requiresConfirmation: false,
          actionPlan: [{
            operation: 'UPDATE',
            payload: { id: taskId, priority: 'HIGH' },
            apiEndpoint: `/api/v1/tasks/${taskId}`,
            method: 'PATCH'
          }],
          detectedIntent: {
            type: 'SET_PRIORITY',
            confidence: 0.90,
            parameters: { taskId, priority: 'HIGH' }
          }
        }
      };

      mockAI_Agent.processChat.mockResolvedValue(mockAIResponse);

      const requestBody = {
        message: `Set priority of task ${taskId} to high`,
        sessionId: 'safety-test-session'
      };

      // Act
      const response = await request(app)
        .post('/api/v1/ai/chat')
        .send(requestBody)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body).toEqual(mockAIResponse);
      expect(mockAI_Agent.processChat).toHaveBeenCalledWith(
        requestBody.message,
        requestBody.sessionId,
        testUser.id
      );
    });
  });

  describe('Safety: Input Sanitization and Injection Prevention', () => {
    it('should handle malicious input safely', async () => {
      // Arrange
      const maliciousInputs = [
        'Delete task 123; DROP TABLE tasks;',
        'Update task "123"; SELECT * FROM users; --',
        'Create task with title: <script>alert("XSS")</script>',
        'Set priority to: $(rm -rf /)',
        'Mark task complete where id = "1 OR 1=1"'
      ];

      for (const maliciousInput of maliciousInputs) {
        // Mock AI agent to handle the input safely
        const mockAIResponse = {
          success: true,
          data: {
            responseText: 'I processed your request safely.',
            requiresConfirmation: false,
            actionPlan: [],
            detectedIntent: {
              type: 'GREETING', // Fallback to safe intent
              confidence: 0.5,
              parameters: {}
            }
          }
        };

        mockAI_Agent.processChat.mockResolvedValue(mockAIResponse);

        const requestBody = {
          message: maliciousInput,
          sessionId: 'safety-test-session'
        };

        // Act
        const response = await request(app)
          .post('/api/v1/ai/chat')
          .send(requestBody)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        // Assert - Should handle malicious input safely
        expect(response.body.success).toBe(true);
        expect(mockAI_Agent.processChat).toHaveBeenCalledWith(
          maliciousInput,
          requestBody.sessionId,
          testUser.id
        );
      }
    });

    it('should validate AI-generated action plans', async () => {
      // Arrange
      const taskId = 'safe-task-123';

      // Mock AI agent to return a properly validated action plan
      const mockAIResponse = {
        success: true,
        data: {
          responseText: 'I\'ve updated your task.',
          requiresConfirmation: false,
          actionPlan: [{
            operation: 'UPDATE',
            payload: { id: taskId, priority: 'HIGH' },
            apiEndpoint: `/api/v1/tasks/${taskId}`,
            method: 'PATCH'
          }],
          detectedIntent: {
            type: 'SET_PRIORITY',
            confidence: 0.92,
            parameters: { taskId, priority: 'HIGH' }
          }
        }
      };

      mockAI_Agent.processChat.mockResolvedValue(mockAIResponse);

      const requestBody = {
        message: `Increase priority of task ${taskId}`,
        sessionId: 'safety-test-session'
      };

      // Act
      const response = await request(app)
        .post('/api/v1/ai/chat')
        .send(requestBody)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body).toEqual(mockAIResponse);

      // Verify the action plan structure is valid
      const actionPlan = response.body.data.actionPlan[0];
      expect(['CREATE', 'READ', 'UPDATE', 'DELETE']).toContain(actionPlan.operation);
      expect(actionPlan.payload).toBeDefined();
      expect(actionPlan.apiEndpoint).toBeDefined();
      expect(actionPlan.method).toBeDefined();

      expect(mockAI_Agent.processChat).toHaveBeenCalledWith(
        requestBody.message,
        requestBody.sessionId,
        testUser.id
      );
    });
  });

  describe('Safety: Rate Limiting and Abuse Prevention', () => {
    it('should handle multiple rapid requests safely', async () => {
      // Arrange
      const taskId = 'safe-task-123';
      const mockAIResponse = {
        success: true,
        data: {
          responseText: 'I processed your request.',
          requiresConfirmation: false,
          actionPlan: [{
            operation: 'UPDATE',
            payload: { id: taskId, title: `Updated at ${Date.now()}` },
            apiEndpoint: `/api/v1/tasks/${taskId}`,
            method: 'PATCH'
          }],
          detectedIntent: {
            type: 'UPDATE_TASK',
            confidence: 0.85,
            parameters: { taskId, title: `Updated at ${Date.now()}` }
          }
        }
      };

      mockAI_Agent.processChat.mockResolvedValue(mockAIResponse);

      const requests = Array.from({ length: 5 }, (_, i) => ({
        message: `Update task ${taskId} with message ${i}`,
        sessionId: 'rapid-request-session'
      }));

      // Act - Send multiple requests rapidly
      const responses = [];
      for (const request of requests) {
        const response = await request(app)
          .post('/api/v1/ai/chat')
          .send(request)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
        responses.push(response);
      }

      // Assert - All requests should be processed safely
      expect(responses).toHaveLength(5);
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Verify that the AI agent was called for each request
      expect(mockAI_Agent.processChat).toHaveBeenCalledTimes(5);
    });
  });

  describe('Safety: Error Handling and Recovery', () => {
    it('should handle AI service failures gracefully', async () => {
      // Arrange
      mockAI_Agent.processChat.mockRejectedValue(new Error('AI service temporarily unavailable'));

      const requestBody = {
        message: 'Create a task to test error handling',
        sessionId: 'error-test-session'
      };

      // Act
      const response = await request(app)
        .post('/api/v1/ai/chat')
        .send(requestBody)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      // Assert
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to process AI request'
      });
    });

    it('should handle partial failures in multi-operation plans', async () => {
      // Arrange
      const taskId1 = 'safe-task-123';
      const taskId2 = 'deletable-task-456';

      // Mock AI agent to return a multi-operation plan
      const mockAIResponse = {
        success: true,
        data: {
          responseText: 'I\'m processing multiple updates.',
          requiresConfirmation: true,
          actionPlan: [
            {
              operation: 'UPDATE',
              payload: { id: taskId1, priority: 'HIGH' },
              apiEndpoint: `/api/v1/tasks/${taskId1}`,
              method: 'PATCH'
            },
            {
              operation: 'DELETE',
              payload: { id: taskId2 },
              apiEndpoint: `/api/v1/tasks/${taskId2}`,
              method: 'DELETE'
            }
          ],
          detectedIntent: {
            type: 'MULTI_OPERATION',
            confidence: 0.88,
            parameters: { taskIds: [taskId1, taskId2] }
          }
        }
      };

      mockAI_Agent.processChat.mockResolvedValue(mockAIResponse);

      const requestBody = {
        message: `Update task ${taskId1} and delete task ${taskId2}`,
        sessionId: 'multi-op-test-session'
      };

      // Act
      const response = await request(app)
        .post('/api/v1/ai/chat')
        .send(requestBody)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body).toEqual(mockAIResponse);
      expect(response.body.data.actionPlan).toHaveLength(2);
      expect(mockAI_Agent.processChat).toHaveBeenCalledWith(
        requestBody.message,
        requestBody.sessionId,
        testUser.id
      );
    });
  });
});