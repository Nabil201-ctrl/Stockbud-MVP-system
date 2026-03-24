
import React, { useState } from 'react';
import { MessageCircle, X, Send, Bot } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const ChatBotButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! I'm your AI assistant. How can I help you today?", isBot: true, time: "Just now" },
    { id: 2, text: "Try asking me about your dashboard metrics or data insights!", isBot: true, time: "Just now" }
  ]);
  const [inputText, setInputText] = useState('');
  const { isDarkMode } = useTheme();

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    // Add user message
    const userMessage = {
      id: messages.length + 1,
      text: inputText,
      isBot: false,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    
    const botResponse = {
      id: messages.length + 2,
      text: getBotResponse(inputText),
      isBot: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages([...messages, userMessage, botResponse]);
    setInputText('');
  };

  const getBotResponse = (userInput) => {
    const input = userInput.toLowerCase();
    
    if (input.includes('revenue') || input.includes('sales')) {
      return "Your revenue has increased by 2.94% this week, reaching $40,256,92. The highest revenue day was December 8th with $56,000.";
    } else if (input.includes('visitor') || input.includes('traffic')) {
      return "Visitor growth increased by 24% this month. Peak traffic occurs around 4 PM with 1,600 visitors.";
    } else if (input.includes('country') || input.includes('location')) {
      return "India has the highest traffic with 2,200 visitors, followed by USA with 1,790 visitors.";
    } else if (input.includes('source') || input.includes('channel')) {
      return "Social media is your top source of purchases (48%), followed by direct search (38%).";
    } else if (input.includes('help') || input.includes('support')) {
      return "I can help you with: Revenue insights, Visitor statistics, Country data, Purchase sources, and general dashboard questions.";
    } else if (input.includes('hello') || input.includes('hi')) {
      return "Hello!  How can I assist you with your dashboard analytics today?";
    } else {
      return "I understand you're asking about \"" + userInput + "\". For specific analytics insights, try asking about revenue, visitors, countries, or purchase sources.";
    }
  };

  const suggestedQuestions = [
    "How's my revenue?",
    "Tell me about visitors",
    "Top countries?",
    "Purchase sources?"
  ];

  const handleSuggestionClick = (question) => {
    setInputText(question);
  };

  return (
    <>
      {}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 z-50 ${
          isDarkMode 
            ? 'bg-blue-600 hover:bg-blue-700 text-white' 
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
        aria-label="Open chatbot"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {}
      {isOpen && (
        <div className={`fixed bottom-24 right-6 w-96 h-[600px] rounded-2xl shadow-2xl flex flex-col z-50 transition-all duration-300 ${
          isDarkMode 
            ? 'bg-gray-800 border border-gray-700' 
            : 'bg-white border border-gray-200'
        }`}>
          {}
          <div className={`p-4 rounded-t-2xl flex items-center justify-between ${
            isDarkMode ? 'bg-gray-900' : 'bg-blue-50'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isDarkMode ? 'bg-blue-600' : 'bg-blue-600'
              }`}>
                <Bot size={20} className="text-white" />
              </div>
              <div>
                <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Analytics Assistant
                </h3>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Online • AI-Powered
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className={`p-2 rounded-lg ${
                isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
              aria-label="Close chat"
            >
              <X size={20} />
            </button>
          </div>

          {}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-3 ${
                    message.isBot
                      ? isDarkMode
                        ? 'bg-gray-700 text-white'
                        : 'bg-gray-100 text-gray-900'
                      : isDarkMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-600 text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {message.isBot && (
                      <Bot size={14} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
                    )}
                    <span className="text-xs font-medium">
                      {message.isBot ? 'AI Assistant' : 'You'}
                    </span>
                    <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      • {message.time}
                    </span>
                  </div>
                  <p className="text-sm">{message.text}</p>
                </div>
              </div>
            ))}
          </div>

          {}
          <div className="px-4 pb-3">
            <p className={`text-xs mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Suggested questions:
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(question)}
                  className={`text-xs px-3 py-2 rounded-full transition-colors ${
                    isDarkMode
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>

          {}
          <div className={`p-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask me about your analytics..."
                className={`flex-1 px-4 py-3 rounded-full text-sm outline-none ${
                  isDarkMode
                    ? 'bg-gray-700 text-white placeholder-gray-400'
                    : 'bg-gray-100 text-gray-900 placeholder-gray-500'
                }`}
              />
              <button
                type="submit"
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                  isDarkMode
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
                aria-label="Send message"
              >
                <Send size={20} />
              </button>
            </form>
            <p className={`text-xs mt-2 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              AI-powered insights • Real-time data
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBotButton;