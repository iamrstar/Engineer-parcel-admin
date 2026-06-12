"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import axios from "axios"
import toast from "react-hot-toast"
import {
  Building,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Phone,
  Mail,
  MapPin,
  Map,
  Globe,
  Eye,
  Home,
  Wallet,
  History,
  TrendingDown,
  TrendingUp,
  DollarSign,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  ArrowLeft,
  Package,
  Check,
  XCircle,
  FileText,
  Key,
  Link as LinkIcon
} from "lucide-react"

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

const getStatusColor = (status) => {
  const colors = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    confirmed: "bg-blue-100 text-blue-800 border-blue-200",
    picked: "bg-purple-100 text-purple-800 border-purple-200",
    "in-transit": "bg-indigo-100 text-indigo-800 border-indigo-200",
    "out-for-delivery": "bg-orange-100 text-orange-800 border-orange-200",
    delivered: "bg-green-100 text-green-800 border-green-200",
    cancelled: "bg-red-100 text-red-800 border-red-200",
    empty_box_delivered: "bg-blue-100 text-blue-800 border-blue-200",
    filled_box_picked: "bg-teal-100 text-teal-800 border-teal-200",
  }
  return colors[status] || "bg-gray-100 dark:bg-[#111111] text-gray-800 dark:text-gray-200 border-gray-200 dark:border-white/10"
};

