import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
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
    private readonly filePath = path.join(process.cwd(), 'chats.json');

    constructor(
        private readonly usersService: UsersService,
        private readonly dashboardService: DashboardService,
        private readonly configService: ConfigService
    ) {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');
        if (apiKey) {
            this.genAI = new GoogleGenerativeAI(apiKey);
            this.model = this.genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        } else {
            console.warn('GEMINI_API_KEY is not set. Chat will use mock responses.');
        }
    }

    async onModuleInit() {
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

    async createChat(userId: string, title: string = 'New Chat', firstMessage?: string, language?: string) {
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
            await this.addMessage(userId, id, firstMessage, language);
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

    async addMessage(userId: string, chatId: string, content: string, language?: string) {
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
        const botResponse = await this.generateBotResponse(userId, content, chat.messages, language);
        chat.messages.push(botResponse);
        this.saveChats();

        return chat;
    }

    async quickChat(userId: string, content: string, history: { role: 'user' | 'assistant', content: string }[], language?: string) {
        const fullHistory: Message[] = history.map(h => ({
            role: h.role,
            content: h.content,
            timestamp: Date.now()
        }));

        const userMsg: Message = {
            role: 'user',
            content,
            timestamp: Date.now()
        };
        fullHistory.push(userMsg);

        return this.generateBotResponse(userId, content, fullHistory, language);
    }


    private async generateBotResponse(userId: string, userMessage: string, history: Message[], languageOverride?: string): Promise<Message> {
        let responseContent = "I'm having trouble connecting to my brain right now.";

        const user = await this.usersService.findById(userId);
        const settings = user?.botSettings;
        const personality = settings?.personality || 'Professional';

        // Calculate Token Cost
        const complexKeywords = ['revenue', 'sales', 'orders', 'profit', 'growth', 'trend', 'analysis', 'report', 'visitors', 'traffic', 'conversion', 'customer', 'product', 'best selling'];
        const isComplex = complexKeywords.some(keyword => userMessage.toLowerCase().includes(keyword));
        const tokenCost = isComplex ? 50 : 25;

        // Check AI Tokens
        if ((user.aiTokens ?? 0) < tokenCost) {
            return {
                role: 'assistant',
                content: `You need ${tokenCost} AI tokens for this request, but you only have ${user.aiTokens ?? 0}. Please upgrade your plan.`,
                timestamp: Date.now()
            };
        }
        // Deduct AI Tokens
        await this.usersService.updateProfile(userId, { aiTokens: (user.aiTokens ?? 0) - tokenCost });

        const name = settings?.name || 'StockBud';
        const language = languageOverride || settings?.language || 'English';
        const dataAccess = settings?.dataAccess || 'Limited';

        // Fetch Real Stats
        let storeStats = "No store connected.";
        if (user.shopifyShop && user.shopifyToken) {
            if (dataAccess === 'Limited') {
                storeStats = "Access to detailed store data is disabled in Bot Customization settings.";
            } else {
                try {
                    const decryptedToken = await this.usersService.getDecryptedShopifyToken(userId);
                    const stats = await this.dashboardService.getStats(user.shopifyShop, decryptedToken);

                    // Format detailed stats for the AI
                    const recentSales = stats.salesHistory.map(s => `${s.name} ($${s.amount})`).join(', ');
                    const revenueTrend = stats.revenue.chartData.map(d => `${d.date}: $${d.revenue}`).join(', ');
                    const trafficSources = stats.source.map(s => `${s.name}: ${s.value}%`).join(', ');
                    const topProducts = stats.topProducts ? stats.topProducts.map(p => `${p.name} (${p.count})`).join(', ') : 'No data';

                    storeStats = `
                        Overview:
                        - Total Revenue (All Time): $${stats.revenue.total}
                        - Revenue Change (This Week vs Last): ${stats.revenue.change}%
                        - Lost Revenue (Cancelled): $${stats.revenue.lost || 0}
    
                        Breakdowns:
                        - Revenue Trend (Last 7 Days): ${revenueTrend || 'No data'}
                        - Traffic Sources: ${trafficSources || 'No data'}
                        - Top Selling Products: ${topProducts}
    
                        Recent Activity:
                        - Last 5 Sales: ${recentSales || 'None'}
                    `;
                } catch (err) {
                    console.error("Error fetching stats for chat context", err);
                }
            }
        }

        // Construct System Prompt based on settings
        let systemInstruction = `You are ${name}, a ${personality} AI assistant for an e-commerce dashboard called StockBud.`;
        if (personality === 'Friendly') systemInstruction += " Be warm, helpful, and use emojis occasionally.";
        if (personality === 'Professional') systemInstruction += " Be formal, precise, and business-focused.";
        if (personality === 'Technical') systemInstruction += " Focus on data, metrics, and technical details.";
        if (personality === 'Concise') systemInstruction += " Keep answers very short and directly to the point.";

        systemInstruction += ` Respond in ${language}.`;
        systemInstruction += ` ${name} answers specific questions about the data and provides clarifications.`;
        systemInstruction += " CRITICAL: You are NOT allowed to generate reports. If the user asks for a report, explain that you can only provide information and answer questions about the system. You can clarify data points but cannot compile full reports. Keep your responses extremely short, punchy, and data-driven. Avoid conversational filler.";

        systemInstruction += ` You have access to the user's REAL e-commerce data. Here is the current snapshot: ${storeStats}. Use this data to answer questions accurately. If asked about something not in this snapshot, explains that you only can see high-level metrics right now.`;

        if (this.model) {
            try {
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

    // Daily Token Replenishment Check - Runs every midnight
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleTokenReplenishment() {
        await this.usersService.checkAndReplenishTokens();
    }

    // Weekly Report Cron Job - Runs every Monday at 9:00 AM
    @Cron(CronExpression.EVERY_WEEK)
    async handleWeeklyReport() {
        console.log('Running Weekly Report Job...');

        const allUsers = await this.usersService.getAllUsers();

        for (const user of allUsers) {
            if (user.shopifyShop && user.shopifyToken) {
                await this.generateWeeklyReportForUser(user.id);
            }
        }
    }

    // Helper to generate a report for a specific user (can be triggered manually or by cron)
    async generateWeeklyReportForUser(userId: string) {
        const user = await this.usersService.findById(userId);

        if (!user || !user.shopifyShop || !user.shopifyToken) return;

        // Check Report Tokens
        if ((user.reportTokens ?? 0) <= 0) {
            console.log(`Skipping weekly report for ${userId}: Not enough tokens.`);
            return;
        }

        // Deduct 1 Report Token
        await this.usersService.updateProfile(userId, { reportTokens: (user.reportTokens ?? 0) - 1 });

        try {
            const decryptedToken = await this.usersService.getDecryptedShopifyToken(userId);
            const stats = await this.dashboardService.getStats(user.shopifyShop, decryptedToken);
            const prompt = `Generate a motivational weekly summary for the shop owner based on these stats: 
                Total Revenue: $${stats.revenue.total}
                Revenue Change: ${stats.revenue.change}%
                Lost Revenue: $${stats.revenue.lost || 0}
                Top Product: ${stats.topProducts?.[0]?.name || 'N/A'}
                Top Source: ${stats.source[0]?.name}
                Keep it short, punchy, and highlight the wins (or opportunities if revenue dropped).`;

            let content = "Weekly Report: ";
            if (this.model) {
                const result = await this.model.generateContent(prompt);
                content += result.response.text();
            } else {
                content += `Revenue is $${stats.revenue.total} (${stats.revenue.change}%). Top Product: ${stats.topProducts?.[0]?.name || 'N/A'}.`;
            }

            // Find or create 'StockBud' chat
            const chats = await this.getUserChats(userId);
            let chat = chats.find(c => c.title === 'StockBud Official' || c.title.includes('StockBud'));

            if (!chat) {
                chat = await this.createChat(userId, 'StockBud Updates');
            }

            await this.addMessage(userId, chat.id, "Generic weekly report trigger"); // This adds a USER message.
            // We want the BOT to initiate. My addMessage logic assumes USER speaks first.
            // I need to manually push a bot message.

            const botMsg: Message = {
                role: 'assistant',
                content: content,
                timestamp: Date.now()
            };
            chat.messages.push(botMsg);
            chat.updatedAt = Date.now();
            this.saveChats();

        } catch (error) {
            console.error(`Failed to generate report for user ${userId}`, error);
        }
    }
}
