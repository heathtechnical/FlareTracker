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
  const [currentStep, setCurrentStep] = useState<'greeting' | 'conditions' | 'medications' | 'lifestyle' | 'complete'>('greeting');
  const [currentConditionIndex, setCurrentConditionIndex] = useState(0);
  const [currentLifestyleFactor, setCurrentLifestyleFactor] = useState<'stress' | 'sleep' | 'water' | 'diet' | null>(null);
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

  const getNextQuestion = (): string => {
    if (!user) return "I need user information to continue.";

    switch (currentStep) {
      case 'greeting':
        return "I'm ready to help you with your daily check-in! Let's start by talking about your skin conditions. Are you ready to begin?";
      
      case 'conditions':
        const currentCondition = user.conditions[currentConditionIndex];
        if (currentCondition) {
          return `How is your ${currentCondition.name} feeling today? Please describe it in your own words or rate it from 1-5 (1 = minimal, 5 = extreme).`;
        }
        return "Let's move on to your medications.";
      
      case 'medications':
        return "Did you take any of your prescribed medications today? Please answer yes or no.";
      
      case 'lifestyle':
        if (!currentLifestyleFactor) {
          setCurrentLifestyleFactor('stress');
          return "Now let's talk about some lifestyle factors. How would you rate your stress level today from 1-5?";
        } else if (currentLifestyleFactor === 'stress') {
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
        return "Thank you for sharing! You can now review and complete your check-in using the main form. Have a great day!";
      
      default:
        return "I'm not sure what to ask next. Please continue with the manual form.";
    }
  };

  const handleStepProgression = (parsed: any) => {
    if (currentStep === 'greeting') {
      const lowerInput = inputValue.toLowerCase();
      if (lowerInput.includes('yes') || lowerInput.includes('ready') || lowerInput.includes('sure') || lowerInput.includes('start')) {
        setCurrentStep('conditions');
        setCurrentConditionIndex(0);
      }
    } else if (currentStep === 'conditions' && parsed.severity) {
      if (currentConditionIndex < user!.conditions.length - 1) {
        setCurrentConditionIndex(currentConditionIndex + 1);
      } else {
        setCurrentStep('medications');
      }
    } else if (currentStep === 'medications' && parsed.medicationTaken !== undefined) {
      setCurrentStep('lifestyle');
      setCurrentLifestyleFactor('stress');
    } else if (currentStep === 'lifestyle' && parsed.lifestyleValue) {
      // Progression is handled in getNextQuestion
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

      // Parse the user input locally first
      const parsed = parseUserResponseLocal(userInput);
      updateFormDataFromParsedResponse(parsed);
      
      // Handle step progression
      handleStepProgression(parsed);

      const context = {
        userName: user.name,
        conditions: user.conditions,
        medications: user.medications,
        currentFormData: formData
      };

      // Create a focused prompt for the current step
      let contextualPrompt = userInput;
      if (currentStep === 'conditions') {
        const currentCondition = user.conditions[currentConditionIndex];
        contextualPrompt = `User is describing their ${currentCondition?.name}: "${userInput}"`;
      } else if (currentStep === 'medications') {
        contextualPrompt = `User is answering about medication adherence: "${userInput}"`;
      } else if (currentStep === 'lifestyle') {
        contextualPrompt = `User is rating their ${currentLifestyleFactor}: "${userInput}"`;
      }

      // Add user message to chat history
      const newChatHistory: ChatMessage[] = [
        ...chatHistory,
        { role: 'user', content: contextualPrompt }
      ];

      // Get AI response
      const aiResponse = await openaiService.sendMessage(newChatHistory, context);
      
      // If the AI response contains multiple questions, extract just the acknowledgment
      const responseLines = aiResponse.split('\n').filter(line => line.trim());
      let cleanResponse = aiResponse;
      
      // If response has multiple sentences, take the first one or two that acknowledge the user
      if (responseLines.length > 1 || aiResponse.includes('?')) {
        const sentences = aiResponse.split(/[.!?]+/).filter(s => s.trim());
        if (sentences.length > 1) {
          // Take the first sentence that acknowledges the user's input
          cleanResponse = sentences[0].trim() + '.';
        }
      }
      
      addAIMessage(cleanResponse);

      // Add the next question after a short delay
      setTimeout(() => {
        const nextQuestion = getNextQuestion();
        if (nextQuestion && nextQuestion !== cleanResponse) {
          addAIMessage(nextQuestion);
        }
      }, 1500);

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
    setCurrentStep('greeting');
    setCurrentConditionIndex(0);
    setCurrentLifestyleFactor(null);
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