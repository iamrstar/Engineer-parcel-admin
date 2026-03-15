"use client"

import { useState, useEffect, useRef } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import axios from "axios"
import toast from "react-hot-toast"
import { Package, LayoutDashboard, FileText, MapPin, Ticket, LogOut, Menu, X, BarChart, Bell, Users } from "lucide-react"

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [eDocketCount, setEDocketCount] = useState(0)
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0)
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

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const token = localStorage.getItem("adminToken") || localStorage.getItem("token")
        if (!token) return

        // Fetch E-Docket Count
        const resDocket = await axios.get(`${import.meta.env.VITE_API_URL}/api/bookings/edocket-count`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const newCount = resDocket.data.count || 0

        // Fetch Pending Online Orders Count
        const resStats = await axios.get(`${import.meta.env.VITE_API_URL}/api/bookings/stats/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const newPending = resStats.data.pendingBookings || 0

        // Fetch Recent Rider Activity (Status Updates)
        const resActivity = await axios.get(`${import.meta.env.VITE_API_URL}/api/bookings/stats/recent-rider-activity`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const recentActivity = resActivity.data || []

        // Fetch Recent Pending Orders List for Dropdown
        const resRecent = await axios.get(`${import.meta.env.VITE_API_URL}/api/bookings/stats/pending-recent`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setRecentOrders(resRecent.data || [])

        let alertTriggered = false;
        let alertMessage = "";

        if (!isFirstLoadRef.current) {
          // Check for new intake bookings
          if (newCount > prevCountRef.current) {
            alertTriggered = true;
            alertMessage = "New E-Docket intake bookings have arrived.";
          }
          // Check for new online orders
          if (newPending > prevPendingRef.current) {
            alertTriggered = true;
            alertMessage = alertTriggered && alertMessage ? "New E-Dockets and Online Orders arrived." : "New Online Orders have arrived.";
          }

          // Check for new Rider Actions (Picked/Delivered)
          recentActivity.forEach(activity => {
            if (!seenActivityIdsRef.current.has(activity._id)) {
              seenActivityIdsRef.current.add(activity._id);
              alertTriggered = true;
              const riderName = activity.assignedRider?.name || "A rider";
              alertMessage = alertTriggered && alertMessage
                ? `${alertMessage} Also, ${riderName} ${activity.status} order ${activity.bookingId}.`
                : `${riderName} has ${activity.status} order ${activity.bookingId}.`;
            }
          });
        }

        // IMPORTANT: Always populate seenActivityIdsRef even on first load 
        // to prevent bulk "already happened" alerts
        recentActivity.forEach(activity => {
          if (!seenActivityIdsRef.current.has(activity._id)) {
            seenActivityIdsRef.current.add(activity._id);
          }
        });

        // Keep track of IDs to avoid memory leaks if it gets too big
        if (seenActivityIdsRef.current.size > 200) {
          const idsArray = Array.from(seenActivityIdsRef.current);
          seenActivityIdsRef.current = new Set(idsArray.slice(-100));
        }

        isFirstLoadRef.current = false;

        if (alertTriggered) {
          // Play sound
          const audio = new Audio("/notification.mp3");
          audio.loop = true;
          audio.play().catch(e => console.error("Audio play failed:", e));
          audioRef.current = audio;

          // Flash the tab title to get user attention if they are on another tab
          const originalTitle = document.title;
          let isAlertTitle = false;
          const titleInterval = setInterval(() => {
            document.title = isAlertTitle ? originalTitle : `(1) 🚨 New E-Docket!`;
            isAlertTitle = !isAlertTitle;
          }, 1000);

          // Limit the number of individual rider actions displayed to avoid "hazy" UI
          let displayMessage = alertMessage;
          if (alertMessage.split("Also,").length > 3) {
            const parts = alertMessage.split("Also,");
            displayMessage = `${parts[0]} Also, ${parts[1]} ... and more updates.`;
          }

          toast((t) => (
            <div className="flex flex-col gap-2 min-w-[250px]">
              <div className="flex items-center gap-2 font-bold text-red-600 text-lg">
                🚨 New Order Alert!
              </div>
              <p className="text-gray-800">{displayMessage}</p>
              {newCount > prevCountRef.current && <p className="text-sm font-semibold text-gray-600">Pending E-Dockets: {newCount}</p>}
              {newPending > prevPendingRef.current && <p className="text-sm font-semibold text-gray-600 mb-2">Pending Online Orders: {newPending}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    toast.dismiss(t.id);
                    if (audioRef.current) {
                      audioRef.current.pause();
                      audioRef.current = null;
                    }
                    clearInterval(titleInterval);
                    document.title = originalTitle;
                    navigate("/bookings");
                  }}
                  className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 font-medium transition-colors text-sm"
                >
                  View Orders
                </button>
                <button
                  onClick={() => {
                    toast.dismiss(t.id);
                    if (audioRef.current) {
                      audioRef.current.pause();
                      audioRef.current = null;
                    }
                    clearInterval(titleInterval);
                    document.title = originalTitle;
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors text-sm"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ), {
            duration: Infinity,
            position: 'top-center',
            style: { border: '2px solid #ef4444', padding: '16px', backgroundColor: '#fef2f2' },
          });
        }

        prevCountRef.current = newCount
        prevPendingRef.current = newPending
        setEDocketCount(newCount)
        setPendingOrdersCount(newPending)
      } catch (error) {
        // Silently fail if not logged in
      }
    }
    fetchCount()
    const interval = setInterval(fetchCount, 10000) // Reduced to 10s for faster alerts
    return () => clearInterval(interval)
  }, [])

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Booking", href: "/bookings", icon: FileText },
    { name: "E-Docket", href: "/e-docket", icon: Package, badge: eDocketCount },
    { name: "Sales Report", href: "/sales-report", icon: BarChart },
    { name: "Pincodes", href: "/pincodes", icon: MapPin },
    { name: "Coupons", href: "/coupons", icon: Ticket },
    { name: "Create Order", href: "/manual-booking", icon: Ticket },
    { name: "User Management", href: "/user-management", icon: Users },
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
