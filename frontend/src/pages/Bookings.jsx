"use client"

import { useState, useEffect } from "react"
import { Link, useSearchParams } from "react-router-dom"
import axios from "axios"
import toast from "react-hot-toast"
import { Search, Filter, Eye, FileText, Calendar, XCircle, Tag, RotateCcw, FileDown, CheckCircle2, UserPlus, Trash2, Plus, ArrowRight } from "lucide-react"
import * as XLSX from "xlsx"

// Helper functions for status visibility
const PRESET_NOTES = [
  "Shipment received at hub",
  "In-transit to next facility",
  "Out for delivery",
  "Package scanned at local facility",
  "Shipment delayed due to operational issues",
  "Ready for pickup",
  "Delivered successfully",
  "Address not found / Mobile switched off"
]

const getTimeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (isNaN(seconds)) return "N/A";
  if (seconds < 0) return "Just now";
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

const TrackingHistoryTooltip = ({ booking }) => {
  const lastTrack = booking.trackingHistory && booking.trackingHistory.length > 0
    ? booking.trackingHistory[booking.trackingHistory.length - 1]
    : null;

  return (
    <div className="absolute hidden group-hover:flex flex-col gap-1.5 z-30 w-64 p-3 bg-slate-900/95 backdrop-blur-md text-white rounded-xl shadow-2xl border border-slate-700/80 right-full mr-3 top-1/2 -translate-y-1/2 transition-all duration-200 ease-out origin-right scale-95 group-hover:scale-100 pointer-events-none">
      {/* Tooltip arrow */}
      <div className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-3 bg-slate-900 border-t border-r border-slate-700/80 rotate-45"></div>
      
      {/* Tooltip Content */}
      <div className="flex items-center justify-between border-b border-slate-700 pb-1.5 mb-0.5">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last Status Update</span>
        {lastTrack?.timestamp && (
          <span className="text-[9px] text-slate-400 font-medium">
            {getTimeAgo(lastTrack.timestamp)}
          </span>
        )}
      </div>

      {lastTrack ? (
        <div className="space-y-1.5 text-left whitespace-normal">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] font-semibold text-slate-400 select-none">Status:</span>
            <span className="text-xs font-bold text-orange-400 capitalize">
              {lastTrack.status === 'empty_box_delivered' ? 'Empty Box Delivered' :
               lastTrack.status === 'filled_box_picked' ? 'Filled Box Picked' :
               lastTrack.status}
            </span>
          </div>
          {lastTrack.location && (
            <div className="flex items-baseline gap-1.5">
              <span className="text-[10px] font-semibold text-slate-400 select-none">Location:</span>
              <span className="text-xs text-slate-200 font-medium">{lastTrack.location}</span>
            </div>
          )}
          {lastTrack.description && (
            <div className="flex flex-col mt-0.5 pt-0.5 border-t border-slate-800">
              <span className="text-[9px] font-semibold text-slate-400 uppercase select-none">Message:</span>
              <p className="text-[11px] text-slate-300 leading-relaxed italic font-serif">
                "{lastTrack.description}"
              </p>
            </div>
          )}
          <div className="text-[9px] text-slate-500 text-right mt-1 font-mono select-none">
            {new Date(lastTrack.timestamp).toLocaleString()}
          </div>
        </div>
      ) : (
        <div className="text-center py-2 text-slate-400 text-xs italic">
          No updates recorded
        </div>
      )}
    </div>
  );
};

