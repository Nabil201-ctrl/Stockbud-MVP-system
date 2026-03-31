import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { ReportsService } from '../reports/reports.service';
import { ConfigService } from '@nestjs/config';
import { GeminiService } from '../common/gemini.service';
import { UsageService } from '../common/usage.service';
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
    private readonly filePath = path.join(process.cwd(), 'chats.json');

    constructor(
        private readonly usersService: UsersService,
        private readonly dashboardService: DashboardService,
        private readonly configService: ConfigService,
        private readonly reportsService: ReportsService,
        private readonly geminiService: GeminiService,
        private readonly usageService: UsageService,
    ) { }

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

        if (chat.messages.length === 1 && chat.title === 'New Chat') {
            chat.title = content.length > 30 ? content.substring(0, 30) + '...' : content;
        }

        chat.updatedAt = Date.now();
        this.saveChats();

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
        const s = settings as any;
        const personality = s?.personality || 'Professional';

        const tokenCost = 10;

        if ((user.aiTokens ?? 0) < tokenCost) {
            return {
                role: 'assistant',
                content: `You need ${tokenCost} AI tokens for this request, but you only have ${user.aiTokens ?? 0}. Please upgrade your plan.`,
                timestamp: Date.now()
            };
        }

        await this.usersService.updateProfile(userId, { aiTokens: (user.aiTokens ?? 0) - tokenCost });

        const name = s?.name || 'StockBud';
        const language = languageOverride || s?.language || 'English';
        const dataAccess = s?.dataAccess || 'Limited';

        let storeStats = "No store connected.";
        const activeShopId = user.activeShopId;

        if (activeShopId && user.shopifyShop && user.shopifyToken) {
            try {
                if (dataAccess === 'Limited') {
                    storeStats = "Access to detailed store data is disabled in Bot Customization settings.";
                } else {
                    const decryptedToken = await this.usersService.getDecryptedShopifyToken(userId);
                    const stats = await this.dashboardService.getStats(user.shopifyShop, decryptedToken);

                    const recentSales = stats.salesHistory.map(s => `${s.name} ($${s.amount})`).join(', ');
                    const revenueTrend = stats.revenue.chartData.map(d => `${d.date}: $${d.revenue}`).join(', ');
                    const trafficSources = stats.source.map(s => `${s.name}: ${s.value}%`).join(', ');
                    const topProducts = stats.topProducts ? stats.topProducts.map(p => `${p.name} (${p.count})`).join(', ') : 'No data';

                    storeStats = `
                        Storefront Type: Shopify
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
                }
            } catch (err) {
                console.error("Error fetching stats for chat context", err);
            }
        }

        let systemInstruction = `You are ${name}, a ${personality} AI assistant for an e-commerce dashboard called StockBud.`;
        if (personality === 'Friendly') systemInstruction += " Be warm, helpful, and use emojis occasionally.";
        if (personality === 'Professional') systemInstruction += " Be formal, precise, and business-focused.";
        if (personality === 'Technical') systemInstruction += " Focus on data, metrics, and technical details.";
        if (personality === 'Concise') systemInstruction += " Keep answers very short and directly to the point.";

        systemInstruction += ` Respond in ${language}.`;
        systemInstruction += ` ${name} acts as a Dashboard Explainer, Navigation Guide, and Business Tutor.`;

        systemInstruction += `\n\n**Navigation Guide**:\n`;
        systemInstruction += `- **Dashboard**: Main overview, revenue charts, traffic sources, heatmap.\n`;
        systemInstruction += `- **Products**: Manage inventory, add new products, view stock levels.\n`;
        systemInstruction += `- **Chat**: Access this AI assistant and full chat history.\n`;
        systemInstruction += `- **Reports**: (Read-only) View generated weekly reports. You cannot generate them here.\n`;
        systemInstruction += `- **Settings**: Connect Shopify store, manage preferences, toggle theme.\n`;
        systemInstruction += `If asked "How do I..." or "Where is...", guide them to the correct page.\n`;

        systemInstruction += `\n\n**Limitations (CRITICAL)**:\n`;
        systemInstruction += `- You CANNOT generate downloadable reports (PDF/CSV). Guide them to the Reports page.\n`;
        systemInstruction += `- You CANNOT duplicate, refund, or edit orders/products. You are Read-Only.\n`;
        systemInstruction += `- You ONLY see the snapshot provided below. You DO NOT have access to historical data (last year, last month) unless it's in the snapshot.\n`;

        systemInstruction += `\n\n**Current Data Snapshot**:\n${storeStats}\n`;
        systemInstruction += `Use this data to answer questions accurately. If asked about metric definitions (e.g. "What is AOV?"), explain them simply.`;
        systemInstruction += ` Keep responses concise and helpful.`;

        if (this.geminiService.hasKeys()) {
            try {
                const apiHistory = history.slice(0, -1).map(msg => ({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.content }]
                }));

                const result = await this.geminiService.executeWithRetry("gemini-flash-latest", async (model) => {
                    const chat = model.startChat({
                        history: [
                            { role: 'user', parts: [{ text: systemInstruction }] },
                            { role: 'model', parts: [{ text: `Understood. I am ${name}, ready to assist.` }] },
                            ...apiHistory
                        ],
                    });
                    return await chat.sendMessage(userMessage);
                });

                responseContent = result.response.text();

                // Log token usage
                if (result.response.usageMetadata) {
                    await this.usageService.logUsage({
                        userId: userId,
                        model: "gemini-flash-latest",
                        inputTokens: result.response.usageMetadata.promptTokenCount,
                        outputTokens: result.response.usageMetadata.candidatesTokenCount,
                        totalTokens: result.response.usageMetadata.totalTokenCount,
                        source: 'chat'
                    });
                }

            } catch (error) {
                console.error("Gemini API Error:", error);
                responseContent = "I apologize, but I'm encountering an error processing your request.";
            }
        } else {
            responseContent = `[Mock ${name} (${personality})]: ${userMessage} (Gemini API Key missing)`;
        }

        return {
            role: 'assistant',
            content: responseContent,
            timestamp: Date.now()
        };
    }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleTokenReplenishment() {
        await this.usersService.checkAndReplenishTokens();
    }

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

    async generateWeeklyReportForUser(userId: string) {
        const user = await this.usersService.findById(userId);
        if (!user || !user.shopifyShop || !user.shopifyToken) return;

        if ((user.reportTokens ?? 0) < 50) {
            console.log(`Skipping weekly report for ${userId}: Not enough tokens.`);
            return;
        }

        await this.usersService.updateProfile(userId, { reportTokens: (user.reportTokens ?? 0) - 50 });

        try {
            const report = await this.reportsService.generateReport(userId, 'weekly' as any);
            const content = report.data.content;

            const chats = await this.getUserChats(userId);
            let chat = chats.find(c => c.title === 'StockBud Official' || c.title.includes('StockBud'));

            if (!chat) {
                chat = await this.createChat(userId, 'StockBud Updates');
            }

            const botMsg: Message = {
                role: 'assistant',
                content: `**Weekly Report Ready:**\n\n${content}\n\n[View Full Report in Reports Tab]`,
                timestamp: Date.now()
            };
            chat.messages.push(botMsg);
            chat.updatedAt = Date.now();
            this.saveChats();
        } catch (error) {
            console.error(`Failed to generate report for user ${userId}`, error);
        }
    }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async cleanupOldChats() {
        console.log('Running daily chat cleanup...');
        this.loadChats();
        const users = await this.usersService.getAllUsers();
        const userRetention = new Map(users.map(u => [u.id, u.retentionMonths || 3]));

        const now = Date.now();
        const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
        let deletedCount = 0;

        for (const [id, chat] of this.chats.entries()) {
            const retentionMonths = userRetention.get(chat.userId) || 3;
            const retentionMs = retentionMonths * THIRTY_DAYS_MS;
            const chatAge = now - chat.updatedAt;

            if (chatAge > retentionMs) {
                this.chats.delete(id);
                deletedCount++;
            }
        }

        if (deletedCount > 0) {
            this.saveChats();
            console.log(`[Cleanup] Deleted ${deletedCount} expired chats.`);
        }
    }
}
