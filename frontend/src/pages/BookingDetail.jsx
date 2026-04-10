"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import axios from "axios"
import toast from "react-hot-toast"
import {
  ArrowLeft,
  Save,
  Package,
  User,
  MapPin,
  CreditCard,
  Truck,
  Bike,
  RefreshCw,
  Calendar
} from "lucide-react"



const BookingDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [riders, setRiders] = useState([])
  const [otherVendor, setOtherVendor] = useState(false)
  const [showETDPopup, setShowETDPopup] = useState(false)
  const [tempETD, setTempETD] = useState("")

  // Reschedule State
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false)
  const [rescheduleData, setRescheduleData] = useState({
    type: "pickup",
    date: "",
    slot: "Anytime",
    source: "customer"
  })
  const [rescheduleLoading, setRescheduleLoading] = useState(false)

  useEffect(() => {
    if (id) fetchBooking()
    fetchRiders()
  }, [id])

  const fetchRiders = async () => {
    try {
      const t = localStorage.getItem("adminToken") || localStorage.getItem("token")
      // Fetch riders, agents, and staff who can be assigned tasks
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/users?roles=rider,agent,staff`, {
        headers: { Authorization: `Bearer ${t}` }
      })
      setRiders(res.data.filter(r => r.isActive))
    } catch (e) {
      console.error("Failed to fetch riders", e)
    }
  }

  const handleAssignRider = async (riderId, assignedFor) => {
    try {
      const t = localStorage.getItem("adminToken") || localStorage.getItem("token")
      const res = await axios.put(`${import.meta.env.VITE_API_URL}/api/bookings/${id}/assign`, {
        riderId: riderId || null,
        assignedFor: assignedFor || "pickup"
      }, { headers: { Authorization: `Bearer ${t}` } })
      setBooking(res.data)
      toast.success(riderId ? "Rider assigned successfully" : "Rider unassigned")
    } catch (error) {
      toast.error("Failed to assign rider")
      console.error(error)
    }
  }

  const handleReschedule = async () => {
    try {
      const t = localStorage.getItem("adminToken") || localStorage.getItem("token")
      const res = await axios.put(`${import.meta.env.VITE_API_URL}/api/bookings/${id}/reschedule`, {}, {
        headers: { Authorization: `Bearer ${t}` }
      })
      setBooking(res.data)
      toast.success("Order rescheduled successfully. You can now reassign a rider.")
    } catch (error) {
      toast.error("Failed to reschedule order")
      console.error(error)
    }
  }

  const fetchBooking = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/bookings/${id}`)
      // const response = await axios.get(`http://localhost:8000/api/bookings/${id}`)
      setBooking(response.data)
    } catch (error) {
      toast.error("Error fetching booking details")
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await axios.put(`${import.meta.env.VITE_API_URL}/api/bookings/${id}`, booking)
      // await axios.put(`http://localhost:8000/api/bookings/${id}`, booking)
      toast.success("Booking updated successfully")
      setEditMode(false)
    } catch (error) {
      toast.error("Error updating booking")
      console.error("Error:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    const confirmDelete = window.confirm("Are you sure you want to delete this booking?");
    if (!confirmDelete) return;

    const confirmPermanentDelete = window.confirm(
      "This will permanently delete the booking. Do you want to proceed?"
    );
    if (!confirmPermanentDelete) return;

    try {
      const response = await axios.delete(`${import.meta.env.VITE_API_URL}/api/bookings/${id}`);
      // const response = await axios.delete(`http://localhost:8000/api/bookings/${id}`);

      if (response.data.success) {
        toast.success("Booking deleted successfully");
        navigate("/bookings");
      } else {
        toast.error(response.data.message || "Failed to delete booking");
      }
    } catch (error) {
      toast.error("Error deleting booking");
      console.error("Error:", error);
    }
  };

  const handleInputChange = (field, value, nested = null) => {
    if (nested) {
      setBooking((prev) => ({
        ...prev,
        [nested]: {
          ...prev?.[nested],
          [field]: value,
        },
      }))
    } else {
      setBooking((prev) => ({
        ...prev,
        [field]: value,
      }))
    }
  }

  const handleDimensionChange = (index, field, value) => {
    setBooking((prev) => {
      const newDimensions = [...(prev.packageDetails?.dimensions || [])];
      if (newDimensions[index]) {
        newDimensions[index] = { ...newDimensions[index], [field]: Number(value) || 0 };
      }
      return {
        ...prev,
        packageDetails: {
          ...prev.packageDetails,
          dimensions: newDimensions,
        },
      };
    });
  };

  const handleBoxQuantityChange = (qty) => {
    const newQty = parseInt(qty) || 1;
    setBooking((prev) => {
      const newDimensions = [...(prev.packageDetails?.dimensions || [])];

      if (newQty > newDimensions.length) {
        for (let i = newDimensions.length; i < newQty; i++) {
          newDimensions.push({ length: 0, width: 0, height: 0 });
        }
      } else if (newQty < newDimensions.length) {
        newDimensions.splice(newQty);
      }

      return {
        ...prev,
        packageDetails: {
          ...prev.packageDetails,
          boxQuantity: newQty,
          dimensions: newDimensions,
        },
      };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Booking not found</p>
      </div>
    )
  }

  return (
    <>
    <div className="p-3 sm:p-4 md:p-6">
      {/* Header Section - Now fully responsive */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4 mb-4">
          <button
            onClick={() => navigate("/bookings")}
            className="p-2 text-gray-600 hover:text-gray-900 shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Booking Details</h1>
            <p className="text-sm sm:text-base text-gray-600 truncate">Booking ID: {booking.bookingId || "N/A"}</p>
          </div>
        </div>

        {/* Action Buttons - Responsive Layout */}
        <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
          {editMode ? (
            <>
              <button
                onClick={() => setEditMode(false)}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full sm:w-auto px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 flex items-center justify-center text-sm sm:text-base"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  if (!booking.estimatedDelivery) {
                    setShowETDPopup(true);
                  } else {
                    setEditMode(true);
                    setOtherVendor(false);
                  }
                }}
                className="w-full sm:w-auto px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 text-sm sm:text-base"
              >
                Edit Booking
              </button>
              <button
                onClick={handleDelete}
                className="w-full sm:w-auto px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm sm:text-base"
              >
                Delete Booking
              </button>
              {booking.serviceType?.toLowerCase() === 'campus-parcel' && (
                <button
                  onClick={() => {
                    setRescheduleData({
                      type: "pickup",
                      date: booking.pickupDate ? new Date(booking.pickupDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                      slot: booking.pickupSlot || "Anytime",
                      source: "customer"
                    });
                    setRescheduleModalOpen(true);
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm sm:text-base flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                >
                  <Calendar className="h-4 w-4" />
                  Reschedule Timing
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Rider Assignment Section */}
      <div className="mb-4 sm:mb-6 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg shadow p-4 sm:p-6 border border-orange-200">
        <div className="flex items-center mb-3">
          <Bike className="h-5 w-5 text-orange-500 mr-2" />
          <h3 className="text-base sm:text-lg font-medium text-gray-900">Rider Assignment</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {booking.status === "pending" ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign Rider</label>
                <select
                  value={booking.assignedRider?._id || booking.assignedRider || ""}
                  onChange={(e) => handleAssignRider(e.target.value, booking.assignedFor || "pickup")}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
                >
                  <option value="">Unassigned</option>
                  {riders.map(r => (
                    <option key={r._id} value={r._id}>{r.name} ({r.phone})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned For</label>
                <select
                  value={booking.assignedFor || "pickup"}
                  onChange={(e) => handleAssignRider(booking.assignedRider?._id || booking.assignedRider, e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
                >
                  <option value="pickup">Pickup</option>
                  <option value="delivery">Delivery</option>
                  <option value="both">Both (Pickup & Delivery)</option>
                </select>
              </div>
            </>
          ) : (
            <div className="sm:col-span-2 flex items-center">
              <div className={`${booking.status === 'cancelled' ? 'bg-red-50 border-red-200' : 'bg-orange-100/50 border-orange-200'} border rounded-lg px-4 py-3 w-full`}>
                <p className={`text-sm ${booking.status === 'cancelled' ? 'text-red-800' : 'text-orange-800'} flex items-center`}>
                  <span className="font-bold mr-2">Order Status:</span>
                  <span className="capitalize">{booking.status}</span>
                </p>
                {booking.status === 'cancelled' && booking.rejectionReason && (
                  <p className="mt-2 p-2 bg-white/50 border border-red-100 rounded text-sm text-red-700 italic">
                    <span className="font-bold not-italic">REASON:</span> {booking.rejectionReason}
                  </p>
                )}
                <p className={`text-xs ${booking.status === 'cancelled' ? 'text-red-600' : 'text-orange-600'} mt-1`}>
                  {booking.status === 'cancelled'
                    ? "Order was rejected. Click 'Reschedule Order' if you want to make it assignable again."
                    : `Rider assignment is locked for ${booking.status} orders.`}
                </p>
                {booking.status === 'cancelled' && (
                  <button
                    onClick={handleReschedule}
                    className="mt-3 px-4 py-1.5 bg-green-600 text-white text-xs font-bold rounded-md hover:bg-green-700 shadow-sm flex items-center gap-1 w-fit"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Reschedule Order
                  </button>
                )}
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {booking.status === "pending" ? "Current Assignment" : "Assigned Rider"}
            </label>
            <div className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg h-[42px] flex items-center">
              {booking.assignedRider ? (
                <span className="inline-flex items-center gap-1.5 overflow-hidden">
                  <span className="w-2 h-2 rounded-full bg-green-500 shrink-0"></span>
                  <span className="text-green-700 font-bold truncate">
                    {typeof booking.assignedRider === 'object' ? booking.assignedRider.name : 'Rider Assigned'}
                  </span>
                  <span className="text-gray-500 text-xs shrink-0">— {booking.assignedFor || 'pickup'}</span>
                </span>
              ) : (
                <span className="text-gray-400">No rider assigned</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Sender Details */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center mb-4">
            <User className="h-5 w-5 text-primary-500 mr-2" />
            <h3 className="text-base sm:text-lg font-medium text-gray-900">Sender Details</h3>
          </div>
          <div className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              {editMode ? (
                <input
                  type="text"
                  value={booking.senderDetails.name}
                  onChange={(e) => handleInputChange("name", e.target.value, "senderDetails")}
                  className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              ) : (
                <p className="text-sm sm:text-base text-gray-900 break-words">{booking.senderDetails.name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              {editMode ? (
                <input
                  type="text"
                  value={booking.senderDetails.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value, "senderDetails")}
                  className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              ) : (
                <p className="text-sm sm:text-base text-gray-900">{booking.senderDetails.phone}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              {editMode ? (
                <input
                  type="email"
                  value={booking.senderDetails.email || ""}
                  onChange={(e) => handleInputChange("email", e.target.value, "senderDetails")}
                  className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              ) : (
                <p className="text-sm sm:text-base text-gray-900 break-words">{booking.senderDetails.email || "N/A"}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
              {editMode ? (
                <textarea
                  value={booking.senderDetails.address}
                  onChange={(e) => handleInputChange("address", e.target.value, "senderDetails")}
                  rows={2}
                  className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              ) : (
                <p className="text-sm sm:text-base text-gray-900 break-words">{booking.senderDetails.address}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2 (Optional)</label>
              {editMode ? (
                <input
                  type="text"
                  value={booking.senderDetails.address2 || ""}
                  onChange={(e) => handleInputChange("address2", e.target.value, "senderDetails")}
                  className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              ) : (
                <p className="text-sm sm:text-base text-gray-900 break-words">{booking.senderDetails.address2 || "N/A"}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                {editMode ? (
                  <input
                    type="text"
                    value={booking.senderDetails.pincode}
                    onChange={(e) => handleInputChange("pincode", e.target.value, "senderDetails")}
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                ) : (
                  <p className="text-sm sm:text-base text-gray-900">{booking.senderDetails.pincode}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                {editMode ? (
                  <input
                    type="text"
                    value={booking.senderDetails.city || ""}
                    onChange={(e) => handleInputChange("city", e.target.value, "senderDetails")}
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                ) : (
                  <p className="text-sm sm:text-base text-gray-900">{booking.senderDetails.city || "N/A"}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Receiver Details */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center mb-4">
            <MapPin className="h-5 w-5 text-primary-500 mr-2" />
            <h3 className="text-base sm:text-lg font-medium text-gray-900">Receiver Details</h3>
          </div>
          <div className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              {editMode ? (
                <input
                  type="text"
                  value={booking.receiverDetails.name}
                  onChange={(e) => handleInputChange("name", e.target.value, "receiverDetails")}
                  className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              ) : (
                <p className="text-sm sm:text-base text-gray-900 break-words">{booking.receiverDetails.name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              {editMode ? (
                <input
                  type="text"
                  value={booking.receiverDetails.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value, "receiverDetails")}
                  className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              ) : (
                <p className="text-sm sm:text-base text-gray-900">{booking.receiverDetails.phone}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              {editMode ? (
                <input
                  type="email"
                  value={booking.receiverDetails.email || ""}
                  onChange={(e) => handleInputChange("email", e.target.value, "receiverDetails")}
                  className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              ) : (
                <p className="text-sm sm:text-base text-gray-900 break-words">{booking.receiverDetails.email || "N/A"}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
              {editMode ? (
                <textarea
                  value={booking.receiverDetails.address}
                  onChange={(e) => handleInputChange("address", e.target.value, "receiverDetails")}
                  rows={2}
                  className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              ) : (
                <p className="text-sm sm:text-base text-gray-900 break-words">{booking.receiverDetails.address}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2 (Optional)</label>
              {editMode ? (
                <input
                  type="text"
                  value={booking.receiverDetails.address2 || ""}
                  onChange={(e) => handleInputChange("address2", e.target.value, "receiverDetails")}
                  className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              ) : (
                <p className="text-sm sm:text-base text-gray-900 break-words">{booking.receiverDetails.address2 || "N/A"}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                {editMode ? (
                  <input
                    type="text"
                    value={booking.receiverDetails.pincode}
                    onChange={(e) => handleInputChange("pincode", e.target.value, "receiverDetails")}
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                ) : (
                  <p className="text-sm sm:text-base text-gray-900">{booking.receiverDetails.pincode}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                {editMode ? (
                  <input
                    type="text"
                    value={booking.receiverDetails.city || ""}
                    onChange={(e) => handleInputChange("city", e.target.value, "receiverDetails")}
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                ) : (
                  <p className="text-sm sm:text-base text-gray-900">{booking.receiverDetails.city || "N/A"}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Vendor & Tracking Details */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 lg:col-span-2">
          <div className="flex items-center mb-4">
            <Truck className="h-5 w-5 text-primary-500 mr-2" />
            <h3 className="text-base sm:text-lg font-medium text-gray-900">Vendor & Tracking Details</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name</label>
              {editMode ? (
                <>
                  <select
                    value={otherVendor ? "other" : (booking.vendorName || "")}
                    onChange={(e) => {
                      if (e.target.value === "other") {
                        setOtherVendor(true)
                        handleInputChange("vendorName", "")
                      } else {
                        setOtherVendor(false)
                        handleInputChange("vendorName", e.target.value)
                      }
                    }}
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Vendor</option>
                    <option value="delhivery">Delhivery</option>
                    <option value="dtdc">DTDC</option>
                    <option value="bluedart">Blue Dart</option>
                    <option value="shiprocket">Shiprocket</option>
                    <option value="other">Other</option>
                  </select>
                  {otherVendor && (
                    <input
                      type="text"
                      value={booking.vendorName || ""}
                      onChange={(e) => handleInputChange("vendorName", e.target.value)}
                      placeholder="Type Vendor Name"
                      className="w-full mt-2 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  )}
                </>
              ) : (
                <p className="text-sm sm:text-base text-gray-900 capitalize">{booking.vendorName || "Not Assigned"}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Tracking ID</label>
              {editMode ? (
                <input
                  type="text"
                  value={booking.vendorTrackingId || ""}
                  onChange={(e) => handleInputChange("vendorTrackingId", e.target.value)}
                  className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g. AWB Number"
                />
              ) : (
                <p className="text-sm sm:text-base text-gray-900">{booking.vendorTrackingId || "Not Assigned"}</p>
              )}
            </div>
          </div>
        </div>

        {/* Logistics & Timing - ONLY FOR CAMPUS PARCEL */}
        {booking.serviceType === 'campus-parcel' && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6 lg:col-span-1">
            <div className="flex items-center mb-4">
              <Truck className="h-5 w-5 text-primary-500 mr-2" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900">Logistics & Picking</h3>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Method</label>
                  {editMode ? (
                    <select
                      value={booking.pickupMethod || "hub"}
                      onChange={(e) => handleInputChange("pickupMethod", e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="hub">Self (At Hub)</option>
                      <option value="doorstep">Doorstep Pickup</option>
                    </select>
                  ) : (
                    <p className="text-sm font-medium text-gray-900 capitalize">{booking.pickupMethod || "hub"}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Slot</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={booking.pickupSlot || ""}
                      onChange={(e) => handleInputChange("pickupSlot", e.target.value)}
                      placeholder="e.g. 10AM - 2PM"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">{booking.pickupSlot || "N/A"}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Date</label>
                {editMode ? (
                  <input
                    type="date"
                    value={booking.pickupDate ? new Date(booking.pickupDate).toISOString().split('T')[0] : ""}
                    onChange={(e) => handleInputChange("pickupDate", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                ) : (
                  <p className="text-sm text-gray-900">{booking.pickupDate ? new Date(booking.pickupDate).toLocaleDateString() : "N/A"}</p>
                )}
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Box/Material Delivery</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Type</label>
                    {editMode ? (
                      <select
                        value={booking.boxDeliveryType || "self"}
                        onChange={(e) => handleInputChange("boxDeliveryType", e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="self">Self Collection</option>
                        <option value="delivered">Company Delivered</option>
                      </select>
                    ) : (
                      <p className="text-sm font-medium text-gray-900 capitalize">{booking.boxDeliveryType || "self"}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Slot</label>
                    {editMode ? (
                      <input
                        type="text"
                        value={booking.boxDeliverySlot || ""}
                        onChange={(e) => handleInputChange("boxDeliverySlot", e.target.value)}
                        placeholder="e.g. Afternoon"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    ) : (
                      <p className="text-sm text-gray-900">{booking.boxDeliverySlot || "N/A"}</p>
                    )}
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Box Delivery Date</label>
                  {editMode ? (
                    <input
                      type="date"
                      value={booking.boxDeliveryDate ? new Date(booking.boxDeliveryDate).toISOString().split('T')[0] : ""}
                      onChange={(e) => handleInputChange("boxDeliveryDate", e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">{booking.boxDeliveryDate ? new Date(booking.boxDeliveryDate).toLocaleDateString() : "N/A"}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Package Details */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center mb-4">
            <Package className="h-5 w-5 text-primary-500 mr-2" />
            <h3 className="text-base sm:text-lg font-medium text-gray-900">Package Details</h3>
          </div>
          <div className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Weight</label>
                {editMode ? (
                  <div className="flex">
                    <input
                      type="number"
                      value={booking.packageDetails.weight}
                      onChange={(e) => handleInputChange("weight", Number.parseFloat(e.target.value), "packageDetails")}
                      className="flex-1 px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-primary-500"
                    />
                    <select
                      value={booking.packageDetails.weightUnit}
                      onChange={(e) => handleInputChange("weightUnit", e.target.value, "packageDetails")}
                      className="px-2 sm:px-3 py-2 text-sm sm:text-base border border-l-0 border-gray-300 rounded-r-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="g">g</option>
                      <option value="kg">kg</option>
                    </select>
                  </div>
                ) : (
                  <p className="text-sm sm:text-base text-gray-900">
                    {booking.packageDetails.weight} {booking.packageDetails.weightUnit}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                {editMode ? (
                  <select
                    value={booking.serviceType}
                    onChange={(e) => handleInputChange("serviceType", e.target.value)}
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="courier">Courier</option>
                    <option value="shifting">Shifting</option>
                    <option value="local">Local</option>
                    <option value="international">International</option>
                    <option value="surface">Surface</option>
                    <option value="air">Air</option>
                    <option value="express">Express</option>
                    <option value="premium">Premium</option>
                  </select>
                ) : (
                  <p className="text-sm sm:text-base text-gray-900 capitalize">{booking.serviceType}</p>
                )}
              </div>
            </div>
            <div className="border-t pt-4 mt-2">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-gray-700">Dimensions</label>
                {editMode ? (
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] uppercase font-bold text-gray-400">Box Quantity:</label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={booking.packageDetails?.boxQuantity || 1}
                      onChange={(e) => handleBoxQuantityChange(e.target.value)}
                      className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 outline-none font-bold text-center"
                    />
                  </div>
                ) : (
                  <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full font-bold text-gray-500 border border-gray-200 uppercase">
                    {booking.packageDetails?.boxQuantity || 1} Box{(booking.packageDetails?.boxQuantity || 1) > 1 ? 'es' : ''}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3">
                {editMode ? (
                  (booking.packageDetails?.dimensions || []).map((dim, idx) => (
                    <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-200 shadow-sm relative pt-6">
                      <span className="absolute top-2 left-2 bg-orange-100 text-orange-600 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold border border-orange-200">
                        {idx + 1}
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] uppercase text-gray-400 font-bold mb-1">Length</label>
                          <input
                            type="number"
                            value={dim.length || 0}
                            onChange={(e) => handleDimensionChange(idx, "length", e.target.value)}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase text-gray-400 font-bold mb-1">Width</label>
                          <input
                            type="number"
                            value={dim.width || 0}
                            onChange={(e) => handleDimensionChange(idx, "width", e.target.value)}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase text-gray-400 font-bold mb-1">Height</label>
                          <input
                            type="number"
                            value={dim.height || 0}
                            onChange={(e) => handleDimensionChange(idx, "height", e.target.value)}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  booking.packageDetails?.dimensions && Array.isArray(booking.packageDetails.dimensions) ? (
                    booking.packageDetails.dimensions.map((dim, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded border border-gray-100">
                        <span className="w-5 h-5 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-[10px] font-bold">{idx + 1}</span>
                        <span className="font-semibold">{dim.length || 0}</span>
                        <span className="text-gray-400">×</span>
                        <span className="font-semibold">{dim.width || 0}</span>
                        <span className="text-gray-400">×</span>
                        <span className="font-semibold">{dim.height || 0}</span>
                        <span className="text-gray-400 ml-1">cm</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm bg-gray-50 p-2 rounded border border-gray-100 flex items-center gap-2">
                      <span className="w-5 h-5 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-[10px] font-bold">1</span>
                      <span className="font-semibold">{booking.packageDetails?.dimensions?.length || 0}</span>
                      <span className="text-gray-400">×</span>
                      <span className="font-semibold">{booking.packageDetails?.dimensions?.width || 0}</span>
                      <span className="text-gray-400">×</span>
                      <span className="font-semibold">{booking.packageDetails?.dimensions?.height || 0}</span>
                      <span className="text-gray-400 ml-1">cm</span>
                    </div>
                  )
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              {editMode ? (
                <textarea
                  value={booking.packageDetails.description || ""}
                  onChange={(e) => handleInputChange("description", e.target.value, "packageDetails")}
                  rows={2}
                  className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              ) : (
                <p className="text-sm sm:text-base text-gray-900 break-words">{booking.packageDetails.description || "N/A"}</p>
              )}
            </div>

            {/* Content Display - NEW */}
            {(booking.packageDetails?.edlContents?.length > 0 || booking.packageDetails?.otherContentText || editMode) && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <label className="block text-xs font-bold text-blue-600 uppercase mb-2">Package Contents</label>
                {booking.packageDetails?.edlContents?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {booking.packageDetails.edlContents.map((content, idx) => (
                      <span key={idx} className="bg-white px-2 py-0.5 rounded text-[11px] font-medium text-blue-700 border border-blue-200">
                        {content}
                      </span>
                    ))}
                  </div>
                )}
                {editMode ? (
                  <div className="mt-2 text-xs">
                    <label className="block text-gray-400 font-bold mb-1 uppercase tracking-tighter">Other / Custom Content</label>
                    <input
                      type="text"
                      value={booking.packageDetails?.otherContentText || ""}
                      onChange={(e) => handleInputChange("otherContentText", e.target.value, "packageDetails")}
                      placeholder="e.g. Special documents"
                      className="w-full px-2 py-1.5 border border-blue-200 rounded focus:ring-1 focus:ring-blue-500 outline-none italic"
                    />
                  </div>
                ) : (
                  booking.packageDetails?.otherContentText && (
                    <p className="text-xs text-blue-800 bg-white p-2 rounded border border-blue-100 italic">
                      <span className="font-bold not-italic mr-1">Other:</span> {booking.packageDetails.otherContentText}
                    </p>
                  )
                )}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              {editMode ? (
                <select
                  value={booking.status}
                  onChange={(e) => handleInputChange("status", e.target.value)}
                  className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="picked">Picked</option>
                  <option value="in-transit">In Transit</option>
                  <option value="out-for-delivery">Out for Delivery</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              ) : (
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${booking.status === "delivered"
                    ? "bg-green-100 text-green-800"
                    : booking.status === "cancelled"
                      ? "bg-red-100 text-red-800"
                      : booking.status === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                >
                  {booking.status}
                </span>
              )}
            </div>
          </div>
        </div>


        {/* Pricing Details */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center mb-4">
            <CreditCard className="h-5 w-5 text-primary-500 mr-2" />
            <h3 className="text-base sm:text-lg font-medium text-gray-900">Pricing & Payment</h3>
          </div>
          <div className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Base Price</label>
                {editMode ? (
                  <input
                    type="number"
                    value={booking.pricing?.basePrice || 0}
                    onChange={(e) => handleInputChange("basePrice", Number(e.target.value), "pricing")}
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                ) : (
                  <p className="text-sm sm:text-base text-gray-900">₹{booking.pricing?.basePrice || 0}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Packaging</label>
                {editMode ? (
                  <input
                    type="number"
                    value={booking.pricing?.packagingCharge || 0}
                    onChange={(e) => handleInputChange("packagingCharge", Number(e.target.value), "pricing")}
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                ) : (
                  <p className="text-sm sm:text-base text-gray-900">₹{booking.pricing?.packagingCharge || 0}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax</label>
                {editMode ? (
                  <input
                    type="number"
                    value={booking.pricing?.tax || 0}
                    onChange={(e) => handleInputChange("tax", Number(e.target.value), "pricing")}
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                ) : (
                  <p className="text-sm sm:text-base text-gray-900">₹{booking.pricing?.tax || 0}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
                {editMode ? (
                  <input
                    type="number"
                    value={booking.pricing?.totalAmount || 0}
                    onChange={(e) => handleInputChange("totalAmount", Number(e.target.value), "pricing")}
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 font-semibold"
                  />
                ) : (
                  <p className="text-base sm:text-lg font-semibold text-gray-900">₹{booking.pricing?.totalAmount || 0}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                {editMode ? (
                  <select
                    value={booking.paymentStatus}
                    onChange={(e) => handleInputChange("paymentStatus", e.target.value)}
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="failed">Failed</option>
                    <option value="refunded">Refunded</option>
                  </select>
                ) : (
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${booking.paymentStatus === "paid"
                      ? "bg-green-100 text-green-800"
                      : booking.paymentStatus === "failed"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                      }`}
                  >
                    {booking.paymentStatus}
                  </span>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                {editMode ? (
                  <select
                    value={booking.paymentMethod}
                    onChange={(e) => handleInputChange("paymentMethod", e.target.value)}
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="COD">Cash on Delivery</option>
                    <option value="online">Online</option>
                  </select>
                ) : (
                  <p className="text-sm sm:text-base text-gray-900">{booking.paymentMethod}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {(booking.notes || editMode) && (
        <div className="mt-4 sm:mt-6 bg-white rounded-lg shadow p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4">Notes</h3>
          {editMode ? (
            <textarea
              value={booking.notes || ""}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Add notes..."
            />
          ) : (
            <p className="text-sm sm:text-base text-gray-900">{booking.notes || "No notes available"}</p>
          )}
        </div>
      )}




      {/* Tracking History Section */}



      {/* Tracking History Section */}
      {/* Estimated Delivery Section */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Estimated Delivery (ETD)
        </h3>
        {editMode ? (
          <input
            type="text"
            value={booking.estimatedDelivery || ""}
            onChange={(e) => handleInputChange("estimatedDelivery", e.target.value)}
            placeholder="e.g. 3-5 Business Days or March 30"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        ) : (
          <p className="text-gray-900">
            {booking.estimatedDelivery || "No ETD assigned"}
          </p>
        )}
      </div>

      {/* ETD Missing Popup */}
      {showETDPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Missing Estimated Delivery</h3>
            <p className="text-gray-600 mb-6 text-sm">
              The Estimated Delivery (ETD) has not been set for this booking yet. Please provide it now or continue anyway.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Delivery Time</label>
                <input
                  type="text"
                  placeholder="e.g. 3-5 Business Days"
                  value={tempETD}
                  onChange={(e) => setTempETD(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={() => {
                    if (tempETD.trim()) {
                      handleInputChange("estimatedDelivery", tempETD);
                    }
                    setShowETDPopup(false);
                    setEditMode(true);
                  }}
                  className="w-full py-2.5 bg-primary-600 text-white font-bold rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Save & Edit
                </button>
                <button
                  onClick={() => {
                    setShowETDPopup(false);
                    setEditMode(true);
                  }}
                  className="w-full py-2.5 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Edit Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Tracking History</h3>

        {Array.isArray(booking?.trackingHistory) && booking.trackingHistory.length > 0 ? (
          <div className="space-y-4">
            {booking.trackingHistory.map((track, index) => (
              <div key={index} className="border-b pb-2">
                {track.editing ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                      <input
                        type="text"
                        value={track.status}
                        onChange={(e) =>
                          setBooking((prev) => {
                            const newHistory = [...prev.trackingHistory]
                            newHistory[index].status = e.target.value
                            return { ...prev, trackingHistory: newHistory }
                          })
                        }
                        className="w-full px-2 py-1 border rounded"
                      />
                      <input
                        type="text"
                        value={track.location}
                        onChange={(e) =>
                          setBooking((prev) => {
                            const newHistory = [...prev.trackingHistory]
                            newHistory[index].location = e.target.value
                            return { ...prev, trackingHistory: newHistory }
                          })
                        }
                        className="w-full px-2 py-1 border rounded"
                      />
                    </div>
                    <textarea
                      value={track.description}
                      onChange={(e) =>
                        setBooking((prev) => {
                          const newHistory = [...prev.trackingHistory]
                          newHistory[index].description = e.target.value
                          return { ...prev, trackingHistory: newHistory }
                        })
                      }
                      rows={2}
                      className="w-full px-2 py-1 border rounded mb-2"
                    />
                    <div className="mb-2">
                      <input
                        type="datetime-local"
                        value={(() => {
                          if (!track.timestamp) return "";
                          try {
                            const date = new Date(track.timestamp);
                            if (isNaN(date.getTime())) return "";
                            date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
                            return date.toISOString().slice(0, 16);
                          } catch (e) {
                            return "";
                          }
                        })()}
                        onChange={(e) =>
                          setBooking((prev) => {
                            const newHistory = [...prev.trackingHistory]
                            // Convert the datetime-local back to a JS Date object
                            newHistory[index].timestamp = e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString();
                            return { ...prev, trackingHistory: newHistory }
                          })
                        }
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          try {
                            setSaving(true)
                            let url = `${import.meta.env.VITE_API_URL}/api/bookings/${id}/tracking`;
                            if (track._id) {
                              url = `${import.meta.env.VITE_API_URL}/api/bookings/${id}/tracking/${track._id}`;
                            }

                            const response = await axios.put(url, track)
                            toast.success("Tracking updated successfully")

                            // update booking state cleanly with latest from server
                            setBooking(response.data)
                          } catch (err) {
                            console.error(err)
                            toast.error("Failed to update tracking")
                          } finally {
                            setSaving(false)
                          }
                        }}
                        className="px-3 py-1 bg-primary-500 text-white rounded hover:bg-primary-600"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setBooking((prev) => {
                            const newHistory = [...prev.trackingHistory]
                            newHistory[index].editing = false
                            return { ...prev, trackingHistory: newHistory }
                          })
                        }}
                        className="px-3 py-1 border rounded hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Status:</span> {track?.status || "—"}
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Location:</span> {track?.location || "—"}
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Description:</span> {track?.description || "—"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {track?.timestamp ? new Date(track.timestamp).toLocaleString() : "—"}
                    </p>
                    {editMode && (
                      <div className="flex items-center gap-3 mt-1">
                        <button
                          onClick={() =>
                            setBooking((prev) => {
                              const newHistory = [...prev.trackingHistory]
                              newHistory[index].editing = true
                              return { ...prev, trackingHistory: newHistory }
                            })
                          }
                          className="px-2 py-1 text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={async () => {
                            if (!window.confirm("Are you sure you want to completely delete this tracking update? This cannot be undone.")) return;
                            try {
                              setSaving(true);
                              const targetUrl = track._id
                                ? `${import.meta.env.VITE_API_URL}/api/bookings/${id}/tracking/${track._id}`
                                : `${import.meta.env.VITE_API_URL}/api/bookings/${id}/tracking`; // fallback though rare

                              if (!track._id) {
                                toast.error("Cannot delete a tracking item without ID");
                                return;
                              }

                              const response = await axios.delete(targetUrl);
                              toast.success("Tracking update deleted");
                              setBooking(response.data);
                            } catch (err) {
                              console.error(err);
                              toast.error("Failed to delete tracking update");
                            } finally {
                              setSaving(false);
                            }
                          }}
                          className="px-2 py-1 text-sm text-red-600 hover:text-red-800 hover:underline font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No tracking updates yet.</p>
        )}

        {/* Quick Tracking Entry Form (Always Visible) */}
      </div>

      <div className="mt-6 bg-orange-50 border border-orange-200 rounded-lg shadow-sm p-4 sm:p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-2 h-full bg-primary-500"></div>

        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
            <Truck className="w-5 h-5 mr-2 text-primary-500" />
            Quick Tracking Update
          </h3>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
            Manual Entry
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4">
          {/* Status */}
          <div className="col-span-1 md:col-span-2">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={booking?.newStatus || ""}
              onChange={(e) => setBooking((prev) => ({ ...prev, newStatus: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500 bg-white"
            >
              <option value="" disabled>Select...</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Booked</option>
              <option value="picked">Picked</option>
              <option value="in-transit">In Transit</option>
              <option value="reached">Reached destination</option>
              <option value="out-for-delivery">Out for Delivery</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Location */}
          <div className="col-span-1 md:col-span-2">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              placeholder="e.g. Delhi Hub"
              value={booking?.newLocation || ""}
              onChange={(e) => setBooking((prev) => ({ ...prev, newLocation: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Description */}
          <div className="col-span-1 md:col-span-3">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Notes / Description (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Out for delivery"
              value={booking?.newDescription || ""}
              onChange={(e) => setBooking((prev) => ({ ...prev, newDescription: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:ring-1 focus:ring-primary-500"
              list="desc-templates"
            />
            <datalist id="desc-templates">
              <option value="Item reached your nearest location" />
              <option value="Out for delivery" />
              <option value="Item moved to next destination" />
              <option value="Connected to next facility" />
              <option value="Item left to facility" />
              <option value="Order canceled" />
              <option value="Item delivered successfully" />
            </datalist>
          </div>

          {/* DateTime Selection */}
          <div className="col-span-1 md:col-span-3">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Date & Time</label>
            <input
              type="datetime-local"
              value={booking?.newTimestamp || (() => {
                const now = new Date();
                now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                return now.toISOString().slice(0, 16);
              })()}
              onChange={(e) => setBooking((prev) => ({ ...prev, newTimestamp: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:ring-1 focus:ring-primary-500"
            />
          </div>


          {/* Submit Button */}
          <div className="col-span-1 md:col-span-2 flex items-end">
            <button
              onClick={async () => {
                try {
                  const { newStatus, newLocation, newDescription, newTimestamp } = booking || {};

                  if (!newStatus || !newLocation) return toast.error("Status and Location are required");

                  // Use custom timestamp if provided, otherwise current time
                  const finalTimestamp = newTimestamp ? new Date(newTimestamp) : new Date();

                  const trackingUpdate = {
                    status: newStatus,
                    location: newLocation,
                    description: newDescription || "Tracking Updated",
                    timestamp: finalTimestamp,
                  };

                  setSaving(true);
                  const response = await axios.put(
                    `${import.meta.env.VITE_API_URL}/api/bookings/${id}/tracking`,
                    trackingUpdate
                  );

                  toast.success("Tracking event logged successfully");

                  const updated = response?.data;
                  const latestEntry = Array.isArray(updated?.trackingHistory)
                    ? updated.trackingHistory[updated.trackingHistory.length - 1]
                    : trackingUpdate;

                  setBooking((prev) => ({
                    ...prev,
                    status: newStatus,
                    trackingHistory: [...(prev?.trackingHistory || []), latestEntry],
                    newStatus: "",
                    newLocation: "",
                    newDescription: "",
                    newTimestamp: "",
                  }));
                } catch (err) {
                  console.error(err);
                  toast.error("Failed to add tracking update");
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
              className="w-full px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 transition flex items-center justify-center disabled:opacity-60"
            >
              {saving ? "Saving..." : "Quick Add"}
            </button>
          </div>
        </div>

      </div>





    </div >

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
                        Update the pickup or delivery schedule for <span className="font-mono font-bold text-gray-700">{booking?.bookingId}</span>
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
                            ? (booking?.pickupDate ? new Date(booking.pickupDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not set')
                            : (booking?.boxDeliveryDate ? new Date(booking.boxDeliveryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not set')}
                        </p>
                        <p className="text-[10px] text-gray-500 font-medium">
                          Slot: {rescheduleData.type === 'pickup' ? booking?.pickupSlot : (booking?.boxDeliverySlot || 'No slot selected')}
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
                      const response = await axios.put(
                        `${import.meta.env.VITE_API_URL}/api/bookings/${booking?._id}/reschedule-campus`,
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
                      setBooking(response.data) // Update local state
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
    </>
  )
}

export default BookingDetail