const Bookings = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState([])
  const [riders, setRiders] = useState([])
  const [bulkModal, setBulkModal] = useState({ open: false, type: "" }) // type: 'status' or 'assign'
  const [bulkUpdates, setBulkUpdates] = useState([])
  const [bulkNotify, setBulkNotify] = useState(true)
  const [bulkAssignment, setBulkAssignment] = useState({ riderId: "", assignedFor: "pickup" })
  const [isBulkUpdating, setIsBulkUpdating] = useState(false)
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "")
  const [searchInput, setSearchInput] = useState(searchParams.get("search") || "")
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all")
  const [serviceFilter, setServiceFilter] = useState(searchParams.get("service") || "all")
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get("page")) || 1)
  const [limit, setLimit] = useState(parseInt(searchParams.get("limit")) || 10)
  const [vendorFilter, setVendorFilter] = useState(searchParams.get("vendor") || "all")
  
  // Date Filtering State
  const [dateFilter, setDateFilter] = useState(searchParams.get("date") || "all") // all, today, last7, last30, custom
  const [customStartDate, setCustomStartDate] = useState(searchParams.get("start") || "")
  const [customEndDate, setCustomEndDate] = useState(searchParams.get("end") || "")

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput)
      if (searchInput !== (searchParams.get("search") || "")) {
        setCurrentPage(1)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams()
    if (searchTerm) params.set("search", searchTerm)
    if (statusFilter !== "all") params.set("status", statusFilter)
    if (serviceFilter !== "all") params.set("service", serviceFilter)
    if (currentPage !== 1) params.set("page", currentPage.toString())
    if (limit !== 10) params.set("limit", limit.toString())
    if (vendorFilter !== "all") params.set("vendor", vendorFilter)
    if (dateFilter !== "all") params.set("date", dateFilter)
    if (customStartDate) params.set("start", customStartDate)
    if (customEndDate) params.set("end", customEndDate)

    setSearchParams(params, { replace: true })
  }, [searchTerm, statusFilter, serviceFilter, currentPage, limit, vendorFilter, dateFilter, customStartDate, customEndDate])

  const handleResetFilters = () => {
    setSearchInput("")
    setSearchTerm("")
    setStatusFilter("all")
    setServiceFilter("all")
    setCurrentPage(1)
    setVendorFilter("all")
    setDateFilter("all")
    setCustomStartDate("")
    setCustomEndDate("")
  }

  const handleExportExcel = async () => {
    try {
      const toastId = toast.loading("Preparing export...")
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token")
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/bookings/export`, {
        params: {
          status: statusFilter,
          serviceType: serviceFilter,
          search: searchTerm,
          startDate: customStartDate || getEffectiveStartDate(dateFilter),
          endDate: customEndDate || getEffectiveEndDate(dateFilter),
          vendorFilter: vendorFilter
        },
        headers: { Authorization: `Bearer ${token}` }
      })

      const data = response.data.map(b => ({
        "Booking ID": b.bookingId,
        "Date": b.isVendorBooking && b.pickupDate ? new Date(b.pickupDate).toLocaleDateString() : new Date(b.createdAt).toLocaleDateString(),
        "Service": b.serviceType,
        "Status": b.status,
        "Sender": b.senderDetails?.name,
        "Sender Phone": b.senderDetails?.phone,
        "Receiver": b.receiverDetails?.name,
        "Receiver Phone": b.receiverDetails?.phone,
        "Pincode": b.receiverDetails?.pincode,
        "Weight": b.packageDetails?.weight || b.weight,
        "Amount (₹)": b.pricing?.totalAmount,
        "Payment": b.paymentStatus,
        "Vendor": b.vendorName || "Not Assigned"
      }))

      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Bookings")
      XLSX.writeFile(wb, `Bookings_Export_${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.dismiss(toastId)
      toast.success("Export complete!")
    } catch (error) {
      console.error("Export Error:", error)
      toast.error("Export failed")
    }
  }

  const fetchRiders = async () => {
    try {
      const t = localStorage.getItem("adminToken") || localStorage.getItem("token")
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/users?roles=rider,agent,staff`, {
        headers: { Authorization: `Bearer ${t}` }
      })
      setRiders(res.data.filter(r => r.isActive))
    } catch (e) {
      console.error("Failed to fetch riders", e)
    }
  }

  useEffect(() => {
    fetchRiders()
  }, [])

  const handleBulkStatusUpdate = async () => {
    if (!bulkUpdates || bulkUpdates.length === 0) return toast.error("Please add at least one status update")
    for (let i = 0; i < bulkUpdates.length; i++) {
      if (!bulkUpdates[i].status) {
        return toast.error(`Please select a status for entry #${i + 1}`)
      }
    }

    try {
      setIsBulkUpdating(true)
      const t = localStorage.getItem("adminToken") || localStorage.getItem("token")
      
      const formattedUpdates = bulkUpdates.map(up => ({
        status: up.status,
        location: up.location || "Hub",
        description: up.description || `Bulk status update to ${up.status.toUpperCase()} by admin.`,
        timestamp: up.timestamp ? new Date(up.timestamp).toISOString() : new Date().toISOString()
      }))

      const sortedUpdates = [...formattedUpdates].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      const latestStatus = sortedUpdates[sortedUpdates.length - 1].status

      await axios.put(`${import.meta.env.VITE_API_URL}/api/bookings/bulk/status`, {
        bookingIds: selectedIds,
        updates: formattedUpdates,
        notify: bulkNotify
      }, { headers: { Authorization: `Bearer ${t}` } })

      toast.success(`Updated ${selectedIds.length} bookings. Final status: ${latestStatus.toUpperCase()}`)
      setSelectedIds([])
      setBulkModal({ open: false, type: "" })
      setBulkUpdates([])
      fetchBookings()
    } catch (error) {
      console.error(error)
      toast.error("Bulk status update failed")
    } finally {
      setIsBulkUpdating(false)
    }
  }

  const handleBulkAssignRider = async () => {
    if (!bulkAssignment.riderId) return toast.error("Please select a rider")
    try {
      setIsBulkUpdating(true)
      const t = localStorage.getItem("adminToken") || localStorage.getItem("token")
      await axios.put(`${import.meta.env.VITE_API_URL}/api/bookings/bulk/assign`, {
        bookingIds: selectedIds,
        riderId: bulkAssignment.riderId,
        assignedFor: bulkAssignment.assignedFor
      }, { headers: { Authorization: `Bearer ${t}` } })

      toast.success(`Assigned ${selectedIds.length} bookings successfully`)
      setSelectedIds([])
      setBulkModal({ open: false, type: "" })
      fetchBookings()
    } catch (error) {
      toast.error("Bulk assignment failed")
    } finally {
      setIsBulkUpdating(false)
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === bookings.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(bookings.map(b => b._id))
    }
  }

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(i => i !== id))
    } else {
      setSelectedIds(prev => [...prev, id])
    }
  }

  const [totalPages, setTotalPages] = useState(1)

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

  // Docket Assignment State
  const [docketModal, setDocketModal] = useState({ open: false, booking: null })
  const [docketVendor, setDocketVendor] = useState("")
  const [docketId, setDocketId] = useState("")
  const [isAssigningDocket, setIsAssigningDocket] = useState(false)

  useEffect(() => {
    fetchBookings()
  }, [currentPage, statusFilter, serviceFilter, searchTerm, vendorFilter, dateFilter, customStartDate, customEndDate])

  const fetchBookings = async () => {
    try {
      setLoading(true)

      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/bookings`, {
        params: {
          page: currentPage,
          limit: limit,
          status: statusFilter,
          serviceType: serviceFilter,
          search: searchTerm,
          vendorFilter: vendorFilter,
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
      empty_box_delivered: "bg-blue-100 text-blue-800",
      filled_box_picked: "bg-teal-100 text-teal-800",
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
                placeholder="Search by Booking ID, Track ID, Sender/Receiver..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
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

            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Vendors</option>
              <option value="bluedart">BlueDart</option>
              <option value="dtdc">DTDC</option>
              <option value="delhivery">Delhivery</option>
              <option value="ecom express">Ecom Express</option>
              <option value="shadowfax">Shadowfax</option>
              <option value="none">No Vendor</option>
            </select>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium border border-green-200"
              title="Export All Filtered to Excel"
            >
              <FileDown className="h-4 w-4" />
              Export
            </button>

            <button
              onClick={handleResetFilters}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium border border-gray-200"
              title="Reset All Filters"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
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
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === bookings.length && bookings.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sender</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receiver</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Route</th>
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
                    <tr key={booking._id} className={`hover:bg-gray-50 transition-colors ${selectedIds.includes(booking._id) ? 'bg-primary-50/30' : ''}`}>
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(booking._id)}
                          onChange={() => toggleSelect(booking._id)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                        />
                      </td>
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
                        <div className="flex items-center text-sm font-semibold text-gray-800">
                          <span className="capitalize">{booking.senderDetails?.city || "—"}</span>
                          <ArrowRight className="h-3.5 w-3.5 text-gray-400 mx-1.5 flex-shrink-0" />
                          <span className="capitalize">{booking.receiverDetails?.city || "—"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-800 capitalize">{booking.serviceType}</div>
                        <div className="text-[10px] text-gray-400 font-medium">Source: {booking.bookingSource || 'web'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap overflow-visible">
                        <div className="flex items-center space-x-1.5 group relative cursor-help">
                          <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${getStatusColor(booking.status)}`}>
                            {booking.serviceType?.toLowerCase() === 'campus-parcel' 
                              ? (booking.status === 'empty_box_delivered' ? 'Box Delivered (For Packing)' :
                                 booking.status === 'filled_box_picked' ? 'Box Picked (Ready)' :
                                 booking.status)
                              : booking.status}
                          </span>
                          {isRecent(booking.updatedAt) && (
                            <span className="flex h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                          )}
                          <TrackingHistoryTooltip booking={booking} />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        ₹{booking.pricing?.totalAmount || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-600">
                        {booking.vendorName ? (
                          booking.vendorName.toLowerCase() === 'bluedart' ? (
                            <a href="https://bluedart.com/home" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline uppercase">
                              {booking.vendorName}
                            </a>
                          ) : booking.vendorName.toLowerCase() === 'dtdc' ? (
                            <a href="https://www.dtdc.com/track-your-shipment/" target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline uppercase">
                              {booking.vendorName}
                            </a>
                          ) : booking.vendorName.toLowerCase() === 'delhivery' ? (
                            <a href="https://www.delhivery.com/tracking" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline uppercase">
                              {booking.vendorName}
                            </a>
                          ) : (
                            <span className="uppercase">{booking.vendorName}</span>
                          )
                        ) : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-mono">
                        {booking.vendorTrackingId || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                        {booking.isVendorBooking && booking.pickupDate ? (
                          new Date(booking.pickupDate).toLocaleDateString()
                        ) : (
                          new Date(booking.createdAt).toLocaleDateString()
                        )}
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
                          <button
                            onClick={() => {
                              setDocketModal({ open: true, booking: booking });
                              setDocketVendor(booking.vendorName || "");
                              setDocketId(booking.vendorTrackingId || "");
                            }}
                            className="p-1 px-2.5 text-teal-600 hover:bg-teal-50 rounded-lg flex items-center gap-1.5 border border-teal-100 transition-colors"
                            title="Quick Assign Docket"
                          >
                            <Tag className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase">DOCKET</span>
                          </button>
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

            {/* Bulk Action Floating Bar */}
            {selectedIds.length > 0 && (
              <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-10 duration-300">
                <div className="flex items-center gap-3 border-r border-gray-700 pr-6">
                  <div className="bg-primary-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {selectedIds.length}
                  </div>
                  <span className="text-sm font-medium">Selected</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const now = new Date();
                      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                      setBulkUpdates([{
                        status: "pending",
                        location: "",
                        description: "",
                        timestamp: now.toISOString().slice(0, 16)
                      }]);
                      setBulkModal({ open: true, type: "status" });
                    }}
                    className="flex items-center gap-2 hover:bg-gray-800 px-3 py-2 rounded-xl transition-colors text-sm font-bold text-primary-400"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Update Status
                  </button>
                  <button
                    onClick={() => setBulkModal({ open: true, type: "assign" })}
                    className="flex items-center gap-2 hover:bg-gray-800 px-3 py-2 rounded-xl transition-colors text-sm font-bold text-amber-400"
                  >
                    <UserPlus className="w-4 h-4" />
                    Assign Rider
                  </button>
                  <button
                    onClick={() => {
                      setDocketModal({ open: true, booking: "bulk" });
                      setDocketVendor("");
                      setDocketId("");
                    }}
                    className="flex items-center gap-2 hover:bg-gray-800 px-3 py-2 rounded-xl transition-colors text-sm font-bold text-teal-400"
                  >
                    <Tag className="w-4 h-4" />
                    Assign Docket
                  </button>
                  <button
                    onClick={() => setSelectedIds([])}
                    className="ml-4 text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
            )}

            {/* Bulk Update Modals */}
            {bulkModal.open && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-900">
                      {bulkModal.type === 'status' ? 'Bulk Status Update' : 'Bulk Rider Assignment'}
                    </h3>
                    <button onClick={() => setBulkModal({ open: false, type: "" })} className="text-gray-400 hover:text-gray-600">
                      <XCircle className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="p-6">
                    <p className="text-sm text-gray-500 mb-6">
                      Applying changes to <span className="font-bold text-gray-900">{selectedIds.length}</span> selected bookings.
                    </p>

                    {bulkModal.type === 'status' ? (
                      <div className="space-y-4">
                        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                          {bulkUpdates.map((update, index) => (
                            <div key={index} className="p-4 bg-gray-50 border border-gray-250 rounded-2xl relative space-y-3 shadow-sm border-2">
                              {/* Header with Card Number & Remove Button */}
                              <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                                <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Status Update #{index + 1}</span>
                                {bulkUpdates.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setBulkUpdates(prev => prev.filter((_, i) => i !== index))
                                    }}
                                    className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Remove
                                  </button>
                                )}
                              </div>

                              {/* Row 1: Status selection buttons */}
                              <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Status</label>
                                <div className="grid grid-cols-4 gap-1">
                                  {["pending", "picked", "in-transit", "reached", "out-for-delivery", "delivered", "cancelled"].map(s => (
                                    <button
                                      key={s}
                                      type="button"
                                      onClick={() => {
                                        setBulkUpdates(prev => {
                                          const copy = [...prev];
                                          copy[index].status = s;
                                          return copy;
                                        })
                                      }}
                                      className={`px-1.5 py-1 rounded-lg text-[9px] font-bold border transition-all truncate ${update.status === s
                                        ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm'
                                        : 'border-gray-200 hover:border-gray-300 bg-white text-gray-600'
                                        }`}
                                    >
                                      {s.toUpperCase()}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Row 2: Location and DateTime */}
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Location</label>
                                  <input
                                    type="text"
                                    value={update.location}
                                    onChange={(e) => {
                                      setBulkUpdates(prev => {
                                        const copy = [...prev];
                                        copy[index].location = e.target.value;
                                        return copy;
                                      })
                                    }}
                                    placeholder="Hub Name, City"
                                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary-500 transition-all font-medium"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Date & Time</label>
                                  <input
                                    type="datetime-local"
                                    value={update.timestamp}
                                    onChange={(e) => {
                                      setBulkUpdates(prev => {
                                        const copy = [...prev];
                                        copy[index].timestamp = e.target.value;
                                        return copy;
                                      })
                                    }}
                                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary-500 transition-all font-semibold"
                                  />
                                </div>
                              </div>

                              {/* Row 3: Preset Note & Description */}
                              <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Tracking Note (Optional)</label>
                                <div className="flex gap-2">
                                  <select
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        setBulkUpdates(prev => {
                                          const copy = [...prev];
                                          copy[index].description = e.target.value;
                                          return copy;
                                        })
                                      }
                                    }}
                                    className="w-1/3 px-2 py-1 bg-white border border-gray-200 rounded-xl text-[10px] font-bold text-primary-600 focus:ring-2 focus:ring-primary-500 transition-all"
                                  >
                                    <option value="">Presets...</option>
                                    {PRESET_NOTES.map(note => (
                                      <option key={note} value={note}>{note}</option>
                                    ))}
                                  </select>
                                  <input
                                    type="text"
                                    value={update.description}
                                    onChange={(e) => {
                                      setBulkUpdates(prev => {
                                        const copy = [...prev];
                                        copy[index].description = e.target.value;
                                        return copy;
                                      })
                                    }}
                                    placeholder="Or type custom note..."
                                    className="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary-500 transition-all font-medium"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* Add More Status Button */}
                          <button
                            type="button"
                            onClick={() => {
                              const now = new Date();
                              now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                              setBulkUpdates(prev => [
                                ...prev,
                                {
                                  status: "pending",
                                  location: "",
                                  description: "",
                                  timestamp: now.toISOString().slice(0, 16)
                                }
                              ])
                            }}
                            className="w-full py-2.5 border-2 border-dashed border-gray-200 hover:border-primary-500 text-gray-500 hover:text-primary-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors bg-gray-50 hover:bg-primary-50/20"
                          >
                            <Plus className="w-4 h-4" />
                            Add More Status
                          </button>
                        </div>

                        {bulkUpdates.some(up => up.status === "delivered") && (
                          <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-3">
                            <input
                              type="checkbox"
                              id="bulkNotify"
                              checked={bulkNotify}
                              onChange={(e) => setBulkNotify(e.target.checked)}
                              className="h-5 w-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500 cursor-pointer"
                            />
                            <label htmlFor="bulkNotify" className="text-xs font-bold text-blue-800 cursor-pointer">
                              Send Delivered Message (Email) to all customers
                            </label>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">Select Rider</label>
                          <select
                            value={bulkAssignment.riderId}
                            onChange={(e) => setBulkAssignment(prev => ({ ...prev, riderId: e.target.value }))}
                            className="w-full rounded-xl border-gray-200 focus:ring-primary-500 focus:border-primary-500 text-sm py-3"
                          >
                            <option value="">Choose a rider...</option>
                            {riders.map(r => (
                              <option key={r._id} value={r._id}>{r.name} ({r.role})</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">Assign For</label>
                          <div className="flex gap-2">
                            {["pickup", "delivery", "both"].map(t => (
                              <button
                                key={t}
                                onClick={() => setBulkAssignment(prev => ({ ...prev, assignedFor: t }))}
                                className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all ${bulkAssignment.assignedFor === t
                                  ? 'border-amber-500 bg-amber-50 text-amber-700'
                                  : 'border-gray-100 hover:border-gray-200 text-gray-600'
                                  }`}
                              >
                                {t.toUpperCase()}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
                    <button
                      onClick={() => setBulkModal({ open: false, type: "" })}
                      className="flex-1 px-4 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={isBulkUpdating}
                      onClick={bulkModal.type === 'status' ? handleBulkStatusUpdate : handleBulkAssignRider}
                      className={`flex-1 px-4 py-3 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${bulkModal.type === 'status' ? 'bg-primary-600 hover:bg-primary-700' : 'bg-amber-600 hover:bg-amber-700'
                        }`}
                    >
                      {isBulkUpdating ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Confirm
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 font-medium">Show:</span>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(parseInt(e.target.value))
                      setCurrentPage(1)
                    }}
                    className="border border-gray-300 rounded-lg px-2 py-1 text-sm bg-white font-bold text-gray-700"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 order-3 sm:order-2 w-full sm:w-auto justify-center">
                  <span className="text-sm font-bold text-gray-900 px-3 py-1 bg-white border border-gray-200 rounded-lg shadow-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                </div>

                <div className="flex items-center gap-2 order-2 sm:order-3">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    className="px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                  >
                    Previous
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    className="px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                  >
                    Next
                  </button>
                </div>
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

      {/* Quick Docket Modal */}
      {docketModal.open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="text-lg font-black text-gray-900">{docketModal.booking === "bulk" ? "Bulk Assign Docket" : "Assign Docket"}</h3>
                <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest">{docketModal.booking === "bulk" ? `${selectedIds.length} Bookings Selected` : docketModal.booking?.bookingId}</p>
              </div>
              <button onClick={() => setDocketModal({ open: false, booking: null })} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Shipping Partner</label>
                <select
                  value={docketVendor}
                  onChange={async (e) => {
                    const vendor = e.target.value;
                    setDocketVendor(vendor);
                    if (vendor && vendor !== "Other") {
                      try {
                        const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
                        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/dockets/next/${vendor}`, {
                          headers: { Authorization: `Bearer ${token}` }
                        });
                        if (res.data.docketId) {
                          setDocketId(res.data.docketId);
                          toast.success(`ID fetched for ${vendor}`);
                        }
                      } catch (err) {
                        console.error(err);
                      }
                    }
                  }}
                  className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-gray-900"
                >
                  <option value="">Select Vendor</option>
                  <option value="BlueDart">BlueDart</option>
                  <option value="DTDC">DTDC</option>
                  <option value="Delhivery">Delhivery</option>
                  <option value="Ecom Express">Ecom Express</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Tracking ID</label>
                <div className="relative">
                  <input
                    type="text"
                    value={docketId}
                    onChange={(e) => setDocketId(e.target.value)}
                    placeholder="Enter Tracking ID"
                    className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-gray-900"
                  />
                  <button 
                    onClick={() => setDocketId("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <button
                onClick={async () => {
                  try {
                    setIsAssigningDocket(true);
                    const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
                    if (docketModal.booking === "bulk") {
                      await axios.put(`${import.meta.env.VITE_API_URL}/api/bookings/bulk/assign-docket`, {
                        bookingIds: selectedIds,
                        vendorName: docketVendor,
                        vendorTrackingId: docketId
                      }, { headers: { Authorization: `Bearer ${token}` } });
                      toast.success(`Docket assigned to ${selectedIds.length} bookings successfully`);
                      setSelectedIds([]);
                    } else {
                      await axios.put(`${import.meta.env.VITE_API_URL}/api/bookings/${docketModal.booking._id}`, {
                        vendorName: docketVendor,
                        vendorTrackingId: docketId
                      }, { headers: { Authorization: `Bearer ${token}` } });
                      toast.success("Docket assigned successfully");
                    }
                    setDocketModal({ open: false, booking: null });
                    fetchBookings();
                  } catch (err) {
                    toast.error("Failed to assign docket");
                  } finally {
                    setIsAssigningDocket(false);
                  }
                }}
                disabled={isAssigningDocket || !docketVendor || !docketId}
                className="w-full bg-teal-600 disabled:bg-gray-200 text-white font-black py-4 rounded-2xl shadow-xl shadow-teal-100 hover:bg-teal-700 transition-all flex items-center justify-center gap-2"
              >
                {isAssigningDocket ? "Saving..." : "Save Assignment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Bookings
