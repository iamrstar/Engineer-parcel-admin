"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import toast from "react-hot-toast"
import {
    Package,
    MapPin,
    Phone,
    CheckCircle,
    XCircle,
    Truck,
    Navigation,
    LogOut,
    Loader2,
    ChevronRight,
    Clock
} from "lucide-react"
import { useAuth } from "../contexts/AuthContext"

const RiderDashboard = () => {
    const [tasks, setTasks] = useState([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(null)
    const { user, logout } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        fetchTasks()
    }, [])

    const fetchTasks = async () => {
        try {
            setLoading(true)
            const token = localStorage.getItem("token") || localStorage.getItem("adminToken")
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/users/tasks`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setTasks(res.data)
        } catch (error) {
            toast.error("Failed to load tasks")
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleAction = async (taskId, action) => {
        const reason = action === "cancelled" ? window.prompt("Reason for rejection:") : null
        if (action === "cancelled" && reason === null) return

        try {
            setActionLoading(taskId)
            const token = localStorage.getItem("token") || localStorage.getItem("adminToken")
            await axios.put(`${import.meta.env.VITE_API_URL}/api/users/tasks/${taskId}/action`,
                { action, reason },
                { headers: { Authorization: `Bearer ${token}` } }
            )
            toast.success(`Task marked as ${action}`)
            fetchTasks()
        } catch (error) {
            toast.error("Action failed")
            console.error(error)
        } finally {
            setActionLoading(null)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <Loader2 className="h-10 w-10 text-primary-600 animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Loading your route...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-primary-600 text-white p-6 rounded-b-[2.5rem] shadow-lg sticky top-0 z-10">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                            <Truck className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <p className="text-white/70 text-xs font-medium uppercase tracking-wider">Hello Rider,</p>
                            <h1 className="text-xl font-bold">{user?.name || "Rider"}</h1>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            logout()
                            navigate("/login")
                        }}
                        className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all border border-white/20"
                    >
                        <LogOut className="h-5 w-5" />
                    </button>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Package className="h-5 w-5 text-white/70" />
                        <span className="font-bold text-lg">{tasks.length} Active Tasks</span>
                    </div>
                    <button
                        onClick={fetchTasks}
                        className="text-white bg-white/20 px-4 py-1.5 rounded-xl text-sm font-semibold border border-white/20 active:scale-95 transition-all"
                    >
                        Refresh List
                    </button>
                </div>
            </div>

            <div className="px-4 mt-6 space-y-4">
                <h2 className="text-gray-400 text-xs font-bold uppercase tracking-widest ml-1">Current Assignment</h2>

                {tasks.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-100">
                        <div className="bg-gray-50 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Package className="h-10 w-10 text-gray-300" />
                        </div>
                        <h3 className="text-gray-800 font-bold text-lg">All caught up!</h3>
                        <p className="text-gray-500 text-sm mt-1">No tasks currently assigned to you.</p>
                    </div>
                ) : (
                    tasks.map((task) => (
                        <div key={task._id} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 transform transition-all active:scale-[0.98]">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2">
                                    <span className="bg-primary-50 text-primary-700 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-primary-100">
                                        {task.bookingId}
                                    </span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border uppercase ${task.assignedFor === 'pickup' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-purple-50 text-purple-700 border-purple-100'
                                        }`}>
                                        {task.assignedFor}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 text-gray-400 text-[10px] font-bold uppercase">
                                    <Clock className="h-3 w-3" />
                                    {new Date(task.createdAt).toLocaleDateString()}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex gap-4">
                                    <div className="flex flex-col items-center">
                                        <div className="h-8 w-8 rounded-xl bg-orange-100 flex items-center justify-center">
                                            <MapPin className="h-4 w-4 text-orange-600" />
                                        </div>
                                        <div className="w-0.5 h-full bg-gray-50 my-1"></div>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Pickup From</p>
                                        <p className="text-sm font-bold text-gray-800">{task.senderDetails.name}</p>
                                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{task.senderDetails.address}</p>
                                        <a href={`tel:${task.senderDetails.phone}`} className="inline-flex items-center gap-2 mt-2 text-primary-600 font-bold text-xs bg-primary-50 px-3 py-1.5 rounded-lg">
                                            <Phone className="h-3 w-3" /> Call Sender
                                        </a>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="h-8 w-8 rounded-xl bg-blue-100 flex items-center justify-center">
                                        <Navigation className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Deliver To</p>
                                        <p className="text-sm font-bold text-gray-800">{task.receiverDetails.name}</p>
                                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{task.receiverDetails.address}</p>
                                        <a href={`tel:${task.receiverDetails.phone}`} className="inline-flex items-center gap-2 mt-2 text-blue-600 font-bold text-xs bg-blue-50 px-3 py-1.5 rounded-lg">
                                            <Phone className="h-3 w-3" /> Call Receiver
                                        </a>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 flex gap-3">
                                <button
                                    disabled={actionLoading === task._id}
                                    onClick={() => handleAction(task._id, task.status === 'pending' || task.status === 'confirmed' ? 'picked' : 'delivered')}
                                    className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary-200 transition-all active:translate-y-0.5 disabled:opacity-50"
                                >
                                    {actionLoading === task._id ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <>
                                            <CheckCircle className="h-5 w-5" />
                                            {task.status === 'pending' || task.status === 'confirmed' ? 'Mark as Picked' : 'Mark as Delivered'}
                                        </>
                                    )}
                                </button>
                                <button
                                    disabled={actionLoading === task._id}
                                    onClick={() => handleAction(task._id, 'cancelled')}
                                    className="px-4 py-3.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl font-bold shadow-sm transition-all flex items-center justify-center"
                                >
                                    <XCircle className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Bottom Nav Placeholder */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 flex justify-around items-center">
                <button className="flex flex-col items-center gap-1 text-primary-600">
                    <Truck className="h-6 w-6" />
                    <span className="text-[10px] font-bold uppercase">Tasks</span>
                </button>
                <button
                    onClick={() => toast("Profile settings coming soon!")}
                    className="flex flex-col items-center gap-1 text-gray-300"
                >
                    <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400">
                        {user?.name?.charAt(0) || "R"}
                    </div>
                    <span className="text-[10px] font-bold uppercase">Profile</span>
                </button>
            </div>
        </div>
    )
}

export default RiderDashboard
