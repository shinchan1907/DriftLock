import React, { useState, useEffect } from 'react';
import {
    LineChart, Line, AreaChart, Area, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import {
    Activity,
    CheckCircle,
    XCircle,
    RefreshCw,
    TrendingUp,
    Shield,
    Clock,
    Zap
} from 'lucide-react';
import client from '../api/client';

const Analytics: React.FC = () => {
    const [summary, setSummary] = useState<any>(null);
    const [timeseries, setTimeseries] = useState<any[]>([]);
    const [serviceDistribution, setServiceDistribution] = useState<any[]>([]);
    const [hourlyTraffic, setHourlyTraffic] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [summaryRes, timeseriesRes, servicesRes, hourlyRes] = await Promise.all([
                    client.get('/analytics/summary'),
                    client.get('/analytics/timeseries'),
                    client.get('/analytics/services'),
                    client.get('/analytics/hourly')
                ]);

                setSummary(summaryRes.data);
                setTimeseries(timeseriesRes.data.days);
                setServiceDistribution(servicesRes.data);
                setHourlyTraffic(hourlyRes.data);
            } catch (err) {
                console.error('Failed to fetch analytics', err);
            }
        };
        fetchData();
    }, []);

    const COLORS = ['#3b82f6', '#ef4444', '#94a3b8'];

    const stats = [
        { name: 'Successful Updates', value: summary?.successful || 0, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        { name: 'Total Errors', value: summary?.errors || 0, icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
        { name: 'Uptime (Services)', value: summary?.success_rate ? `${summary.success_rate}%` : '100%', icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { name: 'Active Services', value: summary?.active_services || 0, icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold text-white tracking-tight">Analytics Overview</h2>
                <p className="text-slate-400 mt-1">Real-time health and performance metrics for your DDNS network.</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                    <div key={stat.name} className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-3xl p-6 shadow-xl shadow-slate-950/50 group hover:border-slate-700 transition-all">
                        <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} w-fit mb-4 group-hover:scale-110 transition-transform`}>
                            <stat.icon className="w-6 h-6" />
                        </div>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{stat.name}</p>
                        <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Activity Chart */}
                <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden relative">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-blue-500" />
                            Update Activity (7 Days)
                        </h3>
                    </div>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={timeseries}>
                                <defs>
                                    <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="date" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                                <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px' }}
                                    itemStyle={{ color: '#f8fafc' }}
                                />
                                <Area type="monotone" dataKey="success" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSuccess)" strokeWidth={3} />
                                <Area type="monotone" dataKey="error" stroke="#ef4444" fillOpacity={0} strokeWidth={2} strokeDasharray="5 5" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Service Load Pie */}
                <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl">
                    <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-emerald-500" />
                        Network Distribution
                    </h3>
                    <div className="h-48 w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={serviceDistribution.length > 0 ? serviceDistribution : [{ name: 'No Data', value: 1 }]}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {serviceDistribution.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 space-y-3">
                        {serviceDistribution.slice(0, 3).map((s, i) => (
                            <div key={s.name} className="flex items-center justify-between text-xs">
                                <span className="text-slate-400 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                    {s.name}
                                </span>
                                <span className="font-mono text-slate-500 flex items-center gap-1">
                                    {s.value} updates
                                    {s.is_tunnel && <Activity className="w-3 h-3 text-blue-500" title="Tunnel Mode" />}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-8">
                {/* Hourly Activity (Bar Chart) */}
                <div className="lg:col-span-2 bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl">
                    <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-amber-500" />
                        Hourly Traffic (Last 24h)
                    </h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={hourlyTraffic}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="hour" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                                <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: '#1e293b' }} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }} />
                                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* System Health Status */}
                <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl flex flex-col justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-white mb-2">System Health</h3>
                        <p className="text-slate-500 text-sm mb-6">Real-time connectivity status</p>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-slate-800">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
                                    <span className="text-slate-200 font-medium">Cloudflare API</span>
                                </div>
                                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Connected</span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-slate-800">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
                                    <span className="text-slate-200 font-medium">SQLite Engine</span>
                                </div>
                                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Healthy</span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-slate-800">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
                                    <span className="text-slate-200 font-medium">Agent Registry</span>
                                </div>
                                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Synced</span>
                            </div>
                        </div>
                    </div>

                    <button className="w-full mt-6 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 group">
                        <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                        Run Diagnostics
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
