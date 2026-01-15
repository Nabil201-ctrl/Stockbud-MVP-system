// App.jsx with routing
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Dashboard from './pages/dashboard';
import BotCustomization from './pages/BotCustomization';
import Realtime from './pages/Realtime';
import Users from './pages/Users';
import ProductsPage from './pages/ProductsPage';
import Settings from './pages/Settings';
import Layout from './components/layout/Layout';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/bot-customization" element={<BotCustomization />} />
            <Route path="/realtime" element={<Realtime />} />
            <Route path="/users" element={<Users />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/settings" element={<Settings />} />

          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;