const TrackingHistoryTooltip = ({ booking }) => {
  const lastTrack = booking.trackingHistory && booking.trackingHistory.length > 0
    ? booking.trackingHistory[booking.trackingHistory.length - 1]
    : null;

  return (
    <div className="absolute hidden group-hover:flex flex-col gap-1.5 z-30 w-64 p-3 bg-slate-900/95 backdrop-blur-md text-white rounded-xl shadow-2xl border border-slate-700/80 bottom-full mb-2.5 left-1/2 -translate-x-1/2 transition-all duration-200 ease-out origin-bottom scale-95 group-hover:scale-100 pointer-events-none">
      {/* Tooltip arrow */}
      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 border-r border-b border-gray-200 dark:border-white/10 border-slate-700/80 rotate-45"></div>
      
      {/* Tooltip Content */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 border-slate-700 pb-1.5 mb-0.5">
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

const Vendors = () => {
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingVendor, setEditingVendor] = useState(null)
  const [pincodeLoading, setPincodeLoading] = useState(false)
  const [pincodeSuccess, setPincodeSuccess] = useState(false)

  // Finance States
  const [selectedVendorForFinance, setSelectedVendorForFinance] = useState(null)
  const [vendorOrders, setVendorOrders] = useState([])
  const [vendorPayments, setVendorPayments] = useState([])
  const [financeSummary, setFinanceSummary] = useState(null)
  const [financeLoading, setFinanceLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('orders') // 'orders' or 'settlements'
  
  const [financeMonth, setFinanceMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  })

  // Edit Order Payment Modal
  const [editingOrder, setEditingOrder] = useState(null)
  const [orderPaymentData, setOrderPaymentData] = useState({
    totalAmount: 0,
    vendorPaidAmount: 0,
    vendorPaymentMethod: "Cash",
    vendorReceivedBy: localStorage.getItem("adminName") || "Admin",
    vendorPaymentDate: new Date().toISOString().split("T")[0]
  })

  const [editingHistoryId, setEditingHistoryId] = useState(null)
  const [editingHistoryAmount, setEditingHistoryAmount] = useState(0)

  // Bulk Settlement Modal
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false)
  const [settlementData, setSettlementData] = useState({
    amount: 0,
    paymentMethod: "Cash",
    receivedBy: localStorage.getItem("adminName") || "Admin",
    month: new Date().toISOString().substring(0, 7),
    notes: ""
  })

  // PDF Options Modal States
  const [pdfModalOpen, setPdfModalOpen] = useState(false)
  const [pdfBooking, setPdfBooking] = useState(null)
  const [pdfOptions, setPdfOptions] = useState({ receipt: true, label: true, declaration: true })

  // Form State
  const [formData, setFormData] = useState({
    partnerId: "",
    name: "",
    email: "",
    phone: "",
    address: "",
    address2: "",
    city: "",
    state: "",
    pincode: "",
    landmark: "",
    apiKey: "",
    webhookUrl: ""
  })

  useEffect(() => {
    fetchVendors()
  }, [])

  useEffect(() => {
    const fetchAddress = async () => {
      if (formData.pincode.length === 6) {
        setPincodeLoading(true)
        try {
          const token = localStorage.getItem("adminToken") || localStorage.getItem("token")
          const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/pincodes?code=${formData.pincode}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          if (res.data.available) {
            setFormData(prev => ({
              ...prev,
              city: res.data.city,
              state: res.data.state
            }))
            setPincodeSuccess(true)
            toast.success("Location details fetched!")
          } else {
            setPincodeSuccess(false)
          }
        } catch (error) {
          console.error("Pincode fetch error:", error)
        } finally {
          setPincodeLoading(false)
        }
      }
    }
    if (formData.pincode.length < 6) setPincodeSuccess(false)
    fetchAddress()
  }, [formData.pincode])

  const fetchVendors = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token")
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/partners`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setVendors(res.data)
    } catch (error) {
      toast.error("Failed to fetch vendors")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const fetchVendorFinances = async (vendor, monthParam = financeMonth) => {
    try {
      setFinanceLoading(true)
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token")
      const headers = { Authorization: `Bearer ${token}` }
      
      const queryParams = monthParam ? `?month=${monthParam}` : '';

      const [ordersRes, paymentsRes, summaryRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/api/partners/${vendor._id}/orders${queryParams}`, { headers }),
        axios.get(`${import.meta.env.VITE_API_URL}/api/vendor-payments/${vendor.partnerId}${queryParams}`, { headers }),
        axios.get(`${import.meta.env.VITE_API_URL}/api/partners/${vendor._id}/finances${queryParams}`, { headers })
      ])

      setVendorOrders(ordersRes.data)
      setVendorPayments(paymentsRes.data)
      setFinanceSummary(summaryRes.data)
      setSelectedVendorForFinance(vendor)
    } catch (error) {
      toast.error("Failed to fetch financial data")
      console.error(error)
    } finally {
      setFinanceLoading(false)
    }
  }

  const handleUpdateOrderPayment = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token")
      
      const payload = {
        ...orderPaymentData,
        vendorPaidAmount: (Number(orderPaymentData.vendorPaidAmount) || 0) + (Number(orderPaymentData.newPaymentAmount) || 0)
      }

      await axios.put(
        `${import.meta.env.VITE_API_URL}/api/partners/order/${editingOrder._id}/payment`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success("Order payment updated")
      setEditingOrder(null)
      fetchVendorFinances(selectedVendorForFinance)
    } catch (error) {
      toast.error("Failed to update order payment")
    }
  }

  const handleEditHistory = async (historyId, newAmount) => {
    try {
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token")
      await axios.put(
        `${import.meta.env.VITE_API_URL}/api/partners/order/${editingOrder._id}/history/${historyId}`,
        { amount: newAmount },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success("Payment history updated")
      
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/partners/${selectedVendorForFinance._id}/orders${financeMonth ? `?month=${financeMonth}` : ''}`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setVendorOrders(res.data)
      const updatedOrder = res.data.find(o => o._id === editingOrder._id);
      if (updatedOrder) {
         setEditingOrder(updatedOrder);
         setOrderPaymentData(prev => ({...prev, vendorPaidAmount: updatedOrder.vendorPaidAmount}));
      }
      
      fetchVendorFinances(selectedVendorForFinance, financeMonth);
      setEditingHistoryId(null);
    } catch (error) {
      toast.error("Failed to update history")
    }
  }

  const handleDeleteHistory = async (historyId) => {
    if (!window.confirm("Are you sure you want to delete this payment record?")) return;
    try {
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token")
      await axios.delete(
        `${import.meta.env.VITE_API_URL}/api/partners/order/${editingOrder._id}/history/${historyId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success("Payment history deleted")
      
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/partners/${selectedVendorForFinance._id}/orders${financeMonth ? `?month=${financeMonth}` : ''}`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setVendorOrders(res.data)
      const updatedOrder = res.data.find(o => o._id === editingOrder._id);
      if (updatedOrder) {
         setEditingOrder(updatedOrder);
         setOrderPaymentData(prev => ({...prev, vendorPaidAmount: updatedOrder.vendorPaidAmount}));
      }
      
      fetchVendorFinances(selectedVendorForFinance, financeMonth);
    } catch (error) {
      toast.error("Failed to delete history")
    }
  }

  const handleRecordSettlement = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token")
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/vendor-payments`,
        { ...settlementData, vendorId: selectedVendorForFinance.partnerId },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success("Settlement recorded")
      setIsSettlementModalOpen(false)
      fetchVendorFinances(selectedVendorForFinance)
    } catch (error) {
      toast.error("Failed to record settlement")
    }
  }

  const handleOpenModal = (vendor = null) => {
    if (vendor) {
      setEditingVendor(vendor)
      setFormData({
        partnerId: vendor.partnerId,
        name: vendor.name,
        phone: vendor.phone,
        email: vendor.email || "",
        address: vendor.address,
        address2: vendor.address2 || "",
        city: vendor.city,
        state: vendor.state,
        pincode: vendor.pincode || "",
        landmark: vendor.landmark || "",
        apiKey: vendor.apiKey || "",
        webhookUrl: vendor.webhookUrl || ""
      })
    } else {
      setEditingVendor(null)
      setFormData({
        partnerId: "",
        name: "",
        phone: "",
        email: "",
        address: "",
        address2: "",
        city: "",
        state: "",
        pincode: "",
        landmark: "",
        apiKey: "",
        webhookUrl: ""
      })
    }
    setPincodeSuccess(vendor ? true : false)
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token")
      const url = editingVendor
        ? `${import.meta.env.VITE_API_URL}/api/partners/${editingVendor._id}`
        : `${import.meta.env.VITE_API_URL}/api/partners`

      const method = editingVendor ? "put" : "post"

      await axios[method](url, formData, {
        headers: { Authorization: `Bearer ${token}` }
      })

      toast.success(editingVendor ? "Partner updated successfully" : "Partner created successfully")
      setIsModalOpen(false)
      fetchVendors()
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save partner")
      console.error(error)
    }
  }

  const handleDelete = async (vendorId) => {
    if (!window.confirm("Are you sure you want to delete this vendor?")) return

    try {
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token")
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/partners/${vendorId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success("Partner deleted successfully")
      fetchVendors()
    } catch (error) {
      toast.error("Failed to delete partner")
      console.error(error)
    }
  }

  const filteredVendors = vendors.filter(vendor =>
    vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.partnerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.phone.includes(searchTerm)
  )

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Building className="h-8 w-8 text-orange-600" />
            Partner Management
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage bulk shipping partners and individual partners</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-orange-200 flex items-center gap-2 w-fit"
        >
          <Plus className="h-5 w-5" />
          Add New Partner
        </button>
      </div>

      {/* Control Bar */}
      <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search by vendor name, ID, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-[#111111] border-none rounded-xl focus:ring-2 focus:ring-orange-500 text-sm"
          />
        </div>
      </div>

      {/* Vendors Table */}
      <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b border-gray-200 dark:border-white/10-2 border-orange-600"></div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">Loading partner data...</p>
          </div>
        ) : filteredVendors.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            <Building className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-lg">No partners found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50 dark:bg-[#111111]/50 text-left">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Partner Info</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Address</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredVendors.map((vendor) => (
                  <tr key={vendor._id} className="hover:bg-gray-50 dark:bg-[#111111]/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-sm">
                          {vendor.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">{vendor.name}</div>
                          <div className="text-xs text-orange-600 font-mono font-bold">ID: {vendor.partnerId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-900 dark:text-white max-w-xs truncate">{vendor.address}</div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400">{vendor.city}, {vendor.state} - {vendor.pincode}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-gray-400" /> {vendor.phone}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
                        <Mail className="h-3.5 w-3.5 text-gray-400" /> {vendor.email || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => fetchVendorFinances(vendor)}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                          title="View Financials"
                        >
                          <Wallet className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleOpenModal(vendor)}
                          className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                          title="Edit Partner"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(vendor._id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete Partner"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl shadow-2xl w-full max-w-2xl relative z-10 overflow-hidden transform transition-all animate-in zoom-in duration-200">
            <div className="bg-orange-600 p-6 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                {editingVendor ? <Edit2 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                {editingVendor ? "Edit Partner" : "Add New Partner"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white dark:bg-[#1A1A1A]/10 rounded-full transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Partner ID (Unique)</label>
                  <input
                    type="text"
                    value={formData.partnerId || ""}
                    onChange={(e) => setFormData({ ...formData, partnerId: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                    placeholder={editingVendor ? "Enter Partner ID" : "Leave blank to auto-generate"}
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Partner Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                    placeholder="e.g. Acme Corp"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                    placeholder="10-digit phone"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                    placeholder="vendor@example.com"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Address (Permanent/Registered) *</label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                    placeholder="Street, Building, etc."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Address Line 2</label>
                  <input
                    type="text"
                    value={formData.address2}
                    onChange={(e) => setFormData({ ...formData, address2: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                    placeholder="Area, Colony, etc."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2">
                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                      <Key className="h-4 w-4 text-orange-600" /> API Key
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. sk_live_12345 (Leave blank to auto-generate)"
                      value={formData.apiKey}
                      onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                      <LinkIcon className="h-4 w-4 text-orange-600" /> Webhook URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://partner.com/api/webhook"
                      value={formData.webhookUrl}
                      onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                    />
                  </div>
                </div>

                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 bg-orange-50/30 p-4 rounded-2xl border border-orange-100">
                  <div className="md:col-span-1">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Pincode *</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={formData.pincode}
                        onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, "") })}
                        className={`w-full px-4 py-2.5 bg-white dark:bg-[#1A1A1A] border-2 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm font-bold tracking-widest transition-all ${pincodeSuccess ? 'border-green-500 bg-green-50/10' : 'border-gray-200 dark:border-white/10'}`}
                        placeholder="6-digit PIN"
                      />
                      {pincodeLoading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b border-gray-200 dark:border-white/10-2 border-orange-600"></div>
                        </div>
                      )}
                      {pincodeSuccess && !pincodeLoading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600 animate-in zoom-in duration-300">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">City *</label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                      placeholder="Auto-filled"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">State *</label>
                    <input
                      type="text"
                      required
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                      placeholder="Auto-filled"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Landmark</label>
                  <input
                    type="text"
                    value={formData.landmark}
                    onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 dark:bg-[#111111] hover:bg-gray-200 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-100 transition-all"
                >
                  {editingVendor ? "Save Changes" : "Create Partner"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Finance View Overlay */}
      {selectedVendorForFinance && (
        <div className="fixed inset-0 z-[70] bg-gray-50 dark:bg-[#111111] flex flex-col animate-in slide-in-from-right duration-300">
          {/* Local Header */}
          <div className="bg-white dark:bg-[#1A1A1A] border-b border-gray-200 dark:border-white/10 px-6 py-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSelectedVendorForFinance(null)}
                className="p-2 hover:bg-gray-100 dark:bg-[#111111] rounded-full transition-all"
              >
                <ArrowLeft className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedVendorForFinance.name}</h2>
                <p className="text-xs text-orange-600 font-mono font-bold tracking-tight">PARTNER FINANCE DASHBOARD • {selectedVendorForFinance.partnerId}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input 
                type="month" 
                value={financeMonth}
                onChange={(e) => {
                  setFinanceMonth(e.target.value);
                  fetchVendorFinances(selectedVendorForFinance, e.target.value);
                }}
                className="px-4 py-2 bg-gray-50 dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-orange-500 outline-none cursor-pointer"
                title="Filter by Month"
              />
              <button 
                onClick={() => setIsSettlementModalOpen(true)}
                className="bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-orange-700 transition-all shadow-lg shadow-orange-100"
              >
                <DollarSign className="h-4 w-4" /> Record Settlement
              </button>
              <button onClick={() => setSelectedVendorForFinance(null)} className="text-gray-400 hover:text-gray-600 dark:text-gray-400"><X className="h-6 w-6" /></button>
            </div>
          </div>

          {/* Dashboard Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-[#1A1A1A] p-5 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 bg-orange-50 rounded-xl text-orange-600"><TrendingUp className="h-5 w-5" /></div>
                  <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest bg-orange-50 px-2 py-0.5 rounded">Total Due</span>
                </div>
                <div className="text-2xl font-black text-gray-900 dark:text-white">₹{(financeSummary?.totalDue || 0).toLocaleString('en-IN')}</div>
                <p className="text-[10px] text-gray-400 mt-1 font-bold italic">Cumulative across {financeSummary?.bookingCount || 0} orders</p>
              </div>
              <div className="bg-white dark:bg-[#1A1A1A] p-5 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 bg-green-50 rounded-xl text-green-600"><CheckCircle2 className="h-5 w-5" /></div>
                  <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest bg-green-50 px-2 py-0.5 rounded">Total Paid</span>
                </div>
                <div className="text-2xl font-black text-gray-900 dark:text-white">₹{((financeSummary?.totalPaidOnOrders || 0) + (financeSummary?.totalBulkPayments || 0)).toLocaleString('en-IN')}</div>
                <p className="text-[10px] text-gray-400 mt-1 font-bold italic">Orders: ₹{financeSummary?.totalPaidOnOrders} | Bulk: ₹{financeSummary?.totalBulkPayments}</p>
              </div>
              <div className="bg-white dark:bg-[#1A1A1A] p-5 rounded-3xl border border-gray-100 shadow-sm border-l-4 border-l-red-500">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 bg-red-50 rounded-xl text-red-600"><AlertCircle className="h-5 w-5" /></div>
                  <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest bg-red-50 px-2 py-0.5 rounded">Net Balance</span>
                </div>
                <div className="text-2xl font-black text-red-600">₹{(financeSummary?.netBalance || 0).toLocaleString('en-IN')}</div>
                <p className="text-[10px] text-gray-400 mt-1 font-bold italic underline">Outstandings to be collected</p>
              </div>
              <div className="bg-white dark:bg-[#1A1A1A] p-5 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 bg-blue-50 rounded-xl text-blue-600"><ClipboardList className="h-5 w-5" /></div>
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">Orders</span>
                </div>
                <div className="text-2xl font-black text-gray-900 dark:text-white">{financeSummary?.bookingCount || 0}</div>
                <p className="text-[10px] text-gray-400 mt-1 font-bold italic">Total vendor bookings</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex border-b border-gray-200 dark:border-white/10">
                <button 
                  onClick={() => setActiveTab('orders')}
                  className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 border-b border-gray-200 dark:border-white/10-2 transition-all ${activeTab === 'orders' ? 'border-orange-600 text-orange-600 bg-orange-50/20' : 'border-transparent text-gray-400 hover:text-gray-600 dark:text-gray-400'}`}
                >
                  <Package className="h-4 w-4" /> ASSOCIATED ORDERS
                </button>
                <button 
                  onClick={() => setActiveTab('settlements')}
                  className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 border-b border-gray-200 dark:border-white/10-2 transition-all ${activeTab === 'settlements' ? 'border-orange-600 text-orange-600 bg-orange-50/20' : 'border-transparent text-gray-400 hover:text-gray-600 dark:text-gray-400'}`}
                >
                  <History className="h-4 w-4" /> SETTLEMENT HISTORY
                </button>
              </div>

              <div className="p-0">
                {activeTab === 'orders' ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                      <thead className="bg-gray-50 dark:bg-[#111111]/50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Order ID</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Route</th>
                          <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Amount</th>
                          <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Paid</th>
                          <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payment Status</th>
                          <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Shipment Status</th>
                          <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {vendorOrders.map(order => (
                          <tr key={order._id} className="hover:bg-gray-50 dark:bg-[#111111]/30 transition-colors">
                            <td className="px-6 py-4 font-mono font-bold text-sm text-gray-900 dark:text-white">{order.trackingId || order.bookingId}</td>
                            <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</td>
                            <td className="px-6 py-4 text-[10px] font-bold uppercase text-gray-600 dark:text-gray-400">{order.senderDetails?.city} ➔ {order.receiverDetails?.city}</td>
                            <td className="px-6 py-4 text-right font-black text-gray-900 dark:text-white">₹{(order.pricing?.totalAmount || 0).toLocaleString('en-IN')}</td>
                            <td className="px-6 py-4 text-right font-bold text-green-600">₹{(order.vendorPaidAmount || 0).toLocaleString('en-IN')}</td>
                            <td className="px-6 py-4 text-center">
                              <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${
                                order.vendorPaymentStatus === 'Paid' ? 'bg-green-100 text-green-700' :
                                order.vendorPaymentStatus === 'Partially Paid' ? 'bg-orange-100 text-orange-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {order.vendorPaymentStatus || 'Pending'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center overflow-visible">
                              <div className="inline-flex items-center space-x-1.5 group relative cursor-help">
                                <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${getStatusColor(order.status)}`}>
                                  {order.status}
                                </span>
                                <TrackingHistoryTooltip booking={order} />
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Link
                                  to={`/bookings/${order._id}`}
                                  className="p-1.5 px-3 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-lg hover:bg-blue-100 transition-all flex items-center gap-1.5 border border-blue-200"
                                >
                                  <Eye className="h-3 w-3" /> View Order
                                </Link>
                                <button
                                  onClick={() => {
                                    setPdfBooking(order);
                                    setPdfOptions({ receipt: true, label: true, declaration: true });
                                    setPdfModalOpen(true);
                                  }}
                                  className="p-1.5 px-3 bg-red-50 text-red-600 text-[10px] font-bold rounded-lg hover:bg-red-100 transition-all flex items-center gap-1.5 border border-red-200"
                                  title="Print Records"
                                >
                                  <FileText className="h-3 w-3" /> PDF
                                </button>
                                <button 
                                  onClick={() => {
                                    setEditingOrder(order);
                                    setOrderPaymentData({
                                      totalAmount: order.pricing?.totalAmount || 0,
                                      vendorPaidAmount: order.vendorPaidAmount || 0,
                                      newPaymentAmount: 0,
                                      vendorPaymentMethod: order.vendorPaymentMethod || "Cash",
                                      vendorReceivedBy: order.vendorReceivedBy || localStorage.getItem("adminName") || "Admin",
                                      vendorPaymentDate: (new Date().toISOString()).split("T")[0]
                                    });
                                  }}
                                  className="bg-gray-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-black transition-all"
                                >Update Payment</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                      <thead className="bg-gray-50 dark:bg-[#111111]/50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Month</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Method</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Received By</th>
                          <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {vendorPayments.map(payment => (
                          <tr key={payment._id} className="hover:bg-gray-50 dark:bg-[#111111]/30">
                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{new Date(payment.paymentDate).toLocaleDateString()}</td>
                            <td className="px-6 py-4 text-xs font-bold text-orange-600 uppercase tracking-tighter">{payment.month}</td>
                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{payment.paymentMethod}</td>
                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{payment.receivedBy}</td>
                            <td className="px-6 py-4 text-right font-black text-green-600">₹{(payment.amount || 0).toLocaleString('en-IN')}</td>
                          </tr>
                        ))}
                        {vendorPayments.length === 0 && (
                          <tr><td colSpan="5" className="py-20 text-center text-gray-400 italic">No settlement history found.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Order Payment Modal */}
          {editingOrder && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/60" onClick={() => setEditingOrder(null)} />
              <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl shadow-2xl w-full max-w-lg relative z-10 p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Update Order Payment</h3>
                  <button onClick={() => setEditingOrder(null)}><X className="h-6 w-6 text-gray-400" /></button>
                </div>
                <p className="text-xs text-orange-600 font-mono font-bold mb-6">ORDER: {editingOrder.trackingId || editingOrder.bookingId}</p>
                
                <form onSubmit={handleUpdateOrderPayment} className="space-y-4">
                  {/* Summary Card */}
                  <div className="bg-gray-50 dark:bg-[#111111] p-4 rounded-xl mb-4 flex justify-between border border-gray-100 divide-x divide-gray-200">
                     <div className="px-2 w-1/3">
                        <span className="text-[10px] uppercase text-gray-500 dark:text-gray-400 font-bold tracking-wider">Total Bill</span>
                        <div className="font-black text-gray-900 dark:text-white text-lg">₹{(orderPaymentData.totalAmount || 0).toLocaleString('en-IN')}</div>
                     </div>
                     <div className="px-4 w-1/3 text-center border-l border-gray-200 dark:border-white/10">
                        <span className="text-[10px] uppercase text-gray-500 dark:text-gray-400 font-bold tracking-wider">Already Paid</span>
                        <div className="font-black text-green-600 text-lg">₹{(orderPaymentData.vendorPaidAmount || 0).toLocaleString('en-IN')}</div>
                     </div>
                     <div className="px-4 w-1/3 text-right">
                        <span className="text-[10px] uppercase text-gray-500 dark:text-gray-400 font-bold tracking-wider">Remaining Due</span>
                        <div className="font-black text-red-600 text-lg">₹{Math.max(0, (orderPaymentData.totalAmount || 0) - (orderPaymentData.vendorPaidAmount || 0) - (orderPaymentData.newPaymentAmount || 0)).toLocaleString('en-IN')}</div>
                     </div>
                  </div>

                  <div className="p-4 bg-green-50 rounded-xl border border-green-200 mb-6 group relative">
                    <label className="block text-xs font-black text-green-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                       <Plus className="h-4 w-4 bg-green-200 rounded-full p-0.5 text-green-800" /> 
                       Add New Payment (₹)
                    </label>
                    <input 
                      type="number" 
                      value={orderPaymentData.newPaymentAmount || ""}
                      onChange={(e) => setOrderPaymentData({...orderPaymentData, newPaymentAmount: Number(e.target.value)})}
                      className="w-full px-4 py-3 bg-white dark:bg-[#1A1A1A] border border-green-200 rounded-xl font-black text-green-700 focus:ring-2 focus:ring-green-500 outline-none text-2xl transition-all shadow-sm"
                      placeholder="0"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Payment Method</label>
                      <select 
                        value={orderPaymentData.vendorPaymentMethod}
                        onChange={(e) => setOrderPaymentData({...orderPaymentData, vendorPaymentMethod: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-[#111111] border border-gray-100 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-green-500 outline-none"
                      >
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cheque">Cheque</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Received By</label>
                      <input 
                        type="text" 
                        value={orderPaymentData.vendorReceivedBy}
                        onChange={(e) => setOrderPaymentData({...orderPaymentData, vendorReceivedBy: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-[#111111] border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Payment Date</label>
                    <input 
                      type="date" 
                      value={orderPaymentData.vendorPaymentDate}
                      onChange={(e) => setOrderPaymentData({...orderPaymentData, vendorPaymentDate: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-[#111111] border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  </div>

                  <details className="group [&_summary::-webkit-details-marker]:hidden bg-orange-50/30 p-4 rounded-xl border border-orange-100/50 mt-4">
                    <summary className="flex cursor-pointer items-center justify-between text-[10px] font-bold text-orange-600 uppercase tracking-wider">
                      <span className="flex items-center gap-2">
                        See Previous Collections & Adjustments 
                        {editingOrder?.vendorPaymentHistory?.length > 0 && <span className="bg-orange-600 text-white rounded-full px-1.5 py-0.5 text-[8px]">{editingOrder.vendorPaymentHistory.length}</span>}
                      </span>
                      <span className="shrink-0 transition duration-300 group-open:-rotate-180 bg-orange-100 p-1 rounded-full text-orange-800">
                        <ChevronRight className="h-3 w-3" />
                      </span>
                    </summary>
                    <div className="mt-4 border-t border-orange-100/50 pt-4 space-y-6">

                      {/* Display the History Table directly inside here */}
                      {editingOrder.vendorPaymentHistory && editingOrder.vendorPaymentHistory.length > 0 ? (
                        <div className="border border-orange-100/50 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-[#1A1A1A]">
                          <div className="max-h-40 overflow-y-auto">
                            <table className="min-w-full divide-y divide-gray-50">
                              <thead className="bg-orange-50/50 sticky top-0">
                                <tr>
                                  <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase">Date</th>
                                  <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase">Method</th>
                                  <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase">Receiver</th>
                                  <th className="px-4 py-2 text-right text-[10px] font-bold text-gray-400 uppercase">Amount</th>
                                  <th className="px-4 py-2 text-center text-[10px] font-bold text-gray-400 uppercase w-20">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50 bg-white dark:bg-[#1A1A1A]">
                                {editingOrder.vendorPaymentHistory.map((hist, idx) => (
                                  <tr key={hist._id || idx} className="hover:bg-orange-50/30 transition-colors group/row">
                                    <td className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">{new Date(hist.date).toLocaleDateString()}</td>
                                    <td className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300">{hist.method || '-'}</td>
                                    <td className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">{hist.receivedBy || '-'}</td>
                                    <td className="px-4 py-2 text-right">
                                      {editingHistoryId === hist._id ? (
                                        <input 
                                          type="number" 
                                          value={editingHistoryAmount}
                                          onChange={(e) => setEditingHistoryAmount(Number(e.target.value))}
                                          className="w-20 px-2 py-1 text-xs font-black text-green-700 bg-green-50 rounded border border-green-200 outline-none focus:ring-1 focus:ring-green-500 text-right"
                                          autoFocus
                                        />
                                      ) : (
                                        <span className="text-xs font-black text-green-600">₹{hist.amount.toLocaleString('en-IN')}</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      {editingHistoryId === hist._id ? (
                                        <div className="flex items-center justify-center gap-2">
                                          <button type="button" onClick={() => handleEditHistory(hist._id, editingHistoryAmount)} className="text-green-600 hover:text-green-800"><Check className="h-4 w-4" /></button>
                                          <button type="button" onClick={() => setEditingHistoryId(null)} className="text-gray-400 hover:text-gray-600 dark:text-gray-400"><XCircle className="h-4 w-4" /></button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover/row:opacity-100 transition-opacity">
                                          <button type="button" onClick={() => { setEditingHistoryId(hist._id); setEditingHistoryAmount(hist.amount); }} className="text-blue-500 hover:text-blue-700" title="Edit Amount"><Edit2 className="h-3 w-3" /></button>
                                          <button type="button" onClick={() => handleDeleteHistory(hist._id)} className="text-red-500 hover:text-red-700" title="Delete Record"><Trash2 className="h-3 w-3" /></button>
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-xs text-gray-400 italic py-2 bg-white dark:bg-[#1A1A1A] rounded-xl border border-orange-50">No previous collections exist for this order.</div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-orange-400 uppercase mb-1">Override Base Bill</label>
                          <input 
                            type="number" 
                            title="Edit if the total bill was negotiated differently"
                            value={orderPaymentData.totalAmount}
                            onChange={(e) => setOrderPaymentData({...orderPaymentData, totalAmount: Number(e.target.value)})}
                            className="w-full px-4 py-2 bg-white dark:bg-[#1A1A1A] border border-orange-200 rounded-xl font-bold text-sm shadow-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-orange-400 uppercase mb-1">Override Base Paid</label>
                          <input 
                            type="number" 
                            title="Edit the historical total if there was an error in past entry"
                            value={orderPaymentData.vendorPaidAmount}
                            onChange={(e) => setOrderPaymentData({...orderPaymentData, vendorPaidAmount: Number(e.target.value)})}
                            className="w-full px-4 py-2 bg-white dark:bg-[#1A1A1A] border border-orange-200 rounded-xl font-bold text-gray-600 dark:text-gray-400 text-sm shadow-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </details>
                  
                  <div className="pt-2 flex gap-3">
                    <button 
                      type="button" 
                      onClick={() => setEditingOrder(null)}
                      className="flex-1 px-6 py-3 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 font-bold rounded-xl hover:bg-gray-50 dark:bg-[#111111] transition-all"
                    >Cancel</button>
                    <button 
                      type="submit"
                      className="flex-[2] px-6 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-all shadow-lg"
                    >Save Changes</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Settlement Modal */}
          {isSettlementModalOpen && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/60" onClick={() => setIsSettlementModalOpen(false)} />
              <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl shadow-2xl w-full max-w-lg relative z-10 p-8 border-t-8 border-green-500">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white">Record Bulk Settlement</h3>
                  <button onClick={() => setIsSettlementModalOpen(false)}><X className="h-6 w-6 text-gray-400" /></button>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                  Record a general payment made by the vendor. This will be deducted from their total net balance.
                </p>
                
                <form onSubmit={handleRecordSettlement} className="space-y-6">
                  <div className="p-6 bg-green-50 rounded-3xl border border-green-100 text-center">
                    <label className="block text-[10px] font-black text-green-600 uppercase tracking-[0.2em] mb-3">Settlement Amount (₹)</label>
                    <input 
                      type="number" 
                      required
                      value={settlementData.amount}
                      onChange={(e) => setSettlementData({...settlementData, amount: Number(e.target.value)})}
                      className="w-full bg-transparent border-none text-center text-4xl font-black text-green-700 focus:ring-0 placeholder-green-200"
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Month Attribution</label>
                      <input 
                        type="month" 
                        value={settlementData.month}
                        onChange={(e) => setSettlementData({...settlementData, month: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-[#111111] border border-transparent rounded-2xl text-sm font-bold focus:bg-white dark:bg-[#1A1A1A] focus:border-green-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Payment Method</label>
                      <select 
                        value={settlementData.paymentMethod}
                        onChange={(e) => setSettlementData({...settlementData, paymentMethod: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-[#111111] border border-transparent rounded-2xl text-sm font-bold focus:bg-white dark:bg-[#1A1A1A] focus:border-green-500 transition-all"
                      >
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cheque">Cheque</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Notes / Description</label>
                    <textarea 
                      value={settlementData.notes}
                      onChange={(e) => setSettlementData({...settlementData, notes: e.target.value})}
                      placeholder="Transaction details, reference numbers, etc."
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-[#111111] border border-transparent rounded-2xl text-sm focus:bg-white dark:bg-[#1A1A1A] focus:border-green-500 transition-all h-24"
                    />
                  </div>
                  
                  <div className="pt-4 flex gap-4">
                    <button 
                      type="button" 
                      onClick={() => setIsSettlementModalOpen(false)}
                      className="flex-1 px-8 py-4 text-gray-500 dark:text-gray-400 font-bold rounded-2xl hover:bg-gray-100 dark:bg-[#111111] transition-all"
                    >Cancel</button>
                    <button 
                      type="submit"
                      className="flex-[2] px-8 py-4 bg-green-600 text-white font-bold rounded-2xl hover:bg-green-700 transition-all shadow-xl shadow-green-100"
                    >Record Settlement</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* PDF Options Modal */}
          {pdfModalOpen && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/60" onClick={() => setPdfModalOpen(false)} />
              <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl shadow-2xl w-full max-w-md relative z-10 p-8 border-t-8 border-red-500">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                    <FileText className="h-6 w-6 text-red-500" /> Print Options
                  </h3>
                  <button onClick={() => setPdfModalOpen(false)}><X className="h-6 w-6 text-gray-400" /></button>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                  Select which documents you want to include in the generated PDF for <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{pdfBooking?.trackingId || pdfBooking?.bookingId}</span>
                </p>

                <div className="space-y-4 bg-gray-50 dark:bg-[#111111] p-5 rounded-2xl border border-gray-200 dark:border-white/10 mb-6">
                  <label className="flex items-center p-3.5 bg-white dark:bg-[#1A1A1A] rounded-xl border border-gray-200 dark:border-white/10 hover:border-red-300 transition-colors cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={pdfOptions.receipt}
                      onChange={(e) => setPdfOptions({ ...pdfOptions, receipt: e.target.checked })}
                      className="h-5 w-5 text-red-600 border-gray-300 dark:border-white/10 rounded focus:ring-red-500 cursor-pointer"
                    />
                    <div className="ml-3">
                      <span className="block text-sm font-bold text-gray-900 dark:text-white group-hover:text-red-700">Booking Receipt</span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">Official proof of booking and charges</span>
                    </div>
                  </label>

                  <label className="flex items-center p-3.5 bg-white dark:bg-[#1A1A1A] rounded-xl border border-gray-200 dark:border-white/10 hover:border-red-300 transition-colors cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={pdfOptions.label}
                      onChange={(e) => setPdfOptions({ ...pdfOptions, label: e.target.checked })}
                      className="h-5 w-5 text-red-600 border-gray-300 dark:border-white/10 rounded focus:ring-red-500 cursor-pointer"
                    />
                    <div className="ml-3">
                      <span className="block text-sm font-bold text-gray-900 dark:text-white group-hover:text-red-700">Shipping Label (A6)</span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">Compact label with QR code for the box</span>
                    </div>
                  </label>

                  <label className="flex items-center p-3.5 bg-white dark:bg-[#1A1A1A] rounded-xl border border-gray-200 dark:border-white/10 hover:border-red-300 transition-colors cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={pdfOptions.declaration}
                      onChange={(e) => setPdfOptions({ ...pdfOptions, declaration: e.target.checked })}
                      className="h-5 w-5 text-red-600 border-gray-300 dark:border-white/10 rounded focus:ring-red-500 cursor-pointer"
                    />
                    <div className="ml-3">
                      <span className="block text-sm font-bold text-gray-900 dark:text-white group-hover:text-red-700">Self-Declaration Form</span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">Legal declaration signed by sender</span>
                    </div>
                  </label>
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setPdfModalOpen(false)}
                    className="flex-1 px-6 py-3.5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 font-bold rounded-xl hover:bg-gray-50 dark:bg-[#111111] transition-all text-sm"
                  >
                    Cancel
                  </button>
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
                        link.setAttribute("download", `Booking_${pdfBooking?.trackingId || pdfBooking?.bookingId}.pdf`);
                        document.body.appendChild(link);
                        link.click();
                        link.remove();
                        setPdfModalOpen(false);
                        toast.success("PDF generated successfully");
                      } catch (error) {
                        toast.error("Failed to generate PDF");
                      }
                    }}
                    className="flex-[2] px-6 py-3.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg text-sm"
                  >
                    Download PDF
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Vendors
