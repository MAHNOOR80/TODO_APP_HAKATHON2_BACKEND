/**
 * AI Session Model
 * Represents an AI conversation session with context and memory
 */

import {
  AIConversationSession,
  IntentType
} from '../types/ai.types';

/**
 * In-memory session store for demonstration purposes
 * In a production environment, this would use Redis, database, or other persistent storage
 */
class InMemorySessionStore {
  private sessions: Map<string, AIConversationSession> = new Map();
  private readonly cleanupInterval: number = 300000; // 5 minutes
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupTimer();
  }

  async get(sessionId: string): Promise<AIConversationSession | null> {
    const session = this.sessions.get(sessionId) || null;

    // Check if session is expired and clean it up if needed
    if (session && session.expiresAt && new Date() > new Date(session.expiresAt)) {
      await this.delete(sessionId);
      return null;
    }

    return session;
  }

  async set(session: AIConversationSession): Promise<void> {
    this.sessions.set(session.sessionId, session);
  }

  async delete(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  async update(session: AIConversationSession): Promise<void> {
    // Update last active timestamp
    session.lastActiveAt = new Date();
    this.sessions.set(session.sessionId, session);
  }

  /**
   * Start periodic cleanup of expired sessions
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredSessionsSync();
    }, this.cleanupInterval);
  }

  /**
   * Cleanup expired sessions synchronously
   */
  cleanupExpiredSessionsSync(): void {
    const now = new Date();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAt && now > new Date(session.expiresAt)) {
        this.sessions.delete(sessionId);
      }
    }
  }

  /**
   * Stop the cleanup timer
   */
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// Initialize the session store
export const aiSessionStore = new InMemorySessionStore();

/**
 * AI Session Model
 * Manages conversation session lifecycle and context
 */
export class AISessionModel {
  /**
   * Create a new AI conversation session
   */
  static async create(userId: string, sessionId?: string): Promise<AIConversationSession> {
    const actualSessionId = sessionId || `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const session: AIConversationSession = {
      sessionId: actualSessionId,
      userId,
      context: {
        recentTasks: [],
        lastIntent: undefined,
        pendingConfirmation: false
      },
      createdAt: new Date(),
      lastActiveAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };

    await aiSessionStore.set(session);
    return session;
  }

  /**
   * Get an existing AI conversation session
   */
  static async get(sessionId: string): Promise<AIConversationSession | null> {
    return await aiSessionStore.get(sessionId);
  }

  /**
   * Update an existing AI conversation session
   */
  static async update(session: AIConversationSession): Promise<AIConversationSession> {
    session.lastActiveAt = new Date();
    await aiSessionStore.update(session);
    return session;
  }

  /**
   * Delete an AI conversation session
   */
  static async delete(sessionId: string): Promise<void> {
    await aiSessionStore.delete(sessionId);
  }

  /**
   * Add a task ID to the recent tasks context
   */
  static async addRecentTask(sessionId: string, taskId: string): Promise<void> {
    const session = await this.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Add task to recent tasks, keeping only the last 5
    session.context.recentTasks = [taskId, ...(session.context.recentTasks || [])].slice(0, 5);
    await this.update(session);
  }

  /**
   * Update the last intent for the session
   */
  static async updateLastIntent(sessionId: string, intentType: string): Promise<void> {
    const session = await this.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.context.lastIntent = intentType as IntentType;
    await this.update(session);
  }

  /**
   * Set pending confirmation status
   */
  static async setPendingConfirmation(sessionId: string, pending: boolean): Promise<void> {
    const session = await this.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.context.pendingConfirmation = pending;
    await this.update(session);
  }

  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions(): Promise<void> {
    aiSessionStore.cleanupExpiredSessionsSync();
  }

  /**
   * Shutdown the session store gracefully
   */
  static async shutdown(): Promise<void> {
    aiSessionStore.stopCleanupTimer();
  }
}