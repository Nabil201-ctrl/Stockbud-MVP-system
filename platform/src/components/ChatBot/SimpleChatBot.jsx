
import React, { useState } from 'react';
import { MessageCircle, X, Send, Bot } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const SimpleChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const { isDarkMode } = useTheme();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim()) {
      alert(`AI Response to: "${message}"\n\nTry asking about:\n• Revenue insights\n• Visitor statistics\n• Country data\n• Purchase sources`);
      setMessage('');
    }
  };

  return (
    <>
      {/* Floating Button */}
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

      {/* Chat Window */}
      {isOpen && (
        <div className={`fixed bottom-24 right-6 w-80 rounded-2xl shadow-2xl flex flex-col z-50 ${
          isDarkMode 
            ? 'bg-gray-800 border border-gray-700' 
            : 'bg-white border border-gray-200'
        }`}>
          {/* Header */}
          <div className={`p-4 rounded-t-2xl flex items-center justify-between ${
            isDarkMode ? 'bg-gray-900' : 'bg-blue-50'
          }`}>
            <div className="flex items-center gap-3">
              <Bot size={20} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
              <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                AI Assistant
              </h3>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="p-4 space-y-2">
            <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Ask me about your dashboard:
            </p>
            <div className="grid grid-cols-2 gap-2">
              {['Revenue', 'Visitors', 'Countries', 'Sources'].map((topic) => (
                <button
                  key={topic}
                  onClick={() => setMessage(`Tell me about ${topic.toLowerCase()}`)}
                  className={`py-2 px-3 rounded-lg text-sm transition-colors ${
                    isDarkMode
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className={`p-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your question..."
                className={`flex-1 px-3 py-2 rounded-lg text-sm outline-none ${
                  isDarkMode
                    ? 'bg-gray-700 text-white placeholder-gray-400'
                    : 'bg-gray-100 text-gray-900 placeholder-gray-500'
                }`}
              />
              <button
                type="submit"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isDarkMode
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                Ask
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default SimpleChatBot;