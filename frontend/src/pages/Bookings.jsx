"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import axios from "axios"
import toast from "react-hot-toast"
import { Search, Filter, Eye, FileText, Calendar, XCircle, Tag } from "lucide-react"

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

  // PDF Selection State
  const [pdfModalOpen, setPdfModalOpen] = useState(false)
  const [pdfBooking, setPdfBooking] = useState(null)
  const [pdfOptions, setPdfOptions] = useState({
    receipt: true,
    label: true,
    declaration: true
  })

  // Reschedule State
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false)
  const [reschedulingBooking, setReschedulingBooking] = useState(null)
  const [rescheduleData, setRescheduleData] = useState({
    type: "pickup",
    date: "",
    slot: "Anytime",
    source: "customer"
  })
  const [rescheduleLoading, setRescheduleLoading] = useState(false)
  
  // Cancellation State
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancelBooking, setCancelBooking] = useState(null)
  const [cancelReason, setCancelReason] = useState("")
  const [cancelSource, setCancelSource] = useState("admin")
  const [cancelling, setCancelling] = useState(false)

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
              <option value="surface">Surface</option>
              <option value="air">Air</option>
              <option value="international">International</option>
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
              <option value="in-transit">In-Transit</option>
              <option value="out-for-delivery">Out for Delivery</option>
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
                              onClick={() => {
                                setPdfBooking(booking);
                                setPdfOptions({
                                  receipt: true,
                                  label: true,
                                  declaration: true
                                });
                                setPdfModalOpen(true);
                              }}
                              className="p-1 px-2.5 text-red-500 hover:bg-red-50 rounded-lg flex items-center gap-1.5 border border-red-100 transition-colors"
                              title="Print Records"
                            >
                              <FileText className="h-4 w-4" />
                              <span className="text-xs font-bold uppercase">PDF</span>
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              try {
                                const t = localStorage.getItem("adminToken") || localStorage.getItem("token")
                                const response = await axios.get(
                                  `${import.meta.env.VITE_API_URL}/api/bookings/${booking._id}/office-label`,
                                  {
                                    headers: { Authorization: `Bearer ${t}` },
                                    responseType: "blob"
                                  }
                                );
                                const url = window.URL.createObjectURL(new Blob([response.data]));
                                const link = document.createElement("a");
                                link.href = url;
                                link.setAttribute("download", `Office_Label_${booking.bookingId}.pdf`);
                                document.body.appendChild(link);
                                link.click();
                                link.remove();
                                toast.success("Office label downloaded");
                              } catch (error) {
                                toast.error("Failed to download office label");
                              }
                            }}
                            className="p-1 px-2.5 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-1.5 border border-blue-100 transition-colors"
                            title="Office Label"
                          >
                            <Tag className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase">OFFICE</span>
                          </button>
                          {booking.status !== 'cancelled' && (
                            <button
                              onClick={() => {
                                setCancelBooking(booking);
                                setCancelReason("");
                                setCancelModalOpen(true);
                              }}
                              className="p-1 px-2.5 text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1.5 border border-red-100 transition-colors"
                              title="Cancel Order"
                            >
                              <XCircle className="h-4 w-4" />
                              <span className="text-xs font-bold uppercase">CANCEL</span>
                            </button>
                          )}
                          {booking.serviceType?.toLowerCase() === "campus-parcel" && (
                            <button
                              onClick={() => {
                                setReschedulingBooking(booking);
                                setRescheduleData({
                                  type: "pickup",
                                  date: new Date().toISOString().split('T')[0],
                                  slot: "Anytime",
                                  source: "customer"
                                });
                                setRescheduleModalOpen(true);
                              }}
                              className="p-1 px-2.5 text-orange-600 hover:bg-orange-50 rounded-lg flex items-center gap-1.5 border border-orange-100 transition-colors"
                              title="Reschedule Pickup/Delivery"
                            >
                              <Calendar className="h-4 w-4" />
                              <span className="text-xs font-bold uppercase">Reschedule</span>
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
      {/* PDF Options Modal */}
      {pdfModalOpen && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={() => setPdfModalOpen(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full border border-gray-100">
              <div className="bg-white px-6 pt-6 pb-4 sm:p-8 sm:pb-6">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <FileText className="h-6 w-6 text-red-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-xl leading-6 font-bold text-gray-900">
                      Print Options
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Select which documents you want to include in the generated PDF for <span className="font-mono font-bold text-gray-700">{pdfBooking?.bookingId}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <label className="flex items-center p-3 bg-white rounded-lg border border-gray-200 hover:border-red-300 transition-colors cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={pdfOptions.receipt}
                      onChange={(e) => setPdfOptions({ ...pdfOptions, receipt: e.target.checked })}
                      className="h-5 w-5 text-red-600 border-gray-300 rounded focus:ring-red-500 cursor-pointer"
                    />
                    <div className="ml-3">
                      <span className="block text-sm font-bold text-gray-900 group-hover:text-red-700">Booking Receipt</span>
                      <span className="block text-xs text-gray-500">Official proof of booking and charges</span>
                    </div>
                  </label>

                  <label className="flex items-center p-3 bg-white rounded-lg border border-gray-200 hover:border-red-300 transition-colors cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={pdfOptions.label}
                      onChange={(e) => setPdfOptions({ ...pdfOptions, label: e.target.checked })}
                      className="h-5 w-5 text-red-600 border-gray-300 rounded focus:ring-red-500 cursor-pointer"
                    />
                    <div className="ml-3">
                      <span className="block text-sm font-bold text-gray-900 group-hover:text-red-700">Shipping Label (A6)</span>
                      <span className="block text-xs text-gray-500">Compact label with QR code for the box</span>
                    </div>
                  </label>

                  <label className="flex items-center p-3 bg-white rounded-lg border border-gray-200 hover:border-red-300 transition-colors cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={pdfOptions.declaration}
                      onChange={(e) => setPdfOptions({ ...pdfOptions, declaration: e.target.checked })}
                      className="h-5 w-5 text-red-600 border-gray-300 rounded focus:ring-red-500 cursor-pointer"
                    />
                    <div className="ml-3">
                      <span className="block text-sm font-bold text-gray-900 group-hover:text-red-700">Self-Declaration Form</span>
                      <span className="block text-xs text-gray-500">Legal declaration signed by sender</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="bg-gray-50 px-6 py-4 sm:px-8 sm:flex sm:flex-row-reverse gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    if (!pdfOptions.receipt && !pdfOptions.label && !pdfOptions.declaration) {
                      toast.error("Please select at least one document");
                      return;
                    }
                    try {
                      const t = localStorage.getItem("adminToken") || localStorage.getItem("token")
                      const response = await axios.get(
                        `${import.meta.env.VITE_API_URL}/api/bookings/${pdfBooking?._id}/receipt?receipt=${pdfOptions.receipt}&label=${pdfOptions.label}&declaration=${pdfOptions.declaration}`,
                        {
                          headers: { Authorization: `Bearer ${t}` },
                          responseType: "blob"
                        }
                      );
                      const url = window.URL.createObjectURL(new Blob([response.data]));
                      const link = document.createElement("a");
                      link.href = url;
                      link.setAttribute("download", `Booking_${pdfBooking?.bookingId}.pdf`);
                      document.body.appendChild(link);
                      link.click();
                      link.remove();
                      setPdfModalOpen(false);
                      toast.success("PDF generated successfully");
                    } catch (error) {
                      toast.error("Failed to generate PDF");
                    }
                  }}
                  className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-bold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm transition-all hover:scale-105"
                >
                  Download PDF
                </button>
                <button
                  type="button"
                  onClick={() => setPdfModalOpen(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Campus Modal */}
      {rescheduleModalOpen && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={() => setRescheduleModalOpen(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full border border-gray-100">
              <div className="bg-white px-6 pt-6 pb-4 sm:p-8 sm:pb-6">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 sm:mx-0 sm:h-10 sm:w-10">
                    <Calendar className="h-6 w-6 text-orange-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-xl leading-6 font-bold text-gray-900">
                      Reschedule Campus Parcel
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Update the pickup or delivery schedule for <span className="font-mono font-bold text-gray-700">{reschedulingBooking?.bookingId}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-5 bg-gray-50 p-5 rounded-xl border border-gray-200">
                  {/* Reschedule Type Selection */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Reschedule For:</label>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setRescheduleData({ ...rescheduleData, type: "pickup" })}
                          className={`p-2.5 rounded-lg border text-sm font-bold transition-all ${rescheduleData.type === 'pickup' ? 'bg-orange-600 border-orange-600 text-white shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:border-orange-300'}`}
                        >
                          Box Pickup
                        </button>
                        <button
                          onClick={() => setRescheduleData({ ...rescheduleData, type: "delivery" })}
                          className={`p-2.5 rounded-lg border text-sm font-bold transition-all ${rescheduleData.type === 'delivery' ? 'bg-orange-600 border-orange-600 text-white shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:border-orange-300'}`}
                        >
                          Box Delivery
                        </button>
                    </div>
                  </div>

                  {/* Reschedule Source Selection */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Reschedule Initiated By:</label>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setRescheduleData({ ...rescheduleData, source: "admin" })}
                          className={`p-3 rounded-lg border text-xs font-bold transition-all flex flex-col items-center gap-1.5 ${rescheduleData.source === 'admin' ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'}`}
                        >
                          <span className="text-center italic opacity-80 font-normal underline">Option 1</span>
                          <span>Admin/Company</span>
                        </button>
                        <button
                          onClick={() => setRescheduleData({ ...rescheduleData, source: "customer" })}
                          className={`p-3 rounded-lg border text-xs font-bold transition-all flex flex-col items-center gap-1.5 ${rescheduleData.source === 'customer' ? 'bg-green-600 border-green-600 text-white shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:border-green-300'}`}
                        >
                          <span className="text-center italic opacity-80 font-normal underline">Option 2</span>
                          <span>Customer Side</span>
                        </button>
                    </div>
                    <p className="mt-2 text-[10px] text-gray-400 italic leading-tight">
                      * Selecting a source will trigger a personalized email notification to the customer.
                    </p>
                  </div>

                  {/* Current Schedule Info */}
                  <div className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Current Schedule Reference</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-sm font-bold text-gray-800">
                          {rescheduleData.type === 'pickup' 
                            ? (reschedulingBooking?.pickupDate ? new Date(reschedulingBooking.pickupDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not set')
                            : (reschedulingBooking?.boxDeliveryDate ? new Date(reschedulingBooking.boxDeliveryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not set')}
                        </p>
                        <p className="text-[10px] text-gray-500 font-medium">
                          Slot: {rescheduleData.type === 'pickup' ? reschedulingBooking?.pickupSlot : (reschedulingBooking?.boxDeliverySlot || 'No slot selected')}
                        </p>
                      </div>
                      <div className="bg-blue-50 px-2 py-0.5 rounded text-[9px] font-bold text-blue-600 border border-blue-100 uppercase">
                        Live
                      </div>
                    </div>
                  </div>

                  {/* New Date */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Select New Date:</label>
                    <input
                      type="date"
                      value={rescheduleData.date}
                      onChange={(e) => setRescheduleData({ ...rescheduleData, date: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-medium"
                    />
                  </div>

                  {/* Slot Selection */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Select Time Slot:</label>
                    <select
                      value={rescheduleData.slot}
                      onChange={(e) => setRescheduleData({ ...rescheduleData, slot: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-medium"
                    >
                      <option value="10:00 AM - 01:00 PM">10:00 AM - 01:00 PM</option>
                      <option value="02:00 PM - 05:00 PM">02:00 PM - 05:00 PM</option>
                      <option value="Anytime">Anytime</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-6 py-4 sm:px-8 sm:flex sm:flex-row-reverse gap-3">
                <button
                  type="button"
                  disabled={rescheduleLoading || !rescheduleData.date}
                  onClick={async () => {
                    try {
                      setRescheduleLoading(true)
                      const t = localStorage.getItem("adminToken") || localStorage.getItem("token")
                      await axios.put(
                        `${import.meta.env.VITE_API_URL}/api/bookings/${reschedulingBooking?._id}/reschedule-campus`,
                        {
                          rescheduleType: rescheduleData.type,
                          newDate: rescheduleData.date,
                          newSlot: rescheduleData.slot,
                          source: rescheduleData.source
                        },
                        { headers: { Authorization: `Bearer ${t}` } }
                      )
                      toast.success(`Rescheduled ${rescheduleData.type === 'pickup' ? 'Pickup' : 'Delivery'} successfully`)
                      setRescheduleModalOpen(false)
                      fetchBookings()
                    } catch (error) {
                      toast.error("Reschedule failed")
                      console.error(error)
                    } finally {
                      setRescheduleLoading(false)
                    }
                  }}
                  className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-6 py-2.5 bg-orange-600 text-base font-bold text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:ml-3 sm:w-auto sm:text-sm transition-all active:scale-95 disabled:opacity-50"
                >
                  {rescheduleLoading ? 'Updating...' : 'Update Schedule'}
                </button>
                <button
                  type="button"
                  onClick={() => setRescheduleModalOpen(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2.5 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={() => setCancelModalOpen(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full border border-gray-100">
              <div className="bg-white px-6 pt-6 pb-4 sm:p-8 sm:pb-6">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <XCircle className="h-6 w-6 text-red-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-xl leading-6 font-bold text-gray-900">
                      Cancel Booking
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Cancel booking <span className="font-mono font-bold text-gray-700">{cancelBooking?.bookingId}</span>?
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Initiated By:</label>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setCancelSource("admin")}
                          className={`p-2.5 rounded-lg border text-sm font-bold transition-all ${cancelSource === 'admin' ? 'bg-red-600 border-red-600 text-white shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:border-red-300'}`}
                        >
                          Admin
                        </button>
                        <button
                          onClick={() => setCancelSource("customer")}
                          className={`p-2.5 rounded-lg border text-sm font-bold transition-all ${cancelSource === 'customer' ? 'bg-red-600 border-red-600 text-white shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:border-red-300'}`}
                        >
                          Customer
                        </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Reason:</label>
                    <select
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="">Select reason...</option>
                      <option value="Customer requested cancellation">Customer requested cancellation</option>
                      <option value="Incorrect address provided">Incorrect details</option>
                      <option value="Duplicate booking">Duplicate booking</option>
                      <option value="Operational issue">Operational issue</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse gap-3">
                <button
                  type="button"
                  disabled={cancelling || !cancelReason}
                  onClick={async () => {
                    try {
                      setCancelling(true)
                      const t = localStorage.getItem("adminToken") || localStorage.getItem("token")
                      await axios.put(
                        `${import.meta.env.VITE_API_URL}/api/bookings/${cancelBooking?._id}/cancel`,
                        { reason: cancelReason, initiatedBy: cancelSource },
                        { headers: { Authorization: `Bearer ${t}` } }
                      )
                      toast.success("Booking cancelled successfully")
                      setCancelModalOpen(false)
                      fetchBookings()
                    } catch (error) {
                      toast.error("Failed to cancel booking")
                    } finally {
                      setCancelling(false)
                    }
                  }}
                  className="w-full px-6 py-2.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-all active:scale-95 disabled:opacity-50"
                >
                  {cancelling ? 'Processing...' : 'Confirm'}
                </button>
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2.5 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Bookings
