import OpenAI from 'openai';
import { AIConfig } from '../config/ai.config';
import {
  AIChatResponse,
  TaskOperationPlan,
  AIConversationSession,
  TaskOperation,
  IntentType
} from '../types/ai.types';
import { AISessionModel } from '../models/ai-session.model';

// --- DEFINITIONS ---

const TOOLS_SCHEMA: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Create a new task. Extract all details like description, priority, tags, and due dates.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "The main task title" },
          description: { type: "string", description: "Any additional details" },
          priority: { type: "string", enum: ["low", "medium", "high"], description: "Priority level" },
          due_date: { type: "string", description: "ISO 8601 date string (YYYY-MM-DD)." },
          category: { type: "string", enum: ["Work", "Personal", "Health", "Finance", "Education"] },
          tags: { type: "string", description: "Comma separated tags e.g. 'work, urgent'" }
        },
        required: ["title"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_task",
      description: "Delete an existing task immediately by its title.",
      parameters: {
        type: "object",
        properties: {
          target_title: { type: "string", description: "The title of the task to delete" }
        },
        required: ["target_title"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_task",
      description: "Update details of a task (title, priority, tags) or mark it as complete/incomplete.",
      parameters: {
        type: "object",
        properties: {
          target_title: { type: "string", description: "The CURRENT title of the task to find" },
          action: { type: "string", enum: ["update_details", "mark_complete", "mark_incomplete"] },
          new_title: { type: "string" },
          new_description: { type: "string" },
          new_priority: { type: "string", enum: ["low", "medium", "high"] },
          new_tags: { type: "string", description: "New tags to replace existing ones" },
          new_due_date: { type: "string" }
        },
        required: ["target_title", "action"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_tasks",
      description: "Search or list tasks.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          priority: { type: "string" },
          status: { type: "string" }
        }
      }
    }
  }
];

export class AI_Agent {
  constructor(
    private openaiClient: OpenAI,
    private config: AIConfig
  ) {}

  async processChat(message: string, sessionId?: string, userId?: string): Promise<AIChatResponse> {
    try {
      // 1. Manage Session
      const session = await this.getSession(sessionId, userId);

      // 2. Prepare Context
      const systemPrompt = `
        You are an intelligent Task Orchestrator.
        Today's date is ${new Date().toLocaleDateString()}.
        
        YOUR RULES:
        1. **Direct Action**: You are authorized to modify tasks immediately.
        2. **Create**: Extract details like priority/dates/tags. 
           - Example: "Add urgent task #work" -> priority: high, tags: "work"
        3. **Delete**: If user says delete, do it immediately.
        4. **Dates**: Convert "tomorrow", "next friday" to YYYY-MM-DD.
      `;

      // 3. Call OpenRouter
      const completion = await this.openaiClient.chat.completions.create({
        model: this.config.modelName || 'meta-llama/llama-3.3-70b-instruct:free',
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message }
        ],
        tools: TOOLS_SCHEMA,
        tool_choice: "auto", 
      });

      const responseMessage = completion.choices[0].message;
      let actionPlan: TaskOperationPlan[] = [];
      let responseText = responseMessage.content || "Processed.";
      let detectedIntentType = IntentType.UNKNOWN;
      
      const requiresConfirmation = false; 

