"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { Package, Clock, CheckCircle, Truck, DollarSign, Bell, X, Database, Activity, Tag, MapPin, Search, ClipboardList, XCircle, MessageCircle, BarChart3, Users } from "lucide-react"
import { Link } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import toast from "react-hot-toast"

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalBookings: 0,
    pendingBookings: 0,
    deliveredBookings: 0,
    inTransitBookings: 0,
    totalRevenue: 0,
  })
  const [taskStats, setTaskStats] = useState({
    active: 0,
    dueToday: 0,
    completed: 0,
    missed: 0,
    parcelsToProcess: 0
  })
  const [adminViewType, setAdminViewType] = useState('global') // 'global' or 'tasks'
  const [loading, setLoading] = useState(true)
  const [showNotifications, setShowNotifications] = useState(false)
  const [pendingOrders, setPendingOrders] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(false)

  // Query Modal State
  const [isQueryModalOpen, setIsQueryModalOpen] = useState(false)
  const [queryData, setQueryData] = useState({
    type: 'Leave Application',
    subject: '',
    description: ''
  })
  const [submittingQuery, setSubmittingQuery] = useState(false)

  const { user } = useAuth()
  const isAdmin = user && (!user.role || user.role === 'admin' || user.role === 'office_admin')

  useEffect(() => {
    fetchStats()
  }, [isAdmin])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showNotifications && !event.target.closest('.notification-wrapper')) {
        setShowNotifications(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showNotifications])

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/bookings/stats/dashboard`)
      setStats(response.data)

      // Always fetch tasks to calculate task stats (for staff it's their tasks, for admin it's all tasks)
      const token = localStorage.getItem("token") || localStorage.getItem("adminToken");
      const tasksRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/tasks`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const tasks = tasksRes.data;
      
      const now = new Date()
      const todayStart = new Date(now.setHours(0,0,0,0))
      
      let active = 0, dueToday = 0, completed = 0, missed = 0, parcelsToProcess = 0;
      
      tasks.forEach(t => {
         if (t.status === 'completed') {
            completed++;
         } else {
            active++;
            if (t.bookings && t.bookings.length) {
               parcelsToProcess += t.bookings.length;
            }
            if (t.dueDate) {
               const due = new Date(t.dueDate);
               const dueStart = new Date(due.setHours(0,0,0,0));
               if (dueStart.getTime() === todayStart.getTime()) {
                  dueToday++;
               } else if (dueStart.getTime() < todayStart.getTime()) {
                  missed++;
               }
            }
         }
      })
      setTaskStats({ active, dueToday, completed, missed, parcelsToProcess })
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPendingOrders = async () => {
    setLoadingOrders(true)
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/bookings`, {
        params: {
          status: 'pending',
          limit: 20
        }
      })
      
      const orders = response.data.bookings || []
      setPendingOrders(orders)
    } catch (error) {
      console.error("Error fetching pending orders:", error)
      setPendingOrders([])
    } finally {
      setLoadingOrders(false)
    }
  }

  const handleNotificationClick = () => {
    if (!showNotifications) {
      fetchPendingOrders()
    }
    setShowNotifications(!showNotifications)
  }

  const handleQuerySubmit = async (e) => {
    e.preventDefault();
    if (!queryData.subject.trim() || !queryData.description.trim()) {
      toast.error("Subject and Description are required");
      return;
    }

    setSubmittingQuery(true);
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("adminToken");
      await axios.post(`${import.meta.env.VITE_API_URL}/api/queries`, queryData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Query submitted successfully!");
      setIsQueryModalOpen(false);
      setQueryData({ type: 'Leave Application', subject: '', description: '' });
    } catch (error) {
      console.error("Query submission error:", error);
      toast.error("Failed to submit query");
    } finally {
      setSubmittingQuery(false);
    }
  };

  const adminCards = [
    {
      name: "Total Bookings",
      value: stats.totalBookings,
      icon: Package,
      gradient: "from-blue-500 to-cyan-400",
      shadow: "shadow-blue-500/30",
    },
    {
      name: "Pending Orders",
      value: stats.pendingBookings,
      icon: Clock,
      gradient: "from-amber-500 to-orange-400",
      shadow: "shadow-orange-500/30",
    },
    {
      name: "In Transit",
      value: stats.inTransitBookings,
      icon: Truck,
      gradient: "from-purple-500 to-indigo-500",
      shadow: "shadow-purple-500/30",
    },
    {
      name: "Delivered",
      value: stats.deliveredBookings,
      icon: CheckCircle,
      gradient: "from-emerald-500 to-teal-400",
      shadow: "shadow-emerald-500/30",
    },
    {
      name: "Total Revenue",
      value: `₹${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      gradient: "from-primary-600 to-primary-400",
      shadow: "shadow-primary-500/30",
    }
  ]

  const staffCards = [
    {
      name: isAdmin ? "Total Active Tasks" : "My Active Tasks",
      value: taskStats.active,
      icon: ClipboardList,
      gradient: "from-blue-500 to-cyan-400",
      shadow: "shadow-blue-500/30",
    },
    {
      name: isAdmin ? "Total Parcels to Process" : "Parcels to Process",
      value: taskStats.parcelsToProcess,
      icon: Package,
      gradient: "from-purple-500 to-indigo-500",
      shadow: "shadow-purple-500/30",
    },
    {
      name: "Due Today",
      value: taskStats.dueToday,
      icon: Clock,
      gradient: "from-amber-500 to-orange-400",
      shadow: "shadow-orange-500/30",
    },
    {
      name: isAdmin ? "Total Missed Tasks" : "Missed Tasks",
      value: taskStats.missed,
      icon: XCircle,
      gradient: "from-rose-500 to-pink-400",
      shadow: "shadow-pink-500/30",
    }
  ]

  const statCards = isAdmin && adminViewType === 'global' ? adminCards : staffCards;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-100 border-t-primary-500"></div>
          <p className="text-gray-500 font-medium animate-pulse">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative pb-10">
      
      {/* Hero Welcome Section */}
      <div className="relative mb-10 rounded-3xl overflow-hidden shadow-lg border border-primary-500/10">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-700 via-primary-600 to-blue-600 dark:from-orange-800 dark:via-orange-700 dark:to-orange-900"></div>
        {/* Abstract pattern overlay */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
        
        <div className="relative p-5 md:p-8 flex flex-row items-start md:items-center justify-between z-10 gap-4">
          <div className="text-white flex-1">
            <div className="flex items-center gap-4 mb-1 md:mb-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight capitalize">Welcome Back, {user?.name || user?.username || 'Admin'} 👋</h1>
            </div>
            <p className="text-primary-100 dark:text-orange-200 font-medium text-sm md:text-base max-w-xl leading-snug">
              {isAdmin 
                ? (adminViewType === 'global' 
                    ? `Here is the current overview of your business operations. You currently have ${stats.pendingBookings} pending orders requiring attention.`
                    : `Here is the system-wide staff performance overview. There are currently ${taskStats.active} active tasks being processed.`)
                : `Here is your task overview for today. You currently have ${taskStats.active} active tasks assigned to you.`
              }
            </p>
            {isAdmin && (
              <div className="mt-4 flex flex-wrap bg-white/10 p-1 rounded-xl w-fit backdrop-blur-md border border-white/20">
                <button
                  onClick={() => setAdminViewType('global')}
                  className={`px-3 py-1.5 md:px-4 md:py-2 text-sm md:text-base rounded-xl font-bold transition-all ${
                    adminViewType === 'global' 
                      ? 'bg-white text-primary-600 shadow-md transform scale-105' 
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  Global Business
                </button>
                <button
                  onClick={() => setAdminViewType('tasks')}
                  className={`px-3 py-1.5 md:px-4 md:py-2 text-sm md:text-base rounded-xl font-bold transition-all flex items-center gap-1 ${
                    adminViewType === 'tasks' 
                      ? 'bg-white text-primary-600 shadow-md transform scale-105' 
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  <Users className="h-4 w-4" /> Staff Performance
                </button>
              </div>
            )}
          </div>
          
          <div className="relative notification-wrapper flex-shrink-0">
            <button
              onClick={handleNotificationClick}
              className="relative p-2.5 md:p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/20 rounded-xl transition-all duration-300 shadow-lg group hover:scale-105"
            >
              <Bell className="h-6 w-6 group-hover:animate-swing" />
              {stats.pendingBookings > 0 && (
                <span className="absolute -top-2 -right-2 inline-flex items-center justify-center px-2 py-1 text-xs font-black leading-none text-red-600 transform bg-white rounded-full min-w-[24px] min-h-[24px] shadow-sm border border-red-100">
                  {stats.pendingBookings}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-4 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 max-h-[500px] flex flex-col transform origin-top-right transition-all animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/80 backdrop-blur-sm rounded-t-2xl">
                  <div>
                    <h3 className="text-lg font-extrabold text-gray-900">New Orders</h3>
                    <p className="text-xs text-gray-500 font-medium">Online orders awaiting processing</p>
                  </div>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-700 rounded-full transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="overflow-y-auto flex-1 p-2">
                  {loadingOrders ? (
                    <div className="flex items-center justify-center p-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                    </div>
                  ) : pendingOrders.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                        <CheckCircle className="h-8 w-8 text-green-500" />
                      </div>
                      <p className="font-bold text-gray-900 mb-1">No pending orders</p>
                      <p className="text-sm">All caught up for now!</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pendingOrders.map((order) => (
                        <Link
                          key={order._id}
                          to={`/bookings/${order._id}`}
                          onClick={() => setShowNotifications(false)}
                          className="block p-4 bg-white hover:bg-gray-50 rounded-xl border border-transparent hover:border-gray-200 transition-all duration-200 group"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-extrabold text-primary-700 group-hover:text-primary-600 transition-colors">
                                  {order.bookingId}
                                </span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black bg-yellow-100 text-yellow-800 uppercase tracking-wider">
                                  {order.status}
                                </span>
                              </div>
                              <div className="space-y-1 mt-3">
                                <p className="text-sm text-gray-700 flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                                  <span className="font-bold text-gray-500 w-10">From:</span> 
                                  <span className="truncate">{order.senderDetails?.name || "N/A"}</span>
                                </p>
                                <p className="text-sm text-gray-700 flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-green-400"></span>
                                  <span className="font-bold text-gray-500 w-10">To:</span> 
                                  <span className="truncate">{order.receiverDetails?.name || "N/A"}</span>
                                </p>
                              </div>
                              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold">
                                <span className="text-primary-600 bg-primary-50 px-2 py-1 rounded">₹{order.pricing?.totalAmount || 0}</span>
                                <span className="text-gray-400 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {pendingOrders.length > 0 && (
                  <div className="p-4 border-t border-gray-100 bg-gray-50/80 backdrop-blur-sm rounded-b-2xl">
                    <Link
                      to="/bookings?status=pending"
                      onClick={() => setShowNotifications(false)}
                      className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-md shadow-primary-500/20 rounded-xl transition-all"
                    >
                      View All Pending Orders
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        {statCards.map((stat, idx) => (
          <div 
            key={stat.name} 
            className="relative group bg-white dark:bg-[#111111] rounded-2xl p-5 shadow-sm hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-black/50 transition-all duration-500 transform hover:-translate-y-1 overflow-hidden border border-gray-100 dark:border-white/10 flex flex-col items-center justify-center text-center"
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            {/* Decorative background blur */}
            <div className={`absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br ${stat.gradient} opacity-10 rounded-full blur-2xl group-hover:scale-110 group-hover:opacity-20 transition-all duration-700`}></div>
            
            <div className="relative z-10 mb-3">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} text-white shadow-lg ${stat.shadow} transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 inline-block`}>
                <stat.icon className="h-5 w-5 mx-auto" strokeWidth={2.5} />
              </div>
            </div>
            
            <div className="relative z-10">
              <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-0.5">{stat.value}</p>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{stat.name}</p>
            </div>
            
            {/* Minimal accent line at bottom */}
            <div className={`absolute bottom-0 left-0 h-1 w-0 bg-gradient-to-r ${stat.gradient} group-hover:w-full transition-all duration-700 ease-in-out`}></div>
          </div>
        ))}
        
        {/* 5th Card: Raise Query (Staff) or Mailbox (Admin Tasks View) */}
        {(!isAdmin || (isAdmin && adminViewType === 'tasks')) && (
          <Link 
            to={isAdmin ? "/queries" : "#"}
            onClick={(e) => {
              if (!isAdmin) {
                e.preventDefault();
                setIsQueryModalOpen(true);
              }
            }}
            className="cursor-pointer relative group bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 shadow-sm shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/40 transition-all duration-500 transform hover:-translate-y-1 overflow-hidden border border-indigo-400 flex flex-col items-center justify-center text-center block"
            style={{ animationDelay: `400ms` }}
          >
            {/* Decorative background blur */}
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white opacity-10 rounded-full blur-2xl group-hover:scale-110 group-hover:opacity-20 transition-all duration-700"></div>
            
            <div className="relative z-10 mb-3">
              <div className="p-3 rounded-xl bg-white/20 text-white shadow-inner transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 inline-block">
                <MessageCircle className="h-5 w-5 mx-auto" strokeWidth={2.5} />
              </div>
            </div>
            
            <div className="relative z-10 text-white mt-auto">
              <p className="text-xl font-black tracking-tight mb-0.5 group-hover:translate-x-1 transition-transform">
                {isAdmin ? "Mailbox" : "Raise Query"} &rarr;
              </p>
              <p className="text-xs font-bold text-indigo-100 uppercase tracking-wider">
                {isAdmin ? "Manage Requests" : "Leave / Issue"}
              </p>
            </div>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions Panel */}
        <div className="bg-white dark:bg-[#111111] rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 p-6 flex flex-col transition-colors">
          <div className="mb-6">
            <h3 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary-500" />
              Quick Actions
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 font-medium">Access your most frequently used modules</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
            <Link
              to="/create-order"
              className="group flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-white/5 rounded-2xl hover:bg-white dark:hover:bg-[#1A1A1A] hover:shadow-xl hover:shadow-primary-500/10 border border-transparent hover:border-primary-100 dark:hover:border-primary-500/50 transition-all duration-300 text-center"
            >
              <div className="p-4 bg-primary-100 dark:bg-primary-500/20 rounded-full text-primary-600 dark:text-primary-400 group-hover:scale-110 group-hover:bg-primary-600 group-hover:text-white transition-all duration-300 mb-4 shadow-sm">
                 <Package className="h-7 w-7" />
              </div>
              <span className="font-extrabold text-gray-700 dark:text-gray-200 group-hover:text-primary-600 dark:group-hover:text-primary-400 text-lg">Create Order</span>
            </Link>

            <Link
              to="/bookings"
              className="group flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-white/5 rounded-2xl hover:bg-white dark:hover:bg-[#1A1A1A] hover:shadow-xl hover:shadow-blue-500/10 border border-transparent hover:border-blue-100 dark:hover:border-blue-500/50 transition-all duration-300 text-center"
            >
              <div className="p-4 bg-blue-100 dark:bg-blue-500/20 rounded-full text-blue-600 dark:text-blue-400 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 mb-4 shadow-sm">
                 <Search className="h-7 w-7" />
              </div>
              <span className="font-extrabold text-gray-700 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 text-lg">Manage Bookings</span>
            </Link>

            <Link
              to="/pincodes"
              className="group flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-white/5 rounded-2xl hover:bg-white dark:hover:bg-[#1A1A1A] hover:shadow-xl hover:shadow-purple-500/10 border border-transparent hover:border-purple-100 dark:hover:border-purple-500/50 transition-all duration-300 text-center"
            >
              <div className="p-4 bg-purple-100 dark:bg-purple-500/20 rounded-full text-purple-600 dark:text-purple-400 group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300 mb-4 shadow-sm">
                 <MapPin className="h-7 w-7" />
              </div>
              <span className="font-extrabold text-gray-700 dark:text-gray-200 group-hover:text-purple-600 dark:group-hover:text-purple-400 text-lg">Pincode Service</span>
            </Link>

            <Link
              to="/coupons"
              className="group flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-white/5 rounded-2xl hover:bg-white dark:hover:bg-[#1A1A1A] hover:shadow-xl hover:shadow-orange-500/10 border border-transparent hover:border-orange-100 dark:hover:border-orange-500/50 transition-all duration-300 text-center"
            >
              <div className="p-4 bg-orange-100 dark:bg-orange-500/20 rounded-full text-orange-600 dark:text-orange-400 group-hover:scale-110 group-hover:bg-orange-600 group-hover:text-white transition-all duration-300 mb-4 shadow-sm">
                 <Tag className="h-7 w-7" />
              </div>
              <span className="font-extrabold text-gray-700 dark:text-gray-200 group-hover:text-orange-600 dark:group-hover:text-orange-400 text-lg">Manage Coupons</span>
            </Link>
          </div>
        </div>

        {/* System Status Panel */}
        <div className="bg-white dark:bg-[#111111] rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 p-6 flex flex-col relative overflow-hidden transition-colors">
          {/* subtle background graphic */}
          <div className="absolute -bottom-10 -right-10 w-48 h-48 border-[20px] border-gray-50 dark:border-white/5 rounded-full opacity-50 pointer-events-none"></div>
          
          <div className="mb-6 relative z-10">
            <h3 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
              <Database className="h-6 w-6 text-gray-700 dark:text-gray-300" />
              System Status
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 font-medium">Real-time infrastructure monitoring</p>
          </div>
          
          <div className="space-y-4 relative z-10 flex-1 flex flex-col justify-center">
            
            <div className="flex items-center justify-between p-5 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 hover:border-gray-200 transition-colors">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white dark:bg-[#1A1A1A] shadow-sm text-gray-700 dark:text-gray-300 rounded-xl">
                   <Database className="h-5 w-5" />
                </div>
                <div>
                  <span className="block font-extrabold text-gray-800 dark:text-gray-200 text-sm tracking-wide">Database Core</span>
                  <span className="text-xs text-gray-400 font-medium">MongoDB Cluster</span>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 rounded-full font-black text-xs border border-green-200 dark:border-green-500/20 shadow-sm">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 dark:bg-green-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
                CONNECTED
              </div>
            </div>

            <div className="flex items-center justify-between p-5 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 hover:border-gray-200 transition-colors">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white dark:bg-[#1A1A1A] shadow-sm text-gray-700 dark:text-gray-300 rounded-xl">
                   <Activity className="h-5 w-5" />
                </div>
                <div>
                  <span className="block font-extrabold text-gray-800 dark:text-gray-200 text-sm tracking-wide">API Services</span>
                  <span className="text-xs text-gray-400 font-medium">REST Endpoints</span>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 rounded-full font-black text-xs border border-green-200 dark:border-green-500/20 shadow-sm">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 dark:bg-green-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
                ACTIVE
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-white/10 flex items-center justify-between">
              <span className="text-sm font-bold text-gray-400">Last Synced</span>
              <span className="text-sm font-extrabold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/10 px-3 py-1 rounded-lg">
                {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
            
          </div>
        </div>
      </div>

      {/* Query/Leave Modal */}
      {isQueryModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col transform animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-indigo-600" />
                Raise a Query
              </h3>
              <button 
                onClick={() => setIsQueryModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 p-1.5 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleQuerySubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Query Type</label>
                <select 
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  value={queryData.type}
                  onChange={(e) => setQueryData({...queryData, type: e.target.value})}
                >
                  <option value="Leave Application">Leave Application</option>
                  <option value="Issue">Report an Issue</option>
                  <option value="General Query">General Query</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Subject</label>
                <input 
                  type="text" 
                  required
                  placeholder="E.g., Sick Leave for Tomorrow"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  value={queryData.subject}
                  onChange={(e) => setQueryData({...queryData, subject: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                <textarea 
                  required
                  rows="4"
                  placeholder="Provide more details here..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
                  value={queryData.description}
                  onChange={(e) => setQueryData({...queryData, description: e.target.value})}
                ></textarea>
              </div>
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsQueryModalOpen(false)}
                  className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingQuery}
                  className="flex-1 py-2.5 px-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-500/20 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {submittingQuery ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    "Submit to Admin"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
