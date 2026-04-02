import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { User } from '@prisma/client';

export interface PlanLimits {
    name: string;
    displayName: string;
    price: number; // Naira per month, 0 for free
    maxShopifyStores: number; // -1 = unlimited
    maxProducts: number;      // -1 = unlimited
    aiActionsPerMonth: number;
    reportTypes: string[];    // allowed report types
    features: string[];
}

const PLAN_CONFIG: Record<string, PlanLimits> = {
    free: {
        name: 'free',
        displayName: 'Free',
        price: 0,
        maxShopifyStores: 1,
        maxProducts: 50,
        aiActionsPerMonth: 5,
        reportTypes: ['weekly'],
        features: [
            '1 Shopify store connection',
            'WhatsApp & Instagram integration',
            'Order creation',
            'Inventory tracking',
            'Up to 50 products',
            'Basic weekly insights (limited view)',
            '5 AI actions/month',
        ],
    },
    beginner: {
        name: 'beginner',
        displayName: 'Beginner',
        price: 4000,
        maxShopifyStores: 2,
        maxProducts: 200,
        aiActionsPerMonth: 30,
        reportTypes: ['weekly', 'sales', 'inventory'],
        features: [
            '2 Shopify store connections',
            'WhatsApp & Instagram integration',
            'Order creation',
            'Inventory tracking',
            'Up to 200+ products',
            'Weekly reports (full access)',
            '30 AI actions/month',
            'Basic support',
            'Data retention',
            'Limited daily insights preview',
        ],
    },
    pro: {
        name: 'pro',
        displayName: 'Pro',
        price: 10000,
        maxShopifyStores: -1,
        maxProducts: -1,
        aiActionsPerMonth: 200,
        reportTypes: ['weekly', 'monthly', 'sales', 'inventory', 'revenue', 'welcome', 'instant'],
        features: [
            'Unlimited Shopify store connections',
            'WhatsApp & Instagram integration',
            'Order creation',
            'Inventory tracking (advanced insights)',
            'Unlimited products',
            'Daily, Weekly & Monthly reports',
            '200 AI actions/month',
            'Priority support',
            'Full data retention & history',
            'Advanced AI insights & recommendations',
            'Multi-store performance tracking dashboard',
        ],
    },
};

@Injectable()
export class PlanService {
    constructor(private readonly db: PrismaService) { }

    getPlanConfig(planName: string): PlanLimits {
        return PLAN_CONFIG[planName] || PLAN_CONFIG.free;
    }

    getAllPlans(): Record<string, PlanLimits> {
        return { ...PLAN_CONFIG };
    }

    /**
     * Get the user's current plan limits
     */
    getUserPlanLimits(user: any): PlanLimits {
        const plan = user.plan || 'free';
        return this.getPlanConfig(plan);
    }

    /**
     * Check if the user can add another Shopify store
     */
    canAddStore(user: any): { allowed: boolean; reason?: string } {
        const limits = this.getUserPlanLimits(user);
        if (limits.maxShopifyStores === -1) return { allowed: true };

        const currentCount = user.shopifyStores?.length || 0;
        if (currentCount >= limits.maxShopifyStores) {
            return {
                allowed: false,
                reason: `Your ${limits.displayName} plan allows up to ${limits.maxShopifyStores} Shopify store(s). Please upgrade to add more.`,
            };
        }
        return { allowed: true };
    }

    /**
     * Check if user can add more products (for social stores)
     */
    canAddProduct(user: any, currentProductCount: number): { allowed: boolean; reason?: string } {
        const limits = this.getUserPlanLimits(user);
        if (limits.maxProducts === -1) return { allowed: true };

        if (currentProductCount >= limits.maxProducts) {
            return {
                allowed: false,
                reason: `Your ${limits.displayName} plan allows up to ${limits.maxProducts} products. Please upgrade.`,
            };
        }
        return { allowed: true };
    }

