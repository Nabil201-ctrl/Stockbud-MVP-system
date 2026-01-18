import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, LogOut } from 'lucide-react';
import axios from 'axios';

export const Sidebar = () => {
    const handleLogout = async () => {
        try {
            await axios.post('/api/auth/logout');
            window.location.href = '/login';
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
        { icon: MessageSquare, label: 'Feedback', path: '/feedback' },
    ];

    return (
        <div className="w-64 bg-white shadow-lg flex flex-col">
            <div className="p-6 border-b">
                <h1 className="text-xl font-bold text-gray-800">StockBud Admin</h1>
            </div>
            <nav className="flex-1 p-4 space-y-2">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                ? 'bg-blue-50 text-blue-600'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`
                        }
                    >
                        <item.icon size={20} />
                        <span className="font-medium">{item.label}</span>
                    </NavLink>
                ))}
            </nav>
            <div className="p-4 border-t">
                <button
                    onClick={handleLogout}
                    className="flex items-center space-x-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 w-full transition-colors"
                >
                    <LogOut size={20} />
                    <span className="font-medium">Logout</span>
                </button>
            </div>
        </div>
    );
};
