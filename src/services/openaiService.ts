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

IMPORTANT RULES:
- NEVER ask multiple questions in one response
- Always acknowledge what the user said before moving on
- Stay focused on skin health topics
- Don't provide medical advice - encourage consulting healthcare providers for concerns
- If they mention severe symptoms or worsening conditions, gently suggest consulting their doctor
- Only provide acknowledgment responses, not follow-up questions (the system handles question flow)

RESPONSE FORMAT:
Respond with only a brief acknowledgment or supportive comment about what the user just shared. Do NOT ask the next question - the system will handle that automatically.

Examples of good responses:
- "Thank you for sharing that. I've noted your severity rating."
- "I understand, that sounds challenging. I've recorded that information."
- "That's great to hear! I've updated your check-in."
- "I'm sorry you're experiencing that. I've made note of those symptoms."`;
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
        max_tokens: 150,
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

      return content;
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

  async parseUserResponse(
    userInput: string,
    context: CheckInContext,
    currentTopic: string
  ): Promise<{
    severity?: number;
    symptoms?: string[];
    medicationTaken?: boolean;
    lifestyleFactor?: { type: string; value: number };
    needsMoreInfo?: boolean;
  }> {
    if (!openai) {
      // Fall back to local parsing if OpenAI is not available
      return this.fallbackParsing(userInput);
    }

    try {
      const parsePrompt = `Parse this user response for skin health check-in data. Current topic: ${currentTopic}

User input: "${userInput}"

Extract any of the following if mentioned:
- Severity rating (1-5 scale)
- Symptoms (itchiness, redness, dryness, flaking, pain, swelling, burning, bleeding)
- Medication adherence (yes/no/taken/skipped)
- Lifestyle factors with ratings (stress, sleep, water, diet on 1-5 scale)

Respond with a JSON object containing only the data you can confidently extract. Use null for unclear items.

Example: {"severity": 3, "symptoms": ["itchiness", "redness"], "medicationTaken": true}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a data extraction assistant. Respond only with valid JSON.'
          },
          {
            role: 'user',
            content: parsePrompt
          }
        ],
        max_tokens: 150,
        temperature: 0.1
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        try {
          return JSON.parse(content);
        } catch {
          // If JSON parsing fails, fall back to simple keyword detection
          return this.fallbackParsing(userInput);
        }
      }
      
      return this.fallbackParsing(userInput);
    } catch (error) {
      console.error('Parsing error:', error);
      return this.fallbackParsing(userInput);
    }
  }

  private fallbackParsing(input: string): any {
    const lowerInput = input.toLowerCase();
    const result: any = {};

    // Parse severity
    const severityKeywords = {
      'minimal': 1, 'very mild': 1, 'barely': 1,
      'mild': 2, 'slight': 2, 'little': 2,
      'moderate': 3, 'medium': 3, 'okay': 3, 'average': 3,
      'severe': 4, 'bad': 4, 'painful': 4, 'worse': 4,
      'extreme': 5, 'terrible': 5, 'unbearable': 5, 'worst': 5
    };

    for (const [keyword, value] of Object.entries(severityKeywords)) {
      if (lowerInput.includes(keyword)) {
        result.severity = value;
        break;
      }
    }

    // Parse numbers
    const numberMatch = input.match(/\b([1-5])\b/);
    if (numberMatch && !result.severity) {
      result.severity = parseInt(numberMatch[1]);
    }

    // Parse symptoms
    const symptoms: string[] = [];
    const symptomKeywords = {
      'itchy': 'Itchiness', 'itch': 'Itchiness', 'scratchy': 'Itchiness',
      'red': 'Redness', 'inflamed': 'Redness',
      'dry': 'Dryness',
      'flaky': 'Flaking', 'peeling': 'Flaking',
      'painful': 'Pain', 'hurt': 'Pain', 'sore': 'Pain',
      'swollen': 'Swelling',
      'burning': 'Burning',
      'bleeding': 'Bleeding'
    };

    Object.entries(symptomKeywords).forEach(([keyword, symptom]) => {
      if (lowerInput.includes(keyword) && !symptoms.includes(symptom)) {
        symptoms.push(symptom);
      }
    });

    if (symptoms.length > 0) {
      result.symptoms = symptoms;
    }

    // Parse medication adherence
    if (lowerInput.includes('yes') || lowerInput.includes('took') || lowerInput.includes('taken')) {
      result.medicationTaken = true;
    } else if (lowerInput.includes('no') || lowerInput.includes('forgot') || lowerInput.includes('skipped')) {
      result.medicationTaken = false;
    }

    return result;
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