    /**
     * Check and consume an AI action. Returns whether the action is allowed.
     * Handles automatic monthly reset.
     */
    canUseAiAction(user: any): { allowed: boolean; remaining: number; limit: number; reason?: string } {
        const limits = this.getUserPlanLimits(user);
        const now = new Date();

        // Check if we need to reset the counter (new month)
        let actionsUsed = user.aiActionsUsed || 0;
        const resetDate = user.aiActionsResetDate ? new Date(user.aiActionsResetDate) : null;

        if (!resetDate || now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear()) {
            // New month — reset counter
            actionsUsed = 0;
            this.db.user.update({
                where: { id: user.id },
                data: {
                    aiActionsUsed: 0,
                    aiActionsResetDate: now,
                }
            });
        }

        const remaining = Math.max(0, limits.aiActionsPerMonth - actionsUsed);

        if (actionsUsed >= limits.aiActionsPerMonth) {
            return {
                allowed: false,
                remaining: 0,
                limit: limits.aiActionsPerMonth,
                reason: `You've used all ${limits.aiActionsPerMonth} AI actions for this month on the ${limits.displayName} plan. Please upgrade for more.`,
            };
        }

        return { allowed: true, remaining: remaining - 1, limit: limits.aiActionsPerMonth };
    }

    /**
     * Record that an AI action was consumed
     */
    async consumeAiAction(userId: string): Promise<void> {
        const user = await this.db.user.findUnique({ where: { id: userId } });
        if (!user) return;

        const now = new Date();
        let actionsUsed = user.aiActionsUsed || 0;
        const resetDate = user.aiActionsResetDate ? new Date(user.aiActionsResetDate) : null;

        // Auto-reset if new month
        if (!resetDate || now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear()) {
            actionsUsed = 0;
        }

        await this.db.user.update({
            where: { id: userId },
            data: {
                aiActionsUsed: actionsUsed + 1,
                aiActionsResetDate: now,
            }
        });
    }

    /**
     * Check if a report type is allowed for the user's plan
     */
    canGenerateReport(user: any, reportType: string): { allowed: boolean; reason?: string } {
        const limits = this.getUserPlanLimits(user);

        if (!limits.reportTypes.includes(reportType)) {
            return {
                allowed: false,
                reason: `The "${reportType}" report is not available on the ${limits.displayName} plan. Please upgrade to access it.`,
            };
        }
        return { allowed: true };
    }

    /**
     * Upgrade a user's plan
     */
    async upgradePlan(userId: string, newPlan: 'free' | 'beginner' | 'pro'): Promise<User> {
        const limits = this.getPlanConfig(newPlan);

        const updateData: Partial<User> = {
            plan: newPlan,
            storeLimit: limits.maxShopifyStores === -1 ? 999 : limits.maxShopifyStores,
        };

        // Reset AI actions on plan change
        updateData.aiActionsUsed = 0;
        updateData.aiActionsResetDate = new Date() as any;

        return this.db.user.update({
            where: { id: userId },
            data: updateData
        });
    }

    /**
     * Get plan usage summary for the user
     */
    getUsageSummary(user: any): any {
        const limits = this.getUserPlanLimits(user);
        const now = new Date();

        let actionsUsed = user.aiActionsUsed || 0;
        const resetDate = user.aiActionsResetDate ? new Date(user.aiActionsResetDate) : null;

        if (!resetDate || now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear()) {
            actionsUsed = 0;
        }

        return {
            plan: user.plan || 'free',
            planDisplayName: limits.displayName,
            price: limits.price,
            aiActions: {
                used: actionsUsed,
                limit: limits.aiActionsPerMonth,
                remaining: Math.max(0, limits.aiActionsPerMonth - actionsUsed),
            },
            stores: {
                connected: user.shopifyStores?.length || 0,
                limit: limits.maxShopifyStores === -1 ? 'Unlimited' : limits.maxShopifyStores,
            },
            products: {
                limit: limits.maxProducts === -1 ? 'Unlimited' : limits.maxProducts,
            },
            reportTypes: limits.reportTypes,
            features: limits.features,
        };
    }
}
