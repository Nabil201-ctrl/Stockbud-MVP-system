import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
});

let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(cb) {
    refreshSubscribers.push(cb);
}

function onRefreshed(token) {
    refreshSubscribers.map(cb => cb(token));
    refreshSubscribers = [];
}

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('stockbud_access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => Promise.reject(error));

api.interceptors.response.use(
    (response) => {
        if (response.data && response.data.access_token) {
            localStorage.setItem('stockbud_access_token', response.data.access_token);
        }
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        if (error.message === 'Network Error' || !error.response) {
            console.warn('Network error (offline mode enabled).');
            return Promise.reject({ isOffline: true, message: 'You are currently offline' });
        }

        if (error.response && error.response.status === 429) {
            console.error("Too many requests. Rate limit exceeded.");
            globalThis.dispatchEvent(new CustomEvent('app:notification', {
                detail: {
                    message: "Too many requests. Please slow down.",
                    type: 'error'
                }
            }));
            return Promise.reject(error);
        }

        if (error.response && error.response.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                return new Promise((resolve) => {
                    subscribeTokenRefresh((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        resolve(api(originalRequest));
                    });
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const refreshResponse = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });

                if (refreshResponse.status === 200 || refreshResponse.status === 201) {
                    const { access_token } = refreshResponse.data;

                    if (access_token) {
                        localStorage.setItem('stockbud_access_token', access_token);
                    }

                    isRefreshing = false;
                    onRefreshed(access_token);

                    return api(originalRequest);
                }
            } catch (refreshError) {
                isRefreshing = false;
                console.error("Token refresh failed. User needs to re-login", refreshError);

                if (refreshError.response && (refreshError.response.status === 401 || refreshError.response.status === 403)) {
                    localStorage.removeItem('stockbud_access_token');
                    localStorage.removeItem('stockbud_cached_user');
                    globalThis.dispatchEvent(new Event('auth:logout'));
                }
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);


export const authAPI = {
    login: (email, password) => api.post('/auth/login', { email, password }),
    register: (name, email, password) => api.post('/auth/register', { name, email, password }),
    logout: () => api.post('/auth/logout'),
    forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
    resetPassword: (token, newPassword) => api.post('/auth/reset-password', { token, newPassword }),
    changePassword: (oldPassword, newPassword) => api.post('/auth/change-password', { oldPassword, newPassword }),
    verifyEmail: (token) => api.get(`/auth/verify?token=${token}`),
};


export const userAPI = {
    getProfile: () => api.get(`/users/me?t=${Date.now()}`),
    updateProfile: (data) => api.put('/users/me', data),
    getPlan: () => api.get('/users/me/plan'),
    upgradePlan: (newPlan) => api.post('/users/me/plan/upgrade', { plan: newPlan }),
    completeOnboarding: () => api.post('/users/onboarding/complete'),
    getUsers: () => api.get('/users'), // Admin
    verifyPayment: (reference) => api.get(`/payments/verify?reference=${reference}`),
};

export const storesAPI = {
    getActiveShop: () => api.get('/users/shopify-stores/active'),
    setActiveShop: (storeId) => api.post('/users/shopify-stores/active', { storeId }),
    deleteShop: (storeId) => api.delete(`/users/shopify-stores/${storeId}`),
    getPairingCode: () => api.post('/shopify/pairing-code'),
    getBotSettings: (storeId) => api.get(`/users/shopify-stores/${storeId}/settings`),
    getShopifyProducts: (params) => api.get('/shopify/products', { params }),
    socialStores: {
        getAll: () => api.get('/social-stores'),
        create: (data) => api.post('/social-stores', data),
        update: (storeId, data) => api.patch(`/social-stores/${storeId}`, data),
        getProducts: (storeId) => api.get(`/social-stores/${storeId}/products`),
        getStats: (storeId) => api.get(`/social-stores/${storeId}/stats`),
        createProduct: (storeId, data) => api.post(`/social-stores/${storeId}/products`, data),
        updateProduct: (storeId, productId, data) => api.patch(`/social-stores/${storeId}/products/${productId}`, data),
        deleteProduct: (storeId, productId) => api.delete(`/social-stores/${storeId}/products/${productId}`),
    },
    meta: {
        getBusinesses: (token) => api.get('/meta/businesses', { params: { token } }),
        getCatalogs: (businessId, token) => api.get('/meta/catalogs', { params: { businessId, token } }),
        connect: (data) => api.post('/meta/connect', data),
    },
    scraper: {
        getSites: () => api.get('/scraper/sites'),
        createSite: (data) => api.post('/scraper/sites', data),
        updateSite: (id, data) => api.patch(`/scraper/sites/${id}`, data),
        triggerScrape: (id) => api.post(`/scraper/sites/${id}/scrape`),
        deleteSite: (id) => api.delete(`/scraper/sites/${id}`),
        getSiteForVerification: (id) => api.get(`/scraper/verify/${id}`),
        verifySite: (id, data) => api.post(`/scraper/verify/${id}`, data),
    }
};


export const dashboardAPI = {
    getStats: (range = 'month', filter = 'all', sortBy = 'newest') =>
        api.get(`/dashboard/stats?range=${range}&filter=${filter}&sortBy=${sortBy}`),

    getTarget: () => api.get('/dashboard/target'),
    setTarget: (type, value) => api.post('/dashboard/target', { type, value }),
};

export const ordersAPI = {
    create: (data) => api.post('/orders', data),
};

export const notificationsAPI = {
    getAll: () => api.get('/notifications'),
    readAll: () => api.patch('/notifications/read-all'),
    readById: (id) => api.patch(`/notifications/${id}/read`),
};

export const reportsAPI = {
    getAll: () => api.get('/reports'),
    getStats: () => api.get('/reports/stats'),
    generate: (type) => api.post('/reports/generate', { type }),
    instantReview: () => api.post('/reports/instant-review'),
    delete: (id) => api.delete(`/reports/${id}`),
    download: (id) => api.get(`/reports/${id}/download`, { responseType: 'blob' }),
};

export const chatsAPI = {
    getAll: () => api.get('/chats'),
    create: (data) => api.post('/chats', data),
    getMessages: (id) => api.get(`/chats/${id}`, { params: { order: 'asc' } }),
    sendMessage: (chatId, data) => api.post(`/chats/${chatId}/messages`, data),
    quickChat: (data) => api.post('/chats/quick', data),
    delete: (id) => api.delete(`/chats/${id}`),
};

export const feedAPI = {
    submitFeedback: (isHelpful, comment) => api.post('/feed', { isHelpful, comment })
};

export const imageAPI = {
    upload: (formData) => axios.post(`${import.meta.env.VITE_IMAGE_API_URL || 'http://localhost:3002'}/upload`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    })
};

export default api;
