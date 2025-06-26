import OpenAI from 'openai';

// Check if API key is configured
const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

if (!apiKey) {
  console.warn('OpenAI API key not found. Please set VITE_OPENAI_API_KEY in your environment variables.');
}

if (apiKey === 'your_openai_api_key') {
  console.warn('OpenAI API key is set to placeholder value. Please update with a real API key.');
}

// Initialize OpenAI client
const openai = apiKey && apiKey !== 'your_openai_api_key' ? new OpenAI({
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

  private createSystemPrompt(context: CheckInContext): string {
    return `You are a helpful AI assistant for a skin health tracking app. Your ONLY job is to provide brief, empathetic acknowledgments to user responses.

CRITICAL RULES - FOLLOW EXACTLY:
1. NEVER ask questions - the system handles all questions automatically
2. NEVER include follow-up questions in your response
3. ONLY provide acknowledgment and support
4. Keep responses to 1 sentence maximum
5. Be warm and understanding
6. NEVER use question marks or question words

USER CONTEXT:
- User's name: ${context.userName}
- Conditions: ${context.conditions.map(c => c.name).join(', ')}

PERFECT RESPONSE EXAMPLES:
- "Thank you for sharing that."
- "I understand, that sounds challenging."
- "Got it, I've noted that information."
- "I'm sorry you're experiencing that."
- "That's great to hear."
- "I appreciate you letting me know."

ABSOLUTELY FORBIDDEN (NEVER DO THIS):
- Any response with "?" 
- Any response with question words (how, what, when, where, why, can, could, would, do, did, are, is, tell me, let me know)
- Multiple sentences
- Follow-up questions of any kind

REMEMBER: ACKNOWLEDGMENT ONLY. NO QUESTIONS. EVER. ONE SENTENCE MAXIMUM.`;
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
      if (apiKey === 'your_openai_api_key') {
        throw new Error('OpenAI API key is set to placeholder value. Please update with a real API key.');
      }
      throw new Error('OpenAI client not initialized properly.');
    }

    try {
      const systemMessage: ChatMessage = {
        role: 'system',
        content: this.createSystemPrompt(context)
      };

      console.log('Sending request to OpenAI...', {
        messageCount: messages.length,
        hasSystemPrompt: true
      });

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [systemMessage, ...messages],
        max_tokens: 30, // Even shorter responses
        temperature: 0.1, // Very low temperature for consistent responses
        presence_penalty: 0.5,
        frequency_penalty: 0.5,
        stop: ['?', '\n'] // Stop at question marks or newlines
      });

      console.log('OpenAI response received:', {
        choices: response.choices.length,
        usage: response.usage
      });

      const content = response.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No response content received from OpenAI');
      }

      // Ultra-aggressive cleaning
      const cleanedContent = this.ultraCleanResponse(content);

      return cleanedContent;
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

  private ultraCleanResponse(response: string): string {
    // Remove any text after question marks
    let cleaned = response.split('?')[0];
    
    // Remove any text after newlines
    cleaned = cleaned.split('\n')[0];
    
    // Split into sentences and take only the first one
    const sentences = cleaned.split(/[.!]+/).filter(s => s.trim());
    
    if (sentences.length === 0) {
      return this.getFallbackResponse();
    }
    
    let firstSentence = sentences[0].trim();
    
    // Ultra-aggressive question word filtering
    const questionWords = [
      'how', 'what', 'when', 'where', 'why', 'which', 'who', 'whom', 'whose',
      'can you', 'could you', 'would you', 'will you', 'should you',
      'do you', 'did you', 'are you', 'is there', 'have you',
      'tell me', 'let me know', 'would like', 'anything else',
      'next', 'now', 'also', 'additionally', 'furthermore'
    ];
    
    const lowerSentence = firstSentence.toLowerCase();
    
    // If it contains any question words, use fallback
    if (questionWords.some(word => lowerSentence.includes(word))) {
      return this.getFallbackResponse();
    }
    
    // Ensure it ends with a period
    if (!firstSentence.endsWith('.') && !firstSentence.endsWith('!')) {
      firstSentence += '.';
    }
    
    return firstSentence;
  }

  private getFallbackResponse(): string {
    const fallbackResponses = [
      "Thank you for sharing that.",
      "I've noted that information.",
      "Got it, thank you.",
      "I understand.",
      "Thank you for letting me know.",
      "I appreciate you sharing that.",
      "That's helpful information."
    ];

    return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
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