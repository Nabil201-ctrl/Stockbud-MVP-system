// pages/ChatPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
    MessageSquare, Plus, Send, User, Bot,
    MoreHorizontal, Trash2, Menu, X
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const ChatPage = () => {
    const { isDarkMode } = useTheme();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    // Mock data for chat history
    const [chats, setChats] = useState([
        {
            id: '1',
            title: 'Revenue Analysis',
            messages: [
                { role: 'user', content: 'Show me the revenue for last week' },
                { role: 'assistant', content: 'Last week\'s revenue was $40,256.92, which is a 2.94% increase from the previous week.' }
            ]
        },
        {
            id: '2',
            title: 'Customer Support',
            messages: [
                { role: 'user', content: 'How do I customize the bot?' },
                { role: 'assistant', content: 'You can customize the bot by navigating to the "Bot Customization" page in the sidebar. There you can adjust its tone, name, and response patterns.' }
            ]
        }
    ]);

    const [currentChatId, setCurrentChatId] = useState('1');

    const currentChat = chats.find(c => c.id === currentChatId) || chats[0];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [currentChat?.messages, isTyping]);

    // Create a new chat
    const createNewChat = () => {
        const newChat = {
            id: Date.now().toString(),
            title: 'New Chat',
            messages: []
        };
        setChats([newChat, ...chats]);
        setCurrentChatId(newChat.id);
        if (window.innerWidth < 768) setSidebarOpen(false);
    };

    // Delete a chat with e.stopPropagation to prevent triggering the select
    const deleteChat = (e, id) => {
        e.stopPropagation();
        const updatedChats = chats.filter(c => c.id !== id);
        setChats(updatedChats);
        if (currentChatId === id && updatedChats.length > 0) {
            setCurrentChatId(updatedChats[0].id);
        } else if (updatedChats.length === 0) {
            createNewChat();
        }
    };

    // Send a message
    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = { role: 'user', content: input };
        const updatedChats = chats.map(chat => {
            if (chat.id === currentChatId) {
                // If it's the first message, update title
                const title = chat.messages.length === 0 ? input.slice(0, 30) + (input.length > 30 ? '...' : '') : chat.title;
                return {
                    ...chat,
                    title,
                    messages: [...chat.messages, userMessage]
                };
            }
            return chat;
        });

        setChats(updatedChats);
        setInput('');
        setIsTyping(true);

        // Simulate AI response delay
        setTimeout(() => {
            const responses = [
                "That's an interesting question about your sales data.",
                "Based on your recent metrics, I'd suggest focusing on customer retention.",
                "Your profit margins have improved by 5% this month.",
                "I can help you analyze that. One moment data is loading...",
                "The best performing product this week is the Premium Plan.",
                "You have 12 new users signed up today."
            ];
            const randomResponse = responses[Math.floor(Math.random() * responses.length)];

            const assistantMessage = { role: 'assistant', content: randomResponse };

            setChats(prevChats => prevChats.map(chat => {
                if (chat.id === currentChatId) {
                    return { ...chat, messages: [...chat.messages, assistantMessage] };
                }
                return chat;
            }));
            setIsTyping(false);
        }, 1500);
    };

    return (
        <div className={`flex h-[calc(100vh-64px)] overflow-hidden ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>

            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="md:hidden fixed inset-0 z-20 bg-black/50"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar - ChatGPT Style */}
            <div className={`
        fixed md:static inset-y-0 left-0 z-30
        w-[260px] flex-shrink-0 flex flex-col transition-transform duration-300 transform
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden'}
        ${isDarkMode ? 'bg-black' : 'bg-gray-900'}
        text-gray-100
      `}>
                <div className="p-3 flex-shrink-0">
                    <button
                        onClick={createNewChat}
                        className={`
              w-full flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm border 
              ${isDarkMode ? 'border-gray-700 hover:bg-gray-900' : 'border-gray-700 hover:bg-gray-800'}
            `}
                    >
                        <Plus size={16} />
                        <span>New chat</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-2 pb-2 scrollbar-thin scrollbar-thumb-gray-600">
                    <div className="flex flex-col gap-2">
                        <div className="text-xs font-semibold text-gray-500 px-3 py-2">Recent</div>
                        {chats.map(chat => (
                            <div
                                key={chat.id}
                                onClick={() => {
                                    setCurrentChatId(chat.id);
                                    if (window.innerWidth < 768) setSidebarOpen(false);
                                }}
                                className={`
                  group flex items-center gap-3 px-3 py-3 rounded-md cursor-pointer text-sm relative transition-colors
                  ${currentChatId === chat.id ? 'bg-gray-800/80' : 'hover:bg-gray-900'}
                `}
                            >
                                <div className="flex-shrink-0">
                                    <MessageSquare size={16} className="text-gray-400" />
                                </div>
                                <div className="flex-1 truncate overflow-hidden pr-6">
                                    {chat.title}
                                </div>

                                {/* Delete Button (visible on hover or active) */}
                                {(currentChatId === chat.id || true) && (
                                    <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => deleteChat(e, chat.id)}
                                            className="p-1 hover:text-red-400 text-gray-400"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* User Profile / Settings at bottom */}
                <div className="p-3 border-t border-gray-700 flex items-center gap-3 cursor-pointer hover:bg-gray-800 rounded-md m-2">
                    <div className="w-8 h-8 rounded-sm bg-blue-600 flex items-center justify-center text-white font-bold">
                        US
                    </div>
                    <div className="flex-1 text-sm font-medium">User Account</div>
                    <MoreHorizontal size={16} className="text-gray-400" />
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col h-full relative w-full">
                {/* Header (Mobile Toggle & Model Name) */}
                <div className={`
          flex items-center justify-between p-2 md:p-4 border-b 
          ${isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'}
        `}>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800"
                        >
                            {sidebarOpen ? <div className="hidden md:block"><Menu size={20} /></div> : <Menu size={20} />}
                            {sidebarOpen && <div className="md:hidden"><Menu size={20} /></div>}
                        </button>
                        <span className="font-semibold text-lg ml-2">StockBud AI 4.0</span>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
                    <div className="max-w-3xl mx-auto flex flex-col gap-6 pb-24">
                        {currentChat?.messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[50vh] text-center opacity-50">
                                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
                                    <Bot size={32} className="text-white" />
                                </div>
                                <h2 className="text-2xl font-bold mb-2">How can I help you today?</h2>
                                <p className="text-sm">Ask about your sales, users, or products.</p>
                            </div>
                        ) : (
                            currentChat?.messages.map((msg, idx) => (
                                <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {msg.role === 'assistant' && (
                                        <div className={`w-8 h-8 rounded-sm flex-shrink-0 flex items-center justify-center ${isDarkMode ? 'bg-blue-600' : 'bg-blue-600'}`}>
                                            <Bot size={18} className="text-white" />
                                        </div>
                                    )}

                                    <div className={`
                      max-w-[80%] md:max-w-[70%] rounded-2xl px-5 py-3 text-sm md:text-base leading-relaxed
                      ${msg.role === 'user'
                                            ? (isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900')
                                            : (isDarkMode ? 'text-gray-100' : 'text-gray-900')}
                    `}>
                                        {msg.content}
                                    </div>

                                    {msg.role === 'user' && (
                                        <div className="w-8 h-8 rounded-sm bg-gray-500 flex-shrink-0 flex items-center justify-center">
                                            <User size={18} className="text-white" />
                                        </div>
                                    )}
                                </div>
                            ))
                        )}

                        {isTyping && (
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-sm bg-blue-600 flex-shrink-0 flex items-center justify-center">
                                    <Bot size={18} className="text-white" />
                                </div>
                                <div className="flex items-center gap-1 h-8">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Input Area */}
                <div className={`
          absolute bottom-0 left-0 right-0 p-4 
          ${isDarkMode ? 'bg-gradient-to-t from-gray-900 via-gray-900 to-transparent' : 'bg-gradient-to-t from-white via-white to-transparent'}
        `}>
                    <div className="max-w-3xl mx-auto">
                        <form onSubmit={handleSend} className="relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Message StockBud..."
                                className={`
                  w-full px-4 py-4 pr-12 rounded-xl shadow-lg focus:outline-none border
                  ${isDarkMode
                                        ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-gray-600'
                                        : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500 focus:border-gray-300'}
                `}
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isTyping}
                                className={`
                  absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors
                  ${input.trim()
                                        ? (isDarkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-black hover:bg-gray-800 text-white')
                                        : 'bg-transparent text-gray-400 cursor-not-allowed'}
                `}
                            >
                                <Send size={18} />
                            </button>
                        </form>
                        <div className="text-center mt-2">
                            <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                StockBud AI can make mistakes. Consider checking important information.
                            </span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ChatPage;
