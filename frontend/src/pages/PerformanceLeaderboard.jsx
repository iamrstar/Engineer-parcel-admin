import React, { useState, useEffect } from "react";
import axios from "axios";
import { Trophy, TrendingUp, DollarSign, Package, Calendar, Award, Star, Info, X } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";

const PerformanceLeaderboard = () => {
  const { user } = useAuth();
  const isAdmin = user && (!user.role || user.role.toLowerCase() === 'admin' || user.role.toLowerCase() === 'main_admin' || user.role.toLowerCase() === 'office_admin');
  
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });
  const [awardModal, setAwardModal] = useState({ open: false, userId: null, name: "" });
  const [awardForm, setAwardForm] = useState({ points: "", reason: "" });
  const [awarding, setAwarding] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);

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

  const handleAwardPoints = async (e) => {
    e.preventDefault();
    if (!awardForm.points || !awardForm.reason) return toast.error("Please fill all fields");
    try {
      setAwarding(true);
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
      await axios.post(`${import.meta.env.VITE_API_URL}/api/bookings/stats/performance-marks`, {
        userId: awardModal.userId,
        points: Number(awardForm.points),
        reason: awardForm.reason
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Points awarded successfully");
      setAwardModal({ open: false, userId: null, name: "" });
      setAwardForm({ points: "", reason: "" });
      fetchLeaderboard();
    } catch (error) {
      toast.error("Failed to award points");
    } finally {
      setAwarding(false);
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
              <button 
                onClick={() => setShowRulesModal(true)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                title="View Point Rules"
              >
                <Info className="w-5 h-5 text-gray-400 hover:text-blue-500" />
              </button>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Track your involvement and performance points for incentives.</p>
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
              const totalPoints = performer.totalPoints || 0;
              
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
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold mb-1">Total Points</p>
                      <p className={`text-xl font-black ${colors.text}`}>{totalPoints} pts</p>
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
                  <th className="px-6 py-4 font-bold border-b border-gray-100 dark:border-white/5 text-center">Attendance Pts</th>
                  <th className="px-6 py-4 font-bold border-b border-gray-100 dark:border-white/5 text-center">Order Pts</th>
                  <th className="px-6 py-4 font-bold border-b border-gray-100 dark:border-white/5 text-center">Admin Marks</th>
                  <th className="px-6 py-4 font-bold border-b border-gray-100 dark:border-white/5 text-center text-orange-600 dark:text-orange-400">Total Points</th>
                  {isAdmin && <th className="px-6 py-4 font-bold border-b border-gray-100 dark:border-white/5 text-right">Action</th>}
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
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.attendancePoints >= 0 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                            {user.attendancePoints > 0 ? '+' : ''}{user.attendancePoints} pts
                          </span>
                          <p className="text-[10px] text-gray-500 mt-1">{user.presentCount} Present, {user.lateCount} Late</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                            +{user.orderPoints || 0} pts
                          </span>
                          <p className="text-[10px] text-gray-500 mt-2 font-medium">
                            Sales: {user.salesCount} &nbsp;|&nbsp; Handled: {user.handlingCount} &nbsp;|&nbsp; Dispatch: {user.packagingCount}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.adminPoints >= 0 ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                            {user.adminPoints > 0 ? '+' : ''}{user.adminPoints} pts
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <p className="text-base font-bold text-orange-600 dark:text-orange-400">
                            {user.totalPoints} pts
                          </p>
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => setAwardModal({ open: true, userId: user._id, name: user.name })}
                              className="text-xs bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg transition-colors font-medium flex items-center gap-1 ml-auto"
                            >
                              <Star className="w-3 h-3" />
                              Award
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        
      </div>

      {/* Rules Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#111111] rounded-2xl w-full max-w-lg border border-gray-100 dark:border-white/5 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/5">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Info className="w-6 h-6 text-blue-500" />
                Leaderboard Point Rules
              </h3>
              <button 
                onClick={() => setShowRulesModal(false)}
                className="text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              
              <div className="space-y-3">
                <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-lg">
                  <Calendar className="w-5 h-5 text-green-500" />
                  Attendance Points
                </h4>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300 ml-7">
                  <li className="flex items-center gap-2">
                    <span className="font-bold text-green-600 dark:text-green-400">+10 points</span>
                    <span>For logging in <strong>before 10:30 AM (IST)</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="font-bold text-red-600 dark:text-red-400">-5 points</span>
                    <span>For logging in <strong>after 10:30 AM (IST)</strong></span>
                  </li>
                </ul>
              </div>

              <div className="w-full h-px bg-gray-100 dark:bg-white/5"></div>

              <div className="space-y-3">
                <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-lg">
                  <Package className="w-5 h-5 text-blue-500" />
                  Order Points
                </h4>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300 ml-7">
                  <li className="flex items-center gap-2">
                    <span className="font-bold text-blue-600 dark:text-blue-400">+2 points</span>
                    <span>For <strong>Sales / Lead by</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="font-bold text-blue-600 dark:text-blue-400">+1 point</span>
                    <span>For <strong>Handled by</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="font-bold text-blue-600 dark:text-blue-400">+1 point</span>
                    <span>For <strong>Dispatch by</strong></span>
                  </li>
                </ul>
              </div>

              <div className="w-full h-px bg-gray-100 dark:bg-white/5"></div>

              <div className="space-y-3">
                <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-lg">
                  <Star className="w-5 h-5 text-purple-500" />
                  Admin Marks
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 ml-7">
                  Admins can manually award or deduct points for exceptional performance, query resolution, or violations.
                </p>
              </div>

            </div>
            <div className="p-4 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02]">
              <button
                onClick={() => setShowRulesModal(false)}
                className="w-full px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Award Points Modal */}
      {awardModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-100 dark:border-white/10">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Award Admin Points to {awardModal.name}</h3>
            <form onSubmit={handleAwardPoints} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Points (can be negative)</label>
                <input
                  type="number"
                  value={awardForm.points}
                  onChange={(e) => setAwardForm({ ...awardForm, points: e.target.value })}
                  placeholder="e.g. 50 or -10"
                  className="w-full px-4 py-2 bg-white dark:bg-[#111111] text-gray-900 dark:text-white border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Reason</label>
                <input
                  type="text"
                  value={awardForm.reason}
                  onChange={(e) => setAwardForm({ ...awardForm, reason: e.target.value })}
                  placeholder="e.g. Employee of the week"
                  className="w-full px-4 py-2 bg-white dark:bg-[#111111] text-gray-900 dark:text-white border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setAwardModal({ open: false, userId: null, name: "" })}
                  className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={awarding}
                  className="px-4 py-2 text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg disabled:opacity-50"
                >
                  {awarding ? "Awarding..." : "Award Points"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default PerformanceLeaderboard;
