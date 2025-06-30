import React, { useState, useEffect, useRef } from "react";
import { Send, X, Bot, User, Sparkles, Crown, Lock } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { openaiService } from "../services/openaiService";
import { useApp } from "../context/AppContext";
import { format, subDays, differenceInDays, parseISO, startOfYear, endOfYear, isWithinInterval } from "date-fns";

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

  // Auto-focus input when component mounts
  useEffect(() => {
    if (textareaRef.current) {
      // Small delay to ensure the modal is fully rendered
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputMessage]);

  // Focus input after sending message
  const focusInput = () => {
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 100);
  };

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

      const greeting = `Hi! I'm your **FlareTracker AI assistant**. I'm here to help you understand your skin health journey and provide supportive guidance.

## I can help you with:
  * **Understanding patterns** in your skin condition data
  * **Discussing your treatment progress** and trends
  * **Providing general skin health information**
  * **Answering questions** about your FlareTracker history
  * **Analyzing medication usage** patterns
  * **Identifying flare frequency** and severity trends

> **Please note:** I cannot provide medical advice or diagnose conditions. Always consult with healthcare professionals for medical concerns.

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

  const generateDetailedAnalytics = () => {
    if (!user || !user.checkIns || user.checkIns.length === 0) {
      return "No check-in data available for analysis.";
    }

    const now = new Date();
    const oneYearAgo = subDays(now, 365);
    const thirtyDaysAgo = subDays(now, 30);
    const sevenDaysAgo = subDays(now, 7);

    // Medication usage analytics
    const medicationAnalytics = user.medications.map(medication => {
      const usageData = {
        lastYear: 0,
        lastMonth: 0,
        lastWeek: 0,
        totalDoses: 0,
        consecutiveDays: 0,
        lastUsed: null as string | null,
        usageByMonth: {} as Record<string, number>
      };

      user.checkIns.forEach(checkIn => {
        const checkInDate = new Date(checkIn.date);
        const medicationEntry = checkIn.medicationEntries.find(entry => 
          entry.medicationId === medication.id && entry.taken
        );

        if (medicationEntry) {
          const doses = medicationEntry.timesTaken || 1;
          usageData.totalDoses += doses;
          usageData.lastUsed = format(checkInDate, 'MMM d, yyyy');

          // Count usage by time periods
          if (checkInDate >= oneYearAgo) usageData.lastYear++;
          if (checkInDate >= thirtyDaysAgo) usageData.lastMonth++;
          if (checkInDate >= sevenDaysAgo) usageData.lastWeek++;

          // Monthly breakdown
          const monthKey = format(checkInDate, 'yyyy-MM');
          usageData.usageByMonth[monthKey] = (usageData.usageByMonth[monthKey] || 0) + 1;
        }
      });

      return { medication, ...usageData };
    });

    // Condition severity analytics
    const conditionAnalytics = user.conditions.map(condition => {
      const severityData = {
        totalEntries: 0,
        averageSeverity: 0,
        severeFlares: 0, // severity 4-5
        mildDays: 0, // severity 1-2
        lastYear: { total: 0, average: 0, severe: 0 },
        lastMonth: { total: 0, average: 0, severe: 0 },
        lastWeek: { total: 0, average: 0, severe: 0 },
        bestDay: { date: '', severity: 5 },
        worstDay: { date: '', severity: 1 },
        monthlyAverages: {} as Record<string, number>
      };

      const severities: number[] = [];
      
      user.checkIns.forEach(checkIn => {
        const checkInDate = new Date(checkIn.date);
        const conditionEntry = checkIn.conditionEntries.find(entry => 
          entry.conditionId === condition.id
        );

        if (conditionEntry && conditionEntry.severity > 0) {
          const severity = conditionEntry.severity;
          severities.push(severity);
          severityData.totalEntries++;

          // Track best and worst days
          if (severity < severityData.bestDay.severity) {
            severityData.bestDay = { date: format(checkInDate, 'MMM d, yyyy'), severity };
          }
          if (severity > severityData.worstDay.severity) {
            severityData.worstDay = { date: format(checkInDate, 'MMM d, yyyy'), severity };
          }

          // Count severe flares and mild days
          if (severity >= 4) severityData.severeFlares++;
          if (severity <= 2) severityData.mildDays++;

          // Time period analysis
          if (checkInDate >= oneYearAgo) {
            severityData.lastYear.total++;
            if (severity >= 4) severityData.lastYear.severe++;
          }
          if (checkInDate >= thirtyDaysAgo) {
            severityData.lastMonth.total++;
            if (severity >= 4) severityData.lastMonth.severe++;
          }
          if (checkInDate >= sevenDaysAgo) {
            severityData.lastWeek.total++;
            if (severity >= 4) severityData.lastWeek.severe++;
          }

          // Monthly averages
          const monthKey = format(checkInDate, 'yyyy-MM');
          if (!severityData.monthlyAverages[monthKey]) {
            severityData.monthlyAverages[monthKey] = 0;
          }
          severityData.monthlyAverages[monthKey] += severity;
        }
      });

      // Calculate averages
      if (severities.length > 0) {
        severityData.averageSeverity = severities.reduce((a, b) => a + b, 0) / severities.length;
        
        // Calculate period averages
        const yearSeverities = severities.slice(-severityData.lastYear.total);
        const monthSeverities = severities.slice(-severityData.lastMonth.total);
        const weekSeverities = severities.slice(-severityData.lastWeek.total);
        
        severityData.lastYear.average = yearSeverities.length > 0 ? 
          yearSeverities.reduce((a, b) => a + b, 0) / yearSeverities.length : 0;
        severityData.lastMonth.average = monthSeverities.length > 0 ? 
          monthSeverities.reduce((a, b) => a + b, 0) / monthSeverities.length : 0;
        severityData.lastWeek.average = weekSeverities.length > 0 ? 
          weekSeverities.reduce((a, b) => a + b, 0) / weekSeverities.length : 0;
      }

      // Convert monthly totals to averages
      Object.keys(severityData.monthlyAverages).forEach(month => {
        const monthEntries = user.checkIns.filter(checkIn => {
          const monthKey = format(new Date(checkIn.date), 'yyyy-MM');
          return monthKey === month && checkIn.conditionEntries.some(entry => 
            entry.conditionId === condition.id && entry.severity > 0
          );
        }).length;
        
        if (monthEntries > 0) {
          severityData.monthlyAverages[month] = severityData.monthlyAverages[month] / monthEntries;
        }
      });

      return { condition, ...severityData };
    });

    // General tracking stats
    const trackingStats = {
      totalCheckIns: user.checkIns.length,
      trackingDays: user.checkIns.length > 0 ? 
        differenceInDays(now, new Date(user.checkIns[user.checkIns.length - 1].date)) : 0,
      consistency: {
        lastWeek: user.checkIns.filter(ci => new Date(ci.date) >= sevenDaysAgo).length,
        lastMonth: user.checkIns.filter(ci => new Date(ci.date) >= thirtyDaysAgo).length,
      },
      firstCheckIn: user.checkIns.length > 0 ? 
        format(new Date(user.checkIns[user.checkIns.length - 1].date), 'MMM d, yyyy') : 'N/A',
      lastCheckIn: user.checkIns.length > 0 ? 
        format(new Date(user.checkIns[0].date), 'MMM d, yyyy') : 'N/A'
    };

    return {
      medicationAnalytics,
      conditionAnalytics,
      trackingStats
    };
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
        const medications = checkIn.medicationEntries
          .filter(entry => entry.taken)
          .map(entry => {
            const medication = user.medications.find(m => m.id === entry.medicationId);
            return `${medication?.name}${entry.timesTaken && entry.timesTaken > 1 ? ` (${entry.timesTaken}x)` : ''}`;
          })
          .join(', ');
        return `${date}: ${conditions}${medications ? ` | Medications: ${medications}` : ''}`;
      })
      .join('\n') || "No check-ins recorded yet";

    // Generate detailed analytics
    const analytics = generateDetailedAnalytics();

    // Calculate some basic stats
    const totalCheckIns = user?.checkIns?.length || 0;
    const daysTracking = totalCheckIns > 0 ? 
      Math.ceil((new Date().getTime() - new Date(user?.checkIns?.[user.checkIns.length - 1]?.date || new Date()).getTime()) / (1000 * 60 * 60 * 24)) : 0;

    const backtick = '`';

    return `You are a supportive AI assistant for FlareTracker, a skin health tracking app. You help users understand their skin health journey through their tracked data.

CRITICAL GUIDELINES:
- NEVER provide medical advice, diagnoses, or treatment recommendations
- NEVER suggest specific medications or dosages
- ALWAYS recommend consulting healthcare professionals for medical concerns
- Be supportive, empathetic, and encouraging
- Focus on data interpretation and general skin health education
- Help users understand patterns and trends in their data
- Provide specific analytics when asked (medication usage counts, flare frequencies, etc.)
- Format your responses using Markdown for better readability
- Use headers, lists, bold text, and other formatting to make responses clear and engaging

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

DETAILED ANALYTICS DATA:
${typeof analytics === 'string' ? analytics : JSON.stringify(analytics, null, 2)}

RESPONSE CAPABILITIES:
You can answer specific questions like:
- "How many times did I use [medication] in the last year/month/week?"
- "How many severe flares have I had this year?"
- "What's my average severity for [condition]?"
- "When was my last flare?"
- "How consistent have I been with tracking?"
- "What's my medication adherence pattern?"
- "Show me my worst/best days"
- "What are my monthly trends?"

MARKDOWN FORMATTING GUIDELINES:
- Use **bold** for emphasis on important numbers and insights
- Use ## headers for main sections
- Use bullet points (•) or numbered lists for multiple items
- Use > blockquotes for important reminders about medical advice
- Use ${backtick}code formatting${backtick} for specific data values
- Use tables when presenting comparative data
- Keep formatting clean and readable

RESPONSE GUIDELINES:
1. Be warm, supportive, and understanding
2. Provide specific data when asked (use the analytics data above)
3. Help interpret patterns and trends
4. Provide general skin health education
5. Encourage consistent tracking
6. Always remind users to consult healthcare providers for medical decisions
7. If asked about specific symptoms or treatments, provide general information but emphasize professional consultation
8. Celebrate improvements and provide encouragement during difficult periods
9. Help users understand correlations in their data (stress, sleep, weather, etc.)
10. When providing statistics, be precise and reference the actual data
11. Format responses with Markdown for better readability

EXAMPLE RESPONSES:
- "## Medication Usage Analysis\n\nLooking at your data, you've used **hydrocortisone cream 15 times** in the last year, with **8 uses** in the past month.\n\n> Remember to follow your healthcare provider's guidance on medication usage."
- "## Flare Pattern Insights\n\nI can see you've had **3 severe flares** (severity 4-5) in the past 6 months, which is down from **7 in the previous 6 months** - that's encouraging progress! 🎉"
- "## Recent Severity Trends\n\nYour eczema has averaged **2.3/5 severity** over the past month, compared to **3.1/5** the month before. This shows a positive trend!"
- "## Tracking Consistency\n\nYou've been incredibly consistent with tracking - **28 out of 30 days** this month! 👏"

Remember: You're here to support and educate with precise data insights, not to replace professional medical care. Always format responses with Markdown for clarity and engagement.`;
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
      focusInput(); // Auto-focus input after sending
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleQuickQuestion = (question: string) => {
    setInputMessage(question);
    focusInput();
  };

  if (!isPremium) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto" style={{ marginTop: 0 }}>
        <div className="w-full max-w-md bg-white rounded-lg shadow-2xl border border-gray-200 p-8 text-center my-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-accent-400 to-primary-500 rounded-full flex items-center justify-center">
              <Crown className="w-8 h-8 text-white" />
            </div>
          </div>
          
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Premium Feature</h3>
          <p className="text-gray-600 mb-6">
            AI Chat is a premium feature that provides personalized insights about your skin health journey.
          </p>
          
          <div className="space-y-3 mb-6">
            <div className="flex items-center text-sm text-gray-600">
              <Sparkles className="w-4 h-4 mr-2 text-accent-500" />
              <span>Personalized skin health insights</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Sparkles className="w-4 h-4 mr-2 text-accent-500" />
              <span>Data pattern analysis</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Sparkles className="w-4 h-4 mr-2 text-accent-500" />
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
            <button className="flex-1 px-4 py-2 bg-gradient-to-r from-accent-400 to-primary-500 text-white rounded-lg hover:from-accent-500 hover:to-primary-600 transition-colors font-medium">
              Upgrade to Premium
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl h-[700px] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-t-lg">
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
                    ? "bg-gradient-to-r from-primary-500 to-accent-500 text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                <div className="flex items-start space-x-3">
                  {message.sender === "assistant" && (
                    <div className="w-6 h-6 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}
                  {message.sender === "user" && (
                    <User className="w-4 h-4 mt-0.5 flex-shrink-0 opacity-80" />
                  )}
                  <div className="flex-1">
                    {message.sender === "assistant" ? (
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            // Custom styling for markdown elements
                            h1: ({ children }) => <h1 className="text-lg font-bold mb-2 text-gray-800">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-base font-semibold mb-2 text-gray-800">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 text-gray-800">{children}</h3>,
                            p: ({ children }) => <p className="text-sm leading-relaxed mb-2 text-gray-800">{children}</p>,
                            ul: ({ children }) => <ul className="text-sm mb-2 pl-4 text-gray-800">{children}</ul>,
                            ol: ({ children }) => <ol className="text-sm mb-2 pl-4 text-gray-800">{children}</ol>,
                            li: ({ children }) => <li className="mb-1 text-gray-800">{children}</li>,
                            strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                            em: ({ children }) => <em className="italic text-gray-700">{children}</em>,
                            code: ({ children }) => <code className="bg-gray-200 px-1 py-0.5 rounded text-xs font-mono text-gray-800">{children}</code>,
                            blockquote: ({ children }) => (
                              <blockquote className="border-l-4 border-primary-500 pl-3 py-1 bg-primary-50 text-sm text-primary-800 mb-2 rounded-r">
                                {children}
                              </blockquote>
                            ),
                            table: ({ children }) => (
                              <div className="overflow-x-auto mb-2">
                                <table className="w-full text-xs border-collapse border border-gray-300">
                                  {children}
                                </table>
                              </div>
                            ),
                            thead: ({ children }) => (
                              <thead className="bg-gray-100">
                                {children}
                              </thead>
                            ),
                            tbody: ({ children }) => (
                              <tbody>
                                {children}
                              </tbody>
                            ),
                            th: ({ children }) => (
                              <th className="border border-gray-300 px-2 py-1 font-semibold text-left text-gray-800">
                                {children}
                              </th>
                            ),
                            td: ({ children }) => (
                              <td className="border border-gray-300 px-2 py-1 text-gray-700">
                                {children}
                              </td>
                            ),
                            tr: ({ children }) => (
                              <tr className="hover:bg-gray-50">
                                {children}
                              </tr>
                            ),
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">
                        {message.content}
                      </p>
                    )}
                    <p
                      className={`text-xs mt-2 ${
                        message.sender === "user"
                          ? "text-white opacity-75"
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
                  <div className="w-6 h-6 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full flex items-center justify-center">
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
        <div className="p-4 border-t border-gray-200 bg-cream-50">
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
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed resize-none overflow-hidden min-h-[48px] max-h-[120px]"
              style={{
                height: "auto",
                minHeight: "48px",
                maxHeight: "120px",
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading || !isConnected}
              className="bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white p-3 rounded-lg transition-all flex-shrink-0"
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
          
          {/* Quick question suggestions */}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => handleQuickQuestion("Show me my medication usage in a table format")}
              className="text-xs px-3 py-1 bg-primary-100 text-primary-700 rounded-full hover:bg-primary-200 transition-colors"
            >
              Medication table
            </button>
            <button
              onClick={() => handleQuickQuestion("How many severe flares have I had this year?")}
              className="text-xs px-3 py-1 bg-primary-100 text-primary-700 rounded-full hover:bg-primary-200 transition-colors"
            >
              Severe flares this year
            </button>
            <button
              onClick={() => handleQuickQuestion("What's my average severity lately?")}
              className="text-xs px-3 py-1 bg-primary-100 text-primary-700 rounded-full hover:bg-primary-200 transition-colors"
            >
              Average severity
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}