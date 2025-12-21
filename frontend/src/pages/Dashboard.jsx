"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { Package, Clock, CheckCircle, Truck, DollarSign, Bell, X } from "lucide-react"
import { Link } from "react-router-dom"

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalBookings: 0,
    pendingBookings: 0,
    deliveredBookings: 0,
    inTransitBookings: 0,
    totalRevenue: 0,
  })
  const [loading, setLoading] = useState(true)
  const [showNotifications, setShowNotifications] = useState(false)
  const [pendingOrders, setPendingOrders] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(false)

  useEffect(() => {
    fetchStats()
  }, [])

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
      console.log("Pending orders fetched:", orders.length)
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

  const statCards = [
    {
      name: "Total Bookings",
      value: stats.totalBookings,
      icon: Package,
      color: "bg-blue-500",
    },
    {
      name: "Pending Orders",
      value: stats.pendingBookings,
      icon: Clock,
      color: "bg-yellow-500",
    },
    {
      name: "In Transit",
      value: stats.inTransitBookings,
      icon: Truck,
      color: "bg-purple-500",
    },
    {
      name: "Delivered",
      value: stats.deliveredBookings,
      icon: CheckCircle,
      color: "bg-green-500",
    },
    {
      name: "Total Revenue",
      value: `₹${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: "bg-primary-500",
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-600">Welcome to EngineersParcel Admin Dashboard</p>
        </div>
        
        {/* Notification Bell Icon */}
        <div className="relative notification-wrapper">
          <button
            onClick={handleNotificationClick}
            className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-lg transition-colors"
          >
            <Bell className="h-6 w-6" />
            {stats.pendingBookings > 0 && (
              <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full min-w-[20px]">
                {stats.pendingBookings}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[500px] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900">New Orders / Online Orders</h3>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1">
                {loadingOrders ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                  </div>
                ) : pendingOrders.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p className="font-medium">No pending orders</p>
                    <p className="text-sm mt-1">All orders are up to date!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {pendingOrders.map((order) => (
                      <Link
                        key={order._id}
                        to={`/bookings/${order._id}`}
                        onClick={() => setShowNotifications(false)}
                        className="block p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold text-gray-900">
                                {order.bookingId}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 capitalize">
                                {order.status}
                              </span>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">From:</span> {order.senderDetails?.name || "N/A"}
                              </p>
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">To:</span> {order.receiverDetails?.name || "N/A"}
                              </p>
                              <p className="text-sm text-gray-500">
                                <span className="font-medium">Service:</span> <span className="capitalize">{order.serviceType || "N/A"}</span>
                              </p>
                            </div>
                            <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                              <span className="font-medium">₹{order.pricing?.totalAmount || 0}</span>
                              <span>•</span>
                              <span>{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {pendingOrders.length > 0 && (
                <div className="p-3 border-t border-gray-200 bg-gray-50">
                  <Link
                    to="/bookings?status=pending"
                    onClick={() => setShowNotifications(false)}
                    className="block w-full text-center py-2 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded transition-colors"
                  >
                    View All Pending Orders →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mb-8">
        {statCards.map((stat) => (
          <div key={stat.name} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className={`${stat.color} rounded-lg p-3`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link
              to="/bookings"
              className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <Package className="h-5 w-5 text-primary-500 mr-3" />
                <span className="font-medium">Manage Bookings</span>
              </div>
            </Link>

            <Link
              to="/pincodes"
              className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <Package className="h-5 w-5 text-primary-500 mr-3" />
                <span className="font-medium">Manage Pincodes</span>
              </div>
            </Link>

            <Link
              to="/coupons"
              className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <Package className="h-5 w-5 text-primary-500 mr-3" />
                <span className="font-medium">Manage Coupons</span>
              </div>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">System Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Database</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Connected
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">API Status</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Active
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Last Updated</span>
              <span className="text-sm text-gray-900">{new Date().toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
