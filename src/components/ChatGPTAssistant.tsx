import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader, X, AlertCircle, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SeverityLevel } from '../types';
import { openaiService, ChatMessage } from '../services/openaiService';

interface Message {
  id: string;
  type: 'user' | 'ai' | 'system';
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
  const [currentStep, setCurrentStep] = useState<'greeting' | 'conditions' | 'medications' | 'lifestyle' | 'complete'>('greeting');
  const [currentConditionIndex, setCurrentConditionIndex] = useState(0);
  const [currentLifestyleFactor, setCurrentLifestyleFactor] = useState<'stress' | 'sleep' | 'water' | 'diet' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [isInitialized, setIsInitialized] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!isInitialized) {
      initializeConversation();
      setIsInitialized(true);
    }
  }, [isInitialized]);

  const addMessage = (type: 'user' | 'ai' | 'system', content: string) => {
    const messageId = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newMessage: Message = {
      id: messageId,
      type,
      content,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMessage]);
  };

  const checkOpenAIConnection = async (): Promise<boolean> => {
    try {
      // Check if API key is configured
      if (!import.meta.env.VITE_OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
      }

      if (import.meta.env.VITE_OPENAI_API_KEY === 'your_openai_api_key') {
        throw new Error('OpenAI API key is not set to a real value');
      }

      // Test the connection with a simple request
      const testContext = {
        userName: user?.name || 'User',
        conditions: user?.conditions || [],
        medications: user?.medications || [],
        currentFormData: formData
      };

      await openaiService.sendMessage([{
        role: 'user',
        content: 'Test connection'
      }], testContext);

      return true;
    } catch (error: any) {
      console.error('OpenAI connection test failed:', error);
      
      if (error.message?.includes('API key')) {
        setError('OpenAI API key is missing or invalid. Please check your configuration.');
      } else if (error.message?.includes('quota') || error.message?.includes('billing')) {
        setError('OpenAI API quota exceeded or billing issue. Please check your OpenAI account.');
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        setError('Network connection error. Please check your internet connection.');
      } else {
        setError(`OpenAI API error: ${error.message || 'Unknown error'}`);
      }
      
      return false;
    }
  };

  const initializeConversation = async () => {
    if (!user) {
      setError('User data not available');
      setConnectionStatus('error');
      return;
    }

    setConnectionStatus('connecting');
    
    // Single connection message
    addMessage('system', '🔗 Connecting to ChatGPT...');

    try {
      // Test OpenAI connection first
      const isConnected = await checkOpenAIConnection();
      
      if (!isConnected) {
        setConnectionStatus('error');
        addMessage('system', '❌ Failed to connect to ChatGPT');
        return;
      }

      setConnectionStatus('connected');
      
      // Single success message
      addMessage('system', '✅ Connected to ChatGPT successfully!');

      // Start conversation immediately without waiting for user
      setTimeout(() => {
        startConversation();
      }, 1000);

    } catch (error: any) {
      console.error('Failed to initialize conversation:', error);
      setConnectionStatus('error');
      setError(`Failed to start conversation: ${error.message || 'Unknown error'}`);
      addMessage('system', '❌ Failed to initialize conversation');
    }
  };

  const startConversation = () => {
    if (conversationStarted) return; // Prevent duplicate starts
    
    setConversationStarted(true);
    
    // Start with the first question immediately
    if (user && user.conditions.length > 0) {
      setCurrentStep('conditions');
      addMessage('ai', `Hi! I'm here to help you with your daily skin check-in. Let's start with your ${user.conditions[0].name}. How is it feeling today? You can describe it in your own words or rate it from 1-5 (1 = minimal, 5 = extreme).`);
    } else {
      addMessage('ai', "Hi! I'm here to help you with your daily skin check-in. I notice you don't have any conditions set up yet. You'll need to add some conditions first before we can continue.");
    }
  };

  const parseUserResponseLocal = (input: string): { 
    severity?: number; 
    symptoms?: string[]; 
    medicationTaken?: boolean;
    lifestyleValue?: number;
  } => {
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

    // Parse lifestyle factors
    if (currentLifestyleFactor) {
      if (currentLifestyleFactor === 'stress') {
        if (lowerInput.includes('very stressed') || lowerInput.includes('extremely stressed')) result.lifestyleValue = 5;
        else if (lowerInput.includes('stressed') || lowerInput.includes('high stress')) result.lifestyleValue = 4;
        else if (lowerInput.includes('moderate') || lowerInput.includes('some stress')) result.lifestyleValue = 3;
        else if (lowerInput.includes('little stress') || lowerInput.includes('low stress')) result.lifestyleValue = 2;
        else if (lowerInput.includes('no stress') || lowerInput.includes('relaxed') || lowerInput.includes('calm')) result.lifestyleValue = 1;
      } else if (currentLifestyleFactor === 'sleep') {
        if (lowerInput.includes('excellent') || lowerInput.includes('great sleep')) result.lifestyleValue = 5;
        else if (lowerInput.includes('good') || lowerInput.includes('well')) result.lifestyleValue = 4;
        else if (lowerInput.includes('okay') || lowerInput.includes('average')) result.lifestyleValue = 3;
        else if (lowerInput.includes('poor') || lowerInput.includes('bad')) result.lifestyleValue = 2;
        else if (lowerInput.includes('terrible') || lowerInput.includes('awful') || lowerInput.includes('no sleep')) result.lifestyleValue = 1;
      } else if (currentLifestyleFactor === 'water') {
        if (lowerInput.includes('lots') || lowerInput.includes('plenty') || lowerInput.includes('well hydrated')) result.lifestyleValue = 5;
        else if (lowerInput.includes('enough') || lowerInput.includes('good')) result.lifestyleValue = 4;
        else if (lowerInput.includes('some') || lowerInput.includes('okay')) result.lifestyleValue = 3;
        else if (lowerInput.includes('little') || lowerInput.includes('not much')) result.lifestyleValue = 2;
        else if (lowerInput.includes('barely') || lowerInput.includes('dehydrated')) result.lifestyleValue = 1;
      } else if (currentLifestyleFactor === 'diet') {
        if (lowerInput.includes('excellent') || lowerInput.includes('very healthy')) result.lifestyleValue = 5;
        else if (lowerInput.includes('good') || lowerInput.includes('healthy')) result.lifestyleValue = 4;
        else if (lowerInput.includes('okay') || lowerInput.includes('average')) result.lifestyleValue = 3;
        else if (lowerInput.includes('poor') || lowerInput.includes('bad')) result.lifestyleValue = 2;
        else if (lowerInput.includes('terrible') || lowerInput.includes('junk')) result.lifestyleValue = 1;
      }

      // Try to parse numbers for lifestyle factors
      if (numberMatch && !result.lifestyleValue) {
        result.lifestyleValue = parseInt(numberMatch[1]);
      }
    }

    return result;
  };

  const updateFormDataFromParsedResponse = (parsed: any) => {
    const updates: any = {};

    // Update severity for current condition
    if (parsed.severity && user && currentStep === 'conditions') {
      const updatedConditionEntries = [...formData.conditionEntries];
      const currentCondition = user.conditions[currentConditionIndex];
      
      if (currentCondition) {
        const entryIndex = updatedConditionEntries.findIndex(e => e.conditionId === currentCondition.id);
        
        if (entryIndex >= 0) {
          updatedConditionEntries[entryIndex] = {
            ...updatedConditionEntries[entryIndex],
            severity: parsed.severity as SeverityLevel,
            symptoms: [
              ...updatedConditionEntries[entryIndex].symptoms,
              ...(parsed.symptoms || [])
            ].filter((symptom, index, arr) => arr.indexOf(symptom) === index)
          };
          updates.conditionEntries = updatedConditionEntries;
        }
      }
    }

    // Update medication adherence
    if (parsed.medicationTaken !== undefined && currentStep === 'medications') {
      const updatedMedicationEntries = formData.medicationEntries.map((entry: any) => ({
        ...entry,
        taken: parsed.medicationTaken,
        timesTaken: parsed.medicationTaken ? 1 : undefined
      }));
      updates.medicationEntries = updatedMedicationEntries;
    }

    // Update lifestyle factors
    if (parsed.lifestyleValue && currentLifestyleFactor && currentStep === 'lifestyle') {
      const updatedFactors = {
        ...formData.factors,
        [currentLifestyleFactor]: parsed.lifestyleValue as SeverityLevel
      };
      updates.factors = updatedFactors;
    }

    if (Object.keys(updates).length > 0) {
      onUpdateFormData(updates);
    }
  };

  const getNextQuestion = (): string | null => {
    if (!user) return null;

    switch (currentStep) {
      case 'conditions':
        if (currentConditionIndex < user.conditions.length - 1) {
          const nextCondition = user.conditions[currentConditionIndex + 1];
          setCurrentConditionIndex(currentConditionIndex + 1);
          return `Now let's talk about your ${nextCondition.name}. How is it feeling today? Please describe it or rate it from 1-5.`;
        } else {
          setCurrentStep('medications');
          return "Great! Now let's talk about your medications. Did you take any of your prescribed medications today?";
        }
      
      case 'medications':
        setCurrentStep('lifestyle');
        setCurrentLifestyleFactor('stress');
        return "Perfect! Now let's talk about some lifestyle factors. How would you rate your stress level today from 1-5?";
      
      case 'lifestyle':
        if (currentLifestyleFactor === 'stress') {
          setCurrentLifestyleFactor('sleep');
          return "How was your sleep quality last night? Rate it from 1-5 or describe it.";
        } else if (currentLifestyleFactor === 'sleep') {
          setCurrentLifestyleFactor('water');
          return "How's your water intake today? Rate it from 1-5.";
        } else if (currentLifestyleFactor === 'water') {
          setCurrentLifestyleFactor('diet');
          return "How would you rate your diet quality today from 1-5?";
        } else {
          setCurrentStep('complete');
          return "Excellent! I've helped you fill out most of your check-in. You can review everything and add any additional notes in the main form. Is there anything else you'd like to tell me about your skin today?";
        }
      
      case 'complete':
        return null; // No more questions
      
      default:
        return null;
    }
  };

  const handleUserInput = async () => {
    if (!inputValue.trim() || isLoading || connectionStatus !== 'connected') return;

    const userInput = inputValue.trim();
    addMessage('user', userInput);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      if (!user) {
        throw new Error('User not found');
      }

      // Parse the user input locally first
      const parsed = parseUserResponseLocal(userInput);
      updateFormDataFromParsedResponse(parsed);

      const context = {
        userName: user.name,
        conditions: user.conditions,
        medications: user.medications,
        currentFormData: formData
      };

      // Create a focused prompt for the current step
      let contextualPrompt = `User responded: "${userInput}". Please provide ONLY a brief acknowledgment. Do not ask any questions.`;
      
      if (currentStep === 'conditions') {
        const currentCondition = user.conditions[currentConditionIndex];
        contextualPrompt = `User is describing their ${currentCondition?.name}: "${userInput}". Please acknowledge this briefly without asking follow-up questions.`;
      } else if (currentStep === 'medications') {
        contextualPrompt = `User answered about medication adherence: "${userInput}". Please acknowledge briefly without asking questions.`;
      } else if (currentStep === 'lifestyle') {
        contextualPrompt = `User rated their ${currentLifestyleFactor}: "${userInput}". Please acknowledge briefly without asking questions.`;
      }

      // Add user message to chat history
      const newChatHistory: ChatMessage[] = [
        ...chatHistory,
        { role: 'user', content: contextualPrompt }
      ];

      // Get AI response
      const aiResponse = await openaiService.sendMessage(newChatHistory, context);
      
      // Clean the response to ensure it's just an acknowledgment
      const cleanResponse = aiResponse.split('.')[0] + '.'; // Take only first sentence
      
      addMessage('ai', cleanResponse);

      // Update chat history with AI response
      setChatHistory([
        ...newChatHistory,
        { role: 'assistant', content: cleanResponse }
      ]);

      // Determine if we should ask the next question
      let shouldProgress = false;

      if (currentStep === 'conditions' && parsed.severity) {
        shouldProgress = true;
      } else if (currentStep === 'medications' && parsed.medicationTaken !== undefined) {
        shouldProgress = true;
      } else if (currentStep === 'lifestyle' && parsed.lifestyleValue) {
        shouldProgress = true;
      }

      // Ask next question after a delay
      if (shouldProgress) {
        setTimeout(() => {
          const nextQuestion = getNextQuestion();
          if (nextQuestion) {
            addMessage('ai', nextQuestion);
          }
        }, 2000);
      }

    } catch (error: any) {
      console.error('Error in conversation:', error);
      setError(`ChatGPT error: ${error.message || 'Unknown error'}`);
      addMessage('system', `❌ Error: ${error.message || 'Failed to get response from ChatGPT'}`);
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
    setCurrentStep('greeting');
    setCurrentConditionIndex(0);
    setCurrentLifestyleFactor(null);
    setConnectionStatus('connecting');
    setIsInitialized(false);
    setConversationStarted(false);
  };

  // Show error screen if connection failed
  if (connectionStatus === 'error') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-800">ChatGPT Connection Failed</h3>
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
              <p className="text-gray-700 mb-2">{error || 'Failed to connect to ChatGPT'}</p>
              {!import.meta.env.VITE_OPENAI_API_KEY && (
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  <p className="font-medium mb-1">To enable ChatGPT assistance:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Get an API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">OpenAI</a></li>
                    <li>Add it to your .env file as VITE_OPENAI_API_KEY</li>
                    <li>Restart the development server</li>
                  </ol>
                </div>
              )}
              {import.meta.env.VITE_OPENAI_API_KEY === 'your_openai_api_key' && (
                <div className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg">
                  <p className="font-medium mb-1">API Key Not Configured:</p>
                  <p>Please replace 'your_openai_api_key' in your .env file with a real OpenAI API key.</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={retryConnection}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
            >
              <RefreshCw size={16} className="mr-2" />
              Retry Connection
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
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white mr-3 ${
              connectionStatus === 'connected' ? 'bg-green-500' : 
              connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
            }`}>
              <Bot size={18} />
            </div>
            <div>
              <h3 className="font-medium text-gray-800">ChatGPT Assistant</h3>
              <p className="text-sm text-gray-500">
                {connectionStatus === 'connected' && 'Connected • One question at a time'}
                {connectionStatus === 'connecting' && 'Connecting to ChatGPT...'}
                {connectionStatus === 'error' && 'Connection Failed'}
              </p>
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
              className={`flex ${
                message.type === 'user' ? 'justify-end' : 
                message.type === 'system' ? 'justify-center' : 'justify-start'
              }`}
            >
              {message.type === 'system' ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 max-w-md">
                  <p className="text-sm text-blue-700 text-center">{message.content}</p>
                </div>
              ) : (
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
              )}
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
              placeholder={
                connectionStatus === 'connected' ? "Type your response..." : 
                connectionStatus === 'connecting' ? "Connecting..." : "Connection failed"
              }
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
              disabled={isLoading || connectionStatus !== 'connected'}
            />
            <button
              onClick={handleUserInput}
              disabled={!inputValue.trim() || isLoading || connectionStatus !== 'connected'}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-gray-500">
              Press Enter to send • AI acknowledges, then asks next question
            </p>
            {connectionStatus === 'connected' && (
              <button
                onClick={retryConnection}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center"
              >
                <RefreshCw size={12} className="mr-1" />
                Reset
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatGPTAssistant;