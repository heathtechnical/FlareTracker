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
    return `You are a helpful AI assistant for a skin health tracking app called "Skin Logger". Your role is to help users complete their daily check-ins in a conversational, empathetic way.

USER CONTEXT:
- User's name: ${context.userName}
- Conditions being tracked: ${context.conditions.map(c => `${c.name}${c.description ? ` (${c.description})` : ''}`).join(', ')}
- Medications: ${context.medications.map(m => `${m.name} (${m.frequency})`).join(', ')}

YOUR GOALS:
1. Help the user rate their skin condition severity (1-5 scale: 1=minimal, 2=mild, 3=moderate, 4=severe, 5=extreme)
2. Identify any symptoms they're experiencing (itchiness, redness, dryness, flaking, pain, swelling, burning, bleeding)
3. Ask about medication adherence
4. Gather lifestyle factors (stress, sleep quality, water intake, diet quality on 1-5 scale)
5. Be supportive and understanding about their skin health journey

CONVERSATION STYLE:
- Be warm, empathetic, and encouraging
- Use natural, conversational language
- Acknowledge their responses positively
- Be understanding about bad skin days
- Celebrate improvements and progress
- Keep responses concise (1-2 sentences max)

CRITICAL RULES:
- NEVER ask multiple questions in one response
- NEVER include follow-up questions in your response
- ONLY provide acknowledgment and support
- The system will handle asking the next question automatically
- Focus on being empathetic and understanding
- Don't provide medical advice - encourage consulting healthcare providers for concerns
- If they mention severe symptoms or worsening conditions, gently suggest consulting their doctor

RESPONSE FORMAT:
Respond with ONLY a brief acknowledgment or supportive comment about what the user just shared. Do NOT ask any questions - the system handles question flow automatically.

Examples of PERFECT responses:
- "Thank you for sharing that. I've noted your severity rating."
- "I understand, that sounds challenging."
- "That's great to hear!"
- "I'm sorry you're experiencing that."
- "Got it, I've recorded that information."
- "Thank you for letting me know."

Examples of WRONG responses (DO NOT DO THIS):
- "Thank you for sharing that. How are your symptoms today?" (NO QUESTIONS!)
- "I understand. What medications did you take?" (NO QUESTIONS!)
- "That's noted. Can you tell me about..." (NO QUESTIONS!)

Remember: ACKNOWLEDGMENT ONLY, NO QUESTIONS!`;
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
        max_tokens: 100, // Reduced to encourage shorter responses
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      });

      console.log('OpenAI response received:', {
        choices: response.choices.length,
        usage: response.usage
      });

      const content = response.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No response content received from OpenAI');
      }

      // Clean the response to ensure it doesn't contain questions
      const cleanedContent = this.cleanResponse(content);

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

  private cleanResponse(response: string): string {
    // Remove any questions from the response
    const sentences = response.split(/[.!?]+/).filter(s => s.trim());
    
    // Filter out sentences that contain question marks or question words
    const nonQuestionSentences = sentences.filter(sentence => {
      const lowerSentence = sentence.toLowerCase().trim();
      return !sentence.includes('?') && 
             !lowerSentence.startsWith('how') &&
             !lowerSentence.startsWith('what') &&
             !lowerSentence.startsWith('when') &&
             !lowerSentence.startsWith('where') &&
             !lowerSentence.startsWith('why') &&
             !lowerSentence.startsWith('can you') &&
             !lowerSentence.startsWith('could you') &&
             !lowerSentence.startsWith('would you') &&
             !lowerSentence.startsWith('do you') &&
             !lowerSentence.startsWith('did you') &&
             !lowerSentence.startsWith('are you') &&
             !lowerSentence.startsWith('is there') &&
             !lowerSentence.includes('tell me') &&
             !lowerSentence.includes('let me know');
    });

    if (nonQuestionSentences.length > 0) {
      // Take the first acknowledgment sentence
      return nonQuestionSentences[0].trim() + '.';
    }

    // Fallback acknowledgments if the response was all questions
    const fallbackResponses = [
      "Thank you for sharing that.",
      "I've noted that information.",
      "Got it, thank you.",
      "I understand.",
      "Thank you for letting me know."
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