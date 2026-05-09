import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    LineChart, Line, AreaChart, Area, Cell, PieChart, Pie
} from 'recharts';
import { 
    Users, MousePointer2, Clock, Eye, TrendingUp, Globe, 
    Smartphone, Monitor, ChevronRight, Activity
} from 'lucide-react';

const Analytics = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [range, setRange] = useState('7d');

    useEffect(() => {
        fetchStats();
    }, [range]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/analytics/stats?range=${range}`);
            setStats(response.data);
        } catch (error) {
            console.error("Error fetching analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading || !stats) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-4 border-primary-200 rounded-full animate-pulse"></div>
                    <div className="absolute inset-0 border-4 border-primary-500 rounded-full border-t-transparent animate-spin"></div>
                </div>
            </div>
        );
    }

    const summaryCards = [
        { title: 'Total Views', value: stats.summary.totalViews, icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50' },
        { title: 'Unique Visitors', value: stats.summary.uniqueVisitors, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
        { title: 'Avg. Duration', value: `${Math.round(stats.summary.avgDuration)}s`, icon: Clock, color: 'text-green-600', bg: 'bg-green-50' },
        { title: 'Bounce Rate', value: '32%', icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' },
    ];

    return (
        <div className="p-6 space-y-8 bg-gray-50/50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Web Analytics</h1>
                    <p className="text-gray-500 mt-1 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-primary-500" />
                        Live insights from engineersparcel.in
                    </p>
                </div>
                <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100">
                    {['24h', '7d', '30d'].map((r) => (
                        <button
                            key={r}
                            onClick={() => setRange(r)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                range === r 
                                ? 'bg-primary-500 text-white shadow-md' 
                                : 'text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                            {r.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {summaryCards.map((card, index) => (
                    <div key={index} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div className={`p-3 rounded-xl ${card.bg}`}>
                                <card.icon className={`w-6 h-6 ${card.color}`} />
                            </div>
                            <span className="text-xs font-bold text-green-500 bg-green-50 px-2 py-1 rounded-full">+12%</span>
                        </div>
                        <div className="mt-4">
                            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{card.title}</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-1">{card.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Traffic Trend */}
                <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-bold text-gray-800">Traffic Overview</h2>
                        <div className="flex gap-4 text-xs font-bold">
                            <span className="flex items-center gap-1.5 text-primary-600">
                                <span className="w-2 h-2 rounded-full bg-primary-500"></span> Views
                            </span>
                            <span className="flex items-center gap-1.5 text-purple-600">
                                <span className="w-2 h-2 rounded-full bg-purple-500"></span> Visitors
                            </span>
                        </div>
                    </div>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.dailyStats}>
                                <defs>
                                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                    dataKey="date" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}}
                                    dy={10}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}}
                                />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Area type="monotone" dataKey="views" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" />
                                <Area type="monotone" dataKey="visitors" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorVisitors)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Pages */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800 mb-6">Popular Pages</h2>
                    <div className="space-y-5">
                        {stats.topPages.map((page, i) => (
                            <div key={i} className="group">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-gray-700 truncate max-w-[150px]">
                                            {page._id === '/' ? '/home' : page._id}
                                        </span>
                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                            Avg. {Math.round(page.avgDuration)}s
                                        </span>
                                    </div>
                                    <span className="text-sm font-extrabold text-primary-500 bg-primary-50 px-2 py-1 rounded-lg">
                                        {page.views}
                                    </span>
                                </div>
                                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                    <div 
                                        className="bg-primary-500 h-full rounded-full transition-all duration-1000" 
                                        style={{ width: `${(page.views / stats.topPages[0].views) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Devices & Browsers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <Monitor className="w-5 h-5 text-blue-500" />
                        Device Usage
                    </h2>
                    <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.devices}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                    dataKey="_id" 
                                    axisLine={false} 
                                    tickLine={false}
                                    tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}}
                                />
                                <YAxis axisLine={false} tickLine={false} hide />
                                <Tooltip cursor={{fill: '#f8fafc'}} />
                                <Bar dataKey="count" radius={[10, 10, 0, 0]}>
                                    {stats.devices.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={['#3b82f6', '#8b5cf6', '#ec4899', '#f97316'][index % 4]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <MousePointer2 className="w-5 h-5 text-orange-500" />
                        Engagement Stats
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                            <h4 className="text-xs font-bold uppercase tracking-widest opacity-80">Conversion Rate</h4>
                            <p className="text-3xl font-black mt-2">4.2%</p>
                            <p className="text-[10px] mt-1 font-bold">+0.8% from last week</p>
                        </div>
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                            <h4 className="text-xs font-bold uppercase tracking-widest opacity-80">Click Through</h4>
                            <p className="text-3xl font-black mt-2">12.5%</p>
                            <p className="text-[10px] mt-1 font-bold">Stable this week</p>
                        </div>
                    </div>
                    <div className="mt-6 p-4 border border-dashed border-gray-200 rounded-2xl">
                        <div className="flex items-center justify-between text-sm font-bold text-gray-600">
                            <span className="flex items-center gap-2"><Globe className="w-4 h-4" /> Global Reach</span>
                            <span className="text-primary-500">View Map <ChevronRight className="inline w-4 h-4" /></span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