      // 4. Handle Tool Calls
      if (responseMessage.tool_calls) {
        for (const toolCall of responseMessage.tool_calls) {
          const args = JSON.parse(toolCall.function.arguments);
          const toolName = toolCall.function.name;

          // --- CREATE ---
          if (toolName === 'create_task') {
            detectedIntentType = IntentType.CREATE_TASK;
            
            // Handle Tags: Convert "tag1, tag2" string to array ["tag1", "tag2"]
            let tagsArray: string[] = [];
            if (args.tags) {
                // Remove # symbol if user/AI added it, and split by comma
                tagsArray = args.tags.split(',').map((t: string) => t.trim().replace(/^#/, ''));
            }

            const payload: any = {
              title: args.title,
              priority: args.priority || 'medium', 
              completed: false,
              tags: tagsArray // Send array to backend
            };
            if (args.description) payload.description = args.description;
            if (args.due_date) payload.dueDate = args.due_date; 
            if (args.category) payload.category = args.category;

            actionPlan.push({
              operation: TaskOperation.CREATE,
              endpoint: '/tasks',
              method: 'POST',
              payload: payload
            });

            responseText = `I've added "**${args.title}**"`;
            if (tagsArray.length > 0) responseText += ` with tags: ${tagsArray.join(', ')}`;
            responseText += `.`;
          } 
          
          // --- DELETE (Uses Magic Endpoint) ---
          else if (toolName === 'delete_task') {
            detectedIntentType = IntentType.DELETE_TASK;
            
            const target = args.target_title;
            const safeTarget = encodeURIComponent(target);
            
            actionPlan.push({
                operation: TaskOperation.DELETE,
                // Points to the new route that finds by title
                endpoint: `/tasks/by-title?title=${safeTarget}`,
                method: 'DELETE'
            });
            responseText = `Done. I've deleted "**${target}**" from your list. 🗑️`;
          }

          // --- UPDATE / COMPLETE (Uses Magic Endpoints) ---
          else if (toolName === 'update_task') {
            const target = args.target_title;
            const safeTarget = encodeURIComponent(target);

            if (args.action === 'mark_complete') {
                detectedIntentType = IntentType.MARK_COMPLETE;
                actionPlan.push({
                    operation: TaskOperation.MARK_COMPLETE,
                    endpoint: `/tasks/by-title/complete?title=${safeTarget}`,
                    method: 'PATCH'
                });
                responseText = `Marked "**${target}**" as complete. ✅`;
            }
            else if (args.action === 'mark_incomplete') {
                detectedIntentType = IntentType.MARK_INCOMPLETE;
                actionPlan.push({
                    operation: TaskOperation.MARK_INCOMPLETE,
                    endpoint: `/tasks/by-title/incomplete?title=${safeTarget}`,
                    method: 'PATCH'
                });
                responseText = `Marked "**${target}**" as incomplete.`;
            }
            else if (args.action === 'update_details') {
                detectedIntentType = IntentType.UPDATE_TASK;
                
                const updatePayload: any = {};
                if (args.new_title) updatePayload.title = args.new_title;
                if (args.new_description) updatePayload.description = args.new_description;
                if (args.new_priority) updatePayload.priority = args.new_priority;
                if (args.new_due_date) updatePayload.dueDate = args.new_due_date;
                if (args.new_tags) {
                    updatePayload.tags = args.new_tags.split(',').map((t: string) => t.trim().replace(/^#/, ''));
                }

                actionPlan.push({
                    operation: TaskOperation.UPDATE,
                    endpoint: `/tasks/by-title?title=${safeTarget}`,
                    method: 'PUT',
                    payload: updatePayload
                });
                responseText = `Updated details for "**${target}**". 📝`;
            }
          }

          // --- SEARCH ---
          else if (toolName === 'search_tasks') {
            detectedIntentType = IntentType.SEARCH_TASKS;
            const params = new URLSearchParams();
            if (args.query) params.append('search', args.query);
            if (args.priority) params.append('priority', args.priority);
            if (args.status) params.append('status', args.status);
            
            actionPlan.push({
                operation: TaskOperation.SEARCH,
                endpoint: `/tasks?${params.toString()}`,
                method: 'GET'
            });
            responseText = "Here are your tasks.";
          }
        }
      }

      // 5. Update Session
      session.lastActiveAt = new Date();
      session.context.lastIntent = detectedIntentType;
      await AISessionModel.update(session);

      return {
        success: true,
        data: {
          responseText,
          requiresConfirmation,
          actionPlan,
          detectedIntent: {
            type: detectedIntentType,
            confidence: 1.0,
            parameters: {}
          }
        }
      };

    } catch (error) {
      console.error('AI Agent Error:', error);
      return {
        success: false,
        error: {
          code: 'AI_PROCESSING_ERROR',
          message: 'Failed to process AI request'
        }
      };
    }
  }

  private async getSession(sessionId?: string, userId?: string): Promise<AIConversationSession> {
    if (sessionId) {
      const existingSession = await AISessionModel.get(sessionId);
      if (existingSession) return existingSession;
    }
    return await AISessionModel.create(userId || 'anonymous', sessionId);
  }
}