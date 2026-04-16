import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, TrendingUp, Zap, Check, X } from 'lucide-react';
import { Layout } from '../components/Layout';

export const Dashboard = () => {
    const [users, setUsers] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [stats, setStats] = useState({ total: 0, newToday: 0, totalSignIns: 0, signInsToday: 0 });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get('https://api.stockbud.xyz/users'); 
                const userList = response.data;
                setUsers(userList);

                
                const total = userList.length;
                const today = new Date().toISOString().split('T')[0];
                const newToday = userList.filter(u => u.createdAt?.startsWith(today)).length;
                const totalSignIns = userList.reduce((sum, u) => sum + (u.signInCount || 0), 0);
                const signInsToday = userList.reduce((sum, u) => {
                    return sum + (u.loginDates ? u.loginDates.filter(d => d === today).length : 0);
                }, 0);
                setStats({ total, newToday, totalSignIns, signInsToday });

                
                const chartMap = {};

                userList.forEach(user => {
                    
                    if (user.createdAt) {
                        const date = user.createdAt.split('T')[0];
                        if (date !== 'Unknown') {
                            if (!chartMap[date]) chartMap[date] = { date, signups: 0, signins: 0 };
                            chartMap[date].signups += 1;
                        }
                    }

                    
                    if (user.loginDates && Array.isArray(user.loginDates)) {
                        user.loginDates.forEach(date => {
                            if (!chartMap[date]) chartMap[date] = { date, signups: 0, signins: 0 };
                            chartMap[date].signins += 1;
                        });
                    }
                });

                const data = Object.values(chartMap).sort((a, b) => a.date.localeCompare(b.date));
                setChartData(data);

            } catch (error) {
                console.error('Failed to fetch users', error);
            }
        };
        fetchData();
    }, []);

    const toggleFreeReports = async (userId, currentStatus) => {
        try {
            await axios.patch(`https://api.stockbud.xyz/users/${userId}/free-reports`, { enable: !currentStatus });
            setUsers(users.map(u => u.id === userId ? { ...u, hasFreeReports: !currentStatus } : u));
        } catch (error) {
            console.error('Failed to update user', error);
            alert('Failed to update user');
        }
    };

    const toggleAllFreeReports = async (enable) => {
        try {
            if (!window.confirm(`Are you sure you want to ${enable ? 'ENABLE' : 'DISABLE'} free reports for ALL users?`)) return;
            await axios.patch('https://api.stockbud.xyz/users/free-reports-all', { enable });
            setUsers(users.map(u => ({ ...u, hasFreeReports: enable })));
        } catch (error) {
            console.error('Failed to update all users', error);
            alert('Failed to update all users');
        }
    };

    return (
        <Layout>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-800">DashboardOverview</h1>
                <p className="text-gray-600">Welcome back, Admin</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 mb-1">Total Users</p>
                            <h3 className="text-2xl font-bold text-gray-800">{stats.total}</h3>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-lg">
                            <Users className="text-blue-600" size={24} />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 mb-1">New Today</p>
                            <h3 className="text-2xl font-bold text-gray-800">{stats.newToday}</h3>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg">
                            <TrendingUp className="text-green-600" size={24} />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 mb-1">Total Sign-ins</p>
                            <h3 className="text-2xl font-bold text-gray-800">{stats.totalSignIns}</h3>
                        </div>
                        <div className="bg-purple-50 p-3 rounded-lg">
                            <Zap className="text-purple-600" size={24} />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 mb-1">Sign-ins Today</p>
                            <h3 className="text-2xl font-bold text-gray-800">{stats.signInsToday}</h3>
                        </div>
                        <div className="bg-orange-50 p-3 rounded-lg">
                            <Users className="text-orange-600" size={24} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
                <h3 className="text-lg font-bold text-gray-800 mb-6">User Signups & Sign-ins Trend</h3>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" />
                            <YAxis allowDecimals={false} />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="signups" name="Signups" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="signins" name="Sign-Ins" fill="#10B981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-800">User Management</h3>
                    <div className="flex gap-2">
                        <button
                            onClick={() => toggleAllFreeReports(true)}
                            className="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors"
                        >
                            Enable All Free Reports
                        </button>
                        <button
                            onClick={() => toggleAllFreeReports(false)}
                            className="bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                        >
                            Disable All Free Reports
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="pb-3 text-sm font-medium text-gray-500">User</th>
                                <th className="pb-3 text-sm font-medium text-gray-500">Email</th>
                                <th className="pb-3 text-sm font-medium text-gray-500">Location</th>
                                <th className="pb-3 text-sm font-medium text-gray-500">Currency</th>
                                <th className="pb-3 text-sm font-medium text-gray-500">Free Reports</th>
                                <th className="pb-3 text-sm font-medium text-gray-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                                    <td className="py-3 items-center flex gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                                            {user.name?.[0] || 'U'}
                                        </div>
                                        <span className="text-sm font-medium text-gray-800">{user.name}</span>
                                    </td>
                                    <td className="py-3 text-sm text-gray-600">{user.email}</td>
                                    <td className="py-3 text-sm text-gray-600">{user.location || 'Unknown'}</td>
                                    <td className="py-3 text-sm text-gray-600">{user.currency || 'USD'}</td>
                                    <td className="py-3">
                                        {user.hasFreeReports ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                <Check size={12} /> Active
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                <X size={12} /> Inactive
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-3">
                                        <button
                                            onClick={() => toggleFreeReports(user.id, user.hasFreeReports)}
                                            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${user.hasFreeReports
                                                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                                }`}
                                        >
                                            {user.hasFreeReports ? 'Revoke Access' : 'Grant Access'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </Layout>
    );
};
