import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

// Rate limiter for AI endpoints - limit to 100 requests per 15 minutes per IP
export const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for sensitive operations like task deletion - limit to 10 requests per 15 minutes per IP
export const aiSensitiveRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 sensitive requests per windowMs
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many sensitive requests from this IP, please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Input validation middleware for AI chat requests
export const validateAIChatInput = (req: Request, res: Response, next: NextFunction) => {
  const { message, sessionId } = req.body;

  // Validate message exists and is not empty
  if (!message || typeof message !== 'string') {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'Message is required and must be a string'
      }
    });
    return; // Explicit return to satisfy TypeScript
  }

  // Sanitize the message input - remove potentially harmful content
  const sanitizedMessage = message.trim().substring(0, 1000); // Limit length to 1000 characters
  req.body.message = sanitizedMessage;

  // Validate session ID format if provided (should be alphanumeric with optional hyphens/underscores)
  if (sessionId && (typeof sessionId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(sessionId))) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_SESSION_ID',
        message: 'Session ID must be a valid alphanumeric string with optional hyphens or underscores'
      }
    });
    return; // Explicit return to satisfy TypeScript
  }

  next();
};

// Validate confirmation actions
export const validateConfirmationInput = (req: Request, res: Response, next: NextFunction) => {
  const { sessionId, actionId } = req.body;

  if (!sessionId || typeof sessionId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(sessionId)) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_SESSION_ID',
        message: 'Valid session ID is required'
      }
    });
    return; // Explicit return to satisfy TypeScript
  }

  if (!actionId || typeof actionId !== 'string') {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ACTION_ID',
        message: 'Valid action ID is required'
      }
    });
    return; // Explicit return to satisfy TypeScript
  }

  next();
};

// Sanitize AI response to prevent potential injection issues
export const sanitizeAIResponse = (response: any): any => {
  if (typeof response !== 'object' || response === null) {
    return response;
  }

  // Create a sanitized copy of the response
  const sanitized = JSON.parse(JSON.stringify(response));

  // Sanitize response text if it exists
  if (sanitized.data && sanitized.data.responseText) {
    // Remove potentially harmful content from response text
    sanitized.data.responseText = sanitized.data.responseText
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/vbscript:/gi, '') // Remove vbscript: protocol
      .substring(0, 5000); // Limit response length
  }

  return sanitized;
};