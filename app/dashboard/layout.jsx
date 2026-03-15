"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import axios from "axios"
import toast from "react-hot-toast"
import { LayoutDashboard, FileText, MapPin, Ticket, LogOut, Menu, X } from "lucide-react"

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [bookingCount, setBookingCount] = useState(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const [audioContextRestarted, setAudioContextRestarted] = useState(false)

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Bookings", href: "/dashboard/bookings", icon: FileText },
    { name: "Pincodes", href: "/dashboard/pincodes", icon: MapPin },
    { name: "Coupons", href: "/dashboard/coupons", icon: Ticket },
  ]

  // Audio for notifications
  const playNotificationSound = () => {
    if (!soundEnabled) return;
    try {
      const audio = new Audio("https://cdn.pixabay.com/audio/2022/10/16/audio_297743d8a2.mp3");
      audio.play().catch(e => {
        console.log("Audio play blocked until user interaction");
        setAudioContextRestarted(false);
      });
    } catch (error) {
      console.error("Failed to play notification sound", error);
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("adminToken")
    if (!token) {
      router.push("/")
    } else {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`
      setLoading(false)
    }
  }, [router])

  // Polling for new bookings
  useEffect(() => {
    if (loading) return;

    const checkNewBookings = async () => {
      try {
        const response = await axios.get("/api/bookings?limit=1");
        const total = response.data.total;

        if (bookingCount !== null && total > bookingCount) {
          toast.success("New Booking Received!", {
            duration: 5000,
            icon: "📦",
            style: {
              borderRadius: '10px',
              background: '#333',
              color: '#fff',
            },
          });
          playNotificationSound();
        }

        setBookingCount(total);
      } catch (error) {
        console.error("Error polling for bookings:", error);
      }
    };

    // Initial check
    checkNewBookings();

    // Set interval for every 30 seconds
    const interval = setInterval(checkNewBookings, 30000);
    return () => clearInterval(interval);
  }, [loading, bookingCount]);

  const handleLogout = () => {
    localStorage.removeItem("adminToken")
    delete axios.defaults.headers.common["Authorization"]
    router.push("/")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? "block" : "hidden"}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-4 border-b">
            <div className="flex items-center">
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo-pNHAlhFVOWz5wVJz4e8AffReVdBKwG.png"
                alt="EngineersParcel"
                className="h-8 w-auto"
              />
            </div>
            <button onClick={() => setSidebarOpen(false)}>
              <X className="h-6 w-6 text-gray-500" />
            </button>
          </div>
          <nav className="flex-1 px-4 py-4 space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? "bg-primary-100 text-primary-700" : "text-gray-700 hover:bg-gray-100"
                    }`}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.name}
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
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo-pNHAlhFVOWz5wVJz4e8AffReVdBKwG.png"
              alt="EngineersParcel"
              className="h-8 w-auto"
            />
          </div>
          <nav className="flex-1 px-4 py-4 space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? "bg-primary-100 text-primary-700" : "text-gray-700 hover:bg-gray-100"
                    }`}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.name}
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
          <div className="flex flex-1 items-center justify-between gap-x-4 self-stretch lg:gap-x-6">
            <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>

            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setSoundEnabled(!soundEnabled);
                  if (!soundEnabled) {
                    playNotificationSound(); // Test sound and trigger interaction
                  }
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${soundEnabled
                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
              >
                {soundEnabled ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                    Sound On
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
                    Sound Off
                  </>
                )}
              </button>
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
