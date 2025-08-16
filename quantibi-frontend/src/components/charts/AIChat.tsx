import React, { useState, useRef, useEffect } from 'react';
import { apiService } from '../../services/api';

interface ChartData {
  name: string;
  type: any;
  dataset: string;
  query: string;
  sql: string;
  data: any;
  style: any;
}

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface AIChatProps {
  initialQuery: string;
  chartData: ChartData;
  onChartUpdate: (updates: Partial<ChartData>) => void;
  workspaceId: string;
}

const AIChat: React.FC<AIChatProps> = ({ initialQuery, chartData, onChartUpdate, workspaceId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Add initial query as first message
    if (initialQuery && messages.length === 0) {
      setMessages([
        {
          id: '1',
          type: 'user',
          content: initialQuery,
          timestamp: new Date()
        }
      ]);
    }
  }, [initialQuery, messages.length]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsProcessing(true);

    try {
      // Process the message with AI
      const response = await processAIMessage(inputValue);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const processAIMessage = async (message: string): Promise<string> => {
    // Check if it's a chart modification request
    if (isChartModificationRequest(message)) {
      return await handleChartModification(message);
    }

    // Check if it's a new query request
    if (isNewQueryRequest(message)) {
      return await handleNewQuery(message);
    }

    // Default response
    return "I can help you modify your chart or create new queries. Try saying things like 'make the bars blue', 'change to a line chart', or 'show me monthly revenue'.";
  };

  const isChartModificationRequest = (message: string): boolean => {
    const modificationKeywords = [
      'make', 'change', 'set', 'update', 'modify', 'color', 'blue', 'red', 'green',
      'title', 'legend', 'axis', 'background', 'size', 'width', 'height'
    ];
    
    return modificationKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
  };

  const isNewQueryRequest = (message: string): boolean => {
    const queryKeywords = [
      'show', 'display', 'get', 'find', 'query', 'data', 'chart', 'graph',
      'revenue', 'users', 'sales', 'performance', 'trends'
    ];
    
    return queryKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
  };

  const handleChartModification = async (message: string): Promise<string> => {
    const lowerMessage = message.toLowerCase();
    
    // Handle color changes
    if (lowerMessage.includes('blue')) {
      onChartUpdate({
        style: {
          ...chartData.style,
          colors: ['#3B82F6', '#1D4ED8', '#1E40AF', '#1E3A8A', '#172554']
        }
      });
      return "I've changed the chart colors to blue tones.";
    }
    
    if (lowerMessage.includes('red')) {
      onChartUpdate({
        style: {
          ...chartData.style,
          colors: ['#EF4444', '#DC2626', '#B91C1C', '#991B1B', '#7F1D1D']
        }
      });
      return "I've changed the chart colors to red tones.";
    }

    // Handle chart type changes
    if (lowerMessage.includes('line') || lowerMessage.includes('line chart')) {
      onChartUpdate({ type: 'line' });
      return "I've changed the chart to a line chart.";
    }

    if (lowerMessage.includes('bar') || lowerMessage.includes('bar chart')) {
      onChartUpdate({ type: 'bar' });
      return "I've changed the chart to a bar chart.";
    }

    if (lowerMessage.includes('pie') || lowerMessage.includes('pie chart')) {
      onChartUpdate({ type: 'pie' });
      return "I've changed the chart to a pie chart.";
    }

    // Handle title changes
    if (lowerMessage.includes('title')) {
      const titleMatch = message.match(/title[:\s]+(.+)/i);
      if (titleMatch) {
        onChartUpdate({
          style: {
            ...chartData.style,
            title: { ...chartData.style.title, text: titleMatch[1].trim() }
          }
        });
        return `I've updated the chart title to "${titleMatch[1].trim()}".`;
      }
    }

    // Handle legend toggle
    if (lowerMessage.includes('legend') && lowerMessage.includes('off')) {
      onChartUpdate({
        style: {
          ...chartData.style,
          legend: { ...chartData.style.legend, display: false }
        }
      });
      return "I've hidden the legend.";
    }

    if (lowerMessage.includes('legend') && lowerMessage.includes('on')) {
      onChartUpdate({
        style: {
          ...chartData.style,
          legend: { ...chartData.style.legend, display: true }
        }
      });
      return "I've shown the legend.";
    }

    return "I understand you want to modify the chart, but I'm not sure exactly what you'd like to change. Could you be more specific?";
  };

  const handleNewQuery = async (message: string): Promise<string> => {
    try {
      // Build conversation context for the AI
      const conversationContext = messages
        .filter(msg => msg.type === 'user')
        .map(msg => msg.content)
        .join('. ');
      
      // Combine context with the new message
      const contextualizedQuery = conversationContext 
        ? `${conversationContext}. ${message}` 
        : message;

      const aiResponse = await apiService.generateChartWithAI(workspaceId, {
        query: contextualizedQuery,
        dataset: chartData.dataset,
        workspace: workspaceId
      });

      // Transform data from Chart.js format to the format expected by ChartRenderer
      const transformedData = aiResponse.data.labels.map((label: string, index: number) => ({
        label: label,
        value: aiResponse.data.datasets[0].data[index]
      }));

      // Update the chart with new data
      onChartUpdate({
        query: contextualizedQuery,
        sql: aiResponse.sql,
        data: transformedData,
        type: aiResponse.chartType
      });

      return `I've updated the chart based on your query: "${message}". The chart now shows the new data with a ${aiResponse.chartType} visualization. I considered the context from our previous conversation to provide a more accurate response.`;
    } catch (error) {
      return "I'm sorry, I couldn't process your query. Please make sure your request is clear and try again.";
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h3 className="text-lg font-medium text-gray-900">AI Assistant</h3>
        <p className="text-sm text-gray-500">
          Ask me to modify your chart or create new queries. I'll remember our conversation context.
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Example: "show me sales in kentucky for 2016" then "actually change to 2017" - I'll understand you mean 2017 for Kentucky.
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.type === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm">{message.content}</p>
              <p className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                <p className="text-sm">Processing...</p>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex space-x-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me to modify your chart or create new queries..."
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            rows={2}
            disabled={isProcessing}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isProcessing}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
