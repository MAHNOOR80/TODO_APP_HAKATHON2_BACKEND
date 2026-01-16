/**
 * AI Types Module
 * Defines TypeScript interfaces for AI-related data structures
 */

// Enum for different types of user intents
export enum IntentType {
  CREATE_TASK = 'CREATE_TASK',
  UPDATE_TASK = 'UPDATE_TASK',
  DELETE_TASK = 'DELETE_TASK',
  SEARCH_TASKS = 'SEARCH_TASKS',
  MARK_COMPLETE = 'MARK_COMPLETE',
  MARK_INCOMPLETE = 'MARK_INCOMPLETE',
  SET_PRIORITY = 'SET_PRIORITY',
  SET_DUE_DATE = 'SET_DUE_DATE',
  SET_REMINDER = 'SET_REMINDER',
  CREATE_RECURRING_TASK = 'CREATE_RECURRING_TASK',
  GREETING = 'GREETING',
  UNKNOWN = 'UNKNOWN'
}

// Enum for priority levels
export enum PriorityLevel {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

// Enum for recurrence patterns
export enum RecurrencePattern {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY'
}

// Enum for task operation types
export enum TaskOperation {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  SEARCH = 'SEARCH',
  MARK_COMPLETE = 'MARK_COMPLETE',
  MARK_INCOMPLETE = 'MARK_INCOMPLETE'
}

// Interface for extracted parameters from user input
export interface ExtractedParameters {
  taskTitle?: string;
  taskDescription?: string;
  taskId?: string;
  priority?: PriorityLevel;
  dueDate?: string; // ISO date string
  category?: string;
  tags?: string[];
  recurrencePattern?: RecurrencePattern;
  reminderOffset?: number; // minutes before due date
}

// Interface for detected user intent
export interface UserIntent {
  type: IntentType;
  confidence: number; // 0-1 scale
  parameters: ExtractedParameters;
}

// Interface for AI response structure
export interface AIResponse {
  id: string;
  sessionId: string;
  userInput: string;
  detectedIntent: UserIntent;
  actionPlan: TaskOperationPlan[];
  responseText: string;
  requiresConfirmation: boolean;
  timestamp: Date;
}

// Interface for a planned task operation
export interface TaskOperationPlan {
  operation: TaskOperation;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  payload?: any;
}

// Interface for AI conversation session
export interface AIConversationSession {
  sessionId: string;
  userId: string;
  context: {
    recentTasks?: string[]; // IDs of recently referenced tasks
    lastIntent?: IntentType;
    pendingConfirmation?: boolean;
  };
  createdAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;
}

// Interface for AI chat request
export interface AIChatRequest {
  message: string;
  sessionId?: string;
}

// Interface for AI chat response
export interface AIChatResponse {
  success: boolean;
  data?: {
    responseText: string;
    requiresConfirmation: boolean;
    actionPlan: TaskOperationPlan[];
    detectedIntent: UserIntent;
  };
  error?: {
    code: string;
    message: string;
  };
}