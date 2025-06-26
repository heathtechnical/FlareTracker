import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SeverityLevel } from '../types';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface AICheckInAssistantProps {
  onUpdateFormData: (updates: any) => void;
  formData: any;
  onClose: () => void;
}

const AICheckInAssistant: React.FC<AICheckInAssistantProps> = ({
  onUpdateFormData,
  formData,
  onClose
}) => {
  const { user } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'greeting' | 'conditions' | 'medications' | 'lifestyle' | 'complete'>('greeting');
  const [currentConditionIndex, setCurrentConditionIndex] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Start the conversation
    addAIMessage("Hi! I'm here to help you with your daily check-in. Let's start by talking about how your skin conditions are feeling today. Are you ready to begin?");
  }, []);

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

  const parseUserResponse = (input: string): { severity?: number; symptoms?: string[] } => {
    const lowerInput = input.toLowerCase();
    
    // Parse severity
    let severity: number | undefined;
    
    if (lowerInput.includes('minimal') || lowerInput.includes('very mild') || lowerInput.includes('barely noticeable')) {
      severity = 1;
    } else if (lowerInput.includes('mild') || lowerInput.includes('slight') || lowerInput.includes('little')) {
      severity = 2;
    } else if (lowerInput.includes('moderate') || lowerInput.includes('medium') || lowerInput.includes('okay') || lowerInput.includes('average')) {
      severity = 3;
    } else if (lowerInput.includes('severe') || lowerInput.includes('bad') || lowerInput.includes('painful') || lowerInput.includes('worse')) {
      severity = 4;
    } else if (lowerInput.includes('extreme') || lowerInput.includes('terrible') || lowerInput.includes('unbearable') || lowerInput.includes('worst')) {
      severity = 5;
    }

    // Try to parse numbers
    const numberMatch = input.match(/\b([1-5])\b/);
    if (numberMatch && !severity) {
      severity = parseInt(numberMatch[1]);
    }

    // Parse symptoms
    const symptoms: string[] = [];
    const symptomKeywords = {
      'itchy': 'Itchiness',
      'itch': 'Itchiness',
      'scratchy': 'Itchiness',
      'red': 'Redness',
      'inflamed': 'Redness',
      'dry': 'Dryness',
      'flaky': 'Flaking',
      'peeling': 'Flaking',
      'painful': 'Pain',
      'hurt': 'Pain',
      'sore': 'Pain',
      'swollen': 'Swelling',
      'burning': 'Burning',
      'bleeding': 'Bleeding'
    };

    Object.entries(symptomKeywords).forEach(([keyword, symptom]) => {
      if (lowerInput.includes(keyword) && !symptoms.includes(symptom)) {
        symptoms.push(symptom);
      }
    });

    return { severity, symptoms };
  };

  const parseLifestyleFactor = (input: string, factor: string): number | undefined => {
    const lowerInput = input.toLowerCase();
    
    if (factor === 'stress') {
      if (lowerInput.includes('very stressed') || lowerInput.includes('extremely stressed')) return 5;
      if (lowerInput.includes('stressed') || lowerInput.includes('high stress')) return 4;
      if (lowerInput.includes('moderate') || lowerInput.includes('some stress')) return 3;
      if (lowerInput.includes('little stress') || lowerInput.includes('low stress')) return 2;
      if (lowerInput.includes('no stress') || lowerInput.includes('relaxed') || lowerInput.includes('calm')) return 1;
    }
    
    if (factor === 'sleep') {
      if (lowerInput.includes('excellent') || lowerInput.includes('great sleep')) return 5;
      if (lowerInput.includes('good') || lowerInput.includes('well')) return 4;
      if (lowerInput.includes('okay') || lowerInput.includes('average')) return 3;
      if (lowerInput.includes('poor') || lowerInput.includes('bad')) return 2;
      if (lowerInput.includes('terrible') || lowerInput.includes('awful') || lowerInput.includes('no sleep')) return 1;
    }
    
    if (factor === 'water') {
      if (lowerInput.includes('lots') || lowerInput.includes('plenty') || lowerInput.includes('well hydrated')) return 5;
      if (lowerInput.includes('enough') || lowerInput.includes('good')) return 4;
      if (lowerInput.includes('some') || lowerInput.includes('okay')) return 3;
      if (lowerInput.includes('little') || lowerInput.includes('not much')) return 2;
      if (lowerInput.includes('barely') || lowerInput.includes('dehydrated')) return 1;
    }

    // Try to parse numbers
    const numberMatch = input.match(/\b([1-5])\b/);
    if (numberMatch) {
      return parseInt(numberMatch[1]);
    }

    return undefined;
  };

  const handleConditionResponse = (input: string) => {
    if (!user) return;

    const currentCondition = user.conditions[currentConditionIndex];
    if (!currentCondition) return;

    const parsed = parseUserResponse(input);
    
    if (parsed.severity) {
      // Update the condition entry
      const updatedConditionEntries = [...formData.conditionEntries];
      const entryIndex = updatedConditionEntries.findIndex(e => e.conditionId === currentCondition.id);
      
      if (entryIndex >= 0) {
        updatedConditionEntries[entryIndex] = {
          ...updatedConditionEntries[entryIndex],
          severity: parsed.severity as SeverityLevel,
          symptoms: parsed.symptoms || []
        };
      }
      
      onUpdateFormData({ conditionEntries: updatedConditionEntries });
      
      let response = `Got it! I've recorded a severity of ${parsed.severity} for your ${currentCondition.name}.`;
      if (parsed.symptoms && parsed.symptoms.length > 0) {
        response += ` I also noted these symptoms: ${parsed.symptoms.join(', ')}.`;
      }
      
      addAIMessage(response);
      
      // Move to next condition or next step
      if (currentConditionIndex < user.conditions.length - 1) {
        setCurrentConditionIndex(currentConditionIndex + 1);
        setTimeout(() => {
          const nextCondition = user.conditions[currentConditionIndex + 1];
          addAIMessage(`Now let's talk about your ${nextCondition.name}. How is it feeling today? You can describe it in your own words or rate it from 1-5.`);
        }, 1000);
      } else {
        setCurrentStep('medications');
        setTimeout(() => {
          addAIMessage("Great! Now let's talk about your medications. Did you take any of your prescribed medications today?");
        }, 1000);
      }
    } else {
      addAIMessage("I'm not sure I understood the severity level. Could you tell me how your " + currentCondition.name + " is feeling on a scale of 1-5? (1 = minimal, 5 = extreme)");
    }
  };

  const handleMedicationResponse = (input: string) => {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('yes') || lowerInput.includes('took') || lowerInput.includes('taken')) {
      addAIMessage("That's good! I'll mark your medications as taken. You can adjust the specific details in the main form if needed.");
      
      // Mark all medications as taken
      const updatedMedicationEntries = formData.medicationEntries.map((entry: any) => ({
        ...entry,
        taken: true,
        timesTaken: 1
      }));
      
      onUpdateFormData({ medicationEntries: updatedMedicationEntries });
      
      setCurrentStep('lifestyle');
      setTimeout(() => {
        addAIMessage("Perfect! Now let's talk about some lifestyle factors. How would you rate your stress level today?");
      }, 1000);
    } else if (lowerInput.includes('no') || lowerInput.includes('forgot') || lowerInput.includes('skipped')) {
      addAIMessage("No worries! I'll note that. You can always update this later if needed.");
      
      setCurrentStep('lifestyle');
      setTimeout(() => {
        addAIMessage("Let's talk about some lifestyle factors. How would you rate your stress level today?");
      }, 1000);
    } else {
      addAIMessage("Did you take your medications today? Please answer with yes or no.");
    }
  };

  const handleLifestyleResponse = (input: string, factor: string) => {
    const value = parseLifestyleFactor(input, factor);
    
    if (value) {
      const updatedFactors = {
        ...formData.factors,
        [factor]: value as SeverityLevel
      };
      
      onUpdateFormData({ factors: updatedFactors });
      
      addAIMessage(`Thanks! I've recorded your ${factor} level as ${value}.`);
      
      // Move to next lifestyle factor
      if (factor === 'stress') {
        setTimeout(() => {
          addAIMessage("How was your sleep quality last night?");
        }, 1000);
      } else if (factor === 'sleep') {
        setTimeout(() => {
          addAIMessage("How's your water intake today?");
        }, 1000);
      } else if (factor === 'water') {
        setCurrentStep('complete');
        setTimeout(() => {
          addAIMessage("Excellent! I've helped you fill out most of your check-in. You can review everything and add any additional notes in the main form. Is there anything else you'd like to tell me about your skin today?");
        }, 1000);
      }
    } else {
      addAIMessage(`Could you rate your ${factor} on a scale of 1-5? Or describe it in your own words.`);
    }
  };

  const handleUserInput = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userInput = inputValue.trim();
    addUserMessage(userInput);
    setInputValue('');
    setIsLoading(true);

    // Simulate AI thinking time
    setTimeout(() => {
      if (currentStep === 'greeting') {
        if (userInput.toLowerCase().includes('yes') || userInput.toLowerCase().includes('ready') || userInput.toLowerCase().includes('sure')) {
          setCurrentStep('conditions');
          if (user && user.conditions.length > 0) {
            addAIMessage(`Perfect! Let's start with your ${user.conditions[0].name}. How is it feeling today? You can describe it in your own words or rate it from 1-5 (1 = minimal, 5 = extreme).`);
          } else {
            addAIMessage("I notice you don't have any conditions set up yet. You'll need to add some conditions first before we can continue with the check-in.");
          }
        } else {
          addAIMessage("No problem! Take your time. When you're ready, just let me know and we can start your check-in.");
        }
      } else if (currentStep === 'conditions') {
        handleConditionResponse(userInput);
      } else if (currentStep === 'medications') {
        handleMedicationResponse(userInput);
      } else if (currentStep === 'lifestyle') {
        // Determine which lifestyle factor we're asking about based on what's already filled
        if (!formData.factors?.stress) {
          handleLifestyleResponse(userInput, 'stress');
        } else if (!formData.factors?.sleep) {
          handleLifestyleResponse(userInput, 'sleep');
        } else if (!formData.factors?.water) {
          handleLifestyleResponse(userInput, 'water');
        }
      } else if (currentStep === 'complete') {
        addAIMessage("Thank you for sharing! I've noted that down. You can now review and complete your check-in using the main form. Have a great day!");
        if (userInput.length > 10) {
          // Add as notes if it's substantial
          onUpdateFormData({ notes: (formData.notes || '') + '\n\nAI Assistant notes: ' + userInput });
        }
      }
      
      setIsLoading(false);
    }, 1000 + Math.random() * 1000); // Random delay to feel more natural
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleUserInput();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white mr-3">
              <Bot size={18} />
            </div>
            <div>
              <h3 className="font-medium text-gray-800">AI Check-in Assistant</h3>
              <p className="text-sm text-gray-500">Let me help you with your daily check-in</p>
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
                  message.type === 'user' ? 'bg-blue-600 ml-2' : 'bg-gray-500 mr-2'
                }`}>
                  {message.type === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={`rounded-lg px-4 py-2 ${
                  message.type === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  <p className="text-sm">{message.content}</p>
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
                <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white mr-2">
                  <Bot size={16} />
                </div>
                <div className="bg-gray-100 rounded-lg px-4 py-2">
                  <div className="flex items-center space-x-1">
                    <Loader size={16} className="animate-spin text-gray-500" />
                    <span className="text-sm text-gray-600">AI is thinking...</span>
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
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your response..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              onClick={handleUserInput}
              disabled={!inputValue.trim() || isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Press Enter to send • The AI will help you fill out your check-in form
          </p>
        </div>
      </div>
    </div>
  );
};

export default AICheckInAssistant;