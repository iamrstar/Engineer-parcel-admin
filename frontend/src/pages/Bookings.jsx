"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import axios from "axios"
import toast from "react-hot-toast"
import { Search, Filter, Eye, FileText, Calendar } from "lucide-react"

// Helper functions for status visibility
const getTimeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (isNaN(seconds)) return "N/A";
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return Math.floor(seconds) + " seconds ago";
};

const isRecent = (date) => {
  if (!date) return false;
  const diff = new Date() - new Date(date);
  return diff < 3600000; // < 1 hour
};

const Bookings = () => {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [serviceFilter, setServiceFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [vendorNotAssigned, setVendorNotAssigned] = useState(false)
  
  // Date Filtering State
  const [dateFilter, setDateFilter] = useState("all") // all, today, last7, last30, custom
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")

  useEffect(() => {
    fetchBookings()
  }, [currentPage, statusFilter, serviceFilter, searchTerm, vendorNotAssigned, dateFilter, customStartDate, customEndDate])

  const fetchBookings = async () => {
    try {
      setLoading(true)

      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/bookings`, {
        params: {
          page: currentPage,
          limit: 10,
          status: statusFilter,
          serviceType: serviceFilter,
          search: searchTerm,
          vendorNotAssigned: vendorNotAssigned,
          startDate: getEffectiveStartDate(),
          endDate: getEffectiveEndDate(),
        },
      })

      setBookings(response.data.bookings)
      setTotalPages(response.data.totalPages)
    } catch (error) {
      toast.error("Error fetching bookings")
      console.error("Error fetching bookings:", error)
    } finally {
      setLoading(false)
    }
  }

  // Helper to calculate effective dates for API
  const getEffectiveStartDate = () => {
    if (dateFilter === "all") return ""
    if (dateFilter === "custom") return customStartDate

    const now = new Date()
    if (dateFilter === "today") {
      return now.toISOString().split('T')[0]
    }
    if (dateFilter === "last7") {
      const d = new Date()
      d.setDate(d.getDate() - 7)
      return d.toISOString().split('T')[0]
    }
    if (dateFilter === "last30") {
      const d = new Date()
      d.setDate(d.getDate() - 30)
      return d.toISOString().split('T')[0]
    }
    return ""
  }

  const getEffectiveEndDate = () => {
    if (dateFilter === "all") return ""
    if (dateFilter === "custom") return customEndDate
    return new Date().toISOString().split('T')[0]
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-blue-100 text-blue-800",
      picked: "bg-purple-100 text-purple-800",
      "in-transit": "bg-indigo-100 text-indigo-800",
      "out-for-delivery": "bg-orange-100 text-orange-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    }
    return colors[status] || "bg-gray-100 text-gray-800"
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchBookings()
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Bookings Management</h1>
        <p className="text-gray-600">Manage all courier bookings</p>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </form>
          
          <div className="flex flex-wrap gap-2">
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Services</option>
              <option value="campus-parcel">Campus Parcel</option>
              <option value="courier">Courier</option>
              <option value="shifting">Shifting</option>
              <option value="express">Express</option>
              <option value="premium">Premium</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="picked">Picked</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <div className="flex items-center gap-2 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100">
              <input
                type="checkbox"
                id="vendorFilter"
                checked={vendorNotAssigned}
                onChange={(e) => setVendorNotAssigned(e.target.checked)}
                className="w-4 h-4 text-primary-600"
              />
              <label htmlFor="vendorFilter" className="text-sm font-medium text-amber-800 whitespace-nowrap">No Vendor</label>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 font-medium text-gray-500">
            <Calendar className="h-4 w-4" />
            <span className="text-sm">Date Filter:</span>
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm ml-1"
            >
              <option value="all">Anytime</option>
              <option value="today">Today</option>
              <option value="last7">Last Week</option>
              <option value="last30">Last Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {dateFilter === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          )}
        </div>
      </div>

      {/* Bookings Table Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sender</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receiver</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Track ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bookings.map((booking) => (
                    <tr key={booking._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{booking.bookingId}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {booking.edl > 0 && (
                            <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">
                              EDL {booking.edl}
                            </span>
                          )}
                          {booking.km > 0 && (
                            <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                              {booking.km} KM
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">{booking.senderDetails?.name}</div>
                        <div className="text-xs text-gray-500">{booking.senderDetails?.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">{booking.receiverDetails?.name}</div>
                        <div className="text-xs text-gray-500">{booking.receiverDetails?.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-800 capitalize">{booking.serviceType}</div>
                        <div className="text-[10px] text-gray-400 font-medium">Source: {booking.bookingSource || 'web'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap overflow-visible">
                        <div className="flex items-center space-x-1.5 group relative">
                          <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${getStatusColor(booking.status)}`}>
                            {booking.status}
                          </span>
                          {isRecent(booking.updatedAt) && (
                            <span className="flex h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                          )}
                          <div className="absolute hidden group-hover:block z-20 p-2 bg-gray-900 text-white rounded text-[10px] -top-12 left-0 w-32 shadow-xl border border-gray-800">
                            Updated: {getTimeAgo(booking.updatedAt)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        ₹{booking.pricing?.totalAmount || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {booking.vendorName || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-mono">
                        {booking.vendorTrackingId || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                        {new Date(booking.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex items-center justify-center space-x-2">
                          <Link to={`/bookings/${booking._id}`} className="p-1 px-2.5 text-primary-600 hover:bg-primary-50 rounded-lg flex items-center gap-1.5 border border-primary-100">
                            <Eye className="h-4 w-4" />
                            <span className="text-xs font-bold">VIEW</span>
                          </Link>
                          {(booking.trackingId || booking.bookingId) && (
                            <button
                              onClick={async () => {
                                try {
                                  const t = localStorage.getItem("adminToken") || localStorage.getItem("token")
                                  const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/bookings/${booking._id}/receipt`, {
                                    headers: { Authorization: `Bearer ${t}` },
                                    responseType: "blob"
                                  })
                                  const url = window.URL.createObjectURL(new Blob([response.data]))
                                  const link = document.createElement("a")
                                  link.href = url
                                  link.setAttribute("download", `Receipt_${booking.bookingId}.pdf`)
                                  document.body.appendChild(link)
                                  link.click()
                                  link.remove()
                                  toast.success("Receipt downloaded")
                                } catch (error) {
                                  toast.error("Receipt failed")
                                }
                              }}
                              className="p-1 px-2.5 text-red-500 hover:bg-red-50 rounded-lg flex items-center gap-1.5 border border-red-100 transition-colors"
                              title="Download PDF"
                            >
                              <FileText className="h-4 w-4" />
                              <span className="text-xs font-bold uppercase">PDF</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {bookings.length === 0 && (
                    <tr>
                      <td colSpan="10" className="px-6 py-10 text-center text-gray-500 italic">No bookings found matching your filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900 px-3 py-1 bg-white border border-gray-200 rounded-lg">
                    Page {currentPage} of {totalPages}
                  </span>
                </div>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Bookings
