"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import axios from "axios"
import toast from "react-hot-toast"
import { Search, Filter, Eye, FileText } from "lucide-react"

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

  useEffect(() => {
    fetchBookings()
  }, [currentPage, statusFilter, serviceFilter, searchTerm, vendorNotAssigned])

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

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search by booking ID, name, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </form>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Services</option>
              <option value="campus-parcel">Campus Parcel</option>
              <option value="courier">Courier</option>
              <option value="shifting">Shifting</option>
              <option value="express">Express</option>
              <option value="premium">Premium</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="picked">Picked</option>
              <option value="in-transit">In Transit</option>
              <option value="out-for-delivery">Out for Delivery</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="flex items-center gap-2 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100">
            <input
              type="checkbox"
              id="vendorFilter"
              checked={vendorNotAssigned}
              onChange={(e) => setVendorNotAssigned(e.target.checked)}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="vendorFilter" className="text-sm font-medium text-amber-800 cursor-pointer whitespace-nowrap">
              No Vendor
            </label>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Booking ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sender
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Receiver
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Service
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vendor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Track ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Booking Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Receipt
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bookings.map((booking) => (
                    <tr key={booking._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {booking.bookingId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{booking.senderDetails.name}</div>
                        <div className="text-sm text-gray-500">{booking.senderDetails.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{booking.receiverDetails.name}</div>
                        <div className="text-sm text-gray-500">{booking.receiverDetails.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900 capitalize">{booking.serviceType}</div>
                        <div className="text-[10px] text-gray-400 font-medium">Source: {booking.bookingSource || 'web'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap overflow-visible">
                        <div className="flex flex-col group relative">
                          <div className="flex items-center space-x-1.5">
                            <span
                              className={`inline-flex px-2 py-0.5 text-[10px] font-bold uppercase rounded-full cursor-help shadow-sm border ${getStatusColor(booking.status)}`}
                            >
                              {booking.status}
                            </span>
                            {isRecent(booking.updatedAt) && (
                              <span className="flex h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" title="Updated Recently"></span>
                            )}
                          </div>

                          {booking.currentLocation && booking.currentLocation !== "Pending" && (
                            <div className="text-[10px] text-gray-400 mt-0.5 font-medium truncate max-w-[100px]">
                              {booking.currentLocation}
                            </div>
                          )}

                          <div className="hidden group-hover:block absolute z-20 p-2.5 bg-gray-900 text-white rounded-lg shadow-2xl text-[11px] -top-14 left-0 w-48 border border-gray-700 pointer-events-none">
                            <div className="flex justify-between items-center mb-1 border-b border-gray-700 pb-1">
                              <span className="font-bold text-blue-400">Activity Report</span>
                              {isRecent(booking.updatedAt) && <span className="text-[9px] bg-blue-600 px-1 rounded text-white font-bold">NEW</span>}
                            </div>
                            <div className="space-y-1">
                              <div><span className="text-gray-400">Location:</span> <span className="font-medium text-gray-200">{booking.currentLocation || 'Hub'}</span></div>
                              <div><span className="text-gray-400">Updated:</span> <span className="font-medium text-gray-200">{getTimeAgo(booking.updatedAt)}</span></div>
                              <div className="text-gray-500 text-[9px] pt-0.5 italic text-right">{new Date(booking.updatedAt).toLocaleString()}</div>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{booking.pricing?.totalAmount || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                        {booking.vendorName || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono text-xs">
                        {booking.vendorTrackingId || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(booking.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Link to={`/bookings/${booking._id}`} className="text-primary-600 hover:text-primary-900" title="View Details">
                            <Eye className="h-4 w-4" />
                          </Link>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {(booking.trackingId || booking.bookingId) ? (
                          <button
                            onClick={async () => {
                              try {
                                const t = localStorage.getItem("adminToken") || localStorage.getItem("token")
                                const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/bookings/${booking._id}/receipt`, {
                                  headers: { Authorization: `Bearer ${t}` },
                                  responseType: 'blob'
                                })

                                const url = window.URL.createObjectURL(new Blob([response.data]))
                                const link = document.createElement('a')
                                link.href = url
                                link.setAttribute('download', `Receipt_${booking.bookingId || booking.trackingId}.pdf`)
                                document.body.appendChild(link)
                                link.click()
                                link.remove()
                                toast.success("Receipt downloaded successfully")
                              } catch (error) {
                                console.error("Download error:", error)
                                toast.error("Failed to download receipt")
                              }
                            }}
                            className="text-red-600 hover:text-red-900 flex items-center gap-1 bg-red-50 px-2 py-1 rounded"
                            title="Download Receipt"
                          >
                            <FileText className="h-4 w-4" />
                            <span className="text-xs">PDF</span>
                          </button>
                        ) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Page <span className="font-medium">{currentPage}</span> of{" "}
                      <span className="font-medium">{totalPages}</span>
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Bookings
