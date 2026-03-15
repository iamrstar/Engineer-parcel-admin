"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import toast from "react-hot-toast"
import { Plus, Search, Edit, Trash2, ToggleLeft, ToggleRight } from "lucide-react"

export default function PincodesPage() {
  const [pincodes, setPincodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPincode, setEditingPincode] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [formData, setFormData] = useState({
    pincode: "",
    city: "",
    state: "",
  })

  useEffect(() => {
    fetchPincodes()
  }, [])

  const fetchPincodes = async () => {
    try {
      const response = await axios.get("/api/pincodes")
      setPincodes(response.data)
    } catch (error) {
      toast.error("Error fetching pincodes")
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingPincode) {
        await axios.put(`/api/pincodes/${editingPincode._id}`, formData)
        toast.success("Pincode updated successfully")
      } else {
        await axios.post("/api/pincodes", formData)
        toast.success("Pincode added successfully")
      }
      setShowModal(false)
      setEditingPincode(null)
      setFormData({ pincode: "", city: "", state: "" })
      fetchPincodes()
    } catch (error) {
      toast.error(error.response?.data?.message || "Error saving pincode")
    }
  }

  const handleEdit = (pincode) => {
    setEditingPincode(pincode)
    setFormData({
      pincode: pincode.pincode,
      city: pincode.city,
      state: pincode.state,
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this pincode?")) {
      try {
        await axios.delete(`/api/pincodes/${id}`)
        toast.success("Pincode deleted successfully")
        fetchPincodes()
      } catch (error) {
        toast.error("Error deleting pincode")
      }
    }
  }

  const handleToggleStatus = async (id) => {
    try {
      await axios.patch(`/api/pincodes/${id}/toggle`)
      toast.success("Pincode status updated")
      fetchPincodes()
    } catch (error) {
      toast.error("Error updating pincode status")
    }
  }

  const filteredPincodes = pincodes.filter(
    (pincode) =>
      pincode.pincode.includes(searchTerm) ||
      pincode.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pincode.state.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pincode Management</h1>
          <p className="text-gray-600">Manage serviceable pincodes</p>
        </div>
        <button
          onClick={() => {
            setEditingPincode(null)
            setFormData({ pincode: "", city: "", state: "" })
            setShowModal(true)
          }}
          className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Pincode
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search pincodes, cities, or states..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Pincodes Table */}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pincode
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    City
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    State
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPincodes.map((pincode) => (
                  <tr key={pincode._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{pincode.pincode}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{pincode.city}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{pincode.state}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          pincode.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}
                      >
                        {pincode.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button onClick={() => handleEdit(pincode)} className="text-primary-600 hover:text-primary-900">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(pincode._id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          {pincode.isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                        </button>
                        <button onClick={() => handleDelete(pincode._id)} className="text-red-600 hover:text-red-900">
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
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingPincode ? "Edit Pincode" : "Add New Pincode"}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600">
                    {editingPincode ? "Update" : "Add"} Pincode
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
