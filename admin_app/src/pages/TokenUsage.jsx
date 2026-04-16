import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.stockbud.xyz';

export function TokenUsage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [rawUsage, setRawUsage] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [aggRes, rawRes] = await Promise.all([
                axios.get(`${API_BASE}/admin/usage/aggregate`),
                axios.get(`${API_BASE}/admin/usage`)
            ]);
            setData(aggRes.data);
            setRawUsage((rawRes.data || []).reverse().slice(0, 50));
        } catch (error) {
            console.error('Error fetching usage data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#0f172a] text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#0f172a] text-white">
                <p>No usage data available or error connecting to server.</p>
            </div>
        );
    }

    const dailyData = Object.entries(data.dailyUsage || {}).map(([day, tokens]) => ({
        name: day,
        tokens: tokens
    }));

    const sourceData = Object.entries(data.bySource || {}).map(([source, tokens]) => ({
        name: source,
        value: tokens
    }));

    const modelData = Object.entries(data.byModel || {}).map(([model, tokens]) => ({
        name: model,
        tokens: tokens
    }));

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

    return (
        <div className="p-8 bg-[#0f172a] min-h-screen text-slate-200">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Token Usage Analytics</h1>
                    <p className="text-slate-400 text-sm">Developer Platform Overview</p>
                </div>
                <button
                    onClick={fetchData}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-medium"
                >
                    <span>Refresh Data</span>
                </button>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {[
                    { label: 'Total Tokens', value: (data.totalTotalTokens || 0).toLocaleString(), color: 'text-blue-400' },
                    { label: 'Prompt Tokens', value: (data.totalInputTokens || 0).toLocaleString(), color: 'text-emerald-400' },
                    { label: 'Completion Tokens', value: (data.totalOutputTokens || 0).toLocaleString(), color: 'text-amber-400' },
                    { label: 'Operations logged', value: (rawUsage.length || 0).toLocaleString(), color: 'text-purple-400' },
                ].map((stat, i) => (
                    <div key={i} className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700/50 shadow-xl">
                        <p className="text-slate-400 text-xs uppercase tracking-wider mb-2 font-semibold">{stat.label}</p>
                        <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                <div className="lg:col-span-2 bg-[#1e293b] p-6 rounded-2xl border border-slate-700/50 shadow-xl">
                    <h3 className="text-lg font-semibold text-white mb-6">Daily Usage History</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dailyData}>
                                <defs>
                                    <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 12 }} />
                                <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                    itemStyle={{ color: '#3b82f6' }}
                                />
                                <Area type="monotone" dataKey="tokens" stroke="#3b82f6" fillOpacity={1} fill="url(#colorTokens)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700/50 shadow-xl">
                    <h3 className="text-lg font-semibold text-white mb-6">Usage by Source</h3>
                    <div className="h-[300px] flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={sourceData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {sourceData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                />
                                <Legend iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-8">
                <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700/50 shadow-xl lg:col-span-1">
                    <h3 className="text-lg font-semibold text-white mb-6">Usage by Model</h3>
                    <div className="h-[300px] flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={modelData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 10 }} width={100} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                />
                                <Bar dataKey="tokens" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="lg:col-span-3 bg-[#1e293b] rounded-2xl border border-slate-700/50 shadow-xl overflow-hidden text-xs">
                    <div className="p-5 border-b border-slate-700/50 flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-white">Recent Log History</h3>
                        <span className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Live Updates</span>
                    </div>
                    <div className="overflow-x-auto max-h-[400px]">
                        <table className="w-full text-left">
                            <thead className="sticky top-0 bg-[#1e293b] z-10">
                                <tr className="bg-[#0f172a]/50 text-slate-400 border-b border-slate-700/50 uppercase tracking-tighter">
                                    <th className="px-6 py-3 font-bold">Timestamp</th>
                                    <th className="px-6 py-3 font-bold">Source</th>
                                    <th className="px-6 py-3 font-bold">Model</th>
                                    <th className="px-6 py-3 font-bold text-right">In</th>
                                    <th className="px-6 py-3 font-bold text-right">Out</th>
                                    <th className="px-6 py-3 font-bold text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {rawUsage.map((log, i) => (
                                    <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-3 text-slate-400 whitespace-nowrap">
                                            {new Date(log.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${log.source === 'chat' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                                    'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                }`}>
                                                {log.source}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-slate-300">{log.model}</td>
                                        <td className="px-6 py-3 text-right text-slate-500">{log.inputTokens.toLocaleString()}</td>
                                        <td className="px-6 py-3 text-right text-slate-500">{log.outputTokens.toLocaleString()}</td>
                                        <td className="px-6 py-3 text-right font-bold text-slate-200">{log.totalTokens.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {rawUsage.length === 0 && (
                        <div className="p-12 text-center text-slate-500 italic">
                            No usage records yet. Start using AI features to see data here.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
