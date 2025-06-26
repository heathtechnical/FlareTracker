import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Note: In production, you'd want to use a backend proxy
});

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
- Ask one question at a time
- Acknowledge their responses before moving to the next topic
- Be understanding about bad skin days
- Celebrate improvements and progress

IMPORTANT RULES:
- Always stay focused on skin health topics
- Don't provide medical advice - encourage consulting healthcare providers for concerns
- Keep responses concise but caring
- If they mention severe symptoms or worsening conditions, gently suggest consulting their doctor
- Parse their natural language responses to extract severity ratings and symptoms

RESPONSE FORMAT:
Respond naturally and conversationally. Don't use structured formats or bullet points unless specifically helpful for clarity.`;
  }

  async sendMessage(
    messages: ChatMessage[],
    context: CheckInContext
  ): Promise<string> {
    try {
      const systemMessage: ChatMessage = {
        role: 'system',
        content: this.createSystemPrompt(context)
      };

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [systemMessage, ...messages],
        max_tokens: 300,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      });

      return response.choices[0]?.message?.content || 'I apologize, but I had trouble processing that. Could you please try again?';
    } catch (error) {
      console.error('OpenAI API error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          return 'I need an OpenAI API key to function properly. Please check your configuration.';
        }
        if (error.message.includes('quota')) {
          return 'I\'m temporarily unavailable due to API limits. Please try again later.';
        }
      }
      
      return 'I\'m having trouble connecting right now. Please try again in a moment.';
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
}

export const openaiService = OpenAIService.getInstance();