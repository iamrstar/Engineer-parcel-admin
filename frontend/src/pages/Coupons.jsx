import axios from "axios"
import { useState, useEffect } from "react"
import toast from "react-hot-toast"
import { Plus, Search, Edit, Trash2, ToggleLeft, ToggleRight, Calendar } from "lucide-react"
 
  
export default function CouponsPage() {
  const API_BASE = import.meta.env.VITE_API_URL;
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    discountType: "percentage",
    discountValue: "",
    minOrderValue: "",
    maxDiscountAmount: "",
    validFrom: "",
    validUntil: "",
    usageLimit: "",
  })



  // Set up the Authorization header (token handling)
  const token = localStorage.getItem("token")
  if (token) {
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`
  }



  const fetchCoupons = async () => {
  try {
    const response = await axios.get(`${API_BASE}/api/coupons`)
    console.log("Coupons fetched:", response.data)  // Log coupons to check
    setCoupons(response.data)
  } catch (error) {
    toast.error("Error fetching coupons")
    console.error("Error:", error)
  } finally {
    setLoading(false)
  }
}

  useEffect(() => {
    fetchCoupons()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const submitData = {
        ...formData,
        discountValue: Number.parseFloat(formData.discountValue),
        minOrderValue: formData.minOrderValue ? Number.parseFloat(formData.minOrderValue) : 0,
        maxDiscountAmount: formData.maxDiscountAmount ? Number.parseFloat(formData.maxDiscountAmount) : null,
        usageLimit: formData.usageLimit ? Number.parseInt(formData.usageLimit) : null,
      }

      if (editingCoupon) {
        await axios.put(`${API_BASE}/api/coupons/${editingCoupon._id}`, submitData)
        toast.success("Coupon updated successfully")
      } else {
        await axios.post(`${API_BASE}/api/coupons`, submitData)
        toast.success("Coupon created successfully")
      }
      setShowModal(false)
      setEditingCoupon(null)
      resetForm()
      fetchCoupons()
    } catch (error) {
      toast.error(error.response?.data?.message || "Error saving coupon")
    }
  }

  const resetForm = () => {
    setFormData({
      code: "",
      description: "",
      discountType: "percentage",
      discountValue: "",
      minOrderValue: "",
      maxDiscountAmount: "",
      validFrom: "",
      validUntil: "",
      usageLimit: "",
    })
  }

  const handleEdit = (coupon) => {
    setEditingCoupon(coupon)
    setFormData({
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue.toString(),
      minOrderValue: coupon.minOrderValue.toString(),
      maxDiscountAmount: coupon.maxDiscountAmount?.toString() || "",
      validFrom: new Date(coupon.validFrom).toISOString().split("T")[0],
      validUntil: new Date(coupon.validUntil).toISOString().split("T")[0],
      usageLimit: coupon.usageLimit?.toString() || "",
    })
    setShowModal(true)
  }

 const handleDelete = async (id) => {
  if (window.confirm("Are you sure you want to delete this coupon?")) {
    try {
      await axios.delete(`${API_BASE}/api/coupons/${id}`)
      toast.success("Coupon deleted successfully")
      fetchCoupons() // Refresh coupons after deletion
    } catch (error) {
      toast.error(error.response?.data?.message || "Error deleting coupon")
    }
  }
}



const handleToggleStatus = async (id) => {
  try {
    await axios.patch(`${API_BASE}/api/coupons/${id}/toggle`)
    toast.success("Coupon status updated")
    fetchCoupons() // Refresh coupons after toggling status
  } catch (error) {
    toast.error(error.response?.data?.message || "Error updating coupon status")
  }
}


  const filteredCoupons = coupons.filter(
    (coupon) =>
      coupon.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      coupon.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString()
  }

  const isExpired = (dateString) => {
    return new Date(dateString) < new Date()
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coupon Management</h1>
          <p className="text-gray-600">Create and manage discount coupons</p>
        </div>
        <button
          onClick={() => {
            setEditingCoupon(null)
            resetForm()
            setShowModal(true)
          }}
          className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Coupon
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search coupons..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Coupons Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valid Until</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usage</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCoupons.map((coupon) => (
                  <tr key={coupon._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{coupon.code}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-xs truncate">{coupon.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {coupon.discountType === "percentage" ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className={`flex items-center ${isExpired(coupon.validUntil) ? "text-red-600" : ""}`}>
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(coupon.validUntil)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {coupon.usageLimit ? `${coupon.usedCount}/${coupon.usageLimit}` : `${coupon.usedCount}/∞`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          coupon.isActive && !isExpired(coupon.validUntil)
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {coupon.isActive && !isExpired(coupon.validUntil) ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button onClick={() => handleEdit(coupon)} className="text-primary-600 hover:text-primary-900">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(coupon._id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          {coupon.isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                        </button>
                        <button onClick={() => handleDelete(coupon._id)} className="text-red-600 hover:text-red-900">
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingCoupon ? "Edit Coupon" : "Create New Coupon"}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Form inputs */}
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
