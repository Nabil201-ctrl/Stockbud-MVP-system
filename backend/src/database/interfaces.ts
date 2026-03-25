export interface ShopifyStore {
    id: string;
    shop: string;
    token: string;
    name: string | null;
    addedAt: string;
    botSettings: any | null;
    targetType: string | null;
    targetValue: number | null;
    userId: string;
}

export interface User {
    id: string;
    email: string;
    name: string;
    password: string | null;
    picture: string | null;
    shopifyShop: string | null;
    shopifyToken: string | null;
    activeShopId: string | null;
    storeLimit: number;
    retentionMonths: number;
    createdAt: string;
    isOnboardingComplete: boolean;
    refreshToken: string | null;
    aiTokens: number;
    reportTokens: number;
    botSettings: any | null;
    lastTokenReset: number | null;
    hasFreeReports: boolean;
    language: string;
    pushSubscription: any | null;
    ipAddress: string | null;
    location: string | null;
    currency: string | null;
    signInCount: number;
    lastLoginDate: string | null;
    loginDates: string[];
    shopifyStores: ShopifyStore[];
}
