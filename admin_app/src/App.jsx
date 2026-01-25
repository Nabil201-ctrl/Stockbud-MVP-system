import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Feedback } from './pages/Feedback';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/feedback" element={<Feedback />} />
            </Route>
        </Routes>
    );
}

export default App;
