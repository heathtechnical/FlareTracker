import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader, X, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SeverityLevel } from '../types';
import { openaiService, ChatMessage } from '../services/openaiService';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface ChatGPTAssistantProps {
  onUpdateFormData: (updates: any) => void;
  formData: any;
  onClose: () => void;
}

const ChatGPTAssistant: React.FC<ChatGPTAssistantProps> = ({
  onUpdateFormData,
  formData,
  onClose
}) => {
  const { user } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentTopic, setCurrentTopic] = useState('greeting');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Check if OpenAI API key is configured
    if (!import.meta.env.VITE_OPENAI_API_KEY) {
      setError('OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your environment variables.');
      return;
    }

    // Start the conversation
    initializeConversation();
  }, []);

  const initializeConversation = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const context = {
        userName: user.name,
        conditions: user.conditions,
        medications: user.medications,
        currentFormData: formData
      };

      const initialMessage = await openaiService.sendMessage(
        [{
          role: 'user',
          content: 'Hi! I\'m ready to do my daily skin check-in. Can you help me?'
        }],
        context
      );

      addAIMessage(initialMessage);
      setChatHistory([{
        role: 'user',
        content: 'Hi! I\'m ready to do my daily skin check-in. Can you help me?'
      }]);
    } catch (error) {
      console.error('Failed to initialize conversation:', error);
      setError('Failed to start conversation. Please check your internet connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const addMessage = (type: 'user' | 'ai', content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const addAIMessage = (content: string) => {
    addMessage('ai', content);
  };

  const addUserMessage = (content: string) => {
    addMessage('user', content);
  };

  const updateFormDataFromParsedResponse = (parsed: any) => {
    const updates: any = {};

    // Update severity for current condition
    if (parsed.severity && user && user.conditions.length > 0) {
      const updatedConditionEntries = [...formData.conditionEntries];
      
      // Find the first condition that doesn't have a severity set, or update the first one
      let targetIndex = updatedConditionEntries.findIndex(entry => entry.severity === 0);
      if (targetIndex === -1) targetIndex = 0;
      
      if (updatedConditionEntries[targetIndex]) {
        updatedConditionEntries[targetIndex] = {
          ...updatedConditionEntries[targetIndex],
          severity: parsed.severity as SeverityLevel,
          symptoms: [
            ...updatedConditionEntries[targetIndex].symptoms,
            ...(parsed.symptoms || [])
          ].filter((symptom, index, arr) => arr.indexOf(symptom) === index) // Remove duplicates
        };
        updates.conditionEntries = updatedConditionEntries;
      }
    }

    // Update symptoms only
    if (parsed.symptoms && !parsed.severity && user && user.conditions.length > 0) {
      const updatedConditionEntries = [...formData.conditionEntries];
      let targetIndex = updatedConditionEntries.findIndex(entry => entry.severity > 0);
      if (targetIndex === -1) targetIndex = 0;
      
      if (updatedConditionEntries[targetIndex]) {
        updatedConditionEntries[targetIndex] = {
          ...updatedConditionEntries[targetIndex],
          symptoms: [
            ...updatedConditionEntries[targetIndex].symptoms,
            ...parsed.symptoms
          ].filter((symptom, index, arr) => arr.indexOf(symptom) === index)
        };
        updates.conditionEntries = updatedConditionEntries;
      }
    }

    // Update medication adherence
    if (parsed.medicationTaken !== undefined) {
      const updatedMedicationEntries = formData.medicationEntries.map((entry: any) => ({
        ...entry,
        taken: parsed.medicationTaken,
        timesTaken: parsed.medicationTaken ? 1 : undefined
      }));
      updates.medicationEntries = updatedMedicationEntries;
    }

    // Update lifestyle factors
    if (parsed.lifestyleFactor) {
      const updatedFactors = {
        ...formData.factors,
        [parsed.lifestyleFactor.type]: parsed.lifestyleFactor.value as SeverityLevel
      };
      updates.factors = updatedFactors;
    }

    if (Object.keys(updates).length > 0) {
      onUpdateFormData(updates);
    }
  };

  const handleUserInput = async () => {
    if (!inputValue.trim() || isLoading || error) return;

    const userInput = inputValue.trim();
    addUserMessage(userInput);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      if (!user) {
        throw new Error('User not found');
      }

      const context = {
        userName: user.name,
        conditions: user.conditions,
        medications: user.medications,
        currentFormData: formData
      };

      // Add user message to chat history
      const newChatHistory: ChatMessage[] = [
        ...chatHistory,
        { role: 'user', content: userInput }
      ];

      // Get AI response
      const aiResponse = await openaiService.sendMessage(newChatHistory, context);
      addAIMessage(aiResponse);

      // Parse user input for form data
      const parsed = await openaiService.parseUserResponse(userInput, context, currentTopic);
      updateFormDataFromParsedResponse(parsed);

      // Update chat history with AI response
      setChatHistory([
        ...newChatHistory,
        { role: 'assistant', content: aiResponse }
      ]);

    } catch (error) {
      console.error('Error in conversation:', error);
      setError('Sorry, I encountered an error. Please try again.');
      addAIMessage('I apologize, but I\'m having trouble right now. Please try again or continue with the manual form.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleUserInput();
    }
  };

  const retryConnection = () => {
    setError(null);
    setMessages([]);
    setChatHistory([]);
    initializeConversation();
  };

  if (error && messages.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-800">AI Assistant Error</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="flex items-start space-x-3 mb-6">
            <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-gray-700 mb-2">{error}</p>
              {!import.meta.env.VITE_OPENAI_API_KEY && (
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  <p className="font-medium mb-1">To enable AI assistance:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Get an API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">OpenAI</a></li>
                    <li>Add it to your .env file as VITE_OPENAI_API_KEY</li>
                    <li>Restart the development server</li>
                  </ol>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={retryConnection}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Use Manual Form
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white mr-3">
              <Bot size={18} />
            </div>
            <div>
              <h3 className="font-medium text-gray-800">ChatGPT Assistant</h3>
              <p className="text-sm text-gray-500">Powered by OpenAI • Let me help with your check-in</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-start max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${
                  message.type === 'user' ? 'bg-blue-600 ml-2' : 'bg-green-500 mr-2'
                }`}>
                  {message.type === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={`rounded-lg px-4 py-2 ${
                  message.type === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    message.type === 'user' ? 'text-blue-200' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-start">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white mr-2">
                  <Bot size={16} />
                </div>
                <div className="bg-gray-100 rounded-lg px-4 py-2">
                  <div className="flex items-center space-x-2">
                    <Loader size={16} className="animate-spin text-gray-500" />
                    <span className="text-sm text-gray-600">ChatGPT is thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {error && (
            <div className="flex justify-center">
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 max-w-md">
                <div className="flex items-center space-x-2">
                  <AlertCircle size={16} className="text-red-500" />
                  <span className="text-sm text-red-700">{error}</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex space-x-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your response..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              disabled={isLoading || !!error}
            />
            <button
              onClick={handleUserInput}
              disabled={!inputValue.trim() || isLoading || !!error}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Press Enter to send • ChatGPT will help you fill out your check-in form naturally
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatGPTAssistant;