import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { aiRouter } from '../../src/routes/ai.routes';
import { AI_Agent } from '../../src/ai/agent';
import { OpenAIApi } from 'openai';
import { AIConfig } from '../../src/config/ai.config';

// Mock the AI agent and OpenAI client
jest.mock('../../src/ai/agent');
jest.mock('openai');

describe('AI Task Creation Integration Tests', () => {
  let app: express.Application;
  let prisma: PrismaClient;
  const mockAIConfig = new AIConfig();

  const mockOpenAIClient = {
    // Mock OpenAI client methods as needed
  };

  // Create a mock AI agent instance
  const mockAI_Agent = {
    processChat: jest.fn(),
  };

  let testUser: any;
  let authToken: string;

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
    // In a real scenario, you'd need to implement proper auth middleware mocking
  });

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.task.deleteMany({
      where: { userId: testUser.id }
    });
    await prisma.user.delete({ where: { id: testUser.id } });
    await prisma.$disconnect();
  });

  describe('Integration: AI Chat -> Task Creation', () => {
    it('should create a task when AI detects CREATE_TASK intent', async () => {
      // Arrange
      const taskTitle = 'Buy groceries from the market';

      // Mock AI agent to return CREATE_TASK intent
      const mockAIResponse = {
        success: true,
        data: {
          responseText: `I've created a task titled "${taskTitle}".`,
          requiresConfirmation: false,
          actionPlan: [{
            operation: 'CREATE',
            payload: {
              title: taskTitle,
              description: 'Created via AI assistant',
              status: 'PENDING'
            },
            apiEndpoint: '/api/v1/tasks',
            method: 'POST'
          }],
          detectedIntent: {
            type: 'CREATE_TASK',
            confidence: 0.95,
            parameters: { title: taskTitle }
          }
        }
      };

      mockAI_Agent.processChat.mockResolvedValue(mockAIResponse);

      const requestBody = {
        message: `Create a task to ${taskTitle}`,
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

      // Verify that the task was created in the database
      const createdTasks = await prisma.task.findMany({
        where: {
          userId: testUser.id,
          title: taskTitle
        }
      });

      expect(createdTasks).toHaveLength(1);
      expect(createdTasks[0]).toMatchObject({
        title: taskTitle,
        description: 'Created via AI assistant',
        status: 'PENDING'
      });
    });

    it('should create a task with due date when AI detects date parameters', async () => {
      // Arrange
      const taskTitle = 'Submit project proposal';
      const dueDate = '2023-12-31';

      // Mock AI agent to return CREATE_TASK intent with date parameters
      const mockAIResponse = {
        success: true,
        data: {
          responseText: `I've created a task titled "${taskTitle}" with due date ${new Date(dueDate).toLocaleDateString()}.`,
          requiresConfirmation: false,
          actionPlan: [{
            operation: 'CREATE',
            payload: {
              title: taskTitle,
              description: 'Created via AI assistant',
              status: 'PENDING',
              dueDate: new Date(dueDate)
            },
            apiEndpoint: '/api/v1/tasks',
            method: 'POST'
          }],
          detectedIntent: {
            type: 'CREATE_TASK',
            confidence: 0.92,
            parameters: {
              title: taskTitle,
              dueDate: new Date(dueDate)
            }
          }
        }
      };

      mockAI_Agent.processChat.mockResolvedValue(mockAIResponse);

      const requestBody = {
        message: `Create a task to ${taskTitle} and set the due date to ${dueDate}`,
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

      // Verify that the task was created in the database with due date
      const createdTasks = await prisma.task.findMany({
        where: {
          userId: testUser.id,
          title: taskTitle
        }
      });

      expect(createdTasks).toHaveLength(1);
      expect(createdTasks[0]).toMatchObject({
        title: taskTitle,
        description: 'Created via AI assistant',
        status: 'PENDING',
        dueDate: new Date(dueDate)
      });
    });

    it('should create a task with priority when AI detects priority parameters', async () => {
      // Arrange
      const taskTitle = 'Fix critical bug';
      const priority = 'HIGH';

      // Mock AI agent to return CREATE_TASK intent with priority parameters
      const mockAIResponse = {
        success: true,
        data: {
          responseText: `I've created a task titled "${taskTitle}" with priority ${priority}.`,
          requiresConfirmation: false,
          actionPlan: [{
            operation: 'CREATE',
            payload: {
              title: taskTitle,
              description: 'Created via AI assistant',
              status: 'PENDING',
              priority: priority
            },
            apiEndpoint: '/api/v1/tasks',
            method: 'POST'
          }],
          detectedIntent: {
            type: 'CREATE_TASK',
            confidence: 0.88,
            parameters: {
              title: taskTitle,
              priority: priority
            }
          }
        }
      };

      mockAI_Agent.processChat.mockResolvedValue(mockAIResponse);

      const requestBody = {
        message: `Create a high priority task to ${taskTitle}`,
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

      // Verify that the task was created in the database with priority
      const createdTasks = await prisma.task.findMany({
        where: {
          userId: testUser.id,
          title: taskTitle
        }
      });

      expect(createdTasks).toHaveLength(1);
      expect(createdTasks[0]).toMatchObject({
        title: taskTitle,
        description: 'Created via AI assistant',
        status: 'PENDING',
        priority: priority
      });
    });

    it('should handle AI responses without action plan gracefully', async () => {
      // Arrange
      const mockAIResponse = {
        success: true,
        data: {
          responseText: "I understand your request.",
          requiresConfirmation: false,
          actionPlan: [],
          detectedIntent: {
            type: 'GREETING',
            confidence: 0.95,
            parameters: {}
          }
        }
      };

      mockAI_Agent.processChat.mockResolvedValue(mockAIResponse);

      const requestBody = {
        message: 'Hi, how are you?',
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

    it('should handle AI processing errors gracefully', async () => {
      // Arrange
      mockAI_Agent.processChat.mockRejectedValue(new Error('AI service unavailable'));

      const requestBody = {
        message: 'Create a task to do something',
        sessionId: 'test-session-123'
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
  });
});