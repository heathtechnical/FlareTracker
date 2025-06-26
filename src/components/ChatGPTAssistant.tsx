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
  const [collectedData, setCollectedData] = useState<any>({});
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
      const greeting = `Hi! I'm here to help you complete your daily skin check-in. Let's start by talking about how ${conditionNames} ${user?.conditions?.length === 1 ? 'is' : 'are'} feeling today. 

Please describe how your skin is today - you can mention severity, symptoms, or anything you've noticed.`;

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

  const parseUserResponse = (response: string, context: any) => {
    const lowerResponse = response.toLowerCase();
    const updatedData = { ...collectedData };
    let dataUpdated = false;

    // Parse severity mentions
    const severityKeywords = {
      1: ['minimal', 'very mild', 'barely noticeable', 'tiny bit'],
      2: ['mild', 'slight', 'little bit', 'not too bad'],
      3: ['moderate', 'medium', 'okay', 'average', 'noticeable'],
      4: ['severe', 'bad', 'quite bad', 'really bothering', 'painful'],
      5: ['extreme', 'terrible', 'worst', 'unbearable', 'very severe']
    };

    // Check for severity ratings
    for (const [severity, keywords] of Object.entries(severityKeywords)) {
      if (keywords.some(keyword => lowerResponse.includes(keyword))) {
        if (!updatedData.conditionSeverities) updatedData.conditionSeverities = {};
        // For simplicity, apply to first condition - could be enhanced to parse specific conditions
        if (user?.conditions?.[0]) {
          updatedData.conditionSeverities[user.conditions[0].id] = parseInt(severity);
          dataUpdated = true;
        }
      }
    }

    // Parse numeric severity (1-5)
    const numericMatch = response.match(/\b([1-5])\b/);
    if (numericMatch && user?.conditions?.[0]) {
      if (!updatedData.conditionSeverities) updatedData.conditionSeverities = {};
      updatedData.conditionSeverities[user.conditions[0].id] = parseInt(numericMatch[1]);
      dataUpdated = true;
    }

    // Parse symptoms
    const symptomKeywords = ['itchy', 'red', 'dry', 'flaky', 'painful', 'swollen', 'burning', 'bleeding'];
    const foundSymptoms: string[] = [];
    
    symptomKeywords.forEach(symptom => {
      if (lowerResponse.includes(symptom)) {
        foundSymptoms.push(symptom.charAt(0).toUpperCase() + symptom.slice(1) + 'ness');
      }
    });

    if (foundSymptoms.length > 0) {
      if (!updatedData.conditionSymptoms) updatedData.conditionSymptoms = {};
      if (user?.conditions?.[0]) {
        updatedData.conditionSymptoms[user.conditions[0].id] = foundSymptoms;
        dataUpdated = true;
      }
    }

    // Parse medication mentions
    if (lowerResponse.includes('took') || lowerResponse.includes('applied') || lowerResponse.includes('used')) {
      if (!updatedData.medicationsTaken) updatedData.medicationsTaken = {};
      user?.medications?.forEach(med => {
        if (lowerResponse.includes(med.name.toLowerCase())) {
          updatedData.medicationsTaken[med.id] = true;
          dataUpdated = true;
        }
      });
    }

    if (dataUpdated) {
      setCollectedData(updatedData);
    }

    return updatedData;
  };

  const generateSummary = (data: any) => {
    const parts: string[] = [];
    
    if (data.conditionSeverities) {
      Object.entries(data.conditionSeverities).forEach(([conditionId, severity]) => {
        const condition = user?.conditions?.find(c => c.id === conditionId);
        if (condition) {
          const severityLabels = ['', 'minimal', 'mild', 'moderate', 'severe', 'extreme'];
          parts.push(`${condition.name}: ${severityLabels[severity as number]} (${severity}/5)`);
        }
      });
    }

    if (data.conditionSymptoms) {
      Object.entries(data.conditionSymptoms).forEach(([conditionId, symptoms]) => {
        const condition = user?.conditions?.find(c => c.id === conditionId);
        if (condition && Array.isArray(symptoms) && symptoms.length > 0) {
          parts.push(`${condition.name} symptoms: ${symptoms.join(', ')}`);
        }
      });
    }

    if (data.medicationsTaken) {
      const takenMeds = Object.entries(data.medicationsTaken)
        .filter(([_, taken]) => taken)
        .map(([medId, _]) => user?.medications?.find(m => m.id === medId)?.name)
        .filter(Boolean);
      
      if (takenMeds.length > 0) {
        parts.push(`Medications taken: ${takenMeds.join(', ')}`);
      }
    }

    return parts.length > 0 
      ? `Here's what I've captured from our conversation:\n\n${parts.join('\n')}\n\nDoes this look correct? If so, I can save your check-in now!`
      : "I haven't captured enough information yet. Could you tell me more about your skin condition severity and any symptoms you're experiencing?";
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
      // Parse user response for data
      const updatedData = parseUserResponse(currentInput, collectedData);
      
      // Check if we have enough data to complete check-in
      const hasConditionData = updatedData.conditionSeverities && 
        Object.keys(updatedData.conditionSeverities).length > 0;
      
      let responseContent: string;
      
      if (hasConditionData && !checkInComplete) {
        // We have enough data, show summary
        responseContent = generateSummary(updatedData);
        setCheckInComplete(true);
      } else if (checkInComplete) {
        // User is responding to summary
        if (currentInput.toLowerCase().includes('yes') || 
            currentInput.toLowerCase().includes('correct') ||
            currentInput.toLowerCase().includes('save')) {
          responseContent = "Perfect! Your check-in data is ready to be saved. Click the 'Save Check-in' button below to complete your daily check-in.";
        } else {
          responseContent = "Let me know what needs to be corrected, and I'll update your check-in data accordingly.";
          setCheckInComplete(false);
        }
      } else {
        // Need more information
        const checkInContext = {
          userName: user?.name || 'User',
          conditions: user?.conditions || [],
          medications: user?.medications || [],
          currentFormData: updatedData
        };

        const chatMessages = messages.slice(-3).map(msg => ({
          role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
          content: msg.content
        }));

        chatMessages.push({
          role: 'user' as const,
          content: currentInput
        });

        responseContent = await openaiService.sendMessage(chatMessages, checkInContext);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: responseContent,
        sender: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Update form data if we have collected data
      if (Object.keys(updatedData).length > 0 && onUpdateFormData) {
        const formUpdate: any = {};
        
        // Update condition entries
        if (updatedData.conditionSeverities || updatedData.conditionSymptoms) {
          formUpdate.conditionEntries = formData?.conditionEntries?.map((entry: any) => {
            const newEntry = { ...entry };
            
            if (updatedData.conditionSeverities?.[entry.conditionId]) {
              newEntry.severity = updatedData.conditionSeverities[entry.conditionId];
            }
            
            if (updatedData.conditionSymptoms?.[entry.conditionId]) {
              newEntry.symptoms = updatedData.conditionSymptoms[entry.conditionId];
            }
            
            return newEntry;
          }) || [];
        }

        // Update medication entries
        if (updatedData.medicationsTaken) {
          formUpdate.medicationEntries = formData?.medicationEntries?.map((entry: any) => ({
            ...entry,
            taken: updatedData.medicationsTaken[entry.medicationId] || entry.taken
          })) || [];
        }

        onUpdateFormData(formUpdate);
      }

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
              placeholder={isConnected ? "Describe how your skin is today..." : "Connection error..."}
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