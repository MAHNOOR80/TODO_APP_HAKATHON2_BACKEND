import request from 'supertest';
import express from 'express';
import { aiRouter } from '../../src/routes/ai.routes';

// Mock the AI agent and OpenAI client
jest.mock('../../src/ai/agent');
jest.mock('openai');

describe('AI Advanced Intent Processing Contract Tests', () => {
  let app: express.Application;

  // Create a mock AI agent instance
  const mockAI_Agent = {
    processChat: jest.fn(),
  };

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/ai', aiRouter);

    // Set up the mock agent on the app for testing
    (app as any).aiAgent = mockAI_Agent;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Advanced Intent Processing - MARK_COMPLETE', () => {
    it('should detect MARK_COMPLETE intent correctly', async () => {
      // Arrange
      const mockResponse = {
        success: true,
        data: {
          responseText: 'I\'ve marked the task as complete.',
          requiresConfirmation: true, // Destructive action should require confirmation
          actionPlan: [{
            operation: 'UPDATE',
            payload: {
              id: 'task-123',
              status: 'COMPLETED'
            },
            apiEndpoint: '/api/v1/tasks/task-123',
            method: 'PATCH'
          }],
          detectedIntent: {
            type: 'MARK_COMPLETE',
            confidence: 0.95,
            parameters: { taskId: 'task-123' }
          }
        }
      };

      mockAI_Agent.processChat.mockResolvedValue(mockResponse);

      const requestBody = {
        message: 'Mark task #123 as complete',
        sessionId: 'test-session-123'
      };

      // Act
      const response = await request(app)
        .post('/api/v1/ai/chat')
        .send(requestBody)
        .expect(200);

      // Assert
      expect(response.body).toEqual(mockResponse);
      expect(mockAI_Agent.processChat).toHaveBeenCalledWith(
        requestBody.message,
        requestBody.sessionId,
        expect.anything()
      );

      // Verify response structure
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('detectedIntent');
      expect(response.body.data.detectedIntent.type).toBe('MARK_COMPLETE');
      expect(response.body.data.requiresConfirmation).toBe(true);
    });

    it('should detect MARK_IN_COMPLETE intent correctly', async () => {
      // Arrange
      const mockResponse = {
        success: true,
        data: {
          responseText: 'I\'ve marked the task as incomplete.',
          requiresConfirmation: true, // Destructive action should require confirmation
          actionPlan: [{
            operation: 'UPDATE',
            payload: {
              id: 'task-123',
              status: 'PENDING'
            },
            apiEndpoint: '/api/v1/tasks/task-123',
            method: 'PATCH'
          }],
          detectedIntent: {
            type: 'MARK_IN_COMPLETE',
            confidence: 0.92,
            parameters: { taskId: 'task-123' }
          }
        }
      };

      mockAI_Agent.processChat.mockResolvedValue(mockResponse);

      const requestBody = {
        message: 'Mark task #123 as incomplete',
        sessionId: 'test-session-123'
      };

      // Act
      const response = await request(app)
        .post('/api/v1/ai/chat')
        .send(requestBody)
        .expect(200);

      // Assert
      expect(response.body).toEqual(mockResponse);
      expect(mockAI_Agent.processChat).toHaveBeenCalledWith(
        requestBody.message,
        requestBody.sessionId,
        expect.anything()
      );

      // Verify response structure
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('detectedIntent');
      expect(response.body.data.detectedIntent.type).toBe('MARK_IN_COMPLETE');
      expect(response.body.data.requiresConfirmation).toBe(true);
    });
  });

  describe('Advanced Intent Processing - DELETE_TASK', () => {
    it('should detect DELETE_TASK intent correctly', async () => {
      // Arrange
      const mockResponse = {
        success: true,
        data: {
          responseText: 'I\'ve deleted the task.',
          requiresConfirmation: true, // Destructive action should require confirmation
          actionPlan: [{
            operation: 'DELETE',
            payload: {
              id: 'task-123'
            },
            apiEndpoint: '/api/v1/tasks/task-123',
            method: 'DELETE'
          }],
          detectedIntent: {
            type: 'DELETE_TASK',
            confidence: 0.98,
            parameters: { taskId: 'task-123' }
          }
        }
      };

      mockAI_Agent.processChat.mockResolvedValue(mockResponse);

      const requestBody = {
        message: 'Delete task #123',
        sessionId: 'test-session-123'
      };

      // Act
      const response = await request(app)
        .post('/api/v1/ai/chat')
        .send(requestBody)
        .expect(200);

      // Assert
      expect(response.body).toEqual(mockResponse);
      expect(mockAI_Agent.processChat).toHaveBeenCalledWith(
        requestBody.message,
        requestBody.sessionId,
        expect.anything()
      );

      // Verify response structure
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('detectedIntent');
      expect(response.body.data.detectedIntent.type).toBe('DELETE_TASK');
      expect(response.body.data.requiresConfirmation).toBe(true);
    });

    it('should detect DELETE_TASK intent with fuzzy matching', async () => {
      // Arrange
      const mockResponse = {
        success: true,
        data: {
          responseText: 'I\'ve deleted the task.',
          requiresConfirmation: true,
          actionPlan: [{
            operation: 'DELETE',
            payload: {
              id: 'task-456'
            },
            apiEndpoint: '/api/v1/tasks/task-456',
            method: 'DELETE'
          }],
          detectedIntent: {
            type: 'DELETE_TASK',
            confidence: 0.85,
            parameters: { taskId: 'task-456' }
          }
        }
      };

      mockAI_Agent.processChat.mockResolvedValue(mockResponse);

      const requestBody = {
        message: 'Remove that task from my list',
        sessionId: 'test-session-123'
      };

      // Act
      const response = await request(app)
        .post('/api/v1/ai/chat')
        .send(requestBody)
        .expect(200);

      // Assert
      expect(response.body).toEqual(mockResponse);
      expect(mockAI_Agent.processChat).toHaveBeenCalledWith(
        requestBody.message,
        requestBody.sessionId,
        expect.anything()
      );

      // Verify response structure
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('detectedIntent');
      expect(response.body.data.detectedIntent.type).toBe('DELETE_TASK');
      expect(response.body.data.requiresConfirmation).toBe(true);
    });
  });

  describe('Advanced Intent Processing - SET_PRIORITY', () => {
    it('should detect SET_PRIORITY intent correctly', async () => {
      // Arrange
      const mockResponse = {
        success: true,
        data: {
          responseText: 'I\'ve set the priority to HIGH.',
          requiresConfirmation: false,
          actionPlan: [{
            operation: 'UPDATE',
            payload: {
              id: 'task-789',
              priority: 'HIGH'
            },
            apiEndpoint: '/api/v1/tasks/task-789',
            method: 'PATCH'
          }],
          detectedIntent: {
            type: 'SET_PRIORITY',
            confidence: 0.90,
            parameters: { taskId: 'task-789', priority: 'HIGH' }
          }
        }
      };

      mockAI_Agent.processChat.mockResolvedValue(mockResponse);

      const requestBody = {
        message: 'Set the priority of task #789 to high',
        sessionId: 'test-session-123'
      };

      // Act
      const response = await request(app)
        .post('/api/v1/ai/chat')
        .send(requestBody)
        .expect(200);

      // Assert
      expect(response.body).toEqual(mockResponse);
      expect(mockAI_Agent.processChat).toHaveBeenCalledWith(
        requestBody.message,
        requestBody.sessionId,
        expect.anything()
      );

      // Verify response structure
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('detectedIntent');
      expect(response.body.data.detectedIntent.type).toBe('SET_PRIORITY');
      expect(response.body.data.requiresConfirmation).toBe(false);
    });

    it('should detect SET_PRIORITY with different priority levels', async () => {
      // Arrange
      const mockResponse = {
        success: true,
        data: {
          responseText: 'I\'ve set the priority to LOW.',
          requiresConfirmation: false,
          actionPlan: [{
            operation: 'UPDATE',
            payload: {
              id: 'task-abc',
              priority: 'LOW'
            },
            apiEndpoint: '/api/v1/tasks/task-abc',
            method: 'PATCH'
          }],
          detectedIntent: {
            type: 'SET_PRIORITY',
            confidence: 0.88,
            parameters: { taskId: 'task-abc', priority: 'LOW' }
          }
        }
      };

      mockAI_Agent.processChat.mockResolvedValue(mockResponse);

      const requestBody = {
        message: 'Change the priority of task abc to low',
        sessionId: 'test-session-123'
      };

      // Act
      const response = await request(app)
        .post('/api/v1/ai/chat')
        .send(requestBody)
        .expect(200);

      // Assert
      expect(response.body).toEqual(mockResponse);
      expect(mockAI_Agent.processChat).toHaveBeenCalledWith(
        requestBody.message,
        requestBody.sessionId,
        expect.anything()
      );

      // Verify response structure
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('detectedIntent');
      expect(response.body.data.detectedIntent.type).toBe('SET_PRIORITY');
      expect(response.body.data.requiresConfirmation).toBe(false);
    });
  });

  describe('Advanced Intent Processing - SET_DUE_DATE', () => {
    it('should detect SET_DUE_DATE intent correctly', async () => {
      // Arrange
      const dueDate = '2023-12-31';
      const mockResponse = {
        success: true,
        data: {
          responseText: `I've set the due date to ${new Date(dueDate).toLocaleDateString()}.`,
          requiresConfirmation: false,
          actionPlan: [{
            operation: 'UPDATE',
            payload: {
              id: 'task-def',
              dueDate: new Date(dueDate)
            },
            apiEndpoint: '/api/v1/tasks/task-def',
            method: 'PATCH'
          }],
          detectedIntent: {
            type: 'SET_DUE_DATE',
            confidence: 0.93,
            parameters: { taskId: 'task-def', dueDate: new Date(dueDate) }
          }
        }
      };

      mockAI_Agent.processChat.mockResolvedValue(mockResponse);

      const requestBody = {
        message: `Set the due date of task def to ${dueDate}`,
        sessionId: 'test-session-123'
      };

      // Act
      const response = await request(app)
        .post('/api/v1/ai/chat')
        .send(requestBody)
        .expect(200);

      // Assert
      expect(response.body).toEqual(mockResponse);
      expect(mockAI_Agent.processChat).toHaveBeenCalledWith(
        requestBody.message,
        requestBody.sessionId,
        expect.anything()
      );

      // Verify response structure
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('detectedIntent');
      expect(response.body.data.detectedIntent.type).toBe('SET_DUE_DATE');
      expect(response.body.data.requiresConfirmation).toBe(false);
    });

    it('should handle natural language date expressions', async () => {
      // Arrange
      const mockResponse = {
        success: true,
        data: {
          responseText: 'I\'ve updated the due date.',
          requiresConfirmation: false,
          actionPlan: [{
            operation: 'UPDATE',
            payload: {
              id: 'task-xyz',
              dueDate: new Date('2023-12-25') // Christmas
            },
            apiEndpoint: '/api/v1/tasks/task-xyz',
            method: 'PATCH'
          }],
          detectedIntent: {
            type: 'SET_DUE_DATE',
            confidence: 0.85,
            parameters: {
              taskId: 'task-xyz',
              dueDate: new Date('2023-12-25'),
              naturalLanguageDate: 'Christmas day'
            }
          }
        }
      };

      mockAI_Agent.processChat.mockResolvedValue(mockResponse);

      const requestBody = {
        message: 'Set the due date of task xyz to Christmas day',
        sessionId: 'test-session-123'
      };

      // Act
      const response = await request(app)
        .post('/api/v1/ai/chat')
        .send(requestBody)
        .expect(200);

      // Assert
      expect(response.body).toEqual(mockResponse);
      expect(mockAI_Agent.processChat).toHaveBeenCalledWith(
        requestBody.message,
        requestBody.sessionId,
        expect.anything()
      );

      // Verify response structure
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('detectedIntent');
      expect(response.body.data.detectedIntent.type).toBe('SET_DUE_DATE');
    });
  });

  describe('Advanced Intent Processing - COMPLEX QUERIES', () => {
    it('should detect LIST_TASKS intent correctly', async () => {
      // Arrange
      const mockResponse = {
        success: true,
        data: {
          responseText: 'Here are your high priority tasks:',
          requiresConfirmation: false,
          actionPlan: [{
            operation: 'READ',
            payload: {
              filters: { priority: 'HIGH' }
            },
            apiEndpoint: '/api/v1/tasks',
            method: 'GET'
          }],
          detectedIntent: {
            type: 'LIST_TASKS',
            confidence: 0.91,
            parameters: { filters: { priority: 'HIGH' } }
          }
        }
      };

      mockAI_Agent.processChat.mockResolvedValue(mockResponse);

      const requestBody = {
        message: 'Show me my high priority tasks',
        sessionId: 'test-session-123'
      };

      // Act
      const response = await request(app)
        .post('/api/v1/ai/chat')
        .send(requestBody)
        .expect(200);

      // Assert
      expect(response.body).toEqual(mockResponse);
      expect(mockAI_Agent.processChat).toHaveBeenCalledWith(
        requestBody.message,
        requestBody.sessionId,
        expect.anything()
      );

      // Verify response structure
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('detectedIntent');
      expect(response.body.data.detectedIntent.type).toBe('LIST_TASKS');
    });

    it('should detect SEARCH_TASKS intent correctly', async () => {
      // Arrange
      const mockResponse = {
        success: true,
        data: {
          responseText: 'I found 2 tasks containing "groceries":',
          requiresConfirmation: false,
          actionPlan: [{
            operation: 'READ',
            payload: {
              searchQuery: 'groceries'
            },
            apiEndpoint: '/api/v1/tasks/search',
            method: 'GET'
          }],
          detectedIntent: {
            type: 'SEARCH_TASKS',
            confidence: 0.89,
            parameters: { searchTerm: 'groceries' }
          }
        }
      };

      mockAI_Agent.processChat.mockResolvedValue(mockResponse);

      const requestBody = {
        message: 'Find tasks about groceries',
        sessionId: 'test-session-123'
      };

      // Act
      const response = await request(app)
        .post('/api/v1/ai/chat')
        .send(requestBody)
        .expect(200);

      // Assert
      expect(response.body).toEqual(mockResponse);
      expect(mockAI_Agent.processChat).toHaveBeenCalledWith(
        requestBody.message,
        requestBody.sessionId,
        expect.anything()
      );

      // Verify response structure
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('detectedIntent');
      expect(response.body.data.detectedIntent.type).toBe('SEARCH_TASKS');
    });
  });
});