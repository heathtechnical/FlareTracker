import OpenAI from 'openai';

// Check if API key is configured
const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

if (!apiKey) {
  console.warn('OpenAI API key not found. Please set VITE_OPENAI_API_KEY in your environment variables.');
}

if (apiKey === 'PLACEHOLDER') {
  console.warn('OpenAI API key is set to placeholder value. Please update with a real API key.');
}

// Initialize OpenAI client
const openai = apiKey ? new OpenAI({
  apiKey: apiKey,
  dangerouslyAllowBrowser: true // Note: In production, you'd want to use a backend proxy
}) : null;

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CheckInContext {
  userName: string;
  conditions: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
  medications: Array<{
    id: string;
    name: string;
    frequency: string;
  }>;
  currentFormData: any;
}

export class OpenAIService {
  private static instance: OpenAIService;
  
  public static getInstance(): OpenAIService {
    if (!OpenAIService.instance) {
      OpenAIService.instance = new OpenAIService();
    }
    return OpenAIService.instance;
  }

  async sendMessage(
    messages: ChatMessage[],
    context: CheckInContext
  ): Promise<string> {
    // Check if OpenAI is properly configured
    if (!openai) {
      if (!apiKey) {
        throw new Error('OpenAI API key not configured. Please set VITE_OPENAI_API_KEY in your environment variables.');
      }
      if (apiKey === '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') {
        throw new Error('OpenAI API key is set to placeholder value. Please update with a real API key.');
      }
      throw new Error('OpenAI client not initialized properly.');
    }

    try {
      console.log('Sending request to OpenAI...', {
        messageCount: messages.length,
        hasSystemPrompt: messages.some(m => m.role === 'system')
      });

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: messages,
        max_tokens: 500,
        temperature: 0.7,
        presence_penalty: 0.3,
        frequency_penalty: 0.3
      });

      console.log('OpenAI response received:', {
        choices: response.choices.length,
        usage: response.usage
      });

      const content = response.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No response content received from OpenAI');
      }

      return content.trim();
    } catch (error: any) {
      console.error('OpenAI API error:', error);
      
      // Handle specific OpenAI errors
      if (error.code === 'invalid_api_key') {
        throw new Error('Invalid OpenAI API key. Please check your API key configuration.');
      }
      
      if (error.code === 'insufficient_quota') {
        throw new Error('OpenAI API quota exceeded. Please check your billing and usage limits.');
      }
      
      if (error.code === 'rate_limit_exceeded') {
        throw new Error('OpenAI API rate limit exceeded. Please try again in a moment.');
      }
      
      if (error.code === 'model_not_found') {
        throw new Error('OpenAI model not found. The requested model may not be available.');
      }
      
      if (error.message?.includes('network') || error.message?.includes('fetch')) {
        throw new Error('Network error connecting to OpenAI. Please check your internet connection.');
      }
      
      if (error.message?.includes('API key')) {
        throw new Error('OpenAI API key error. Please verify your API key is correct and active.');
      }
      
      // Generic error handling
      throw new Error(`OpenAI API error: ${error.message || 'Unknown error occurred'}`);
    }
  }

  // Test connection method
  async testConnection(): Promise<boolean> {
    if (!openai) {
      return false;
    }

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: 'Test connection - please respond with "OK"'
          }
        ],
        max_tokens: 10,
        temperature: 0
      });

      return !!response.choices[0]?.message?.content;
    } catch (error) {
      console.error('OpenAI connection test failed:', error);
      return false;
    }
  }
}

export const openaiService = OpenAIService.getInstance();