import React, { useState, useEffect } from "react";
import axios from "axios";
import { Trophy, TrendingUp, DollarSign, Package, Calendar, Award } from "lucide-react";
import toast from "react-hot-toast";

const PerformanceLeaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchLeaderboard();
  }, [dateRange]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/bookings/stats/performance-leaderboard`, {
        headers: { Authorization: `Bearer ${token}` },
        params: dateRange
      });
      setLeaderboard(res.data);
    } catch (error) {
      console.error("Failed to fetch leaderboard", error);
      toast.error("Failed to fetch performance leaderboard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-[#111111] p-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-500" />
              Performance Leaderboard
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Track employee involvement and calculate incentives.</p>
          </div>
          
          <div className="flex items-center gap-3 bg-gray-50 dark:bg-[#1A1A1A] p-2 rounded-xl border border-gray-200 dark:border-white/10">
            <div className="flex items-center gap-2 px-3">
              <Calendar className="w-4 h-4 text-gray-500" />
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="bg-transparent border-none text-sm font-medium text-gray-700 dark:text-gray-300 focus:ring-0 cursor-pointer outline-none"
              />
            </div>
            <span className="text-gray-400">to</span>
            <div className="flex items-center gap-2 px-3">
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="bg-transparent border-none text-sm font-medium text-gray-700 dark:text-gray-300 focus:ring-0 cursor-pointer outline-none"
              />
            </div>
          </div>
        </div>

        {/* Top 3 Performers Cards */}
        {!loading && leaderboard.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-6">
            {leaderboard.slice(0, 3).map((performer, index) => {
              const totalRevenue = performer.salesRevenue + performer.handlingRevenue + performer.packagingRevenue;
              
              let colors = {
                bg: "bg-orange-50 dark:bg-orange-500/10",
                border: "border-orange-200 dark:border-orange-500/20",
                text: "text-orange-700 dark:text-orange-400",
                icon: "text-orange-500"
              };
              
              if (index === 0) {
                colors = { bg: "bg-yellow-50 dark:bg-yellow-500/10", border: "border-yellow-200 dark:border-yellow-500/20", text: "text-yellow-700 dark:text-yellow-400", icon: "text-yellow-500" };
              } else if (index === 1) {
                colors = { bg: "bg-gray-100 dark:bg-gray-500/10", border: "border-gray-300 dark:border-gray-500/30", text: "text-gray-700 dark:text-gray-300", icon: "text-gray-400" };
              }

              return (
                <div key={performer._id} className={`${colors.bg} border ${colors.border} rounded-2xl p-6 relative overflow-hidden transform transition-all hover:-translate-y-1 hover:shadow-lg`}>
                  <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 rounded-bl-full`} />
                  <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-white dark:bg-[#1A1A1A] flex items-center justify-center shadow-md mb-4 relative">
                      {index === 0 && <Award className="w-6 h-6 absolute -top-2 -right-2 text-yellow-500" />}
                      <span className="text-2xl font-bold">{index + 1}</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{performer.name}</h3>
                    <p className={`text-sm font-medium ${colors.text} mb-4 uppercase tracking-wider`}>{performer.role}</p>
                    
                    <div className="w-full bg-white/60 dark:bg-black/20 rounded-xl p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold mb-1">Total Touched Revenue</p>
                      <p className={`text-xl font-black ${colors.text}`}>₹{totalRevenue.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Full Detailed Table */}
        <div className="bg-white dark:bg-[#111111] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-white/5">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Detailed Involvement Breakdown</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#1A1A1A] text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-bold border-b border-gray-100 dark:border-white/5">Rank</th>
                  <th className="px-6 py-4 font-bold border-b border-gray-100 dark:border-white/5">Employee</th>
                  <th className="px-6 py-4 font-bold border-b border-gray-100 dark:border-white/5 text-center">Orders Touched</th>
                  <th className="px-6 py-4 font-bold border-b border-gray-100 dark:border-white/5 text-right">Sales Revenue</th>
                  <th className="px-6 py-4 font-bold border-b border-gray-100 dark:border-white/5 text-right">Handling Revenue</th>
                  <th className="px-6 py-4 font-bold border-b border-gray-100 dark:border-white/5 text-right">Packaging Revenue</th>
                  <th className="px-6 py-4 font-bold border-b border-gray-100 dark:border-white/5 text-right text-orange-600 dark:text-orange-400">Total Influenced</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                        <p>Crunching the numbers...</p>
                      </div>
                    </td>
                  </tr>
                ) : leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      No performance data found for this period.
                    </td>
                  </tr>
                ) : (
                  leaderboard.map((user, idx) => {
                    const totalRevenue = user.salesRevenue + user.handlingRevenue + user.packagingRevenue;
                    
                    return (
                      <tr key={user._id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4">
                          <span className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-sm font-bold text-gray-700 dark:text-gray-300">
                            {idx + 1}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{user.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{user.role}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                            {user.bookingsTouched.length} Orders
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">₹{user.salesRevenue.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">{user.salesCount} orders</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">₹{user.handlingRevenue.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">{user.handlingCount} orders</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">₹{user.packagingRevenue.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">{user.packagingCount} orders</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="text-base font-bold text-orange-600 dark:text-orange-400">₹{totalRevenue.toLocaleString()}</p>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default PerformanceLeaderboard;
