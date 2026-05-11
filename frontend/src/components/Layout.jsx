import { useState, useEffect, useRef } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import axios from "axios"
import toast from "react-hot-toast"
import { Package, LayoutDashboard, FileText, MapPin, Ticket, LogOut, Menu, X, BarChart, Bell, Users, Building, CheckSquare, ClipboardList } from "lucide-react"
import { socket } from "../utils/socket"
import { Activity as ActivityIcon } from "lucide-react"

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [eDocketCount, setEDocketCount] = useState(0)
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0)
  const [tasksCount, setTasksCount] = useState(0)
  const [recentOrders, setRecentOrders] = useState([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const { logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

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

  // Function to show the persistent alert (Refactored from the polling logic)
  const showAlert = (message, updateCount, singleBookingId, counts = {}, bookingSource = null) => {
    // Play sound if not already playing
    if (!audioRef.current) {
      const audio = new Audio("/notification.mp3")
      audio.loop = true
      audio.play().catch(e => console.error("Audio play failed:", e))
      audioRef.current = audio
    }

    // Flash the tab title
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
        // Polling-based alert logic remains as a fallback but we prefer socket events now
        if (newCount > prevCountRef.current || newPending > prevPendingRef.current) {
          const msg = newCount > prevCountRef.current ? "New E-Docket intake bookings have arrived." : "New Online Orders have arrived."
          showAlert(msg, 1, null, { newCount, newPending })
        }
      }

      const resTasks = await axios.get(`${import.meta.env.VITE_API_URL}/api/bookings/tasks/tomorrow-count`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setTasksCount(resTasks.data.count || 0)

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
        fetchCount(true) // Silent fetch to update counters
      })

      socket.on("status_update", (data) => {
        console.log("🚚 Real-time Status (Silent Refresh):", data)
        // showAlert is removed here to prevent annoying popups for transit updates
        fetchCount(true)
      })
    }

    fetchCount()
    const interval = setInterval(() => fetchCount(true), 30000) // Increase polling to 30s since we have sockets now

    return () => {
      clearInterval(interval)
      socket.off("new_booking")
      socket.off("status_update")
      socket.disconnect()
    }
  }, [])

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Booking", href: "/bookings", icon: FileText, badge: pendingOrdersCount },
    { name: "E-Docket", href: "/e-docket", icon: Package, badge: eDocketCount },
    { name: "Sales Report", href: "/sales-report", icon: BarChart },
    { name: "Web Analytics", href: "/analytics", icon: ActivityIcon },
    { name: "Pincodes", href: "/pincodes", icon: MapPin },
    { name: "Coupons", href: "/coupons", icon: Ticket },
    { name: "Create Order", href: "/manual-booking", icon: Ticket },
    { name: "Tasks", href: "/tasks", icon: CheckSquare, badge: tasksCount },
    { name: "User Management", href: "/user-management", icon: Users },
    { name: "Vendor Management", href: "/vendors", icon: Building },
    { name: "Docket Management", href: "/docket-management", icon: ClipboardList },
  ]

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? "block" : "hidden"}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-4 border-b">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-primary-500" />
              <span className="ml-2 text-xl font-bold text-gray-900">EngineersParcel</span>
            </div>
            <button onClick={() => setSidebarOpen(false)}>
              <X className="h-6 w-6 text-gray-500" />
            </button>
          </div>
          <nav className="flex-1 px-4 py-4 space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? "bg-primary-100 text-primary-700" : "text-gray-700 hover:bg-gray-100"
                    }`}
                >
                  <div className="flex items-center">
                    <item.icon className="h-5 w-5 mr-3" />
                    {item.name}
                  </div>
                  {item.badge > 0 && (
                    <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-red-500 text-white">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
          <div className="p-4 border-t">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex h-16 items-center px-4 border-b">
            <Package className="h-8 w-8 text-primary-500" />
            <span className="ml-2 text-xl font-bold text-gray-900">EngineersParcel</span>
          </div>
          <nav className="flex-1 px-4 py-4 space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? "bg-primary-100 text-primary-700" : "text-gray-700 hover:bg-gray-100"
                    }`}
                >
                  <div className="flex items-center">
                    <item.icon className="h-5 w-5 mr-3" />
                    {item.name}
                  </div>
                  {item.badge > 0 && (
                    <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-red-500 text-white">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
          <div className="p-4 border-t">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button type="button" className="-m-2.5 p-2.5 text-gray-700 lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
            </div>

            {/* Right side - Notifications */}
            <div className="flex flex-1 justify-end items-center gap-x-4">
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <span className="sr-only">View notifications</span>
                  <Bell className="h-6 w-6" />
                  {pendingOrdersCount > 0 && (
                    <span className="absolute top-1 right-1 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 border-2 border-white rounded-full">
                      {pendingOrdersCount}
                    </span>
                  )}
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden">
                    <div className="flex justify-between items-center p-3 border-b border-gray-100 bg-gray-50">
                      <h3 className="text-sm font-semibold text-gray-900">New Orders / Online Orders</h3>
                      <button onClick={() => setIsDropdownOpen(false)}>
                        <X className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                      </button>
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                      {recentOrders.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-500">
                          No pending orders.
                        </div>
                      ) : (
                        recentOrders.map((order) => (
                          <div
                            key={order._id}
                            onClick={() => { setIsDropdownOpen(false); navigate(`/bookings/${order._id}`) }}
                            className="p-3 border-b border-gray-50 hover:bg-primary-50 transition-colors cursor-pointer"
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-sm font-bold text-gray-900">{order.bookingId}</span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                Pending
                              </span>
                            </div>
                            <div className="text-xs text-gray-600 mb-0.5">
                              From: <span className="text-gray-900">{order.senderDetails?.name || 'Unknown'}</span>
                            </div>
                            <div className="text-xs text-gray-600 mb-1">
                              To: <span className="text-gray-900">{order.receiverDetails?.name || 'Unknown'}</span>
                            </div>
                            <div className="text-xs text-gray-500 mb-1">
                              Service: {order.serviceType === 'campus-parcel' ? 'Campus-Parcel' : 'Courier'}
                            </div>
                            <div className="flex justify-between items-center text-xs text-gray-500">
                              <span>₹{order.pricing?.totalAmount || 0}</span>
                              <span className="text-primary-600 font-medium">View →</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <Link
                      to="/bookings"
                      onClick={() => setIsDropdownOpen(false)}
                      className="block w-full text-center p-3 text-sm font-medium text-primary-600 hover:bg-primary-50 transition-colors border-t border-gray-100"
                    >
                      View All Pending Orders →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-6">
          <div className="px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  )
}

export default Layout
