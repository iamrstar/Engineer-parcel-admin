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
  CreditCard
} from "lucide-react"



const BookingDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)

  useEffect(() => {
    if (id) fetchBooking()
  }, [id])

 const fetchBooking = async () => {
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/bookings/${id}`)
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
    toast.success("Booking updated successfully")
    setEditMode(false)
  } catch (error) {
    toast.error("Error updating booking")
    console.error("Error:", error)
  } finally {
    setSaving(false)
  }
}

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
    <div className="p-4">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate("/bookings")}
            className="mr-4 p-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Booking Details</h1>
            <p className="text-gray-600">Booking ID: {booking.bookingId || "N/A"}</p>
          </div>
        </div>
        <div className="flex space-x-3">
          {editMode ? (
            <>
              <button
                onClick={() => setEditMode(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 flex items-center"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditMode(true)}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
            >
              Edit Booking
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sender Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <User className="h-5 w-5 text-primary-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Sender Details</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              {editMode ? (
                <input
                  type="text"
                  value={booking.senderDetails.name}
                  onChange={(e) => handleInputChange("name", e.target.value, "senderDetails")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              ) : (
                <p className="text-gray-900">{booking.senderDetails.name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              {editMode ? (
                <input
                  type="text"
                  value={booking.senderDetails.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value, "senderDetails")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              ) : (
                <p className="text-gray-900">{booking.senderDetails.phone}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              {editMode ? (
                <input
                  type="email"
                  value={booking.senderDetails.email || ""}
                  onChange={(e) => handleInputChange("email", e.target.value, "senderDetails")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              ) : (
                <p className="text-gray-900">{booking.senderDetails.email || "N/A"}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              {editMode ? (
                <textarea
                  value={booking.senderDetails.address}
                  onChange={(e) => handleInputChange("address", e.target.value, "senderDetails")}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              ) : (
                <p className="text-gray-900">{booking.senderDetails.address}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                {editMode ? (
                  <input
                    type="text"
                    value={booking.senderDetails.pincode}
                    onChange={(e) => handleInputChange("pincode", e.target.value, "senderDetails")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                ) : (
                  <p className="text-gray-900">{booking.senderDetails.pincode}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                {editMode ? (
                  <input
                    type="text"
                    value={booking.senderDetails.city || ""}
                    onChange={(e) => handleInputChange("city", e.target.value, "senderDetails")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                ) : (
                  <p className="text-gray-900">{booking.senderDetails.city || "N/A"}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Receiver Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <MapPin className="h-5 w-5 text-primary-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Receiver Details</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              {editMode ? (
                <input
                  type="text"
                  value={booking.receiverDetails.name}
                  onChange={(e) => handleInputChange("name", e.target.value, "receiverDetails")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              ) : (
                <p className="text-gray-900">{booking.receiverDetails.name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              {editMode ? (
                <input
                  type="text"
                  value={booking.receiverDetails.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value, "receiverDetails")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              ) : (
                <p className="text-gray-900">{booking.receiverDetails.phone}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              {editMode ? (
                <input
                  type="email"
                  value={booking.receiverDetails.email || ""}
                  onChange={(e) => handleInputChange("email", e.target.value, "receiverDetails")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              ) : (
                <p className="text-gray-900">{booking.receiverDetails.email || "N/A"}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              {editMode ? (
                <textarea
                  value={booking.receiverDetails.address}
                  onChange={(e) => handleInputChange("address", e.target.value, "receiverDetails")}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              ) : (
                <p className="text-gray-900">{booking.receiverDetails.address}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                {editMode ? (
                  <input
                    type="text"
                    value={booking.receiverDetails.pincode}
                    onChange={(e) => handleInputChange("pincode", e.target.value, "receiverDetails")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                ) : (
                  <p className="text-gray-900">{booking.receiverDetails.pincode}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                {editMode ? (
                  <input
                    type="text"
                    value={booking.receiverDetails.city || ""}
                    onChange={(e) => handleInputChange("city", e.target.value, "receiverDetails")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                ) : (
                  <p className="text-gray-900">{booking.receiverDetails.city || "N/A"}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Package Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Package className="h-5 w-5 text-primary-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Package Details</h3>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Weight</label>
                {editMode ? (
                  <div className="flex">
                    <input
                      type="number"
                      value={booking.packageDetails.weight}
                      onChange={(e) => handleInputChange("weight", Number.parseFloat(e.target.value), "packageDetails")}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-primary-500"
                    />
                    <select
                      value={booking.packageDetails.weightUnit}
                      onChange={(e) => handleInputChange("weightUnit", e.target.value, "packageDetails")}
                      className="px-3 py-2 border border-l-0 border-gray-300 rounded-r-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="g">g</option>
                      <option value="kg">kg</option>
                    </select>
                  </div>
                ) : (
                  <p className="text-gray-900">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
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
                  <p className="text-gray-900 capitalize">{booking.serviceType}</p>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              ) : (
                <p className="text-gray-900">{booking.packageDetails.description || "N/A"}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              {editMode ? (
                <select
                  value={booking.status}
                  onChange={(e) => handleInputChange("status", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
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
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    booking.status === "delivered"
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
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <CreditCard className="h-5 w-5 text-primary-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Pricing & Payment</h3>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Base Price</label>
                <p className="text-gray-900">₹{booking.pricing?.basePrice || 0}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Charges</label>
                <p className="text-gray-900">₹{booking.pricing?.additionalCharges || 0}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax</label>
                <p className="text-gray-900">₹{booking.pricing?.tax || 0}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
                <p className="text-lg font-semibold text-gray-900">₹{booking.pricing?.totalAmount || 0}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                {editMode ? (
                  <select
                    value={booking.paymentStatus}
                    onChange={(e) => handleInputChange("paymentStatus", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="failed">Failed</option>
                    <option value="refunded">Refunded</option>
                  </select>
                ) : (
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      booking.paymentStatus === "paid"
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
                <p className="text-gray-900">{booking.paymentMethod}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {(booking.notes || editMode) && (
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Notes</h3>
          {editMode ? (
            <textarea
              value={booking.notes || ""}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Add notes..."
            />
          ) : (
            <p className="text-gray-900">{booking.notes || "No notes available"}</p>
          )}
        </div>
      )}
    </div>
  )
}

export default BookingDetail
