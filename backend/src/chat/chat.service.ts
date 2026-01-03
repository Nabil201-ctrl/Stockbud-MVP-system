import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

export interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

export interface Chat {
    id: string;
    userId: string;
    title: string;
    messages: Message[];
    updatedAt: number;
}

@Injectable()
export class ChatService implements OnModuleInit {
    private chats: Map<string, Chat> = new Map();
    private genAI: GoogleGenerativeAI;
    private model: any;
    private readonly filePath = path.join(__dirname, '..', '..', 'chats.json');

    constructor(
        private readonly usersService: UsersService,
        private readonly configService: ConfigService
    ) {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');
        if (apiKey) {
            this.genAI = new GoogleGenerativeAI(apiKey);
            this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
        } else {
            console.warn('GEMINI_API_KEY is not set. Chat will use mock responses.');
        }
    }

    onModuleInit() {
        this.loadChats();
    }

    private loadChats() {
        if (fs.existsSync(this.filePath)) {
            try {
                const data = fs.readFileSync(this.filePath, 'utf8');
                const chatsArray = JSON.parse(data);
                this.chats = new Map(chatsArray.map((chat: Chat) => [chat.id, chat]));
                console.log(`Loaded ${this.chats.size} chats from ${this.filePath}`);
            } catch (error) {
                console.error('Error loading chats from file:', error);
            }
        }
    }

    private saveChats() {
        try {
            const chatsArray = Array.from(this.chats.values());
            fs.writeFileSync(this.filePath, JSON.stringify(chatsArray, null, 2), 'utf8');
        } catch (error) {
            console.error('Error saving chats to file:', error);
        }
    }

    async getUserChats(userId: string) {
        return Array.from(this.chats.values())
            .filter(chat => chat.userId === userId)
            .sort((a, b) => b.updatedAt - a.updatedAt);
    }

    async getChat(userId: string, chatId: string) {
        const chat = this.chats.get(chatId);
        if (!chat || chat.userId !== userId) {
            throw new NotFoundException('Chat not found');
        }
        return chat;
    }

    async createChat(userId: string, title: string = 'New Chat', firstMessage?: string) {
        const id = Math.random().toString(36).substr(2, 9);
        const chat: Chat = {
            id,
            userId,
            title,
            messages: [],
            updatedAt: Date.now()
        };

        this.chats.set(id, chat);
        this.saveChats();

        if (firstMessage) {
            await this.addMessage(userId, id, firstMessage);
        }

        return chat;
    }

    async deleteChat(userId: string, chatId: string) {
        const chat = this.chats.get(chatId);
        if (chat && chat.userId === userId) {
            this.chats.delete(chatId);
            this.saveChats();
            return { success: true };
        }
        throw new NotFoundException('Chat not found');
    }

    async addMessage(userId: string, chatId: string, content: string) {
        const chat = this.chats.get(chatId);
        if (!chat || chat.userId !== userId) {
            throw new NotFoundException('Chat not found');
        }

        const userMessage: Message = {
            role: 'user',
            content,
            timestamp: Date.now()
        };

        chat.messages.push(userMessage);

        // Update Title if it's the first message and still "New Chat"
        if (chat.messages.length === 1 && chat.title === 'New Chat') {
            chat.title = content.length > 30 ? content.substring(0, 30) + '...' : content;
        }

        chat.updatedAt = Date.now();
        this.saveChats();

        // Generate Bot Response
        const botResponse = await this.generateBotResponse(userId, content, chat.messages);
        chat.messages.push(botResponse);
        this.saveChats();

        return chat;
    }

    private async generateBotResponse(userId: string, userMessage: string, history: Message[]): Promise<Message> {
        let responseContent = "I'm having trouble connecting to my brain right now.";

        const user = await this.usersService.findById(userId);
        const settings = user?.botSettings;
        const personality = settings?.personality || 'Professional';
        const name = settings?.name || 'StockBud';

        // Construct System Prompt based on settings
        let systemInstruction = `You are ${name}, a ${personality} AI assistant for an e-commerce dashboard called StockBud.`;
        if (personality === 'Friendly') systemInstruction += " Be warm, helpful, and use emojis occasionally.";
        if (personality === 'Professional') systemInstruction += " Be formal, precise, and business-focused.";
        if (personality === 'Technical') systemInstruction += " Focus on data, metrics, and technical details.";
        if (personality === 'Concise') systemInstruction += " Keep answers very short and directly to the point.";

        systemInstruction += " You have access to the user's e-commerce data (in theory). For now, if asked about specific data like revenue or users, give realistic simulated estimates.";

        if (this.model) {
            try {
                // Convert history to Gemini format (excluding the very last user message which is 'userMessage' passed as argument, 
                // but actually 'history' already includes the last user message in my addMessage implementation.
                // So we need to take all history EXCEPT the last one as history, and the last one is the prompt? 
                // Gemini `sendMessage` handles the new message. Use `startChat` for history.

                // Get history excluding the latest message which we just added
                const apiHistory = history.slice(0, -1).map(msg => ({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.content }]
                }));

                const chat = this.model.startChat({
                    history: [
                        { role: 'user', parts: [{ text: systemInstruction }] }, // System instruction as first user message
                        { role: 'model', parts: [{ text: `Understood. I am ${name}, ready to assist.` }] }, // Ack
                        ...apiHistory
                    ],
                });

                const result = await chat.sendMessage(userMessage);
                responseContent = result.response.text();

            } catch (error) {
                console.error("Gemini API Error:", error);
                responseContent = "I apologize, but I'm encountering an error processing your request.";
            }
        } else {
            // Fallback if no API key
            responseContent = `[Mock ${name} (${personality})]: ${userMessage} (Gemini API Key missing)`;
        }

        return {
            role: 'assistant',
            content: responseContent,
            timestamp: Date.now()
        };
    }
}
