import OpenAI from 'openai';

export interface AIConfig {
  apiKey: string;
  baseURL: string;
  modelName: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
}

const DEFAULT_AI_CONFIG: AIConfig = {
  apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || '',
  // KEY CHANGE: Point to OpenRouter
  baseURL: process.env.AI_BASE_URL || 'https://openrouter.ai/api/v1',
  // KEY CHANGE: Use the model that is working for you in Python
  modelName: process.env.AI_MODEL_NAME || 'meta-llama/llama-3.3-70b-instruct:free',
  temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
  maxTokens: parseInt(process.env.AI_MAX_TOKENS || '1000', 10),
  timeout: parseInt(process.env.AI_TIMEOUT || '30000', 10),
};

export function getAIConfig(): AIConfig {
  const config = { ...DEFAULT_AI_CONFIG };
  if (!config.apiKey) {
    console.warn('Warning: AI API key is missing. Set OPENROUTER_API_KEY.');
  }
  return config;
}

export function initializeOpenAIClient(): OpenAI {
  const config = getAIConfig();
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    // KEY CHANGE: OpenRouter requires these specific headers
    defaultHeaders: {
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "Todo AI Assistant",
    }
  });
}

export const aiConfig = getAIConfig();
export default aiConfig;