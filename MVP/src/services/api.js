import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// Create the global Axios instance
const api = axios.create({
    baseURL: API_URL,
    withCredentials: true, // Crucial for sending secure cookies (access_token & refresh_token)
});

// Response interceptor to handle automated token refresh and offline states
api.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // Check if the error is due to being offline (Network Error)
        if (error.message === 'Network Error' || !error.response) {
            console.warn('Network error (offline mode enabled).');
            return Promise.reject({ isOffline: true, message: 'You are currently offline' });
        }

        // If error is 401 Unauthorized, attempt to refresh tokens
        if (error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // Request a refresh
                const refreshResponse = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });

                if (refreshResponse.status === 200 || refreshResponse.status === 201) {
                    // Retry original request automatically
                    return api(originalRequest);
                }
            } catch (refreshError) {
                console.error("Token refresh failed. User needs to re-login", refreshError);
                // Clear state if strictly unauthorized
                if (refreshError.response && (refreshError.response.status === 401 || refreshError.response.status === 403)) {
                    localStorage.removeItem('stockbud_cached_user');
                    // Broadcast event so UI logs out smoothly
                    globalThis.dispatchEvent(new Event('auth:logout'));
                }
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

// ==========================================
// CENTRALIZED API REQUEST ENDPOINTS
// ==========================================

export const authAPI = {
    login: (email, password) => api.post('/auth/login', { email, password }),
    register: (name, email, password) => api.post('/auth/register', { name, email, password }),
    logout: () => api.post('/auth/logout'),
    forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
    resetPassword: (token, newPassword) => api.post('/auth/reset-password', { token, newPassword }),
    changePassword: (oldPassword, newPassword) => api.post('/auth/change-password', { oldPassword, newPassword }),
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
        update: (storeId, name) => api.put(`/social-stores/${storeId}`, { name }),
        getProducts: (storeId) => api.get(`/social-stores/${storeId}/products`),
        createProduct: (storeId, data) => api.post(`/social-stores/${storeId}/products`, data),
        updateProduct: (storeId, productId, data) => api.patch(`/social-stores/${storeId}/products/${productId}`, data),
        deleteProduct: (storeId, productId) => api.delete(`/social-stores/${storeId}/products/${productId}`),
    }
};

export const dashboardAPI = {
    getStats: (range = 'week') => api.get(`/dashboard/stats?range=${range}`),
    getTarget: () => api.get('/dashboard/target'),
    setTarget: (type, value) => api.post('/dashboard/target', { type, value }),
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
