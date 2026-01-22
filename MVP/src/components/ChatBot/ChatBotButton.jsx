// components/ChatBot/ChatBotButton.jsx
import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, Loader2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

const ChatBotButton = () => {
  const { isDarkMode } = useTheme();
  const { authenticatedFetch, refreshUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! I'm your AI assistant. How can I help you today?", isBot: true, time: "Just now" },
    { id: 2, text: "Try asking me about your dashboard metrics or data insights!", isBot: true, time: "Just now" }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, isOpen]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMessageText = inputText;

    // Add user message
    const userMessage = {
      id: Date.now(),
      text: userMessageText,
      isBot: false,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    try {
      // Prepare history for API
      const history = messages.map(m => ({
        role: m.isBot ? 'assistant' : 'user',
        content: m.text
      }));

      const response = await authenticatedFetch('http://localhost:3000/chats/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: userMessageText, history })
      });

      if (response.ok) {
        const data = await response.json();
        const botResponse = {
          id: Date.now() + 1,
          text: data.content,
          isBot: true,
          time: new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, botResponse]);
        await refreshUser();
      } else {
        const errorData = await response.json();
        const botResponse = {
          id: Date.now() + 1,
          text: errorData.message || "I'm having trouble connecting right now.",
          isBot: true,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, botResponse]);
      }
    } catch (error) {
      console.error("Failed to send message", error);
      const botResponse = {
        id: Date.now() + 1,
        text: "Network error. Please try again.",
        isBot: true,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botResponse]);
    } finally {
      setIsTyping(false);
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
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 z-50 ${isDarkMode
          ? 'bg-blue-600 hover:bg-blue-700 text-white'
          : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        aria-label="Open chatbot"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className={`fixed bottom-0 right-0 w-full h-[100dvh] sm:h-[700px] sm:w-[500px] sm:bottom-24 sm:right-6 sm:rounded-2xl shadow-2xl flex flex-col z-50 transition-all duration-300 ${isDarkMode
          ? 'bg-gray-800 border-t sm:border border-gray-700'
          : 'bg-slate-50 border-t sm:border border-gray-200'
          }`}>
          {/* Header */}
          <div className={`p-4 sm:rounded-t-2xl flex items-center justify-between ${isDarkMode ? 'bg-gray-900' : 'bg-blue-50'
            }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-blue-600' : 'bg-blue-600'
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
              className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              aria-label="Close chat"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-3 ${message.isBot
                    ? isDarkMode
                      ? 'bg-gray-700 text-white'
                      : 'bg-white text-gray-900 border border-gray-200 shadow-sm'
                    : isDarkMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-100 text-blue-900'
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
                  <p className="text-base whitespace-pre-wrap">{message.text}</p>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className={`max-w-[80%] rounded-2xl p-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <div className="flex items-center gap-1 h-5">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions */}
          <div className="px-4 pb-3">
            <p className={`text-xs mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Suggested questions:
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(question)}
                  className={`text-xs px-3 py-2 rounded-full transition-colors ${isDarkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>

          {/* Input Area */}
          <div className={`p-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask me about your analytics..."
                disabled={isTyping}
                className={`flex-1 px-4 py-3 rounded-full text-base outline-none ${isDarkMode
                  ? 'bg-gray-700 text-white placeholder-gray-400'
                  : 'bg-gray-100 text-gray-900 placeholder-gray-500'
                  }`}
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isTyping}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isDarkMode
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                aria-label="Send message"
              >
                {isTyping ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
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