import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, TrendingUp, DollarSign, Scale, Calendar, Calculator, ArrowRight, MapPin, Clock, X } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

const PartnerPortalDashboard = () => {
  const [stats, setStats] = useState({ totalOrders: 0, totalKgs: 0, totalRupees: 0, pricePerKg: 0 });
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('month'); 
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [recentOrders, setRecentOrders] = useState([]);
  
  // Tracking Modal State
  const [selectedTrackingId, setSelectedTrackingId] = useState(null);
  const [trackingData, setTrackingData] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  
  // Rate Calculator State
  const [calcWeight, setCalcWeight] = useState("");
  const [calcResult, setCalcResult] = useState(null);

  useEffect(() => {
    if (timeframe === 'custom') {
      if (!customStartDate || !customEndDate) return;
    }
    fetchDashboardStats();
  }, [timeframe, customStartDate, customEndDate]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("partnerToken");
      let url = `${import.meta.env.VITE_API_URL}/api/v1/partners/portal/dashboard?timeframe=${timeframe}`;
      if (timeframe === 'custom') {
        url += `&startDate=${customStartDate}&endDate=${customEndDate}`;
      }
      let ordersUrl = `${import.meta.env.VITE_API_URL}/api/v1/partners/portal/orders?timeframe=${timeframe}`;
      if (timeframe === 'custom') {
        ordersUrl += `&startDate=${customStartDate}&endDate=${customEndDate}`;
      }
      
      const [res, ordersRes] = await Promise.all([
        axios.get(url, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(ordersUrl, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setStats(res.data);
      setRecentOrders(ordersRes.data.slice(0, 5));
    } catch (error) {
      toast.error("Failed to fetch dashboard stats");
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = (e) => {
    e.preventDefault();
    if (calcWeight && stats.pricePerKg > 0) {
      let weight = Number(calcWeight);
      let chargeable = Math.ceil(weight);
      if (chargeable < 1) chargeable = 1;
      setCalcResult(chargeable * stats.pricePerKg);
    } else {
      setCalcResult(0);
    }
  };

  const handleTrackOrder = async (trackingId) => {
    setSelectedTrackingId(trackingId);
    setTrackingLoading(true);
    setTrackingData(null);
    try {
      const token = localStorage.getItem("partnerToken");
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/v1/partners/portal/orders/${trackingId}/track`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTrackingData(res.data);
    } catch (error) {
      toast.error("Failed to fetch tracking details");
    } finally {
      setTrackingLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-blue-100 text-blue-800",
      picked: "bg-purple-100 text-purple-800",
      "in-transit": "bg-indigo-100 text-indigo-800",
      "out-for-delivery": "bg-orange-100 text-orange-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    }
    return colors[status?.toLowerCase().replace(/ /g, '-')] || "bg-gray-100 text-gray-800"
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Welcome Back!
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Here is your performance overview.</p>
        </div>
        
        <div className="flex flex-col gap-2 items-end">
          <div className="flex items-center gap-2 bg-white dark:bg-[#111111] p-1.5 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="bg-transparent text-sm font-semibold text-gray-700 dark:text-gray-300 outline-none px-2 py-1 cursor-pointer"
            >
              <option value="month">Current Month</option>
              <option value="prevMonth">Previous Month</option>
              <option value="last3Months">Last 3 Months</option>
              <option value="lifetime">Lifetime</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          
          {timeframe === 'custom' && (
            <div className="flex items-center gap-2 animate-in fade-in">
              <input 
                type="date" 
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111111] text-gray-700 dark:text-gray-300 outline-none focus:ring-1 focus:ring-orange-500"
              />
              <span className="text-gray-400 text-xs">to</span>
              <input 
                type="date" 
                value={customEndDate}
                min={customStartDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111111] text-gray-700 dark:text-gray-300 outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Orders */}
            <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl p-6 border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all duration-300">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Package className="h-24 w-24 text-orange-600" />
              </div>
              <div className="relative z-10">
                <div className="h-12 w-12 bg-orange-50 dark:bg-orange-500/10 rounded-2xl flex items-center justify-center mb-6 border border-orange-100 dark:border-orange-500/20">
                  <Package className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="text-gray-500 dark:text-gray-400 font-medium mb-1">Total Orders</h3>
                <div className="text-4xl font-extrabold text-gray-900 dark:text-white">
                  {stats.totalOrders}
                </div>
              </div>
            </div>

            {/* Total Kgs */}
            <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl p-6 border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all duration-300">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Scale className="h-24 w-24 text-blue-600" />
              </div>
              <div className="relative z-10">
                <div className="h-12 w-12 bg-blue-50 dark:bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 border border-blue-100 dark:border-blue-500/20">
                  <Scale className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-gray-500 dark:text-gray-400 font-medium mb-1">Total Volume (Kgs)</h3>
                <div className="text-4xl font-extrabold text-gray-900 dark:text-white">
                  {stats.totalKgs} <span className="text-xl text-gray-400">kg</span>
                </div>
              </div>
            </div>

            {/* Total Rupees */}
            <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl p-6 border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all duration-300">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <DollarSign className="h-24 w-24 text-green-600" />
              </div>
              <div className="relative z-10">
                <div className="h-12 w-12 bg-green-50 dark:bg-green-500/10 rounded-2xl flex items-center justify-center mb-6 border border-green-100 dark:border-green-500/20">
                  <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-gray-500 dark:text-gray-400 font-medium mb-1">Total Amount (₹)</h3>
                <div className="text-4xl font-extrabold text-gray-900 dark:text-white">
                  ₹{stats.totalRupees}
                </div>
              </div>
            </div>
          </div>

            {/* Middle Row: Charts & Status */}
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Chart Section */}
              <div className="lg:col-span-2 bg-white dark:bg-[#1A1A1A] rounded-3xl p-6 border border-gray-100 dark:border-white/5 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Order Volume</h3>
                <div className="h-72 w-full">
                  {stats.chartData && stats.chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats.chartData}>
                        <defs>
                          <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ea580c" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.1} />
                        <XAxis 
                          dataKey="date" 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: '#888' }}
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: '#888' }}
                          dx={-10}
                        />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                        />
                        <Area type="monotone" dataKey="orders" stroke="#ea580c" strokeWidth={3} fillOpacity={1} fill="url(#colorOrders)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">No data available for this period.</div>
                  )}
                </div>
              </div>

              {/* Status Breakdown Section */}
              <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl p-6 border border-gray-100 dark:border-white/5 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Status Breakdown</h3>
                <div className="space-y-4">
                  {stats.statusBreakdown && Object.entries(stats.statusBreakdown).map(([status, count]) => {
                    if (count === 0) return null;
                    let colorClass = "bg-gray-100 text-gray-600";
                    if (status === "Delivered") colorClass = "bg-green-100 text-green-600";
                    if (status === "In Transit") colorClass = "bg-blue-100 text-blue-600";
                    if (status === "Pending") colorClass = "bg-yellow-100 text-yellow-600";
                    if (status === "Returned" || status === "Failed") colorClass = "bg-red-100 text-red-600";
                    
                    return (
                      <div key={status} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-[#111111] border border-gray-100 dark:border-white/5">
                        <div className="flex items-center gap-3">
                          <div className={`h-3 w-3 rounded-full ${colorClass.split(' ')[0]}`}></div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">{status}</span>
                        </div>
                        <span className="font-bold text-gray-900 dark:text-white">{count}</span>
                      </div>
                    );
                  })}
                  {stats.statusBreakdown && Object.values(stats.statusBreakdown).every(v => v === 0) && (
                     <div className="text-center text-gray-400 py-8">No orders found.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Orders Table */}
            <div className="mt-8 bg-white dark:bg-[#1A1A1A] rounded-3xl p-6 border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Orders</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-white/10">
                      <th className="pb-3 text-sm font-semibold text-gray-500 dark:text-gray-400">Tracking ID</th>
                      <th className="pb-3 text-sm font-semibold text-gray-500 dark:text-gray-400">Date</th>
                      <th className="pb-3 text-sm font-semibold text-gray-500 dark:text-gray-400">Receiver</th>
                      <th className="pb-3 text-sm font-semibold text-gray-500 dark:text-gray-400">Status</th>
                      <th className="pb-3 text-sm font-semibold text-gray-500 dark:text-gray-400 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.length > 0 ? recentOrders.map(order => (
                      <tr key={order._id} className="border-b border-gray-50 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <td className="py-4 font-mono text-sm font-semibold text-orange-600 dark:text-orange-400">{order.bookingId}</td>
                        <td className="py-4 text-sm text-gray-600 dark:text-gray-300">{new Date(order.createdAt).toLocaleDateString()}</td>
                        <td className="py-4 text-sm text-gray-600 dark:text-gray-300">{order.receiverDetails?.name || 'N/A'}</td>
                        <td className="py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                            {order.status || 'Pending'}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <button 
                            onClick={() => handleTrackOrder(order.bookingId)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-500/20 rounded-lg transition-colors font-semibold shadow-sm text-sm"
                          >
                            Track Details
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="4" className="py-8 text-center text-gray-400">No recent orders.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          {/* Rate Calculator Section */}
          <div className="mt-8 bg-white dark:bg-[#1A1A1A] rounded-3xl p-6 border border-gray-100 dark:border-white/5 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl">
                <Calculator className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Rate Calculator</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Calculate shipping costs based on your special rate (₹{stats.pricePerKg}/kg)</p>
              </div>
            </div>

            <form onSubmit={handleCalculate} className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="w-full sm:w-1/3">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Weight (Kgs)</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={calcWeight}
                  onChange={(e) => setCalcWeight(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="e.g. 5.5"
                />
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
              >
                Calculate <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            {calcResult !== null && (
              <div className="mt-6 p-4 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl flex items-center justify-between animate-in slide-in-from-bottom-2">
                <div className="text-indigo-900 dark:text-indigo-300 font-medium">
                  Estimated Cost for {calcWeight} kg @ ₹{stats.pricePerKg}/kg
                </div>
                <div className="text-2xl font-black text-indigo-700 dark:text-indigo-400">
                  ₹{calcResult.toFixed(2)}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Tracking Modal */}
      {selectedTrackingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedTrackingId(null)}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Track Order</h3>
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-mono bg-gray-100 dark:bg-white/5 inline-block px-3 py-1 rounded-lg">
              {selectedTrackingId}
            </div>

            {trackingLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
              </div>
            ) : trackingData ? (
              <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-orange-50 dark:bg-orange-500/10 rounded-2xl border border-orange-100 dark:border-orange-500/20">
                  <div className={`p-3 rounded-xl ${getStatusColor(trackingData.currentStatus)}`}>
                    <Package className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-xs text-orange-600 dark:text-orange-400 font-semibold uppercase tracking-wider mb-1">Current Status</div>
                    <div className="font-bold text-gray-900 dark:text-white text-lg">{trackingData.currentStatus}</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Tracking History
                  </h4>
                  {trackingData.history && trackingData.history.length > 0 ? (
                    <div className="relative border-l-2 border-gray-200 dark:border-white/10 ml-3 space-y-6 pb-4">
                      {trackingData.history.slice().sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)).map((event, idx) => (
                        <div key={idx} className="relative pl-6">
                          <div className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white dark:border-[#1A1A1A] ${idx === trackingData.history.length - 1 ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">{event.status}</div>
                          {event.location && <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{event.location}</div>}
                          {event.remark && <div className="text-xs text-gray-500 mt-1 italic">{event.remark}</div>}
                          <div className="text-xs text-gray-400 mt-1">{new Date(event.timestamp).toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-white/5 rounded-2xl">
                      No tracking events recorded yet.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-red-500">Could not load tracking information.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerPortalDashboard;
