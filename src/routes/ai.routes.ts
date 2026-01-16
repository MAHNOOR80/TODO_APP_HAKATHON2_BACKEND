import express, { Request, Response, Router } from 'express';
import { aiConfig, initializeOpenAIClient } from '../config/ai.config';
import { AIChatRequest, AIChatResponse } from '../types/ai.types';
import { AI_Agent } from '../ai/agent';
import { requireAuth } from '../middleware/auth.middleware';
import { aiRateLimiter, validateAIChatInput, sanitizeAIResponse } from '../middleware/ai-security.middleware';

// Initialize the AI agent
const aiAgent = new AI_Agent(initializeOpenAIClient(), aiConfig);

const router: Router = express.Router();

/**
 * POST /api/v1/ai/chat
 * Process natural language input for todo management
 */
router.post('/chat', requireAuth, aiRateLimiter, validateAIChatInput, async (req: Request, res: Response) => {
  try {
    const { message, sessionId }: AIChatRequest = req.body;

    // Process the AI chat request
    const result: AIChatResponse = await aiAgent.processChat(message, sessionId, req.userId);

    // Sanitize the response before sending
    const sanitizedResult = sanitizeAIResponse(result);
    res.status(200).json(sanitizedResult);
  } catch (error) {
    console.error('AI Chat Error:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred processing your request'
      }
    });
  }
});

export default router;