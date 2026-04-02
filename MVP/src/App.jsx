
import React from 'react';
import ReloadPrompt from './ReloadPrompt';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { storage } from './utils/db';
import Dashboard from './pages/dashboard';
import BotCustomization from './pages/BotCustomization';
import Realtime from './pages/Realtime';
import Users from './pages/Users';
import ProductsPage from './pages/ProductsPage';
import ChatPage from './pages/ChatPage';
import SettingsPage from './pages/SettingsPage';
import ReportsPage from './pages/ReportsPage';
import Layout from './components/layout/Layout';

import GetStarted from './pages/onboarding/GetStarted';
import Notifications from './pages/onboarding/Notifications';
import ShopAccess from './pages/onboarding/ShopAccess';
import LinkShop from './pages/onboarding/LinkShop';


import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';


import { AuthProvider } from './context/AuthContext';
import AuthSuccess from './pages/AuthSuccess';

import LandingPage from './pages/LandingPage';
import ProtectedRoute from './components/auth/ProtectedRoute';

function App() {

  React.useEffect(() => {
    const seedDB = async () => {
      try {
        const hasShop = await storage.get('shopifyShop');
        const hasToken = await storage.get('shopifyToken');

        if (!hasShop && import.meta.env.VITE_SHOPIFY_SHOP_URL) {
          await storage.set('shopifyShop', import.meta.env.VITE_SHOPIFY_SHOP_URL);
          console.log('Seeded shopifyShop from Env');
        }

        if (!hasToken && import.meta.env.VITE_SHOPIFY_ADMIN_TOKEN) {
          await storage.set('shopifyToken', import.meta.env.VITE_SHOPIFY_ADMIN_TOKEN);
          console.log('Seeded shopifyToken from Env');
        }
      } catch (e) {
        console.error("Failed to seed DB:", e);
      }
    };
    seedDB();
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            { }
            <Route path="/" element={<LandingPage />} />

            { }
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/signup" element={<Signup />} />
            <Route path="/auth/forgot-password" element={<ForgotPassword />} />
            <Route path="/auth/reset-password" element={<ResetPassword />} />
            <Route path="/auth/success" element={<AuthSuccess />} />

            { }
            <Route path="/get-started" element={<ProtectedRoute><GetStarted /></ProtectedRoute>} />
            <Route path="/onboarding/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/onboarding/shop-access" element={<ProtectedRoute><ShopAccess /></ProtectedRoute>} />
            <Route path="/onboarding/link-shop" element={<ProtectedRoute><LinkShop /></ProtectedRoute>} />

            { }
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/bot-customization" element={<BotCustomization />} />
              <Route path="/realtime" element={<Realtime />} />
              <Route path="/users" element={<Users />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
            </Route>

            { }
          </Routes >
        </Router >
        <ReloadPrompt />
      </AuthProvider >
    </ThemeProvider >
  );
}

export default App;