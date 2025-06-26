import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, X, Bot, User, Save, CheckCircle } from 'lucide-react';
import { openaiService } from '../services/openaiService';
import { useApp } from '../context/AppContext';
import { SeverityLevel } from '../types';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

interface ChatGPTAssistantProps {
  formData?: any;
  onUpdateFormData?: (data: any) => void;
  onClose?: () => void;
  onSaveCheckIn?: () => void;
}

export default function ChatGPTAssistant({ 
  formData,
  onUpdateFormData,
  onClose,
  onSaveCheckIn
}: ChatGPTAssistantProps) {
  const { user } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [checkInComplete, setCheckInComplete] = useState(false);
  const [collectedData, setCollectedData] = useState<any>({
    conditionEntries: {},
    medicationEntries: {},
    factors: {},
    notes: ''
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    initializeConversation();
  }, []);

  const checkOpenAIConnection = async (): Promise<boolean> => {
    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      
      if (!apiKey || apiKey.trim() === '') {
        throw new Error('OpenAI API key is not set');
      }
      
      if (!apiKey.startsWith('sk-')) {
        throw new Error('OpenAI API key format is invalid');
      }
      
      if (apiKey === 'PLACEHOLDER') {
        throw new Error('OpenAI API key is set to placeholder value');
      }
      
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid OpenAI API key');
        } else if (response.status === 429) {
          throw new Error('OpenAI API rate limit exceeded');
        } else {
          throw new Error(`OpenAI API error: ${response.status}`);
        }
      }

      return true;
    } catch (error) {
      console.error('OpenAI connection test failed:', error);
      throw error;
    }
  };

  const initializeConversation = async () => {
    try {
      setConnectionError(null);
      await checkOpenAIConnection();
      setIsConnected(true);

      const conditionNames = user?.conditions?.map(c => c.name).join(', ') || 'your skin conditions';
      const greeting = `Hi! I'm here to help you complete your daily skin check-in. 

How is your ${conditionNames} ${user?.conditions?.length === 1 ? '' : 'are'} feeling today? Please tell me about the severity and anything you've noticed.`;

      const initialMessage: Message = {
        id: Date.now().toString(),
        content: greeting,
        sender: 'assistant',
        timestamp: new Date(),
      };

      setMessages([initialMessage]);
    } catch (error) {
      setIsConnected(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setConnectionError(errorMessage);
      
      const errorMsg: Message = {
        id: Date.now().toString(),
        content: `I'm sorry, but I'm currently unable to connect to the AI service. Error: ${errorMessage}. Please check your API key configuration and try again.`,
        sender: 'assistant',
        timestamp: new Date(),
      };
      
      setMessages([errorMsg]);
    }
  };

  const createSystemPrompt = () => {
    const conditionsList = user?.conditions?.map(c => `- ${c.name} (ID: ${c.id})`).join('\n') || '';
    const medicationsList = user?.medications?.map(m => `- ${m.name} (ID: ${m.id}, Frequency: ${m.frequency})`).join('\n') || '';
    
    // Check which conditions still need severity ratings
    const missingConditions = user?.conditions?.filter(c => 
      !collectedData.conditionEntries[c.id]?.severity
    ).map(c => c.name) || [];
    
    return `You are a helpful AI assistant for a skin health tracking app. Your job is to collect check-in information through natural conversation and return structured JSON data.

USER'S CONDITIONS:
${conditionsList}

USER'S MEDICATIONS:
${medicationsList}

CURRENT COLLECTED DATA:
${JSON.stringify(collectedData, null, 2)}

MISSING SEVERITY RATINGS FOR: ${missingConditions.join(', ') || 'None - all conditions rated'}

YOUR TASKS:
1. Have a natural conversation about the user's skin health today
2. MANDATORY: Get severity rating (1-5 scale) for each condition, this should be taken from the users
  responses NEVER ask the user for a numeric severity rating
   - 1 = minimal, 2 = mild, 3 = moderate, 4 = severe, 5 = extreme
3. OPTIONAL: Pick up from conversation naturally (don't explicitly ask unless mentioned):
   - Symptoms (itchiness, redness, dryness, flaking, pain, swelling, burning, bleeding)
   - Medication usage (assume NOT taken unless explicitly mentioned)
   - Lifestyle factors (stress, sleep, water, diet - 1-5 scale)
   - General notes

4. When you have severity ratings for ALL conditions, provide a summary and set isComplete to true

CRITICAL: At the end of each response, include a JSON block with the collected data in this exact format:
\`\`\`json
{
  "conditionEntries": {
    "condition-id": {
      "severity": 1-5,
      "symptoms": ["symptom1", "symptom2"],
      "notes": "any specific notes"
    }
  },
  "medicationEntries": {
    "medication-id": {
      "taken": true/false,
      "timesTaken": 1,
      "skippedReason": "reason if not taken"
    }
  },
  "factors": {
    "stress": 1-5,
    "sleep": 1-5,
    "water": 1-5,
    "diet": 1-5,
    "weather": "description"
  },
  "notes": "general notes",
  "isComplete": true/false
}
\`\`\`

IMPORTANT RULES:
- ONLY include data that the user has actually provided in conversation, but it is ok to calculate a severity rating
- Don't ask about symptoms or medications unless the user brings them up
- Assume medications are NOT taken unless explicitly mentioned
- Focus conversation on calculating severity ratings for all conditions
- Ratings should be taken from the conversation, don't ask for a numeric rating unless required
- Be conversational and supportive, not clinical
- Only set "isComplete": true when you have severity ratings for ALL conditions
- Don't fill in optional data unless it has been provided`;
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !isConnected) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    try {
      // Prepare context for the AI
      const checkInContext = {
        userName: user?.name || 'User',
        conditions: user?.conditions || [],
        medications: user?.medications || [],
        currentFormData: collectedData
      };

      // Convert messages to the format expected by openaiService
      const chatMessages = messages.slice(-5).map(msg => ({
        role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content
      }));

      // Add the current user message
      chatMessages.push({
        role: 'user' as const,
        content: currentInput
      });

      // Add system message with current context
      const systemMessage = {
        role: 'system' as const,
        content: createSystemPrompt()
      };

      const response = await openaiService.sendMessage(
        [systemMessage, ...chatMessages],
        checkInContext
      );

      // Extract JSON data from response
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        try {
          const extractedData = JSON.parse(jsonMatch[1]);
          
          // Update collected data
          setCollectedData(prev => ({
            ...prev,
            ...extractedData
          }));

          // Check if check-in is complete
          if (extractedData.isComplete) {
            setCheckInComplete(true);
          }

          // Update form data
          if (onUpdateFormData) {
            const formUpdate: any = {};
            
            // Update condition entries
            if (extractedData.conditionEntries) {
              formUpdate.conditionEntries = formData?.conditionEntries?.map((entry: any) => {
                const collectedEntry = extractedData.conditionEntries[entry.conditionId];
                if (collectedEntry) {
                  return {
                    ...entry,
                    severity: collectedEntry.severity || entry.severity,
                    symptoms: collectedEntry.symptoms || entry.symptoms,
                    notes: collectedEntry.notes || entry.notes
                  };
                }
                return entry;
              }) || [];
            }

            // Update medication entries - only if explicitly mentioned
            if (extractedData.medicationEntries) {
              formUpdate.medicationEntries = formData?.medicationEntries?.map((entry: any) => {
                const collectedEntry = extractedData.medicationEntries[entry.medicationId];
                if (collectedEntry !== undefined) {
                  return {
                    ...entry,
                    taken: collectedEntry.taken !== undefined ? collectedEntry.taken : entry.taken,
                    timesTaken: collectedEntry.timesTaken || entry.timesTaken,
                    skippedReason: collectedEntry.skippedReason || entry.skippedReason
                  };
                }
                return entry;
              }) || [];
            }

            // Update factors - only if mentioned
            if (extractedData.factors) {
              formUpdate.factors = {
                ...formData?.factors,
                ...extractedData.factors
              };
            }

            // Update notes
            if (extractedData.notes) {
              formUpdate.notes = extractedData.notes;
            }

            onUpdateFormData(formUpdate);
          }
        } catch (parseError) {
          console.error('Error parsing JSON from AI response:', parseError);
        }
      }

      // Remove JSON block from display message
      const displayMessage = response.replace(/```json\n[\s\S]*?\n```/, '').trim();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: displayMessage,
        sender: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'I apologize, but I encountered an error while processing your message. Please try again.',
        sender: 'assistant',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSaveCheckIn = () => {
    if (onSaveCheckIn) {
      onSaveCheckIn();
    }
    if (onClose) {
      onClose();
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md h-[600px] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-blue-600 text-white rounded-t-lg">
          <div className="flex items-center space-x-2">
            <Bot className="w-5 h-5" />
            <h3 className="font-semibold">AI Check-in Assistant</h3>
            {isConnected && (
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            )}
            {connectionError && (
              <div className="w-2 h-2 bg-red-400 rounded-full"></div>
            )}
          </div>
          <button
            onClick={handleClose}
            className="text-white hover:text-gray-200 transition-colors"
            aria-label="Close chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  message.sender === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <div className="flex items-start space-x-2">
                  {message.sender === 'assistant' && (
                    <Bot className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  )}
                  {message.sender === 'user' && (
                    <User className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.sender === 'user' ? 'text-blue-200' : 'text-gray-500'
                    }`}>
                      {message.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-800 p-3 rounded-lg max-w-[80%]">
                <div className="flex items-center space-x-2">
                  <Bot className="w-4 h-4" />
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Save Button (appears when check-in is complete) */}
        {checkInComplete && (
          <div className="px-4 py-2 border-t border-gray-200 bg-green-50">
            <button
              onClick={handleSaveCheckIn}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <Save className="w-4 h-4" />
              <span>Save Check-in</span>
            </button>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex space-x-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isConnected ? "How is your skin feeling today?" : "Connection error..."}
              disabled={!isConnected || isLoading}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading || !isConnected}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          {connectionError && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
              <strong>Connection Error:</strong> {connectionError}
              <br />
              <span className="text-red-500">Please check your OpenAI API key configuration in the .env file.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}