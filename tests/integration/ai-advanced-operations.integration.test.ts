import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { aiRouter } from '../../src/routes/ai.routes';

// Mock the AI agent and OpenAI client
jest.mock('../../src/ai/agent');
jest.mock('openai');

describe('AI Advanced Task Operations Integration Tests', () => {
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
    await prisma.task.createMany({
      data: [
        {
          id: 'task-123',
          title: 'Complete project proposal',
          description: 'Finish the project proposal document',
          status: 'PENDING',
          priority: 'MEDIUM',
          userId: testUser.id
        },
        {
          id: 'task-456',
          title: 'Buy groceries',
          description: 'Get milk, bread, and eggs',
          status: 'PENDING',
          priority: 'LOW',
          userId: testUser.id
        }
      ]
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

  describe('Integration: AI Chat -> Task Update Operations', () => {
    it('should update task status to COMPLETED when AI detects MARK_COMPLETE intent', async () => {
      // Arrange
      const taskId = 'task-123';

      // Mock AI agent to return MARK_COMPLETE intent
      const mockAIResponse = {
        success: true,
        data: {
          responseText: 'I\'ve marked the task as complete.',
          requiresConfirmation: true,
          actionPlan: [{
            operation: 'UPDATE',
            payload: {
              id: taskId,
              status: 'COMPLETED'
            },
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
        sessionId: 'test-session-123'
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

      // Verify that the task was updated in the database
      const updatedTask = await prisma.task.findUnique({
        where: { id: taskId }
      });

      expect(updatedTask).not.toBeNull();
      expect(updatedTask!.status).toBe('COMPLETED');
    });

    it('should update task status to PENDING when AI detects MARK_IN_COMPLETE intent', async () => {
      // Arrange
      const taskId = 'task-456';

      // First, mark the task as completed to test changing it back
      await prisma.task.update({
        where: { id: taskId },
        data: { status: 'COMPLETED' }
      });

      // Mock AI agent to return MARK_IN_COMPLETE intent
      const mockAIResponse = {
        success: true,
        data: {
          responseText: 'I\'ve marked the task as incomplete.',
          requiresConfirmation: true,
          actionPlan: [{
            operation: 'UPDATE',
            payload: {
              id: taskId,
              status: 'PENDING'
            },
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
        sessionId: 'test-session-123'
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

      // Verify that the task was updated in the database
      const updatedTask = await prisma.task.findUnique({
        where: { id: taskId }
      });

      expect(updatedTask).not.toBeNull();
      expect(updatedTask!.status).toBe('PENDING');
    });

    it('should update task priority when AI detects SET_PRIORITY intent', async () => {
      // Arrange
      const taskId = 'task-123';
      const newPriority = 'HIGH';

      // Mock AI agent to return SET_PRIORITY intent
      const mockAIResponse = {
        success: true,
        data: {
          responseText: `I've set the priority to ${newPriority}.`,
          requiresConfirmation: false,
          actionPlan: [{
            operation: 'UPDATE',
            payload: {
              id: taskId,
              priority: newPriority
            },
            apiEndpoint: `/api/v1/tasks/${taskId}`,
            method: 'PATCH'
          }],
          detectedIntent: {
            type: 'SET_PRIORITY',
            confidence: 0.90,
            parameters: { taskId, priority: newPriority }
          }
        }
      };

      mockAI_Agent.processChat.mockResolvedValue(mockAIResponse);

      const requestBody = {
        message: `Set the priority of task ${taskId} to ${newPriority.toLowerCase()}`,
        sessionId: 'test-session-123'
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

      // Verify that the task priority was updated in the database
      const updatedTask = await prisma.task.findUnique({
        where: { id: taskId }
      });

      expect(updatedTask).not.toBeNull();
      expect(updatedTask!.priority).toBe(newPriority);
    });

    it('should update task due date when AI detects SET_DUE_DATE intent', async () => {
      // Arrange
      const taskId = 'task-456';
      const newDueDate = new Date('2023-12-31');

      // Mock AI agent to return SET_DUE_DATE intent
      const mockAIResponse = {
        success: true,
        data: {
          responseText: `I've set the due date to ${newDueDate.toLocaleDateString()}.`,
          requiresConfirmation: false,
          actionPlan: [{
            operation: 'UPDATE',
            payload: {
              id: taskId,
              dueDate: newDueDate
            },
            apiEndpoint: `/api/v1/tasks/${taskId}`,
            method: 'PATCH'
          }],
          detectedIntent: {
            type: 'SET_DUE_DATE',
            confidence: 0.93,
            parameters: { taskId, dueDate: newDueDate }
          }
        }
      };

      mockAI_Agent.processChat.mockResolvedValue(mockAIResponse);

      const requestBody = {
        message: `Set the due date of task ${taskId} to ${newDueDate.toISOString().split('T')[0]}`,
        sessionId: 'test-session-123'
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

      // Verify that the task due date was updated in the database
      const updatedTask = await prisma.task.findUnique({
        where: { id: taskId }
      });

      expect(updatedTask).not.toBeNull();
      expect(updatedTask!.dueDate).toEqual(newDueDate);
    });
  });

  describe('Integration: AI Chat -> Task Deletion Operations', () => {
    it('should delete a task when AI detects DELETE_TASK intent', async () => {
      // Arrange
      const taskId = 'task-123';

      // Mock AI agent to return DELETE_TASK intent
      const mockAIResponse = {
        success: true,
        data: {
          responseText: 'I\'ve deleted the task.',
          requiresConfirmation: true,
          actionPlan: [{
            operation: 'DELETE',
            payload: {
              id: taskId
            },
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
        sessionId: 'test-session-123'
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

      // Verify that the task was deleted from the database
      const deletedTask = await prisma.task.findUnique({
        where: { id: taskId }
      });

      expect(deletedTask).toBeNull();
    });

    it('should handle deletion of non-existent task gracefully', async () => {
      // Arrange
      const nonExistentTaskId = 'non-existent-task';

      // Mock AI agent to return DELETE_TASK intent
      const mockAIResponse = {
        success: true,
        data: {
          responseText: 'I\'ve deleted the task.',
          requiresConfirmation: true,
          actionPlan: [{
            operation: 'DELETE',
            payload: {
              id: nonExistentTaskId
            },
            apiEndpoint: `/api/v1/tasks/${nonExistentTaskId}`,
            method: 'DELETE'
          }],
          detectedIntent: {
            type: 'DELETE_TASK',
            confidence: 0.95,
            parameters: { taskId: nonExistentTaskId }
          }
        }
      };

      mockAI_Agent.processChat.mockResolvedValue(mockAIResponse);

      const requestBody = {
        message: `Delete task ${nonExistentTaskId}`,
        sessionId: 'test-session-123'
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

  describe('Integration: AI Chat -> Complex Operations', () => {
    it('should handle multiple operations in sequence', async () => {
      // Arrange
      const taskId1 = 'task-123';
      const taskId2 = 'task-456';

      // Mock AI agent to return multiple operations
      const mockAIResponse = {
        success: true,
        data: {
          responseText: 'I\'ve updated both tasks.',
          requiresConfirmation: true,
          actionPlan: [
            {
              operation: 'UPDATE',
              payload: {
                id: taskId1,
                priority: 'HIGH'
              },
              apiEndpoint: `/api/v1/tasks/${taskId1}`,
              method: 'PATCH'
            },
            {
              operation: 'UPDATE',
              payload: {
                id: taskId2,
                status: 'COMPLETED'
              },
              apiEndpoint: `/api/v1/tasks/${taskId2}`,
              method: 'PATCH'
            }
          ],
          detectedIntent: {
            type: 'MULTI_UPDATE',
            confidence: 0.88,
            parameters: {
              taskIds: [taskId1, taskId2],
              updates: { priority: 'HIGH', status: 'COMPLETED' }
            }
          }
        }
      };

      mockAI_Agent.processChat.mockResolvedValue(mockAIResponse);

      const requestBody = {
        message: `Set task ${taskId1} to high priority and mark task ${taskId2} as complete`,
        sessionId: 'test-session-123'
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

      // Verify that both tasks were updated in the database
      const updatedTask1 = await prisma.task.findUnique({
        where: { id: taskId1 }
      });

      const updatedTask2 = await prisma.task.findUnique({
        where: { id: taskId2 }
      });

      expect(updatedTask1).not.toBeNull();
      expect(updatedTask1!.priority).toBe('HIGH');

      expect(updatedTask2).not.toBeNull();
      expect(updatedTask2!.status).toBe('COMPLETED');
    });

    it('should handle operations with confirmation requirements', async () => {
      // Arrange
      const taskId = 'task-123';

      // Mock AI agent to return MARK_COMPLETE intent (which requires confirmation)
      const mockAIResponse = {
        success: true,
        data: {
          responseText: 'I\'ve marked the task as complete.',
          requiresConfirmation: true, // This indicates a destructive operation
          actionPlan: [{
            operation: 'UPDATE',
            payload: {
              id: taskId,
              status: 'COMPLETED'
            },
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
        sessionId: 'test-session-123'
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
      expect(mockAI_Agent.processChat).toHaveBeenCalledWith(
        requestBody.message,
        requestBody.sessionId,
        testUser.id
      );

      // Verify that the task was updated in the database
      const updatedTask = await prisma.task.findUnique({
        where: { id: taskId }
      });

      expect(updatedTask).not.toBeNull();
      expect(updatedTask!.status).toBe('COMPLETED');
    });
  });
});