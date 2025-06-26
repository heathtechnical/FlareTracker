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
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [isInitialized, setIsInitialized] = useState(false);
  const [needsMoreInfo, setNeedsMoreInfo] = useState(false);
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
      if (!import.meta.env.VITE_OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
      }

      if (import.meta.env.VITE_OPENAI_API_KEY === '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') {
        throw new Error('OpenAI API key is set to placeholder value');
      }

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
    addMessage('system', '🔗 Connecting to ChatGPT...');

    try {
      const isConnected = await checkOpenAIConnection();
      
      if (!isConnected) {
        setConnectionStatus('error');
        addMessage('system', '❌ Failed to connect to ChatGPT');
        return;
      }

      setConnectionStatus('connected');
      addMessage('system', '✅ Connected to ChatGPT successfully!');

      // Start with the main question
      setTimeout(() => {
        if (user.conditions.length > 0) {
          const conditionNames = user.conditions.map(c => c.name).join(', ');
          addMessage('ai', `Hi! How is your skin today? Please tell me about your ${conditionNames} and anything else you'd like me to know about your skin health today.`);
        } else {
          addMessage('ai', "Hi! How is your skin today? Please tell me about any skin conditions you're experiencing and I'll help fill out your check-in.");
        }
      }, 1000);

    } catch (error: any) {
      console.error('Failed to initialize conversation:', error);
      setConnectionStatus('error');
      setError(`Failed to start conversation: ${error.message || 'Unknown error'}`);
      addMessage('system', '❌ Failed to initialize conversation');
    }
  };

  const parseComprehensiveResponse = (input: string): any => {
    const lowerInput = input.toLowerCase();
    const updates: any = {};

    // Parse severity for each condition
    if (user && user.conditions.length > 0) {
      const conditionEntries = [...formData.conditionEntries];
      let foundSeverity = false;

      user.conditions.forEach((condition, index) => {
        const conditionName = condition.name.toLowerCase();
        
        // Look for condition-specific mentions
        const conditionMentioned = lowerInput.includes(conditionName) || 
                                 lowerInput.includes(conditionName.split(' ')[0]) ||
                                 (user.conditions.length === 1); // If only one condition, assume it's about that

        if (conditionMentioned || !foundSeverity) {
          // Parse severity
          let severity: number | undefined;
          
          // Severity keywords
          if (lowerInput.includes('terrible') || lowerInput.includes('awful') || lowerInput.includes('unbearable') || lowerInput.includes('worst')) {
            severity = 5;
          } else if (lowerInput.includes('bad') || lowerInput.includes('severe') || lowerInput.includes('painful') || lowerInput.includes('really') && (lowerInput.includes('itchy') || lowerInput.includes('red'))) {
            severity = 4;
          } else if (lowerInput.includes('moderate') || lowerInput.includes('okay') || lowerInput.includes('average') || lowerInput.includes('not great') || lowerInput.includes('acting up')) {
            severity = 3;
          } else if (lowerInput.includes('mild') || lowerInput.includes('slight') || lowerInput.includes('little') || lowerInput.includes('better') || lowerInput.includes('improving')) {
            severity = 2;
          } else if (lowerInput.includes('minimal') || lowerInput.includes('barely') || lowerInput.includes('very mild') || lowerInput.includes('almost gone') || lowerInput.includes('clear')) {
            severity = 1;
          }

          // Try to parse numbers
          const numberMatch = input.match(/\b([1-5])\b/);
          if (numberMatch && !severity) {
            severity = parseInt(numberMatch[1]);
          }

          // Default severity if mentioned but no specific level
          if (!severity && conditionMentioned) {
            if (lowerInput.includes('good') || lowerInput.includes('fine') || lowerInput.includes('well')) {
              severity = 2;
            } else if (lowerInput.includes('not') && (lowerInput.includes('good') || lowerInput.includes('great'))) {
              severity = 3;
            } else {
              severity = 3; // Default moderate if mentioned without specifics
            }
          }

          if (severity) {
            const entryIndex = conditionEntries.findIndex(e => e.conditionId === condition.id);
            if (entryIndex >= 0) {
              conditionEntries[entryIndex] = {
                ...conditionEntries[entryIndex],
                severity: severity as SeverityLevel
              };
              foundSeverity = true;
            }
          }
        }
      });

      if (foundSeverity) {
        updates.conditionEntries = conditionEntries;
      }
    }

    // Parse symptoms
    const symptoms: string[] = [];
    const symptomKeywords = {
      'itchy': 'Itchiness', 'itch': 'Itchiness', 'scratchy': 'Itchiness', 'scratching': 'Itchiness',
      'red': 'Redness', 'inflamed': 'Redness', 'inflammation': 'Redness',
      'dry': 'Dryness', 'flaky': 'Flaking', 'peeling': 'Flaking', 'scaling': 'Flaking',
      'painful': 'Pain', 'hurt': 'Pain', 'sore': 'Pain', 'ache': 'Pain',
      'swollen': 'Swelling', 'puffy': 'Swelling',
      'burning': 'Burning', 'stinging': 'Burning',
      'bleeding': 'Bleeding', 'blood': 'Bleeding'
    };

    Object.entries(symptomKeywords).forEach(([keyword, symptom]) => {
      if (lowerInput.includes(keyword) && !symptoms.includes(symptom)) {
        symptoms.push(symptom);
      }
    });

    // Add symptoms to all conditions that have severity
    if (symptoms.length > 0 && updates.conditionEntries) {
      updates.conditionEntries = updates.conditionEntries.map((entry: any) => {
        if (entry.severity > 0) {
          return {
            ...entry,
            symptoms: [...(entry.symptoms || []), ...symptoms].filter((s, i, arr) => arr.indexOf(s) === i)
          };
        }
        return entry;
      });
    }

    // Parse medication adherence
    if (lowerInput.includes('took') || lowerInput.includes('applied') || lowerInput.includes('used') || 
        lowerInput.includes('medication') || lowerInput.includes('cream') || lowerInput.includes('pill')) {
      
      if (lowerInput.includes('forgot') || lowerInput.includes('missed') || lowerInput.includes('skipped') || 
          lowerInput.includes("didn't") || lowerInput.includes("haven't")) {
        // Medications not taken
        updates.medicationEntries = formData.medicationEntries.map((entry: any) => ({
          ...entry,
          taken: false
        }));
      } else {
        // Medications taken
        updates.medicationEntries = formData.medicationEntries.map((entry: any) => ({
          ...entry,
          taken: true,
          timesTaken: 1
        }));
      }
    }

    // Parse lifestyle factors
    const lifestyleUpdates: any = {};

    // Stress
    if (lowerInput.includes('stress')) {
      if (lowerInput.includes('very stressed') || lowerInput.includes('extremely stressed')) {
        lifestyleUpdates.stress = 5;
      } else if (lowerInput.includes('stressed') || lowerInput.includes('stressful')) {
        lifestyleUpdates.stress = 4;
      } else if (lowerInput.includes('some stress') || lowerInput.includes('bit stressed')) {
        lifestyleUpdates.stress = 3;
      } else if (lowerInput.includes('little stress') || lowerInput.includes('not stressed')) {
        lifestyleUpdates.stress = 2;
      } else if (lowerInput.includes('no stress') || lowerInput.includes('relaxed')) {
        lifestyleUpdates.stress = 1;
      }
    }

    // Sleep
    if (lowerInput.includes('sleep') || lowerInput.includes('slept') || lowerInput.includes('tired')) {
      if (lowerInput.includes('great sleep') || lowerInput.includes('excellent sleep') || lowerInput.includes('slept well')) {
        lifestyleUpdates.sleep = 5;
      } else if (lowerInput.includes('good sleep') || lowerInput.includes('well rested')) {
        lifestyleUpdates.sleep = 4;
      } else if (lowerInput.includes('okay sleep') || lowerInput.includes('average sleep')) {
        lifestyleUpdates.sleep = 3;
      } else if (lowerInput.includes('poor sleep') || lowerInput.includes('bad sleep') || lowerInput.includes('tired')) {
        lifestyleUpdates.sleep = 2;
      } else if (lowerInput.includes('no sleep') || lowerInput.includes('terrible sleep') || lowerInput.includes('exhausted')) {
        lifestyleUpdates.sleep = 1;
      }
    }

    // Water
    if (lowerInput.includes('water') || lowerInput.includes('hydrat') || lowerInput.includes('drink')) {
      if (lowerInput.includes('lots of water') || lowerInput.includes('well hydrated') || lowerInput.includes('plenty')) {
        lifestyleUpdates.water = 5;
      } else if (lowerInput.includes('enough water') || lowerInput.includes('good hydration')) {
        lifestyleUpdates.water = 4;
      } else if (lowerInput.includes('some water') || lowerInput.includes('okay')) {
        lifestyleUpdates.water = 3;
      } else if (lowerInput.includes('little water') || lowerInput.includes('not much')) {
        lifestyleUpdates.water = 2;
      } else if (lowerInput.includes('dehydrated') || lowerInput.includes('barely any')) {
        lifestyleUpdates.water = 1;
      }
    }

    if (Object.keys(lifestyleUpdates).length > 0) {
      updates.factors = {
        ...formData.factors,
        ...lifestyleUpdates
      };
    }

    // Extract notes
    if (input.length > 20) {
      const existingNotes = formData.notes || '';
      const newNotes = existingNotes ? `${existingNotes}\n\nAI Assistant: ${input}` : `AI Assistant: ${input}`;
      updates.notes = newNotes;
    }

    return updates;
  };

  const analyzeCompleteness = (updates: any): { isComplete: boolean; missingInfo: string[] } => {
    const missing: string[] = [];
    
    // Check if we have severity for all conditions
    if (user && user.conditions.length > 0) {
      const updatedEntries = updates.conditionEntries || formData.conditionEntries;
      const missingSeverity = user.conditions.filter(condition => {
        const entry = updatedEntries.find((e: any) => e.conditionId === condition.id);
        return !entry || entry.severity === 0;
      });
      
      if (missingSeverity.length > 0) {
        missing.push(`severity ratings for ${missingSeverity.map(c => c.name).join(', ')}`);
      }
    }

    // Check medications if user has any
    if (user && user.medications.length > 0) {
      const updatedMedEntries = updates.medicationEntries || formData.medicationEntries;
      const hasMedicationInfo = updatedMedEntries.some((entry: any) => entry.taken !== undefined);
      
      if (!hasMedicationInfo) {
        missing.push('medication information');
      }
    }

    return {
      isComplete: missing.length === 0,
      missingInfo: missing
    };
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

      // Parse the comprehensive response
      const updates = parseComprehensiveResponse(userInput);
      
      // Apply updates to form
      if (Object.keys(updates).length > 0) {
        onUpdateFormData(updates);
      }

      // Analyze completeness
      const { isComplete, missingInfo } = analyzeCompleteness(updates);

      const context = {
        userName: user.name,
        conditions: user.conditions,
        medications: user.medications,
        currentFormData: { ...formData, ...updates }
      };

      // Create AI response based on what was captured and what's missing
      let aiPrompt = `User described their skin: "${userInput}". `;
      
      if (Object.keys(updates).length > 0) {
        aiPrompt += `I successfully captured information about their skin condition. `;
      }
      
      if (isComplete) {
        aiPrompt += `I have all the information needed for their check-in. Please acknowledge and let them know their check-in is ready to save.`;
      } else {
        aiPrompt += `I still need information about: ${missingInfo.join(', ')}. Please ask for this specific missing information.`;
        setNeedsMoreInfo(true);
      }

      // Get AI response
      const aiResponse = await openaiService.sendMessage([
        { role: 'user', content: aiPrompt }
      ], context);
      
      addMessage('ai', aiResponse);

      // Update chat history
      setChatHistory([
        ...chatHistory,
        { role: 'user', content: userInput },
        { role: 'assistant', content: aiResponse }
      ]);

      if (isComplete) {
        setNeedsMoreInfo(false);
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
    setConnectionStatus('connecting');
    setIsInitialized(false);
    setNeedsMoreInfo(false);
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
              <h3 className="font-medium text-gray-800">AI Check-in Assistant</h3>
              <p className="text-sm text-gray-500">
                {connectionStatus === 'connected' && 'Tell me about your skin and I\'ll fill out your form'}
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
                    <span className="text-sm text-gray-600">Analyzing your response...</span>
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
                connectionStatus === 'connected' ? 
                  (needsMoreInfo ? "Please provide the additional information..." : "Describe how your skin is today...") : 
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
              Describe your skin condition, medications, stress, sleep, etc. - I'll fill out the form automatically
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