import React, { useState, useEffect, useRef } from "react";
import { Send, X, Bot, User, Sparkles, Crown, Lock } from "lucide-react";
import { openaiService } from "../services/openaiService";
import { useApp } from "../context/AppContext";
import { format, subDays } from "date-fns";

interface Message {
  id: string;
  content: string;
  sender: "user" | "assistant";
  timestamp: Date;
}

interface PremiumAIChatProps {
  onClose: () => void;
}

export default function PremiumAIChat({ onClose }: PremiumAIChatProps) {
  const { user } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isPremium] = useState(true); // For demo purposes, set to true
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    initializeConversation();
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputMessage]);

  const checkOpenAIConnection = async (): Promise<boolean> => {
    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

      if (!apiKey || apiKey.trim() === "") {
        throw new Error("OpenAI API key is not set");
      }

      if (!apiKey.startsWith("sk-")) {
        throw new Error("OpenAI API key format is invalid");
      }

      if (apiKey === "PLACEHOLDER") {
        throw new Error("OpenAI API key is set to placeholder value");
      }

      const response = await fetch("https://api.openai.com/v1/models", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Invalid OpenAI API key");
        } else if (response.status === 429) {
          throw new Error("OpenAI API rate limit exceeded");
        } else {
          throw new Error(`OpenAI API error: ${response.status}`);
        }
      }

      return true;
    } catch (error) {
      console.error("OpenAI connection test failed:", error);
      throw error;
    }
  };

  const initializeConversation = async () => {
    try {
      setConnectionError(null);
      await checkOpenAIConnection();
      setIsConnected(true);

      const greeting = `Hi! I'm your FlareTracker AI assistant. I'm here to help you understand your skin health journey and provide supportive guidance.

I can help you with:
• Understanding patterns in your skin condition data
• Discussing your treatment progress and trends
• Providing general skin health information
• Answering questions about your FlareTracker history

Please note: I cannot provide medical advice or diagnose conditions. Always consult with healthcare professionals for medical concerns.

How can I help you today?`;

      const initialMessage: Message = {
        id: Date.now().toString(),
        content: greeting,
        sender: "assistant",
        timestamp: new Date(),
      };

      setMessages([initialMessage]);
    } catch (error) {
      setIsConnected(false);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      setConnectionError(errorMessage);

      const errorMsg: Message = {
        id: Date.now().toString(),
        content: `I'm sorry, but I'm currently unable to connect to the AI service. Error: ${errorMessage}. Please check your API key configuration and try again.`,
        sender: "assistant",
        timestamp: new Date(),
      };

      setMessages([errorMsg]);
    }
  };

  const createSystemPrompt = () => {
    const conditionsList =
      user?.conditions?.map((c) => `- ${c.name}: ${c.description || 'No description'}`).join("\n") ||
      "No conditions tracked yet";
    
    const medicationsList =
      user?.medications
        ?.map((m) => `- ${m.name} (${m.dosage}, ${m.frequency}) - ${m.active ? 'Active' : 'Inactive'}`)
        .join("\n") || "No medications tracked yet";

    // Get recent check-ins for context
    const recentCheckIns = user?.checkIns
      ?.slice(0, 10)
      ?.map(checkIn => {
        const date = format(new Date(checkIn.date), 'MMM d, yyyy');
        const conditions = checkIn.conditionEntries
          .map(entry => {
            const condition = user.conditions.find(c => c.id === entry.conditionId);
            return `${condition?.name}: severity ${entry.severity}/5${entry.symptoms.length > 0 ? `, symptoms: ${entry.symptoms.join(', ')}` : ''}`;
          })
          .join('; ');
        return `${date}: ${conditions}`;
      })
      .join('\n') || "No check-ins recorded yet";

    // Calculate some basic stats
    const totalCheckIns = user?.checkIns?.length || 0;
    const daysTracking = totalCheckIns > 0 ? 
      Math.ceil((new Date().getTime() - new Date(user?.checkIns?.[user.checkIns.length - 1]?.date || new Date()).getTime()) / (1000 * 60 * 60 * 24)) : 0;

    return `You are a supportive AI assistant for FlareTracker, a skin health tracking app. You help users understand their skin health journey through their tracked data.

CRITICAL GUIDELINES:
- NEVER provide medical advice, diagnoses, or treatment recommendations
- NEVER suggest specific medications or dosages
- ALWAYS recommend consulting healthcare professionals for medical concerns
- Be supportive, empathetic, and encouraging
- Focus on data interpretation and general skin health education
- Help users understand patterns and trends in their data

USER CONTEXT:
Name: ${user?.name || 'User'}
Tracking since: ${user?.createdAt ? format(new Date(user.createdAt), 'MMMM yyyy') : 'Recently'}
Total check-ins: ${totalCheckIns}
Days tracking: ${daysTracking}

CONDITIONS BEING TRACKED:
${conditionsList}

MEDICATIONS:
${medicationsList}

RECENT CHECK-INS (last 10):
${recentCheckIns}

RESPONSE GUIDELINES:
1. Be warm, supportive, and understanding
2. Help interpret patterns in their data when asked
3. Provide general skin health education
4. Encourage consistent tracking
5. Always remind users to consult healthcare providers for medical decisions
6. If asked about specific symptoms or treatments, provide general information but emphasize professional consultation
7. Celebrate improvements and provide encouragement during difficult periods
8. Help users understand correlations in their data (stress, sleep, weather, etc.)

EXAMPLE RESPONSES:
- "I can see from your data that your eczema severity has been trending downward over the past month - that's encouraging progress!"
- "I notice you've been consistent with tracking for 30 days - that's fantastic dedication to understanding your skin health!"
- "While I can't provide medical advice, I can help you see patterns in your data that might be worth discussing with your dermatologist."

Remember: You're here to support and educate, not to replace professional medical care.`;
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !isConnected) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage.trim(),
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    const currentInput = inputMessage.trim();
    setInputMessage("");
    setIsLoading(true);

    try {
      const context = {
        userName: user?.name || "User",
        conditions: user?.conditions || [],
        medications: user?.medications || [],
        currentFormData: {},
      };

      const chatMessages = messages.slice(-5).map((msg) => ({
        role:
          msg.sender === "user" ? ("user" as const) : ("assistant" as const),
        content: msg.content,
      }));

      chatMessages.push({
        role: "user" as const,
        content: currentInput,
      });

      const systemMessage = {
        role: "system" as const,
        content: createSystemPrompt(),
      };

      const response = await openaiService.sendMessage(
        [systemMessage, ...chatMessages],
        context
      );

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response,
        sender: "assistant",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content:
          "I apologize, but I encountered an error while processing your message. Please try again.",
        sender: "assistant",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isPremium) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-2xl border border-gray-200 p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
              <Crown className="w-8 h-8 text-white" />
            </div>
          </div>
          
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Premium Feature</h3>
          <p className="text-gray-600 mb-6">
            AI Chat is a premium feature that provides personalized insights about your skin health journey.
          </p>
          
          <div className="space-y-3 mb-6">
            <div className="flex items-center text-sm text-gray-600">
              <Sparkles className="w-4 h-4 mr-2 text-yellow-500" />
              <span>Personalized skin health insights</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Sparkles className="w-4 h-4 mr-2 text-yellow-500" />
              <span>Data pattern analysis</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Sparkles className="w-4 h-4 mr-2 text-yellow-500" />
              <span>24/7 supportive guidance</span>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Maybe Later
            </button>
            <button className="flex-1 px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-lg hover:from-yellow-500 hover:to-orange-600 transition-colors font-medium">
              Upgrade to Premium
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-2xl h-[700px] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-lg">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold">FlareTracker AI Assistant</h3>
              <div className="flex items-center text-sm opacity-90">
                <Crown className="w-3 h-3 mr-1" />
                <span>Premium</span>
                {isConnected && (
                  <div className="w-2 h-2 bg-green-400 rounded-full ml-2"></div>
                )}
                {connectionError && (
                  <div className="w-2 h-2 bg-red-400 rounded-full ml-2"></div>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
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
              className={`flex ${
                message.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] p-4 rounded-lg ${
                  message.sender === "user"
                    ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                <div className="flex items-start space-x-3">
                  {message.sender === "assistant" && (
                    <div className="w-6 h-6 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}
                  {message.sender === "user" && (
                    <User className="w-4 h-4 mt-0.5 flex-shrink-0 opacity-80" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </p>
                    <p
                      className={`text-xs mt-2 ${
                        message.sender === "user"
                          ? "text-purple-200"
                          : "text-gray-500"
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-800 p-4 rounded-lg max-w-[80%]">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex space-x-3 items-end">
            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                isConnected
                  ? "Ask me about your skin health journey..."
                  : "Connection error..."
              }
              disabled={!isConnected || isLoading}
              rows={1}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed resize-none overflow-hidden min-h-[48px] max-h-[120px]"
              style={{
                height: "auto",
                minHeight: "48px",
                maxHeight: "120px",
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading || !isConnected}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white p-3 rounded-lg transition-all flex-shrink-0"
              aria-label="Send message"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          {connectionError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-600">
              <strong>Connection Error:</strong> {connectionError}
              <br />
              <span className="text-red-500">
                Please check your OpenAI API key configuration in the .env file.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}