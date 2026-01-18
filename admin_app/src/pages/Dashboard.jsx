import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, TrendingUp } from 'lucide-react';
import { Layout } from '../components/Layout';

export const Dashboard = () => {
    const [users, setUsers] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [stats, setStats] = useState({ total: 0, newToday: 0 });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get('/api/users');
                const userList = response.data;
                setUsers(userList);

                // Process data for stats
                const total = userList.length;
                const today = new Date().toISOString().split('T')[0];
                const newToday = userList.filter(u => u.createdAt?.startsWith(today)).length;
                setStats({ total, newToday });

                // Process data for Chart (Group by Date)
                const groups = userList.reduce((acc, user) => {
                    const date = user.createdAt ? user.createdAt.split('T')[0] : 'Unknown';
                    acc[date] = (acc[date] || 0) + 1;
                    return acc;
                }, {});

                const data = Object.keys(groups).sort().map(date => ({
                    date,
                    count: groups[date]
                }));
                setChartData(data);

            } catch (error) {
                console.error('Failed to fetch users', error);
            }
        };
        fetchData();
    }, []);

    return (
        <Layout>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-800">DashboardOverview</h1>
                <p className="text-gray-600">Welcome back, Admin</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-6">User Signups Trend</h3>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" />
                            <YAxis allowDecimals={false} />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </Layout>
    );
};
