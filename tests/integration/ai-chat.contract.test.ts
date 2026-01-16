import request from 'supertest';
import express from 'express';
import { aiRouter } from '../../src/routes/ai.routes';
import { AIConfig } from '../../src/config/ai.config';
import { AI_Agent } from '../../src/ai/agent';

// Mock the AI agent and OpenAI client
jest.mock('../../src/ai/agent');
jest.mock('openai');

describe('AI Chat Contract Tests', () => {
  let app: express.Application;
  const mockAIConfig = new AIConfig();

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

  describe('POST /api/v1/ai/chat', () => {
    it('should return 200 and valid response when request is valid', async () => {
      // Arrange
      const mockResponse = {
        success: true,
        data: {
          responseText: 'Task created successfully',
          requiresConfirmation: false,
          actionPlan: [],
          detectedIntent: {
            type: 'CREATE_TASK',
            confidence: 0.9,
            parameters: { title: 'Test task' }
          }
        }
      };

      mockAI_Agent.processChat.mockResolvedValue(mockResponse);

      const requestBody = {
        message: 'Create a task to buy groceries',
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
        expect.anything() // userId from auth middleware
      );
    });

    it('should return 400 when message is missing', async () => {
      // Arrange
      const requestBody = {
        sessionId: 'test-session-123'
        // Missing message field
      };

      // Act & Assert
      const response = await request(app)
        .post('/api/v1/ai/chat')
        .send(requestBody)
        .expect(400);

      expect(response.body).toEqual({
        error: 'Message is required',
        success: false
      });
    });

    it('should return 400 when message is empty', async () => {
      // Arrange
      const requestBody = {
        message: '',
        sessionId: 'test-session-123'
      };

      // Act & Assert
      const response = await request(app)
        .post('/api/v1/ai/chat')
        .send(requestBody)
        .expect(400);

      expect(response.body).toEqual({
        error: 'Message is required',
        success: false
      });
    });

    it('should return 500 when AI agent throws an error', async () => {
      // Arrange
      mockAI_Agent.processChat.mockRejectedValue(new Error('AI service unavailable'));

      const requestBody = {
        message: 'Create a task',
        sessionId: 'test-session-123'
      };

      // Act & Assert
      const response = await request(app)
        .post('/api/v1/ai/chat')
        .send(requestBody)
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to process AI request',
        success: false
      });
    });

    it('should handle confirmation flows properly', async () => {
      // Arrange
      const mockConfirmationResponse = {
        success: true,
        data: {
          responseText: 'Action confirmed and executed successfully.',
          requiresConfirmation: false,
          actionPlan: [],
          detectedIntent: null
        }
      };

      mockAI_Agent.processChat.mockResolvedValue(mockConfirmationResponse);

      const requestBody = {
        message: 'Delete my important task',
        sessionId: 'test-session-123',
        confirm: true
      };

      // Act
      const response = await request(app)
        .post('/api/v1/ai/chat')
        .send(requestBody)
        .expect(200);

      // Assert
      expect(response.body).toEqual(mockConfirmationResponse);
      expect(mockAI_Agent.processChat).toHaveBeenCalledWith(
        requestBody.message,
        requestBody.sessionId,
        expect.anything() // userId from auth middleware
      );
    });

    it('should validate response structure', async () => {
      // Arrange
      const mockResponse = {
        success: true,
        data: {
          responseText: 'Task updated',
          requiresConfirmation: false,
          actionPlan: [],
          detectedIntent: {
            type: 'MARK_COMPLETE',
            confidence: 0.85,
            parameters: { taskId: 'task-123' }
          }
        }
      };

      mockAI_Agent.processChat.mockResolvedValue(mockResponse);

      const requestBody = {
        message: 'Mark task as complete',
        sessionId: 'test-session-123'
      };

      // Act
      const response = await request(app)
        .post('/api/v1/ai/chat')
        .send(requestBody)
        .expect(200);

      // Assert - Check that response has the expected structure
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('responseText');
      expect(response.body.data).toHaveProperty('requiresConfirmation');
      expect(response.body.data).toHaveProperty('actionPlan');
      expect(response.body.data).toHaveProperty('detectedIntent');
    });
  });
});