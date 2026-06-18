import { useState, useEffect, useRef } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import axios from "axios"
import toast from "react-hot-toast"
import { Package, LayoutDashboard, FileText, MapPin, Ticket, LogOut, Menu, X, BarChart, Bell, Users, Building, CheckSquare, ClipboardList, UserCheck, MessageCircle, CheckCircle, Moon, Sun, Gift } from "lucide-react"
import { socket } from "../utils/socket"
import { Activity as ActivityIcon } from "lucide-react"
import { useTheme } from "../contexts/ThemeContext"

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [eDocketCount, setEDocketCount] = useState(0)
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0)
  const [tasksCount, setTasksCount] = useState(0)
  const [recentOrders, setRecentOrders] = useState([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const { logout } = useAuth()
  const { isDarkMode, toggleDarkMode } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()

  const [unacceptedIncentivesCount, setUnacceptedIncentivesCount] = useState(0)
  const prevCountRef = useRef(0)
  const prevPendingRef = useRef(0)
  const isFirstLoadRef = useRef(true)
  const seenActivityIdsRef = useRef(new Set())
  const audioRef = useRef(null)
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false)

  // Unlock audio context on first user interaction
  useEffect(() => {
    const unlockAudio = () => {
      // Create empty audio context to unlock
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        ctx.resume().then(() => ctx.close());
      }

      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };

    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
    document.addEventListener('keydown', unlockAudio);

    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  // Function to show the persistent alert
  const showAlert = (message, updateCount, singleBookingId, counts = {}, bookingSource = null) => {
    if (!audioRef.current) {
      const audio = new Audio("/notification.mp3")
      audio.loop = true
      audio.play().catch(e => console.error("Audio play failed:", e))
      audioRef.current = audio
    }

    const originalTitle = document.title
    let isAlertTitle = false
    const titleInterval = setInterval(() => {
      document.title = isAlertTitle ? originalTitle : `(1) 🚨 New Alert!`
      isAlertTitle = !isAlertTitle
    }, 1000)

    toast((t) => (
      <div className="flex flex-col gap-3 min-w-[300px] bg-white p-1">
        <div className="flex items-center gap-3 border-b border-red-100 pb-2">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center animate-pulse">
            <Bell className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 leading-tight">Admin Notification</h4>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Real-time Update</p>
          </div>
        </div>

        <div className="py-1">
          <p className="text-sm text-gray-700 font-medium leading-relaxed">{message}</p>
          {(counts.newCount > 0 || counts.newPending > 0) && (
            <div className="mt-2 space-y-1">
              {counts.newCount > 0 && (
                <div className="flex items-center gap-2 text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                  Pending E-Dockets: {counts.newCount}
                </div>
              )}
              {counts.newPending > 0 && (
                <div className="flex items-center gap-2 text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                  Pending Online Orders: {counts.newPending}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <button
            onClick={() => {
              toast.dismiss(t.id)
              if (audioRef.current) {
                audioRef.current.pause()
                audioRef.current = null
              }
              clearInterval(titleInterval)
              document.title = originalTitle

              if (bookingSource === "Agent") {
                const date = counts.date ? counts.date.split('T')[0] : new Date().toISOString().split('T')[0]
                navigate(`/e-docket?id=${singleBookingId}&date=${date}`)
              } else if (updateCount === 1 && singleBookingId) {
                navigate(`/bookings/${singleBookingId}`)
              } else {
                navigate("/bookings")
              }
            }}
            className="flex-1 px-4 py-2.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 font-bold shadow-lg shadow-orange-100 transition-all active:scale-95 text-xs flex items-center justify-center gap-2"
          >
            <Package className="h-3.5 w-3.5" />
            {bookingSource === "Agent" ? "View E-Dockets" : (updateCount === 1 && singleBookingId ? "View Update" : "View Dashboard")}
          </button>
          <button
            onClick={() => {
              toast.dismiss(t.id)
              if (audioRef.current) {
                audioRef.current.pause()
                audioRef.current = null
              }
              clearInterval(titleInterval)
              document.title = originalTitle
            }}
            className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 font-bold transition-all text-xs"
          >
            Dismiss
          </button>
        </div>
      </div>
    ), {
      duration: Infinity,
      position: 'top-right',
      style: { border: 'none', padding: '12px', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' },
    })
  }

  const showIncentiveAlert = (task) => {
    if (!audioRef.current) {
      const audio = new Audio("/notification.mp3")
      audio.play().catch(e => console.error("Audio play failed:", e))
    }

    toast((t) => (
      <div className="flex flex-col gap-3 min-w-[300px] bg-white p-1">
        <div className="flex items-center gap-3 border-b border-purple-100 pb-2">
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center animate-bounce">
            <Gift className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 leading-tight">New Incentive Challenge!</h4>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Earn Rewards</p>
          </div>
        </div>

        <div className="py-1">
          <p className="text-sm text-gray-700 font-medium leading-relaxed">{task.title}</p>
          <div className="mt-2 text-[11px] font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded">
            Reward: {task.incentiveType === 'fixed' ? '₹' : ''}{task.incentiveValue}{task.incentiveType === 'percentage' ? '%' : ''}
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <button
            onClick={() => {
              toast.dismiss(t.id)
              navigate("/tracking-tasks")
            }}
            className="flex-1 px-4 py-2.5 bg-purple-500 text-white rounded-xl hover:bg-purple-600 font-bold shadow-lg shadow-purple-100 transition-all active:scale-95 text-xs flex items-center justify-center gap-2"
          >
            View Details
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 font-bold transition-all text-xs"
          >
            Dismiss
          </button>
        </div>
      </div>
    ), {
      duration: 10000,
      position: 'top-center',
      style: { border: 'none', padding: '12px', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' },
    })
  }

  const showLeadAlert = (lead) => {
    if (!audioRef.current) {
      const audio = new Audio("/notification.mp3")
      audio.play().catch(e => console.error("Audio play failed:", e))
    }

    toast((t) => (
      <div className="flex flex-col gap-3 min-w-[300px] bg-white p-1">
        <div className="flex items-center gap-3 border-b border-blue-100 pb-2">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center animate-pulse">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 leading-tight">New Lead Alert!</h4>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">From Main Website</p>
          </div>
        </div>

        <div className="py-1">
          <p className="text-sm text-gray-700 font-medium leading-relaxed">{lead.name} ({lead.phone})</p>
        </div>

        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <button
            onClick={() => {
              toast.dismiss(t.id)
              navigate("/leads")
            }}
            className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 font-bold shadow-lg shadow-blue-100 transition-all active:scale-95 text-xs flex items-center justify-center gap-2"
          >
            View Leads
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 font-bold transition-all text-xs"
          >
            Dismiss
          </button>
        </div>
      </div>
    ), {
      duration: Infinity,
      position: 'top-right',
      style: { border: 'none', padding: '12px', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' },
    })
  }

  const fetchCount = async (silent = false) => {
    try {
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token")
      if (!token) return

      const resDocket = await axios.get(`${import.meta.env.VITE_API_URL}/api/bookings/edocket-count`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const newCount = resDocket.data.count || 0

      const resStats = await axios.get(`${import.meta.env.VITE_API_URL}/api/bookings/stats/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const newPending = resStats.data.pendingBookings || 0

      const resActivity = await axios.get(`${import.meta.env.VITE_API_URL}/api/bookings/stats/recent-rider-activity`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const recentActivity = resActivity.data || []

      const resRecent = await axios.get(`${import.meta.env.VITE_API_URL}/api/bookings/stats/pending-recent`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setRecentOrders(resRecent.data || [])

      if (!silent && !isFirstLoadRef.current) {
        if (newCount > prevCountRef.current || newPending > prevPendingRef.current) {
          const msg = newCount > prevCountRef.current ? "New E-Docket intake bookings have arrived." : "New Online Orders have arrived."
          showAlert(msg, 1, null, { newCount, newPending })
        }
      }

      const resTasks = await axios.get(`${import.meta.env.VITE_API_URL}/api/bookings/tasks/tomorrow-count`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setTasksCount(resTasks.data.count || 0)

      try {
        const resIncentives = await axios.get(`${import.meta.env.VITE_API_URL}/api/incentives/unaccepted-count`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setUnacceptedIncentivesCount(resIncentives.data.count || 0)
      } catch(err) {
        // ignore if not staff or error
      }

      prevCountRef.current = newCount
      prevPendingRef.current = newPending
      setEDocketCount(newCount)
      setPendingOrdersCount(newPending)
      isFirstLoadRef.current = false
    } catch (error) {
      console.error("Fetch count error:", error)
    }
  }

  // Socket Connection & Listeners
  useEffect(() => {
    const token = localStorage.getItem("adminToken") || localStorage.getItem("token")
    if (token) {
      socket.connect()

      socket.on("new_booking", (data) => {
        console.log("🔥 Real-time Booking:", data)
        showAlert(`New ${data.serviceType} Booking ${data.bookingId} from ${data.senderName}`, 1, data.bookingId, { date: data.createdAt }, data.bookingSource)
        fetchCount(true)
      })

      socket.on("status_update", (data) => {
        console.log("🚚 Real-time Status (Silent Refresh):", data)
        fetchCount(true)
      })

      socket.on("new_incentive_task", (data) => {
        console.log("🎁 Real-time Incentive Task:", data)
        showIncentiveAlert(data)
      })

      socket.on("new_lead", (data) => {
        console.log("👤 Real-time Lead:", data)
        showLeadAlert(data)
      })
    }

    fetchCount()
    const interval = setInterval(() => fetchCount(true), 30000)

    return () => {
      clearInterval(interval)
      socket.off("new_booking")
      socket.off("status_update")
      socket.off("new_incentive_task")
      socket.off("new_lead")
      socket.disconnect()
    }
  }, [])

  const { user } = useAuth()
  const isAdmin = user && (!user.role || user.role === 'admin')

  const allNavigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Booking", href: "/bookings", icon: FileText, badge: pendingOrdersCount },
    { name: "E-Docket", href: "/e-docket", icon: Package, badge: eDocketCount },
    { name: "Sales Report", href: "/sales-report", icon: BarChart },
    { name: "Web Analytics", href: "/analytics", icon: ActivityIcon },
    { name: "Pincodes", href: "/pincodes", icon: MapPin },
    { name: "Coupons", href: "/coupons", icon: Ticket },
    { name: "Create Order", href: "/manual-booking", icon: Ticket },
    { name: "Tasks", href: "/tasks", icon: CheckSquare, badge: tasksCount },
    { name: "Staff Tasks", href: "/tracking-tasks", icon: ClipboardList, badge: unacceptedIncentivesCount },
    { name: "Attendance", href: "/attendance", icon: UserCheck },
    { name: "Attendance Report", href: "/attendance-report", icon: FileText },
    { name: "User Management", href: "/user-management", icon: Users },
    { name: "Partner Management", href: "/partners", icon: Building },
    { name: "Docket Management", href: "/docket-management", icon: ClipboardList },
    { name: "Manage Queries", href: "/queries", icon: MessageCircle },
    { name: "Leads", href: "/leads", icon: Users },
    { name: "Offices", href: "/offices", icon: Building },
    { name: "Access Control", href: "/access-control", icon: UserCheck },
  ]

  const defaultStaffAllowed = ["Dashboard", "Booking", "E-Docket", "Pincodes", "Create Order", "Partner Management", "Staff Tasks", "Manage Queries", "Docket Management", "Leads"];
  
  const navigation = isAdmin 
    ? allNavigation 
    : allNavigation.filter(item => {
        if (user?.permissions && Array.isArray(user.permissions) && user.permissions.length > 0) {
          if (user.permissions.includes("ALL")) return true;
          return user.permissions.includes(item.name) || user.permissions.includes(item.name.replace("My ", "Staff "));
        }
        return defaultStaffAllowed.includes(item.name);
      }).map(item => {
        if (item.name === "Manage Queries") return { ...item, name: "My Queries" }
        if (item.name === "Staff Tasks") return { ...item, name: "My Tasks" }
        return item
      });

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  // Find active route name for dynamic header
  const activeRouteName = navigation.find(n => n.href === location.pathname)?.name || "Dashboard"

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans selection:bg-primary-200 selection:text-primary-900">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? "block" : "hidden"}`}>
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white shadow-2xl transform transition-transform duration-300">
          <div className="flex h-16 items-center justify-between px-6 border-b border-gray-100">
            <div className="flex items-center">
              <div className="p-2 bg-gradient-to-br from-primary-600 to-primary-500 rounded-xl shadow-lg shadow-primary-500/30">
                <Package className="h-6 w-6 text-white" />
              </div>
              <span className="ml-3 text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 tracking-tight">EngineersParcel</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
              <X className="h-6 w-6 text-gray-500" />
            </button>
          </div>
          <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto custom-scrollbar">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex items-center justify-between px-3 py-1.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                    isActive 
                      ? "bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/25" 
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <div className="flex items-center">
                    <item.icon className={`h-5 w-5 mr-3 transition-transform duration-300 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-primary-500 group-hover:scale-110'}`} />
                    {item.name}
                  </div>
                  {item.badge > 0 && (
                    <span className={`inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-black rounded-full ${isActive ? 'bg-white text-primary-600' : 'bg-red-500 text-white shadow-sm shadow-red-500/30'}`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
          <div className="p-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between mt-auto">
            <button
              onClick={handleLogout}
              className="flex items-center justify-center w-full px-3 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-xl transition-all duration-300 group shadow-sm hover:shadow-md"
            >
              <LogOut className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col z-40">
        <div className="flex flex-col h-full bg-white dark:bg-[#0A0A0A] border-r border-gray-100 dark:border-white/10 shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-colors duration-300">
          <div className="flex h-16 items-center px-6 border-b border-gray-100/80 dark:border-white/10 bg-white dark:bg-[#0A0A0A] transition-colors duration-300">
            <div className="p-2 bg-gradient-to-br from-primary-600 to-primary-500 rounded-xl shadow-lg shadow-primary-500/30">
              <Package className="h-6 w-6 text-white" />
            </div>
            <span className="ml-3 text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 tracking-tight">EngineersParcel</span>
          </div>
          <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto custom-scrollbar">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center justify-between px-3 py-1.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                    isActive 
                      ? "bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/25 transform scale-[1.02]" 
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white hover:scale-[1.01]"
                  }`}
                >
                  <div className="flex items-center">
                    <item.icon className={`h-5 w-5 mr-3 transition-transform duration-300 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-primary-500 group-hover:scale-110'}`} />
                    {item.name}
                  </div>
                  {item.badge > 0 && (
                    <span className={`inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-black rounded-full ${isActive ? 'bg-white text-primary-600' : 'bg-red-500 text-white shadow-sm shadow-red-500/30'}`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
          <div className="p-3 border-t border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-black/50 flex items-center justify-between mt-auto transition-colors duration-300">
            {/* Compact User Profile Snippet */}
            <div className="flex items-center gap-2 overflow-hidden max-w-[70%]">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-900 border border-white dark:border-white/10 shadow-sm overflow-hidden flex items-center justify-center shrink-0">
                <span className="font-black text-gray-500 dark:text-gray-400 text-sm uppercase">
                   {user?.name ? user.name.charAt(0) : (user?.username ? user.username.charAt(0) : 'A')}
                </span>
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-extrabold text-gray-900 dark:text-white truncate capitalize leading-tight">{user?.name || user?.username || 'Admin'}</p>
                <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider leading-none mt-0.5">{user?.role || 'System Admin'}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 text-red-500 hover:text-red-700 dark:hover:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg transition-all duration-300 shadow-sm border border-red-100 dark:border-red-500/10 hover:shadow-md group shrink-0"
            >
              <LogOut className="h-4 w-4 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col min-h-screen bg-gray-50 dark:bg-[#0A0A0A] transition-colors duration-300">
        
        {/* Top bar (Glassmorphism) */}
        <div className="sticky top-0 z-30 flex h-16 items-center gap-x-4 bg-white/70 dark:bg-[#0A0A0A]/70 backdrop-blur-xl border-b border-gray-100/50 dark:border-white/10 px-4 shadow-[0_4px_30px_rgba(0,0,0,0.02)] sm:gap-x-6 sm:px-6 lg:px-8 transition-colors duration-300">
          <button type="button" className="-m-2.5 p-2.5 text-gray-700 dark:text-gray-300 lg:hidden hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6 items-center">
            
            {/* Dynamic Page Title */}
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white tracking-tight capitalize">
                {activeRouteName}
              </h1>
            </div>

            {/* Right side - Notifications & Theme */}
            <div className="flex flex-1 justify-end items-center gap-x-4">
              
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className="relative p-2.5 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-500 bg-gray-50 dark:bg-white/5 hover:bg-primary-50 dark:hover:bg-white/10 border border-gray-100 dark:border-white/5 rounded-full transition-all duration-300 shadow-sm"
              >
                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="relative p-2.5 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-500 bg-gray-50 dark:bg-white/5 hover:bg-primary-50 dark:hover:bg-white/10 border border-gray-100 dark:border-white/5 rounded-full transition-all duration-300 shadow-sm"
                >
                  <span className="sr-only">View notifications</span>
                  <Bell className="h-5 w-5" />
                  {pendingOrdersCount > 0 && (
                    <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 text-[10px] font-black text-white bg-red-500 border-2 border-white rounded-full shadow-sm">
                      {pendingOrdersCount}
                    </span>
                  )}
                </button>

                {/* Dropdown Menu (Glassmorphism) */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white/95 dark:bg-[#111111]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100/80 dark:border-white/10 z-50 overflow-hidden transform origin-top-right transition-all animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
                      <h3 className="text-sm font-extrabold text-gray-900 dark:text-white tracking-tight">System Alerts</h3>
                      <button onClick={() => setIsDropdownOpen(false)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                        <X className="h-4 w-4 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white" />
                      </button>
                    </div>

                    <div className="max-h-96 overflow-y-auto custom-scrollbar p-2">
                      {recentOrders.length === 0 ? (
                        <div className="p-8 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                          <CheckCircle className="h-10 w-10 text-green-400 dark:text-green-500 mx-auto mb-3 opacity-50" />
                          No pending alerts right now.
                        </div>
                      ) : (
                        recentOrders.map((order) => (
                          <div
                            key={order._id}
                            onClick={() => { setIsDropdownOpen(false); navigate(`/bookings/${order._id}`) }}
                            className="p-3 mb-1 rounded-xl hover:bg-primary-50 dark:hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-primary-100 dark:hover:border-white/10 group"
                          >
                            <div className="flex justify-between items-start mb-1.5">
                              <span className="text-sm font-extrabold text-gray-900 dark:text-white group-hover:text-primary-700 dark:group-hover:text-primary-400 transition-colors">{order.bookingId}</span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black bg-yellow-100 dark:bg-yellow-500/20 text-yellow-800 dark:text-yellow-400 uppercase tracking-wider shadow-sm">
                                Pending
                              </span>
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 dark:bg-blue-500"></span>
                                <span className="text-gray-900 dark:text-gray-200 font-medium truncate">{order.senderDetails?.name || 'Unknown'}</span>
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 dark:bg-green-500"></span>
                                <span className="text-gray-900 dark:text-gray-200 font-medium truncate">{order.receiverDetails?.name || 'Unknown'}</span>
                              </div>
                            </div>
                            
                            <div className="mt-3 pt-2 border-t border-gray-100/50 flex justify-between items-center text-xs text-gray-500">
                              <span className="font-bold text-gray-700">₹{order.pricing?.totalAmount || 0}</span>
                              <span className="text-primary-600 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                View Details <span aria-hidden="true">&rarr;</span>
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="p-3 border-t border-gray-100 bg-gray-50/50">
                      <Link
                        to="/bookings"
                        onClick={() => setIsDropdownOpen(false)}
                        className="block w-full text-center py-2.5 text-sm font-bold text-primary-700 bg-primary-100 hover:bg-primary-200 rounded-xl transition-colors"
                      >
                        View All Pending Orders
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 py-8 relative">
          
          {/* Subtle background gradient blob for the whole app */}
          <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary-200 rounded-full mix-blend-multiply filter blur-[128px] opacity-20"></div>
            <div className="absolute top-40 left-1/4 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-[128px] opacity-20"></div>
          </div>

          <div className="px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default Layout
