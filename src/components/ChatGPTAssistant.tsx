import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, X, Bot, User } from 'lucide-react';
import { generateHealthInsights } from '../services/openaiService';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

interface ChatGPTAssistantProps {
  userConditions?: string[];
  recentSymptoms?: string[];
  medications?: string[];
}

export default function ChatGPTAssistant({ 
  userConditions = [], 
  recentSymptoms = [], 
  medications = [] 
}: ChatGPTAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      initializeConversation();
    }
  }, [isOpen]);

  const checkOpenAIConnection = async (): Promise<boolean> => {
    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      
      // Check if API key exists and is not empty
      if (!apiKey || apiKey.trim() === '') {
        throw new Error('OpenAI API key is not set');
      }
      
      // Check if API key looks like a valid OpenAI key format
      if (!apiKey.startsWith('sk-')) {
        throw new Error('OpenAI API key format is invalid');
      }
      
      // Test the connection with a simple request
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

      // Create initial greeting message
      const greeting = `Hello! I'm your health assistant. I can help you understand your symptoms, provide general health information, and answer questions about your conditions${userConditions.length > 0 ? ` (${userConditions.join(', ')})` : ''}. 

Please note that I'm not a substitute for professional medical advice. Always consult with your healthcare provider for medical decisions.

How can I help you today?`;

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
        content: `I'm sorry, but I'm currently unable to connect to the AI service. Error: ${errorMessage}. Please check your internet connection and try again later.`,
        sender: 'assistant',
        timestamp: new Date(),
      };
      
      setMessages([errorMsg]);
    }
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
    setInputMessage('');
    setIsLoading(true);

    try {
      // Prepare context for the AI
      const context = {
        conditions: userConditions,
        symptoms: recentSymptoms,
        medications: medications,
        conversationHistory: messages.slice(-5), // Last 5 messages for context
      };

      const response = await generateHealthInsights(inputMessage.trim(), context);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response,
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

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all duration-300 z-40 ${
          isOpen ? 'scale-0' : 'scale-100'
        }`}
        aria-label="Open AI Assistant"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Chat Window */}
      <div
        className={`fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-lg shadow-2xl border border-gray-200 transition-all duration-300 z-50 ${
          isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-blue-600 text-white rounded-t-lg">
          <div className="flex items-center space-x-2">
            <Bot className="w-5 h-5" />
            <h3 className="font-semibold">Health Assistant</h3>
            {isConnected && (
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            )}
            {connectionError && (
              <div className="w-2 h-2 bg-red-400 rounded-full"></div>
            )}
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white hover:text-gray-200 transition-colors"
            aria-label="Close chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 h-[360px]">
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

        {/* Input */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex space-x-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isConnected ? "Ask me about your health..." : "Connection error..."}
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
            <p className="text-xs text-red-600 mt-2">
              Connection error: {connectionError}
            </p>
          )}
        </div>
      </div>
    </>
  );
}