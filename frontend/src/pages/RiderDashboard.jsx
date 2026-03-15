import { useState, useEffect } from "react"
import { Navigate } from "react-router-dom"
import axios from "axios"
import toast from "react-hot-toast"
import { useAuth } from "../contexts/AuthContext"
import { Package, Bike, MapPin, Phone, CheckCircle, Truck, Clock, Search } from "lucide-react"

const RiderDashboard = () => {
    const { user, logout, isAuthenticated } = useAuth()
    const [assignedOrders, setAssignedOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")

    const riderId = user?.id || user?._id

    useEffect(() => {
        if (riderId) {
            fetchAssignedOrders()
        }
    }, [riderId])

    const fetchAssignedOrders = async () => {
        try {
            setLoading(true)
            const token = localStorage.getItem("token") || localStorage.getItem("adminToken")
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/bookings/assigned/${riderId}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setAssignedOrders(res.data)
        } catch (error) {
            toast.error("Failed to fetch assigned orders")
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleAction = async (bookingId, action) => {
        if (!window.confirm(`Are you sure you want to mark this order as ${action}?`)) return

        try {
            const token = localStorage.getItem("token") || localStorage.getItem("adminToken")
            await axios.put(`${import.meta.env.VITE_API_URL}/api/bookings/${bookingId}/rider-action`,
                { action, riderId },
                { headers: { Authorization: `Bearer ${token}` } }
            )
            toast.success(`Order marked as ${action} successfully`)
            fetchAssignedOrders() // Refresh list
        } catch (error) {
            toast.error(error.response?.data?.message || `Failed to mark as ${action}`)
            console.error(error)
        }
    }

    if (!isAuthenticated) return <Navigate to="/login" />
    if (user?.role !== "rider" && user?.role !== "admin") {
        // Basic protection - if not admin or rider, they shouldn't be here
        // But since admin can also see it, it's fine
    }

    const filteredOrders = assignedOrders.filter(order =>
        order.bookingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.senderDetails?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.receiverDetails?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Rider Header */}
            <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-4 flex justify-between items-center sm:px-6 lg:px-8">
                <div className="flex items-center gap-2">
                    <Bike className="h-8 w-8 text-primary-500" />
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Rider Dashboard</h1>
                        <p className="text-sm text-gray-500">Welcome, {user?.name || "Rider"}</p>
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="text-sm font-medium text-red-600 hover:text-red-800"
                >
                    Logout
                </button>
            </header>

            <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
                {/* Search & Stats */}
                <div className="mb-6 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by ID or name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 bg-white"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
                            <div className="bg-blue-100 p-2 rounded-lg">
                                <Clock className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-bold">Assigned</p>
                                <p className="text-xl font-bold">{assignedOrders.length}</p>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
                            <div className="bg-green-100 p-2 rounded-lg">
                                <CheckCircle className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-bold">My Status</p>
                                <p className="text-sm font-bold text-green-600">Online</p>
                            </div>
                        </div>
                    </div>
                </div>

                <h2 className="text-lg font-bold text-gray-900 mb-4 px-1">My Tasks</h2>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500"></div>
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 py-12 px-4 text-center">
                        <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">No tasks assigned to you right now</p>
                        <button
                            onClick={fetchAssignedOrders}
                            className="mt-4 text-primary-500 font-bold hover:underline"
                        >
                            Refresh List
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredOrders.map((order) => (
                            <div key={order._id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                {/* Order Header */}
                                <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                                    <span className="font-mono text-xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded border border-primary-100">
                                        {order.bookingId}
                                    </span>
                                    <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded ${order.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                                        order.status === 'picked' ? 'bg-purple-100 text-purple-700' :
                                            'bg-yellow-100 text-yellow-700'
                                        }`}>
                                        {order.status}
                                    </span>
                                </div>

                                <div className="p-4 space-y-4">
                                    {/* Sender Info (Pickup) */}
                                    <div className="flex gap-3">
                                        <div className="bg-orange-100 p-2 rounded-full h-fit mt-1">
                                            <MapPin className="h-4 w-4 text-orange-600" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[10px] text-gray-500 uppercase font-bold">Pick-up From</p>
                                            <p className="font-bold text-gray-900">{order.senderDetails?.name}</p>
                                            <p className="text-sm text-gray-600 leading-tight mt-0.5">{order.senderDetails?.address1 || "No address"}</p>
                                            <a href={`tel:${order.senderDetails?.phone}`} className="inline-flex items-center gap-1 mt-2 text-primary-600 font-bold text-sm">
                                                <Phone className="h-3 w-3" /> {order.senderDetails?.phone}
                                            </a>
                                        </div>
                                    </div>

                                    <div className="border-t border-gray-50 pt-3 flex gap-3">
                                        <div className="bg-green-100 p-2 rounded-full h-fit mt-1">
                                            <Truck className="h-4 w-4 text-green-600" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[10px] text-gray-500 uppercase font-bold">Deliver To</p>
                                            <p className="font-bold text-gray-900">{order.receiverDetails?.name}</p>
                                            <p className="text-sm text-gray-600 leading-tight mt-0.5">{order.receiverDetails?.address1 || "No address"}</p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="pt-2 flex flex-col gap-2">
                                        {order.status === 'confirmed' && (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleAction(order._id, 'picked')}
                                                    className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-100 flex items-center justify-center gap-2"
                                                >
                                                    <CheckCircle className="h-5 w-5" /> Pickup Done
                                                </button>
                                                <button
                                                    onClick={() => handleAction(order._id, 'cancelled')}
                                                    className="flex-1 bg-red-100 text-red-600 font-bold py-3 rounded-xl hover:bg-red-200 transition-colors border border-red-200 flex items-center justify-center gap-2"
                                                >
                                                    <Clock className="h-5 w-5" /> Pickup Rejected
                                                </button>
                                            </div>
                                        )}
                                        {order.status === 'picked' && (
                                            <button
                                                onClick={() => handleAction(order._id, 'delivered')}
                                                className="w-full bg-primary-600 text-white font-bold py-3 rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-100 flex items-center justify-center gap-2"
                                            >
                                                <Truck className="h-5 w-5" /> Mark Delivered
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}

export default RiderDashboard
