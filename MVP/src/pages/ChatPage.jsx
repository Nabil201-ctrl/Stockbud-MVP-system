import React, { useState, useEffect, useRef } from 'react';
import {
    MessageSquare, Plus, Send, User, Bot,
    MoreHorizontal, Trash2, Menu, X
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import MarkdownRenderer from '../components/MarkdownRenderer';

const ChatPage = () => {
    const { isDarkMode } = useTheme();
    const { authenticatedFetch, user, refreshUser } = useAuth();
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

    // Load chats on mount
    useEffect(() => {
        loadChats();
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [currentChat?.messages, isTyping]);

    const loadChats = async () => {
        try {
            const response = await authenticatedFetch('http://localhost:3000/chats');
            if (response.ok) {
                const data = await response.json();
                setChats(data);
                if (data.length > 0 && !currentChatId) {
                    setCurrentChatId(data[0].id);
                }
            }
        } catch (error) {
            console.error("Failed to load chats", error);
        }
    };

    const createNewChat = async () => {
        try {
            const response = await authenticatedFetch('http://localhost:3000/chats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: 'New Chat' })
            });

            if (response.ok) {
                const newChat = await response.json();
                setChats([newChat, ...chats]);
                setCurrentChatId(newChat.id);
                if (window.innerWidth < 768) setSidebarOpen(false);
            }
        } catch (error) {
            console.error("Failed to create chat", error);
        }
    };

    const deleteChat = async (e, id) => {
        e.stopPropagation();
        try {
            const response = await authenticatedFetch(`http://localhost:3000/chats/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                const updatedChats = chats.filter(c => c.id !== id);
                setChats(updatedChats);
                if (currentChatId === id) {
                    setCurrentChatId(updatedChats.length > 0 ? updatedChats[0].id : null);
                }
            }
        } catch (error) {
            console.error("Failed to delete chat", error);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        // If no chat selected/exists, create one first or handle error. 
        // Logic: if no currentChatId, create one then send.
        let targetChatId = currentChatId;
        if (!targetChatId) {
            try {
                const response = await authenticatedFetch('http://localhost:3000/chats', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: input.slice(0, 30), firstMessage: input, language }) // Pass language
                });
                if (response.ok) {
                    const newChat = await response.json();
                    setChats([newChat, ...chats]);
                    setCurrentChatId(newChat.id);
                    setInput('');
                    return; // The backend creates the chat with the first message, so we are done
                }
            } catch (err) {
                console.error("Error creating initial chat", err);
                return;
            }
        }

        const messageContent = input;
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
            const response = await authenticatedFetch(`http://localhost:3000/chats/${targetChatId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: messageContent, language }) // Pass language
            });

            if (response.ok) {
                const updatedChat = await response.json();
                setChats(prev => prev.map(c => c.id === targetChatId ? updatedChat : c));
                await refreshUser();
            }
        } catch (error) {
            console.error("Failed to send message", error);
        } finally {
            setIsTyping(false);
        }
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
        ${isDarkMode ? 'bg-black text-gray-100' : 'bg-gray-50 text-gray-900 border-r border-gray-200'}
      `}>
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
                        <span className="font-semibold text-lg ml-2">{user?.botSettings?.name || 'StockBud AI'}</span>
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
                                <h2 className="text-2xl font-bold mb-2">{t('chat.welcomeTitle')}</h2>
                                <p className="text-sm">{t('chat.welcomeSubtitle')}</p>
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
