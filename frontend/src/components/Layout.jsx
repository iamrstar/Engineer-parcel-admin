"use client"

import { useState, useEffect } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { Package, LayoutDashboard, FileText, MapPin, Ticket, LogOut, Menu, X, PieChart } from "lucide-react"
import axios from "axios"

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [docketCount, setDocketCount] = useState(0)
  const { logout, token } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const fetchDocketCount = async () => {
      try {
        const currentToken = token || localStorage.getItem("adminToken") || localStorage.getItem("token")
        if (!currentToken) return;

        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/bookings/edocket-count`, {
          headers: { Authorization: `Bearer ${currentToken}` }
        })
        if (res.data && typeof res.data.count === 'number') {
          setDocketCount(res.data.count)
        }
      } catch (error) {
        console.error("Failed to fetch docket count", error)
      }
    }

    fetchDocketCount()
    const interval = setInterval(fetchDocketCount, 30000)
    return () => clearInterval(interval)
  }, [token])

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Booking", href: "/bookings", icon: FileText },
    { name: "E-Docket", href: "/e-docket", icon: Ticket },
    { name: "Pincodes", href: "/pincodes", icon: MapPin },
    { name: "Coupons", href: "/coupons", icon: Ticket },
    { name: "Create Order", href: "/manual-booking", icon: Ticket },
    { name: "Sales Report", href: "/sales-report", icon: PieChart },
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

              const linkContent = (
                <div className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors justify-between w-full ${isActive ? "bg-primary-100 text-primary-700" : "text-gray-700 hover:bg-gray-100"}`}>
                  <div className="flex items-center">
                    <item.icon className="h-5 w-5 mr-3" />
                    {item.name}
                  </div>
                  {item.name === "E-Docket" && docketCount > 0 && (
                    <span className="flex items-center justify-center bg-red-500 text-white text-[10px] font-bold h-5 min-w-[20px] px-1.5 rounded-full animate-pulse">
                      {docketCount}
                    </span>
                  )}
                </div>
              )

              if (item.external) {
                return (
                  <form
                    key={item.name}
                    method="POST"
                    action={`${item.href}/api/auth/callback/credentials`}
                    target="_blank"
                    className="w-full"
                  >
                    <input type="hidden" name="username" value="admin" />
                    <input type="hidden" name="password" value="admin123" />
                    <input type="hidden" name="redirect" value="true" />
                    <input type="hidden" name="callbackUrl" value={`${item.href}/admin`} />

                    <button type="submit" onClick={() => setSidebarOpen(false)} className="w-full text-left">
                      {linkContent}
                    </button>
                  </form>
                )
              }

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                >
                  {linkContent}
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

              const linkContent = (
                <div className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors justify-between w-full ${isActive ? "bg-primary-100 text-primary-700" : "text-gray-700 hover:bg-gray-100"}`}>
                  <div className="flex items-center">
                    <item.icon className="h-5 w-5 mr-3" />
                    {item.name}
                  </div>
                  {item.name === "E-Docket" && docketCount > 0 && (
                    <span className="flex items-center justify-center bg-red-500 text-white text-[10px] font-bold h-5 min-w-[20px] px-1.5 rounded-full animate-pulse">
                      {docketCount}
                    </span>
                  )}
                </div>
              )

              if (item.external) {
                return (
                  <form
                    key={item.name}
                    method="POST"
                    action={`${item.href}/api/auth/callback/credentials`}
                    target="_blank"
                    className="w-full"
                  >
                    <input type="hidden" name="username" value="admin" />
                    <input type="hidden" name="password" value="admin123" />
                    <input type="hidden" name="redirect" value="true" />
                    <input type="hidden" name="callbackUrl" value={`${item.href}/admin`} />

                    <button type="submit" className="w-full text-left">
                      {linkContent}
                    </button>
                  </form>
                )
              }

              return (
                <Link
                  key={item.name}
                  to={item.href}
                >
                  {linkContent}
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
