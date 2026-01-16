import request from 'supertest';
import express from 'express';
import { aiRouter } from '../../src/routes/ai.routes';

// Mock the AI agent and OpenAI client
jest.mock('../../src/ai/agent');
jest.mock('openai');

describe('AI Context Management Contract Tests', () => {
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

  describe('Session Context Management', () => {
    it('should maintain conversation context across multiple requests with same session', async () => {
      // Arrange
      const sessionId = 'session-context-test-123';

      // First request - create a task
      const firstResponse = {
        success: true,
        data: {
          responseText: 'I\'ve created a task titled "Important meeting prep".',
          requiresConfirmation: false,
          actionPlan: [{
            operation: 'CREATE',
            payload: {
              title: 'Important meeting prep',
              description: 'Created via AI assistant',
              status: 'PENDING'
            },
            apiEndpoint: '/api/v1/tasks',
            method: 'POST'
          }],
          detectedIntent: {
            type: 'CREATE_TASK',
            confidence: 0.95,
            parameters: { title: 'Important meeting prep' }
          }
        }
      };

      // Second request - reference the previous task
      const secondResponse = {
        success: true,
        data: {
          responseText: 'I\'ve set the priority to HIGH.',
          requiresConfirmation: false,
          actionPlan: [{
            operation: 'UPDATE',
            payload: {
              id: 'task-456', // This would typically be the ID of the created task
              priority: 'HIGH'
            },
            apiEndpoint: '/api/v1/tasks/task-456',
            method: 'PATCH'
          }],
          detectedIntent: {
            type: 'SET_PRIORITY',
            confidence: 0.90,
            parameters: { taskId: 'task-456', priority: 'HIGH' }
          }
        }
      };

      // Mock the agent to return different responses based on the message content
      mockAI_Agent.processChat.mockImplementation(async (message: string) => {
        if (message.includes('create')) {
          return firstResponse;
        } else if (message.includes('priority') || message.includes('high')) {
          return secondResponse;
        }
        return firstResponse; // default
      });

      // First request
      const firstRequest = {
        message: 'Create a task called "Important meeting prep"',
        sessionId
      };

      // Second request - refers to the previous task
      const secondRequest = {
        message: 'Set that task to high priority',
        sessionId
      };

      // Act - First request
      const firstResponseActual = await request(app)
        .post('/api/v1/ai/chat')
        .send(firstRequest)
        .expect(200);

      // Act - Second request
      const secondResponseActual = await request(app)
        .post('/api/v1/ai/chat')
        .send(secondRequest)
        .expect(200);

      // Assert
      expect(firstResponseActual.body).toEqual(firstResponse);
      expect(secondResponseActual.body).toEqual(secondResponse);

      // Verify that the agent was called with the session ID both times
      expect(mockAI_Agent.processChat).toHaveBeenNthCalledWith(
        1,
        firstRequest.message,
        firstRequest.sessionId,
        expect.anything()
      );
      expect(mockAI_Agent.processChat).toHaveBeenNthCalledWith(
        2,
        secondRequest.message,
        secondRequest.sessionId,
        expect.anything()
      );
    });

    it('should handle different sessions independently', async () => {
      // Arrange
      const sessionId1 = 'session-1';
      const sessionId2 = 'session-2';

      const responseForSession1 = {
        success: true,
        data: {
          responseText: 'I\'ve created a task for session 1.',
          requiresConfirmation: false,
          actionPlan: [{
            operation: 'CREATE',
            payload: { title: 'Task for session 1', status: 'PENDING' },
            apiEndpoint: '/api/v1/tasks',
            method: 'POST'
          }],
          detectedIntent: {
            type: 'CREATE_TASK',
            confidence: 0.90,
            parameters: { title: 'Task for session 1' }
          }
        }
      };

      const responseForSession2 = {
        success: true,
        data: {
          responseText: 'I\'ve created a task for session 2.',
          requiresConfirmation: false,
          actionPlan: [{
            operation: 'CREATE',
            payload: { title: 'Task for session 2', status: 'PENDING' },
            apiEndpoint: '/api/v1/tasks',
            method: 'POST'
          }],
          detectedIntent: {
            type: 'CREATE_TASK',
            confidence: 0.90,
            parameters: { title: 'Task for session 2' }
          }
        }
      };

      // Mock the agent to return different responses based on session ID
      mockAI_Agent.processChat.mockImplementation(async (message: string, sessionId: string) => {
        if (sessionId === sessionId1) {
          return responseForSession1;
        }
        return responseForSession2;
      });

      // Requests for different sessions
      const request1 = {
        message: 'Create a task',
        sessionId: sessionId1
      };

      const request2 = {
        message: 'Create a task',
        sessionId: sessionId2
      };

      // Act
      const response1 = await request(app)
        .post('/api/v1/ai/chat')
        .send(request1)
        .expect(200);

      const response2 = await request(app)
        .post('/api/v1/ai/chat')
        .send(request2)
        .expect(200);

      // Assert
      expect(response1.body).toEqual(responseForSession1);
      expect(response2.body).toEqual(responseForSession2);

      // Verify that each session is handled independently
      expect(mockAI_Agent.processChat).toHaveBeenCalledWith(
        request1.message,
        request1.sessionId,
        expect.anything()
      );
      expect(mockAI_Agent.processChat).toHaveBeenCalledWith(
        request2.message,
        request2.sessionId,
        expect.anything()
      );
    });

    it('should maintain context of recent tasks within a session', async () => {
      // Arrange
      const sessionId = 'session-recent-tasks-123';

      const createResponse = {
        success: true,
        data: {
          responseText: 'I\'ve created a task titled "Follow up with client".',
          requiresConfirmation: false,
          actionPlan: [{
            operation: 'CREATE',
            payload: {
              id: 'recent-task-789',
              title: 'Follow up with client',
              status: 'PENDING'
            },
            apiEndpoint: '/api/v1/tasks',
            method: 'POST'
          }],
          detectedIntent: {
            type: 'CREATE_TASK',
            confidence: 0.92,
            parameters: { title: 'Follow up with client' }
          }
        }
      };

      const updateResponse = {
        success: true,
        data: {
          responseText: 'I\'ve marked the task as complete.',
          requiresConfirmation: true,
          actionPlan: [{
            operation: 'UPDATE',
            payload: {
              id: 'recent-task-789', // Same ID as created task
              status: 'COMPLETED'
            },
            apiEndpoint: '/api/v1/tasks/recent-task-789',
            method: 'PATCH'
          }],
          detectedIntent: {
            type: 'MARK_COMPLETE',
            confidence: 0.95,
            parameters: {
              taskId: 'recent-task-789',
              reference: 'it' // Indicates reference to previous task
            }
          }
        }
      };

      // Mock the agent to handle follow-up commands
      mockAI_Agent.processChat.mockImplementation(async (message: string) => {
        if (message.includes('create')) {
          return createResponse;
        } else if (message.includes('complete') || message.includes('it')) {
          return updateResponse;
        }
        return createResponse; // default
      });

      // Create task first
      const createRequest = {
        message: 'Create a task to follow up with client',
        sessionId
      };

      // Follow up with reference to the created task
      const followUpRequest = {
        message: 'Mark it as complete',
        sessionId
      };

      // Act - Create task
      const createResult = await request(app)
        .post('/api/v1/ai/chat')
        .send(createRequest)
        .expect(200);

      // Act - Follow up
      const followUpResult = await request(app)
        .post('/api/v1/ai/chat')
        .send(followUpRequest)
        .expect(200);

      // Assert
      expect(createResult.body).toEqual(createResponse);
      expect(followUpResult.body).toEqual(updateResponse);

      // Verify that the agent received both messages with the same session
      expect(mockAI_Agent.processChat).toHaveBeenNthCalledWith(
        1,
        createRequest.message,
        createRequest.sessionId,
        expect.anything()
      );
      expect(mockAI_Agent.processChat).toHaveBeenNthCalledWith(
        2,
        followUpRequest.message,
        followUpRequest.sessionId,
        expect.anything()
      );

      // Verify that the follow-up request correctly referenced the recent task
      expect(followUpResult.body.data.detectedIntent.parameters.reference).toBe('it');
      expect(followUpResult.body.data.actionPlan[0].payload.id).toBe('recent-task-789');
    });
  });

  describe('Context Resolution in AI Responses', () => {
    it('should resolve "it", "that", and "the task" references correctly', async () => {
      // Arrange
      const sessionId = 'context-resolution-test';

      const createResponse = {
        success: true,
        data: {
          responseText: 'I\'ve created a task titled "Review quarterly reports".',
          requiresConfirmation: false,
          actionPlan: [{
            operation: 'CREATE',
            payload: {
              id: 'task-it-reference',
              title: 'Review quarterly reports',
              status: 'PENDING'
            },
            apiEndpoint: '/api/v1/tasks',
            method: 'POST'
          }],
          detectedIntent: {
            type: 'CREATE_TASK',
            confidence: 0.90,
            parameters: { title: 'Review quarterly reports' }
          }
        }
      };

      const referenceResponse = {
        success: true,
        data: {
          responseText: 'I\'ve set the priority to HIGH.',
          requiresConfirmation: false,
          actionPlan: [{
            operation: 'UPDATE',
            payload: {
              id: 'task-it-reference', // Should reference the previously created task
              priority: 'HIGH'
            },
            apiEndpoint: '/api/v1/tasks/task-it-reference',
            method: 'PATCH'
          }],
          detectedIntent: {
            type: 'SET_PRIORITY',
            confidence: 0.88,
            parameters: {
              taskId: 'task-it-reference',
              priority: 'HIGH',
              reference: 'it' // Indicates reference to previous task
            }
          }
        }
      };

      mockAI_Agent.processChat.mockImplementation(async (message: string) => {
        if (message.includes('create')) {
          return createResponse;
        } else if (message.includes('it') || message.includes('priority')) {
          return referenceResponse;
        }
        return createResponse; // default
      });

      // Create task first
      const createRequest = {
        message: 'Create a task to review quarterly reports',
        sessionId
      };

      // Reference the task using "it"
      const referenceRequest = {
        message: 'Set it to high priority',
        sessionId
      };

      // Act - Create task
      const createResult = await request(app)
        .post('/api/v1/ai/chat')
        .send(createRequest)
        .expect(200);

      // Act - Reference task
      const referenceResult = await request(app)
        .post('/api/v1/ai/chat')
        .send(referenceRequest)
        .expect(200);

      // Assert
      expect(createResult.body).toEqual(createResponse);
      expect(referenceResult.body).toEqual(referenceResponse);

      // Verify that the reference correctly identified the task
      expect(referenceResult.body.data.actionPlan[0].payload.id).toBe('task-it-reference');
      expect(referenceResult.body.data.detectedIntent.parameters.reference).toBe('it');
    });

    it('should handle "last task", "previous task" references', async () => {
      // Arrange
      const sessionId = 'previous-task-reference-test';

      const firstCreateResponse = {
        success: true,
        data: {
          responseText: 'I\'ve created a task titled "Prepare presentation".',
          requiresConfirmation: false,
          actionPlan: [{
            operation: 'CREATE',
            payload: {
              id: 'first-task-123',
              title: 'Prepare presentation',
              status: 'PENDING'
            },
            apiEndpoint: '/api/v1/tasks',
            method: 'POST'
          }],
          detectedIntent: {
            type: 'CREATE_TASK',
            confidence: 0.91,
            parameters: { title: 'Prepare presentation' }
          }
        }
      };

      const secondCreateResponse = {
        success: true,
        data: {
          responseText: 'I\'ve created a task titled "Send follow-up email".',
          requiresConfirmation: false,
          actionPlan: [{
            operation: 'CREATE',
            payload: {
              id: 'second-task-456',
              title: 'Send follow-up email',
              status: 'PENDING'
            },
            apiEndpoint: '/api/v1/tasks',
            method: 'POST'
          }],
          detectedIntent: {
            type: 'CREATE_TASK',
            confidence: 0.93,
            parameters: { title: 'Send follow-up email' }
          }
        }
      };

      const previousReferenceResponse = {
        success: true,
        data: {
          responseText: 'I\'ve set the due date to tomorrow.',
          requiresConfirmation: false,
          actionPlan: [{
            operation: 'UPDATE',
            payload: {
              id: 'second-task-456', // Should reference the most recent task
              dueDate: new Date(Date.now() + 86400000) // Tomorrow
            },
            apiEndpoint: '/api/v1/tasks/second-task-456',
            method: 'PATCH'
          }],
          detectedIntent: {
            type: 'SET_DUE_DATE',
            confidence: 0.87,
            parameters: {
              taskId: 'second-task-456',
              dueDate: new Date(Date.now() + 86400000),
              reference: 'previous' // Indicates reference to most recent task
            }
          }
        }
      };

      mockAI_Agent.processChat.mockImplementation(async (message: string) => {
        if (message.includes('first') || message.includes('presentation')) {
          return firstCreateResponse;
        } else if (message.includes('follow-up') || message.includes('email')) {
          return secondCreateResponse;
        } else if (message.includes('previous') || message.includes('last')) {
          return previousReferenceResponse;
        }
        return firstCreateResponse; // default
      });

      // Sequence of requests
      const firstRequest = {
        message: 'Create a task to prepare presentation',
        sessionId
      };

      const secondRequest = {
        message: 'Create a task to send follow-up email',
        sessionId
      };

      const previousRequest = {
        message: 'Set the due date of the previous task to tomorrow',
        sessionId
      };

      // Act - First task
      await request(app)
        .post('/api/v1/ai/chat')
        .send(firstRequest)
        .expect(200);

      // Act - Second task
      await request(app)
        .post('/api/v1/ai/chat')
        .send(secondRequest)
        .expect(200);

      // Act - Reference previous task
      const previousResult = await request(app)
        .post('/api/v1/ai/chat')
        .send(previousRequest)
        .expect(200);

      // Assert
      expect(previousResult.body).toEqual(previousReferenceResponse);

      // Verify that the reference correctly identified the most recent task
      expect(previousResult.body.data.actionPlan[0].payload.id).toBe('second-task-456');
      expect(previousResult.body.data.detectedIntent.parameters.reference).toBe('previous');
    });
  });

  describe('Context Expiration and Cleanup', () => {
    it('should handle session expiration gracefully', async () => {
      // Arrange
      const expiredSessionId = 'expired-session-999';

      const expiredResponse = {
        success: false,
        error: {
          code: 'SESSION_EXPIRED',
          message: 'Session has expired, starting new conversation'
        }
      };

      mockAI_Agent.processChat.mockRejectedValue(new Error('Session expired'));

      const requestPayload = {
        message: 'What did we talk about earlier?',
        sessionId: expiredSessionId
      };

      // Act
      const response = await request(app)
        .post('/api/v1/ai/chat')
        .send(requestPayload)
        .expect(500);

      // Assert
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to process AI request'
      });
    });

    it('should maintain context length limits', async () => {
      // Arrange
      const sessionId = 'context-limit-test';

      const response = {
        success: true,
        data: {
          responseText: 'I understand your request.',
          requiresConfirmation: false,
          actionPlan: [],
          detectedIntent: {
            type: 'GREETING',
            confidence: 0.85,
            parameters: {}
          }
        }
      };

      mockAI_Agent.processChat.mockResolvedValue(response);

      // Simulate a conversation with many exchanges
      const conversationSteps = [
        'Create a task',
        'Update the task',
        'Add a note',
        'Change priority',
        'Set due date',
        'Add category',
        'Update description',
        'Move to different list',
        'Set reminder',
        'Share with team'
      ];

      // Act - Process multiple conversation steps
      for (let i = 0; i < conversationSteps.length; i++) {
        const stepRequest = {
          message: conversationSteps[i],
          sessionId
        };

        const stepResponse = await request(app)
          .post('/api/v1/ai/chat')
          .send(stepRequest)
          .expect(200);

        // Assert each step returns successfully
        expect(stepResponse.status).toBe(200);
        expect(stepResponse.body.success).toBe(true);

        // Verify the agent was called with the correct session
        expect(mockAI_Agent.processChat).toHaveBeenNthCalledWith(
          i + 1,
          conversationSteps[i],
          sessionId,
          expect.anything()
        );
      }

      // Verify that the total number of calls matches the conversation steps
      expect(mockAI_Agent.processChat).toHaveBeenCalledTimes(conversationSteps.length);
    });
  });
});