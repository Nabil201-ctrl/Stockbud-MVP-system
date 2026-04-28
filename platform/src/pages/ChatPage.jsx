import React, { useState, useEffect, useRef } from 'react';
import {
    MessageSquare, Plus, Send, User, Bot,
    MoreHorizontal, Trash2, Menu, X, Lock
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { storage } from '../utils/db';

import { chatsAPI } from '../services/api';

const ChatPage = () => {
    const { isDarkMode } = useTheme();
    const { user, refreshUser } = useAuth();
    const { language, t } = useLanguage();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    // Real data state
    const [chats, setChats] = useState([]);
    const [currentChatId, setCurrentChatId] = useState(null);
    const currentChat = chats.find(c => c.id === currentChatId);

    const themeColors = {
        'Blue': 'bg-blue-600',
        'Purple': 'bg-purple-600',
        'Green': 'bg-green-600',
        'Orange': 'bg-orange-600'
    };

    const getBotColor = () => {
        if (!user?.botSettings?.theme) return 'bg-blue-600';
        return themeColors[user.botSettings.theme] || 'bg-blue-600';
    };

    const getInitials = (name) => {
        if (!name) return 'U';
        return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };


    useEffect(() => {
        loadChats();
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [currentChat?.messages, isTyping]);

    const loadChats = async () => {
        try {
            const cachedChats = await storage.get('stockbud_chats');
            if (cachedChats) {
                setChats(cachedChats);
                if (cachedChats.length > 0 && !currentChatId) {
                    setCurrentChatId(cachedChats[0].id);
                }
            }

            const response = await chatsAPI.getAll();
            const data = response.data;
            setChats(data);
            await storage.set('stockbud_chats', data);

            if (data.length > 0 && !currentChatId) {
                setCurrentChatId(data[0].id);
            }
        } catch (error) {
            console.error("Failed to load chats", error);
        }
    };

    const createNewChat = async () => {
        try {
            const res = await chatsAPI.create({ title: 'New Chat' });
            const newChat = res.data;
            const updatedChats = [newChat, ...chats];
            setChats(updatedChats);
            await storage.set('stockbud_chats', updatedChats);
            setCurrentChatId(newChat.id);
            if (window.innerWidth < 768) setSidebarOpen(false);
        } catch (error) {
            console.error("Failed to create chat", error);
        }
    };

    const deleteChat = async (e, id) => {
        e.stopPropagation();
        try {
            await chatsAPI.delete(id);
            const updatedChats = chats.filter(c => c.id !== id);
            setChats(updatedChats);
            await storage.set('stockbud_chats', updatedChats);
            if (currentChatId === id) {
                setCurrentChatId(updatedChats.length > 0 ? updatedChats[0].id : null);
            }
        } catch (error) {
            console.error("Failed to delete chat", error);
        }
    };

    const handleSend = async (eOrText) => {
        let messageContent = input;

        if (eOrText && eOrText.preventDefault) {
            eOrText.preventDefault();
        } else if (typeof eOrText === 'string') {
            messageContent = eOrText;
        }

        if (!messageContent.trim()) return;

        let targetChatId = currentChatId;
        if (!targetChatId) {
            try {
                const response = await chatsAPI.create({ title: messageContent.slice(0, 30), firstMessage: messageContent, language });
                const newChat = response.data;
                setChats([newChat, ...chats]);
                setCurrentChatId(newChat.id);
                setInput('');
                return; // The backend creates the chat with the first message, so we are done
            } catch (err) {
                console.error("Error creating initial chat", err);
                return;
            }
        }

        setInput('');
        setIsTyping(true);

        // Optimistically update UI
        setChats(prev => prev.map(chat => {
            if (chat.id === targetChatId) {
                return {
                    ...chat,
                    messages: [...chat.messages, { role: 'user', content: messageContent }]
                };
            }
            return chat;
        }));

        try {
            const res = await chatsAPI.sendMessage(targetChatId, { content: messageContent, language });
            const updatedChat = res.data;
            setChats(prev => prev.map(c => c.id === targetChatId ? updatedChat : c));
            await refreshUser();
        } catch (error) {
            console.error("Failed to send message", error);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className={`flex h-[calc(100vh-64px)] overflow-hidden ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>

            { }
            {sidebarOpen && (
                <div
                    className="md:hidden fixed inset-0 z-20 bg-black/50"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            { }
            <div className={`
        fixed md:static inset-y-0 left-0 z-30
        w-[260px] flex-shrink-0 flex flex-col transition-transform duration-300 transform
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden'}
        ${isDarkMode ? 'bg-black text-gray-100' : 'bg-gray-50 text-gray-900 border-r border-gray-200'}
      `}>
                <div id="chat-sidebar" className="h-full flex flex-col">
                    <div className="p-3 flex-shrink-0">
                        <button
                            onClick={createNewChat}
                            className={`
              w-full flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm border 
              ${isDarkMode ? 'border-gray-700 hover:bg-gray-900' : 'bg-white border-gray-200 hover:bg-gray-100 text-gray-900'}
            `}
                        >
                            <Plus size={16} />
                            <span>{t('chat.newChat')}</span>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-2 pb-2 scrollbar-thin scrollbar-thumb-gray-600">
                        <div className="flex flex-col gap-2">
                            <div className="text-xs font-semibold text-gray-500 px-3 py-2">{t('chat.recent')}</div>
                            {chats.map(chat => (
                                <div
                                    key={chat.id}
                                    onClick={() => {
                                        setCurrentChatId(chat.id);
                                        if (window.innerWidth < 768) setSidebarOpen(false);
                                    }}
                                    className={`
                  group flex items-center gap-3 px-3 py-3 rounded-md cursor-pointer text-sm relative transition-colors
                  ${currentChatId === chat.id
                                            ? (isDarkMode ? 'bg-gray-800/80 text-white' : 'bg-gray-200 text-gray-900')
                                            : (isDarkMode ? 'hover:bg-gray-900 text-gray-300' : 'hover:bg-gray-100 text-gray-700')}
                `}
                                >
                                    <div className="flex-shrink-0">
                                        <MessageSquare size={16} className="text-gray-400" />
                                    </div>
                                    <div className="flex-1 truncate overflow-hidden pr-6">
                                        {chat.title}
                                    </div>

                                    { }
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

                    { }
                    <div className={`p-3 border-t flex items-center gap-3 cursor-pointer rounded-md m-2 ${isDarkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-100'}`}>
                        {user?.picture ? (
                            <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-sm object-cover" />
                        ) : (
                            <div className="w-8 h-8 rounded-sm bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                                {getInitials(user?.name)}
                            </div>
                        )}
                        <div className="flex-1 text-sm font-medium truncate">{user?.name || 'User Account'}</div>
                        <MoreHorizontal size={16} className="text-gray-400" />
                    </div>
                </div>
            </div>

            { }
            <div className="flex-1 flex flex-col h-full relative w-full">
                { }
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
                        <span className="font-semibold text-lg ml-2">{user?.botSettings?.name || 'StockBud AI'}</span>
                    </div>
                </div>

                { }
                <div className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
                    <div className="max-w-3xl mx-auto flex flex-col gap-6 pb-24">
                        {currentChat?.messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center mt-10">
                                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4 opacity-90 shadow-lg">
                                    <Bot size={32} className="text-white" />
                                </div>
                                <h2 className="text-2xl font-bold mb-2">{t('chat.welcomeTitle') || 'How can I help you today?'}</h2>
                                <p className={`text-sm mb-8 max-w-md ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {t('chat.welcomeSubtitle') || 'Ask about your store, request insights, or get started with these suggestions.'}
                                </p>

                                <div className="w-full mt-4 pb-8">
                                    {(() => {
                                        const plan = user?.plan || 'free';

                                        const freeCards = [
                                            { title: "Store Overview", hint: "Give me a quick review of my store's overall performance." },
                                            { title: "Recent Orders", hint: "What were my last 5 orders?" },
                                            { title: "Total Revenue", hint: "What is my total revenue so far?" },
                                            { title: "AI Assistant Help", hint: "What kind of questions can I ask you?" }
                                        ];

                                        const beginnerCards = [
                                            { title: "Weekly Summary", hint: "Summarize my performance for the last 7 days." },
                                            { title: "Top Products", hint: "What are my best selling products right now?" },
                                            { title: "Low Stock Alert", hint: "Are any of my important items running low on inventory?" },
                                            { title: "Traffic Sources", hint: "Where are my customers coming from this month?" }
                                        ];

                                        const proCards = [
                                            { title: "Advanced Revenue Analysis", hint: "Give me a detailed breakdown of revenue including cancellations and changing trends." },
                                            { title: "Cross-Channel Performance", hint: "Compare my sales across Shopify, Instagram, and WhatsApp." },
                                            { title: "Predictive Analytics", hint: "Based on current trends, what products might run out of stock next week?" },
                                            { title: "Customer Lifetime Value", hint: "Which products lead to the highest repeat purchase rate?" }
                                        ];

                                        let unlockedCards = [];
                                        let lockedCards = [];
                                        let upgradeMessage = "";

                                        if (plan === 'pro') {
                                            unlockedCards = proCards;
                                            lockedCards = [];
                                            upgradeMessage = "You have full access to all StockBud AI features.";
                                        } else if (plan === 'beginner') {
                                            unlockedCards = beginnerCards;
                                            lockedCards = proCards.slice(0, 2);
                                            upgradeMessage = "Upgrade to Pro to unlock predictive analytics and advanced metrics.";
                                        } else {
                                            unlockedCards = freeCards;
                                            lockedCards = beginnerCards.slice(0, 2);
                                            upgradeMessage = "Upgrade to Beginner or Pro to unlock deeper insights.";
                                        }

                                        return (
                                            <div className="w-full flex flex-col items-center">
                                                <div className={`mb-5 px-4 py-1.5 rounded-full text-xs font-bold border flex items-center justify-center
                                                    ${plan === 'pro' ? 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800'
                                                        : plan === 'beginner' ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
                                                            : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'}
                                                `}>
                                                    {plan.toUpperCase()} PLAN ACTIVE
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl px-2 mb-8">
                                                    {unlockedCards.map((suggestion, i) => (
                                                        <button
                                                            key={`unlocked-${i}`}
                                                            onClick={() => handleSend(suggestion.hint)}
                                                            className={`
                                                                flex flex-col text-left p-4 rounded-xl border transition-all cursor-pointer group hover:-translate-y-0.5 shadow-sm
                                                                ${plan === 'pro'
                                                                    ? (isDarkMode ? 'bg-purple-900/10 border-purple-800/50 hover:bg-purple-900/30 hover:border-purple-600' : 'bg-purple-50 hover:bg-purple-100 border-purple-200')
                                                                    : plan === 'beginner'
                                                                        ? (isDarkMode ? 'bg-blue-900/10 border-blue-800/50 hover:bg-blue-900/30 hover:border-blue-600' : 'bg-blue-50 hover:bg-blue-100 border-blue-200')
                                                                        : (isDarkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-700 hover:border-gray-500' : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300')
                                                                }
                                                            `}
                                                        >
                                                            <span className={`font-semibold text-sm mb-1 transition-colors
                                                                ${plan === 'pro' ? 'text-purple-700 dark:text-purple-300'
                                                                    : plan === 'beginner' ? 'text-blue-700 dark:text-blue-300'
                                                                        : isDarkMode ? 'text-gray-200' : 'text-gray-800'} 
                                                            `}>{suggestion.title}</span>
                                                            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{suggestion.hint}</span>
                                                        </button>
                                                    ))}
                                                </div>

                                                {lockedCards.length > 0 && (
                                                    <div className="w-full max-w-2xl px-2 mt-2 border-t border-dashed dark:border-gray-700 pt-6">
                                                        <div className="flex items-center gap-2 mb-4 px-2 justify-center">
                                                            <Lock size={14} className="text-gray-400" />
                                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Plan Exclusives</span>
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                                                            {lockedCards.map((suggestion, i) => (
                                                                <div
                                                                    key={`locked-${i}`}
                                                                    className={`
                                                                        flex flex-col text-left p-4 rounded-xl border border-dashed opacity-60 cursor-not-allowed
                                                                        ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-300'}
                                                                    `}
                                                                >
                                                                    <span className="font-semibold text-sm text-gray-500 mb-1 flex items-center justify-between">
                                                                        {suggestion.title}
                                                                        <Lock size={12} />
                                                                    </span>
                                                                    <span className="text-xs text-gray-400">{suggestion.hint}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="text-center mt-6">
                                                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                                {upgradeMessage}{' '}
                                                                <a href="/settings" className="font-bold text-blue-500 hover:text-blue-600 hover:underline">Manage Plan</a>
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        ) : (
                            currentChat?.messages.map((msg, idx) => (
                                <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {msg.role === 'assistant' && (
                                        <div className={`w-8 h-8 rounded-sm flex-shrink-0 flex items-center justify-center ${getBotColor()}`}>
                                            <Bot size={18} className="text-white" />
                                        </div>
                                    )}

                                    <div className={`
                      max-w-[80%] md:max-w-[70%] rounded-2xl px-5 py-3 text-sm md:text-base leading-relaxed
                      ${msg.role === 'user'
                                            ? (isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900')
                                            : (isDarkMode ? 'text-gray-100' : 'text-gray-900')}
                    `}>
                                        {msg.role === 'assistant' ? (
                                            <MarkdownRenderer content={msg.content} isDarkMode={isDarkMode} />
                                        ) : (
                                            msg.content
                                        )}
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
                                <div className={`w-8 h-8 rounded-sm flex-shrink-0 flex items-center justify-center ${getBotColor()}`}>
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

                { }
                <div className={`
          absolute bottom-0 left-0 right-0 p-4 
          ${isDarkMode ? 'bg-gradient-to-t from-gray-900 via-gray-900 to-transparent' : 'bg-gradient-to-t from-white via-white to-transparent'}
        `}>
                    <div id="chat-input" className="max-w-3xl mx-auto">
                        <form onSubmit={handleSend} className="relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={t('chat.placeholder')}
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
                                {t('chat.disclaimer')}
                            </span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ChatPage;
