"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { Package, Clock, CheckCircle, Truck, DollarSign } from "lucide-react"

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalBookings: 0,
    pendingBookings: 0,
    deliveredBookings: 0,
    inTransitBookings: 0,
    totalRevenue: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

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
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-600">Welcome to EngineersParcel Admin Dashboard</p>
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
            <a
              href="/bookings"
              className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <Package className="h-5 w-5 text-primary-500 mr-3" />
                <span className="font-medium">Manage Bookings</span>
              </div>
            </a>
            <a
              href="/pincodes"
              className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <Package className="h-5 w-5 text-primary-500 mr-3" />
                <span className="font-medium">Manage Pincodes</span>
              </div>
            </a>
            <a
              href="/coupons"
              className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <Package className="h-5 w-5 text-primary-500 mr-3" />
                <span className="font-medium">Manage Coupons</span>
              </div>
            </a>
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
