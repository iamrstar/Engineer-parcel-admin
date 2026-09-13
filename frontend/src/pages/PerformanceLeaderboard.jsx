import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Trophy, TrendingUp, DollarSign, Package, Calendar, Award, Star, Info, X, Check, Copy, ExternalLink, Search, Eye, ArrowRight } from "lucide-react";
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

  // Orders & Associated EP IDs Inspection Modal
  const [ordersModal, setOrdersModal] = useState({ open: false, user: null, activeTab: 'all' });
  const [ordersSearch, setOrdersSearch] = useState('');
  const [copiedEpId, setCopiedEpId] = useState(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [dateRange]);

  const getOrderCountDisplay = (u) => {
    if (!u) return 0;
    const all = [
      ...(u.salesOrders || []),
      ...(u.handlingOrders || []),
      ...(u.packagingOrders || [])
    ];
    if (all.length > 0) {
      const uniqueIds = new Set(all.map(o => o.bookingId).filter(Boolean));
      return uniqueIds.size || all.length;
    }
    return Math.max(u.salesCount || 0, u.handlingCount || 0, u.packagingCount || 0) || ((u.salesCount || 0) + (u.handlingCount || 0) + (u.packagingCount || 0));
  };

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/bookings/stats/performance-leaderboard`, {
        headers: { Authorization: `Bearer ${token}` },
        params: dateRange
      });
      let data = Array.isArray(res.data) ? res.data : [];

      // Check if fallback fetch for detailed orders is needed (e.g. older backend or stripped orders)
      const needsOrdersFallback = data.some(u => 
        (!u.salesOrders || u.salesOrders.length === 0) &&
        ((u.salesCount || 0) > 0 || (u.handlingCount || 0) > 0 || (u.packagingCount || 0) > 0)
      );

      if (needsOrdersFallback) {
        try {
          const bookingsRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/bookings`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { limit: 500, startDate: dateRange.startDate, endDate: dateRange.endDate }
          });
          const allBookings = bookingsRes.data.bookings || bookingsRes.data || [];
          
          data = data.map(u => {
            const uId = (u._id || u.userId || "").toString();
            const sOrders = [];
            const hOrders = [];
            const pOrders = [];

            allBookings.forEach(b => {
              const orderItem = {
                _id: b._id,
                bookingId: b.bookingId || `EP-${b._id?.toString().slice(-6).toUpperCase()}`,
                customerName: b.senderDetails?.name || "N/A",
                serviceType: b.serviceType || "Standard",
                status: b.status || "Booked",
                createdAt: b.createdAt,
              };

              const sId = (b.salesAgent?._id || b.salesAgent || "").toString();
              const hId = (b.handlingAgent?._id || b.handlingAgent || "").toString();
              const pId = (b.packagingAgent?._id || b.packagingAgent || "").toString();

              if (sId === uId) sOrders.push({ ...orderItem, roleType: "sales", points: 2 });
              if (hId === uId) hOrders.push({ ...orderItem, roleType: "handling", points: 1 });
              if (pId === uId) pOrders.push({ ...orderItem, roleType: "packaging", points: 1 });
            });

            return {
              ...u,
              salesOrders: u.salesOrders?.length ? u.salesOrders : sOrders,
              handlingOrders: u.handlingOrders?.length ? u.handlingOrders : hOrders,
              packagingOrders: u.packagingOrders?.length ? u.packagingOrders : pOrders,
            };
          });
        } catch (fallbackError) {
          console.error("Fallback orders fetch error:", fallbackError);
        }
      }

      setLeaderboard(data);
    } catch (error) {
      console.error("Failed to fetch leaderboard", error);
      toast.error("Failed to fetch performance leaderboard");
    } finally {
      setLoading(false);
    }
  };

  const openOrdersModal = async (targetUser, activeTab = 'all') => {
    if (!targetUser) return;

    const currentTotal = (targetUser.salesOrders?.length || 0) + (targetUser.handlingOrders?.length || 0) + (targetUser.packagingOrders?.length || 0);
    const hasRoleCounts = (targetUser.salesCount || 0) > 0 || (targetUser.handlingCount || 0) > 0 || (targetUser.packagingCount || 0) > 0;

    if (currentTotal > 0 || !hasRoleCounts) {
      setOrdersModal({ open: true, user: targetUser, activeTab, loading: false });
      return;
    }

    setOrdersModal({ open: true, user: targetUser, activeTab, loading: true });
    try {
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
      const bookingsRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 500, startDate: dateRange.startDate, endDate: dateRange.endDate }
      });
      const allBookings = bookingsRes.data.bookings || bookingsRes.data || [];
      const uId = (targetUser._id || targetUser.userId || "").toString();

      const sOrders = [];
      const hOrders = [];
      const pOrders = [];

      allBookings.forEach(b => {
        const orderItem = {
          _id: b._id,
          bookingId: b.bookingId || `EP-${b._id?.toString().slice(-6).toUpperCase()}`,
          customerName: b.senderDetails?.name || "N/A",
          serviceType: b.serviceType || "Standard",
          status: b.status || "Booked",
          createdAt: b.createdAt,
        };

        const sId = (b.salesAgent?._id || b.salesAgent || "").toString();
        const hId = (b.handlingAgent?._id || b.handlingAgent || "").toString();
        const pId = (b.packagingAgent?._id || b.packagingAgent || "").toString();

        if (sId === uId) sOrders.push({ ...orderItem, roleType: "sales", points: 2 });
        if (hId === uId) hOrders.push({ ...orderItem, roleType: "handling", points: 1 });
        if (pId === uId) pOrders.push({ ...orderItem, roleType: "packaging", points: 1 });
      });

      const updatedUser = {
        ...targetUser,
        salesOrders: sOrders,
        handlingOrders: hOrders,
        packagingOrders: pOrders
      };

      setLeaderboard(prev => prev.map(u => ((u._id || u.userId) === (targetUser._id || targetUser.userId) ? updatedUser : u)));
      setOrdersModal({ open: true, user: updatedUser, activeTab, loading: false });
    } catch (e) {
      console.error("Failed to load user orders in modal:", e);
      setOrdersModal({ open: true, user: targetUser, activeTab, loading: false });
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

  const handleCopyEpId = (bookingId) => {
    navigator.clipboard.writeText(bookingId);
    setCopiedEpId(bookingId);
    toast.success(`Copied ${bookingId}`);
    setTimeout(() => setCopiedEpId(null), 2000);
  };

  // Filtered orders for the EP IDs modal
  const modalOrdersList = useMemo(() => {
    if (!ordersModal.user) return [];
    const { salesOrders = [], handlingOrders = [], packagingOrders = [] } = ordersModal.user;
    
    let combined = [];
    if (ordersModal.activeTab === 'all') {
      combined = [
        ...salesOrders.map(o => ({ ...o, roleLabel: 'Sales / Lead by', roleBadgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' })),
        ...handlingOrders.map(o => ({ ...o, roleLabel: 'Handled by', roleBadgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' })),
        ...packagingOrders.map(o => ({ ...o, roleLabel: 'Dispatch by', roleBadgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' }))
      ];
    } else if (ordersModal.activeTab === 'sales') {
      combined = salesOrders.map(o => ({ ...o, roleLabel: 'Sales / Lead by', roleBadgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' }));
    } else if (ordersModal.activeTab === 'handling') {
      combined = handlingOrders.map(o => ({ ...o, roleLabel: 'Handled by', roleBadgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' }));
    } else if (ordersModal.activeTab === 'packaging') {
      combined = packagingOrders.map(o => ({ ...o, roleLabel: 'Dispatch by', roleBadgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' }));
    }

    if (!ordersSearch.trim()) return combined;
    const q = ordersSearch.toLowerCase().trim();
    return combined.filter(o => 
      o.bookingId?.toLowerCase().includes(q) ||
      o.customerName?.toLowerCase().includes(q) ||
      o.serviceType?.toLowerCase().includes(q) ||
      o.status?.toLowerCase().includes(q)
    );
  }, [ordersModal.user, ordersModal.activeTab, ordersSearch]);

  const totalUserOrders = ordersModal.user 
    ? (ordersModal.user.salesOrders?.length || 0) + (ordersModal.user.handlingOrders?.length || 0) + (ordersModal.user.packagingOrders?.length || 0)
    : 0;

  // Find the performance record of the logged-in staff member
  const currentStaff = useMemo(() => {
    if (!leaderboard || leaderboard.length === 0) return null;
    if (!user) return null;

    const loggedUserId = (user.id || user._id || user.userId || "").toString().trim();
    const loggedUsername = (user.username || "").trim().toLowerCase();
    const loggedName = (user.name || "").trim().toLowerCase();
    const loggedPhone = (user.phone || "").toString().trim();

    // 1. Try exact ID match
    if (loggedUserId) {
      const match = leaderboard.find(u => (u._id || u.userId)?.toString().trim() === loggedUserId);
      if (match) return match;
    }

    // 2. Try username match
    if (loggedUsername) {
      const match = leaderboard.find(u => 
        (u.username && u.username.trim().toLowerCase() === loggedUsername) ||
        (u.name && u.name.trim().toLowerCase() === loggedUsername)
      );
      if (match) return match;
    }

    // 3. Try name match
    if (loggedName) {
      const match = leaderboard.find(u => 
        (u.name && u.name.trim().toLowerCase() === loggedName) ||
        (u.username && u.username.trim().toLowerCase() === loggedName)
      );
      if (match) return match;
    }

    // 4. Try phone match
    if (loggedPhone) {
      const match = leaderboard.find(u => u.phone && u.phone.toString().trim() === loggedPhone);
      if (match) return match;
    }

    // 5. Try case-insensitive substring match on name
    if (loggedName) {
      const match = leaderboard.find(u => 
        u.name && (u.name.toLowerCase().includes(loggedName) || loggedName.includes(u.name.toLowerCase()))
      );
      if (match) return match;
    }

    // If still not found and the user is NOT an admin, construct a personal record with their identity
    if (!isAdmin) {
      return {
        _id: loggedUserId,
        name: user.name || user.username || "You",
        role: user.role || "Staff",
        rank: "-",
        totalPoints: 0,
        attendancePoints: 0,
        orderPoints: 0,
        adminPoints: 0,
        salesCount: 0,
        handlingCount: 0,
        packagingCount: 0,
        presentCount: 0,
        lateCount: 0,
        salesOrders: [],
        handlingOrders: [],
        packagingOrders: []
      };
    }

    return null;
  }, [leaderboard, user, isAdmin]);

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
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {isAdmin 
                ? 'Track staff involvement, audit associated orders, and manage incentive points.' 
                : 'Track your involvement and performance points for incentives.'}
            </p>
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

        {/* ADMIN: Top 3 Performers Podium */}
        {!loading && leaderboard.length > 0 && isAdmin && (
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

                    {/* Order Roles Breakdown on podium card */}
                    <div className="w-full mt-3 pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px] font-semibold text-gray-600 dark:text-gray-300 px-1">
                      <span>Sales: <strong className="text-blue-600 dark:text-blue-400 font-bold">{performer.salesCount || 0}</strong></span>
                      <span>•</span>
                      <span>Handled: <strong className="text-purple-600 dark:text-purple-400 font-bold">{performer.handlingCount || 0}</strong></span>
                      <span>•</span>
                      <span>Dispatch: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{performer.packagingCount || 0}</strong></span>
                    </div>

                    <button
                      type="button"
                      onClick={() => openOrdersModal(performer, 'all')}
                      className="w-full mt-2.5 py-1.5 px-3 bg-white/80 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer hover:shadow-sm"
                    >
                      <Package className="w-3.5 h-3.5 text-indigo-500" />
                      <span>View Associated EP IDs ({ getOrderCountDisplay(performer) })</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* STAFF ONLY: Dedicated Personal Performance Summary Banner */}
        {!loading && !isAdmin && currentStaff && (
          <div className="bg-white dark:bg-[#111111] border border-gray-100 dark:border-white/5 rounded-2xl p-6 shadow-sm mb-8 mt-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 text-white flex items-center justify-center font-black text-2xl shadow-md shadow-orange-500/20">
                  {currentStaff.rank ? `#${currentStaff.rank}` : '-'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{currentStaff.name}</h2>
                    <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-400 uppercase tracking-wider">
                      {currentStaff.role || 'Staff'}
                    </span>
                    <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400">
                      Your Profile
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Your Performance Rank on the Team: <strong className="text-gray-900 dark:text-white">Rank {currentStaff.rank ? `#${currentStaff.rank}` : 'Unranked'}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-orange-50 dark:bg-orange-950/30 px-5 py-3 rounded-2xl border border-orange-100 dark:border-orange-500/20">
                <div>
                  <p className="text-xs text-orange-600 dark:text-orange-400 font-bold uppercase tracking-wider">Total Points</p>
                  <p className="text-3xl font-black text-orange-600 dark:text-orange-400">{currentStaff.totalPoints || 0} <span className="text-base font-medium">pts</span></p>
                </div>
              </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              {/* Attendance */}
              <div className="bg-gray-50 dark:bg-white/[0.02] p-4 rounded-xl border border-gray-100 dark:border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-green-500" /> Attendance Pts
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${(currentStaff.attendancePoints || 0) >= 0 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                    {(currentStaff.attendancePoints || 0) > 0 ? '+' : ''}{currentStaff.attendancePoints || 0} pts
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                  {currentStaff.presentCount || 0} Days Present &nbsp;•&nbsp; {currentStaff.lateCount || 0} Late
                </p>
              </div>

              {/* Order Points */}
              <div className="bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-blue-500" /> Order Pts
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    +{currentStaff.orderPoints || 0} pts
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300 font-medium">
                  <span>Sales: <strong>{currentStaff.salesCount || 0}</strong></span>
                  <span>•</span>
                  <span>Handled: <strong>{currentStaff.handlingCount || 0}</strong></span>
                  <span>•</span>
                  <span>Dispatch: <strong>{currentStaff.packagingCount || 0}</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => openOrdersModal(currentStaff, 'all')}
                  className="mt-3 w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Package className="w-3.5 h-3.5" /> View My Associated EP IDs ({ getOrderCountDisplay(currentStaff) })
                </button>
              </div>

              {/* Admin Marks */}
              <div className="bg-purple-50/50 dark:bg-purple-950/20 p-4 rounded-xl border border-purple-100 dark:border-purple-900/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-purple-500" /> Admin Marks
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${(currentStaff.adminPoints || 0) >= 0 ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                    {(currentStaff.adminPoints || 0) > 0 ? '+' : ''}{currentStaff.adminPoints || 0} pts
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                  Points awarded/deducted by management
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Full Detailed Table */}
        <div className="bg-white dark:bg-[#111111] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-white/5">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {isAdmin ? 'Detailed Involvement Breakdown' : 'My Performance Breakdown'}
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#1A1A1A] text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-bold border-b border-gray-100 dark:border-white/5">Rank</th>
                  <th className="px-6 py-4 font-bold border-b border-gray-100 dark:border-white/5">Employee</th>
                  <th className="px-6 py-4 font-bold border-b border-gray-100 dark:border-white/5 text-center">Attendance Pts</th>
                  <th className="px-6 py-4 font-bold border-b border-gray-100 dark:border-white/5 text-center">Order Pts (Click to View EP IDs)</th>
                  <th className="px-6 py-4 font-bold border-b border-gray-100 dark:border-white/5 text-center">Admin Marks</th>
                  <th className="px-6 py-4 font-bold border-b border-gray-100 dark:border-white/5 text-center text-orange-600 dark:text-orange-400">Total Points</th>
                  {isAdmin && <th className="px-6 py-4 font-bold border-b border-gray-100 dark:border-white/5 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                        <p>Crunching the numbers...</p>
                      </div>
                    </td>
                  </tr>
                ) : leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="px-6 py-12 text-center text-gray-500">
                      No performance data found for this period.
                    </td>
                  </tr>
                ) : (
                  leaderboard.map((u, idx) => {
                    const totalEmpOrders = getOrderCountDisplay(u);
                    const isSelf = currentStaff && (
                      (u._id && currentStaff._id && u._id.toString() === currentStaff._id.toString()) ||
                      (u.name && currentStaff.name && u.name.trim().toLowerCase() === currentStaff.name.trim().toLowerCase())
                    );
                    const canViewOrders = isAdmin || isSelf;

                    return (
                      <tr 
                        key={u._id || idx} 
                        className={`transition-colors ${isSelf ? 'bg-orange-50/60 dark:bg-orange-950/20 border-l-4 border-l-orange-500' : 'hover:bg-gray-50 dark:hover:bg-white/[0.02]'}`}
                      >
                        <td className="px-6 py-4">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            isSelf 
                              ? 'bg-orange-500 text-white shadow-sm' 
                              : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300'
                          }`}>
                            {u.rank || (idx + 1)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <p 
                              onClick={canViewOrders ? () => openOrdersModal(u, 'all') : undefined}
                              className={`text-sm font-bold ${isSelf ? 'text-orange-900 dark:text-orange-200' : 'text-gray-900 dark:text-white'} ${canViewOrders ? 'cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline' : ''}`}
                              title={canViewOrders ? `Click to audit ${u.name}'s associated EP IDs` : undefined}
                            >
                              {u.name}
                            </p>
                            {isSelf && (
                              <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 uppercase tracking-wider shadow-xs">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{u.role}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${u.attendancePoints >= 0 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                            {u.attendancePoints > 0 ? '+' : ''}{u.attendancePoints} pts
                          </span>
                          <p className="text-[10px] text-gray-500 mt-1">{u.presentCount || 0} Present, {u.lateCount || 0} Late</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 shadow-xs">
                              +{u.orderPoints || 0} pts
                            </span>
                            
                            {/* Role Counts */}
                            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2 text-[11px] font-medium">
                              {canViewOrders ? (
                                <>
                                  <button 
                                    type="button"
                                    onClick={() => openOrdersModal(u, 'sales')}
                                    className="px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 transition-colors cursor-pointer"
                                    title="Click to view Sales EP IDs"
                                  >
                                    Sales: <strong className="font-bold">{u.salesCount || 0}</strong>
                                  </button>
                                  <span className="text-gray-300 dark:text-gray-600">•</span>
                                  <button 
                                    type="button"
                                    onClick={() => openOrdersModal(u, 'handling')}
                                    className="px-2 py-0.5 rounded-md bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 transition-colors cursor-pointer"
                                    title="Click to view Handled EP IDs"
                                  >
                                    Handled: <strong className="font-bold">{u.handlingCount || 0}</strong>
                                  </button>
                                  <span className="text-gray-300 dark:text-gray-600">•</span>
                                  <button 
                                    type="button"
                                    onClick={() => openOrdersModal(u, 'packaging')}
                                    className="px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 transition-colors cursor-pointer"
                                    title="Click to view Dispatch EP IDs"
                                  >
                                    Dispatch: <strong className="font-bold">{u.packagingCount || 0}</strong>
                                  </button>
                                </>
                              ) : (
                                <div className="text-gray-500 dark:text-gray-400">
                                  <span>Sales: <strong className="font-bold text-gray-700 dark:text-gray-300">{u.salesCount || 0}</strong></span>
                                  <span className="mx-1">•</span>
                                  <span>Handled: <strong className="font-bold text-gray-700 dark:text-gray-300">{u.handlingCount || 0}</strong></span>
                                  <span className="mx-1">•</span>
                                  <span>Dispatch: <strong className="font-bold text-gray-700 dark:text-gray-300">{u.packagingCount || 0}</strong></span>
                                </div>
                              )}
                            </div>

                            {/* View EP IDs modal button */}
                            {canViewOrders && totalEmpOrders > 0 && (
                              <button
                                type="button"
                                onClick={() => openOrdersModal(u, 'all')}
                                className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline cursor-pointer"
                              >
                                <Package className="w-3.5 h-3.5" />
                                View EP IDs ({totalEmpOrders})
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${u.adminPoints >= 0 ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                            {u.adminPoints > 0 ? '+' : ''}{u.adminPoints} pts
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <p className="text-base font-bold text-orange-600 dark:text-orange-400">
                            {u.totalPoints} pts
                          </p>
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => setAwardModal({ open: true, userId: u._id, name: u.name })}
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

      {/* Associated Orders & EP IDs Modal */}
      {ordersModal.open && ordersModal.user && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#111111] rounded-2xl w-full max-w-3xl max-h-[85vh] border border-gray-100 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-[#151515]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Package className="w-6 h-6 text-indigo-500" />
                    Associated Orders & EP IDs
                  </h3>
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300">
                    {ordersModal.user.name} ({ordersModal.user.role || 'Staff'})
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Audit which specific orders generated points for this employee.
                </p>
              </div>
              <button 
                onClick={() => { setOrdersModal({ open: false, user: null, activeTab: 'all' }); setOrdersSearch(''); }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="p-4 border-b border-gray-100 dark:border-white/5 flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-[#111111]">
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto p-1 bg-gray-100 dark:bg-white/5 rounded-xl">
                <button
                  onClick={() => setOrdersModal({ ...ordersModal, activeTab: 'all' })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    ordersModal.activeTab === 'all'
                      ? 'bg-white dark:bg-[#222] text-gray-900 dark:text-white shadow-xs'
                      : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'
                  }`}
                >
                  All ({totalUserOrders || getOrderCountDisplay(ordersModal.user)})
                </button>
                <button
                  onClick={() => setOrdersModal({ ...ordersModal, activeTab: 'sales' })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    ordersModal.activeTab === 'sales'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30'
                  }`}
                >
                  Sales / Lead ({ordersModal.user.salesOrders?.length || ordersModal.user.salesCount || 0}) • +2 pts
                </button>
                <button
                  onClick={() => setOrdersModal({ ...ordersModal, activeTab: 'handling' })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    ordersModal.activeTab === 'handling'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30'
                  }`}
                >
                  Handled ({ordersModal.user.handlingOrders?.length || ordersModal.user.handlingCount || 0}) • +1 pt
                </button>
                <button
                  onClick={() => setOrdersModal({ ...ordersModal, activeTab: 'packaging' })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    ordersModal.activeTab === 'packaging'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                  }`}
                >
                  Dispatch ({ordersModal.user.packagingOrders?.length || ordersModal.user.packagingCount || 0}) • +1 pt
                </button>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search EP ID, customer..."
                  value={ordersSearch}
                  onChange={(e) => setOrdersSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Orders List / Table */}
            <div className="p-4 flex-1 overflow-y-auto max-h-[480px] divide-y divide-gray-100 dark:divide-white/5">
              {ordersModal.loading ? (
                <div className="py-16 text-center text-gray-500 dark:text-gray-400">
                  <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-sm font-medium">Fetching associated orders and EP IDs...</p>
                </div>
              ) : modalOrdersList.length === 0 ? (
                <div className="py-12 text-center text-gray-500 dark:text-gray-400 text-sm">
                  <Package className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                  <p>No associated orders found for this category or filter.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {modalOrdersList.map((order, oIdx) => (
                    <div
                      key={`${order._id}-${order.roleType}-${oIdx}`}
                      className="p-3.5 bg-gray-50/50 hover:bg-gray-50 dark:bg-white/[0.02] dark:hover:bg-white/[0.05] rounded-xl border border-gray-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/bookings/${order._id || order.bookingId}`}
                              className="font-mono text-sm font-black text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline inline-flex items-center gap-1 cursor-pointer transition-colors group"
                              title={`Click to view booking detail for ${order.bookingId}`}
                            >
                              <span>{order.bookingId}</span>
                              <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleCopyEpId(order.bookingId)}
                              className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                              title="Copy EP ID"
                            >
                              {copiedEpId === order.bookingId ? (
                                <Check className="w-3.5 h-3.5 text-green-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${order.roleBadgeColor}`}>
                              {order.roleLabel} (+{order.points} pt{order.points > 1 ? 's' : ''})
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-600 dark:text-gray-400">
                            <span>Customer: <strong className="text-gray-900 dark:text-white font-medium">{order.customerName}</strong></span>
                            <span>•</span>
                            <span>Type: <strong>{order.serviceType}</strong></span>
                            {order.status && (
                              <>
                                <span>•</span>
                                <span className="font-medium text-gray-700 dark:text-gray-300">Status: {order.status}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-white/5">
                        <span className="text-[11px] text-gray-400">
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                        </span>

                        <Link
                          to={`/bookings/${order._id || order.bookingId}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl transition-all shadow-xs cursor-pointer whitespace-nowrap"
                          title="Go to Booking Detail Page"
                        >
                          <span>Booking Details</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02] flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Showing <strong>{modalOrdersList.length}</strong> orders
              </span>
              <button
                onClick={() => { setOrdersModal({ open: false, user: null, activeTab: 'all' }); setOrdersSearch(''); }}
                className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-xs font-bold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
                    <span>For <strong>Sales / Lead by</strong> (Direct orders only; blocked for vendor orders)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="font-bold text-blue-600 dark:text-blue-400">+1 point</span>
                    <span>For <strong>Handled by</strong> (Direct orders only; blocked for vendor orders)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="font-bold text-blue-600 dark:text-blue-400">+1 point</span>
                    <span>For <strong>Dispatch by</strong> (All orders including vendor orders)</span>
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
