"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import toast from "react-hot-toast"
import {
    Users,
    UserPlus,
    Search,
    Filter,
    Edit2,
    Trash2,
    UserCheck,
    UserX,
    X,
    Shield,
    Phone,
    Mail,
    Eye,
    EyeOff
} from "lucide-react"

const UserManagement = () => {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [roleFilter, setRoleFilter] = useState("all")
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingUser, setEditingUser] = useState(null)
    const [viewingCredentials, setViewingCredentials] = useState(null)
    const [adminPasswordInput, setAdminPasswordInput] = useState("")
    const [isPasswordVerified, setIsPasswordVerified] = useState(false)

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        username: "",
        phone: "",
        email: "",
        password: "",
        role: "agent",
        isActive: true
    })

    useEffect(() => {
        fetchUsers()
    }, [roleFilter])

    const fetchUsers = async () => {
        try {
            setLoading(true)
            const token = localStorage.getItem("adminToken") || localStorage.getItem("token")
            const params = {}
            if (roleFilter !== "all") params.roles = roleFilter

            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/users`, {
                params,
                headers: { Authorization: `Bearer ${token}` }
            })
            setUsers(res.data)
        } catch (error) {
            toast.error("Failed to fetch users")
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleOpenModal = (user = null) => {
        if (user) {
            setEditingUser(user)
            setFormData({
                name: user.name,
                username: user.username,
                phone: user.phone || "",
                email: user.email || "",
                password: "", // Keep password empty for security during edit
                role: user.role,
                isActive: user.isActive
            })
        } else {
            setEditingUser(null)
            setFormData({
                name: "",
                username: "",
                phone: "",
                email: "",
                password: "",
                role: "agent",
                isActive: true
            })
        }
        setIsModalOpen(true)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            const token = localStorage.getItem("adminToken") || localStorage.getItem("token")

            // Validation
            if (!formData.name || !formData.username || (!editingUser && !formData.password)) {
                return toast.error("Please fill all required fields")
            }

            const url = editingUser
                ? `${import.meta.env.VITE_API_URL}/api/users/${editingUser._id}`
                : `${import.meta.env.VITE_API_URL}/api/users`

            const method = editingUser ? "put" : "post"

            // Don't send empty password on edit
            const submissionData = { ...formData }
            if (editingUser && !submissionData.password) {
                delete submissionData.password
            }

            await axios[method](url, submissionData, {
                headers: { Authorization: `Bearer ${token}` }
            })

            toast.success(editingUser ? "User updated successfully" : "User created successfully")
            setIsModalOpen(false)
            fetchUsers()
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to save user")
            console.error(error)
        }
    }

    const handleDelete = async (userId) => {
        if (!window.confirm("Are you sure you want to delete this user?")) return

        try {
            const token = localStorage.getItem("adminToken") || localStorage.getItem("token")
            await axios.delete(`${import.meta.env.VITE_API_URL}/api/users/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            toast.success("User deleted successfully")
            fetchUsers()
        } catch (error) {
            toast.error("Failed to delete user")
            console.error(error)
        }
    }

    const toggleStatus = async (user) => {
        try {
            const token = localStorage.getItem("adminToken") || localStorage.getItem("token")
            await axios.put(`${import.meta.env.VITE_API_URL}/api/users/${user._id}`,
                { isActive: !user.isActive },
                { headers: { Authorization: `Bearer ${token}` } }
            )
            toast.success(`User ${user.isActive ? 'deactivated' : 'activated'} successfully`)
            fetchUsers()
        } catch (error) {
            toast.error("Failed to update status")
        }
    }

    const handleViewCredentials = (user) => {
        setViewingCredentials(user)
        setAdminPasswordInput("")
        setIsPasswordVerified(false)
    }

    const verifyAdminPassword = () => {
        if (adminPasswordInput === "engineers123") {
            setIsPasswordVerified(true)
        } else {
            toast.error("Incorrect Admin Password")
        }
    }

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone?.includes(searchTerm)
    )

    const getRoleBadge = (role) => {
        const roles = {
            admin: "bg-red-100 text-red-800",
            agent: "bg-blue-100 text-blue-800",
            rider: "bg-green-100 text-green-800",
            staff: "bg-purple-100 text-purple-800",
        }
        return roles[role] || "bg-gray-100 text-gray-800"
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <Users className="h-8 w-8 text-primary-600" />
                        User Management
                    </h1>
                    <p className="text-gray-500 mt-1">Manage staff, agents, and riders across the platform</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-primary-200 flex items-center gap-2 w-fit"
                >
                    <UserPlus className="h-5 w-5" />
                    Add New User
                </button>
            </div>

            {/* Control Bar */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                        type="text"
                        placeholder="Search by name, username, or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-gray-400" />
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="all">All Roles</option>
                        <option value="admin">Admins</option>
                        <option value="agent">Agents</option>
                        <option value="rider">Riders</option>
                        <option value="staff">Staff</option>
                    </select>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                        <p className="text-gray-500 font-medium">Loading user data...</p>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                        <Users className="h-12 w-12 mb-4 opacity-20" />
                        <p className="text-lg">No users found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-gray-50/50 text-left">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">User Info</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredUsers.map((user) => (
                                    <tr key={user._id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-semibold text-gray-900">{user.name}</div>
                                                    <div className="text-xs text-gray-500 flex items-center gap-1">
                                                        <Shield className="h-3 w-3" /> @{user.username}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900 flex items-center gap-2">
                                                <Phone className="h-3.5 w-3.5 text-gray-400" /> {user.phone || 'N/A'}
                                            </div>
                                            <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                                                <Mail className="h-3.5 w-3.5 text-gray-400" /> {user.email || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2.5 py-1 text-xs font-bold rounded-lg uppercase tracking-wider ${getRoleBadge(user.role)}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <button
                                                onClick={() => toggleStatus(user)}
                                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${user.isActive
                                                    ? "bg-green-50 text-green-700 hover:bg-green-100"
                                                    : "bg-red-50 text-red-700 hover:bg-red-100"
                                                    }`}
                                            >
                                                {user.isActive ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                                                {user.isActive ? 'Active' : 'Inactive'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => handleViewCredentials(user)}
                                                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                                    title="View Credentials"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleOpenModal(user)}
                                                    className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                                                    title="Edit User"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user._id)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Delete User"
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

            {/* View Credentials Modal */}
            {viewingCredentials && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setViewingCredentials(null)} />
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm relative z-10 overflow-hidden p-6 text-center">
                        {!isPasswordVerified ? (
                            <div className="space-y-4">
                                <div className="h-16 w-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Shield className="h-8 w-8" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">Security Check</h3>
                                <p className="text-gray-500 text-sm">Please enter the master admin password to view user credentials.</p>
                                <input
                                    type="password"
                                    value={adminPasswordInput}
                                    onChange={(e) => setAdminPasswordInput(e.target.value)}
                                    placeholder="Enter Admin Password"
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-red-500 rounded-xl outline-none transition-all text-center"
                                    onKeyDown={(e) => e.key === 'Enter' && verifyAdminPassword()}
                                    autoFocus
                                />
                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={() => setViewingCredentials(null)}
                                        className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={verifyAdminPassword}
                                        className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-100 transition-all"
                                    >
                                        Verify
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Eye className="h-8 w-8" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">User Credentials</h3>
                                <div className="bg-gray-50 rounded-2xl p-4 space-y-4 text-left border border-gray-100">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Full Name</label>
                                        <p className="text-gray-900 font-semibold">{viewingCredentials.name}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Username</label>
                                            <p className="text-primary-600 font-bold">@{viewingCredentials.username}</p>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Password</label>
                                            <p className="text-red-600 font-bold font-mono">
                                                {viewingCredentials.plainPassword || "********"}
                                            </p>
                                            {!viewingCredentials.plainPassword && (
                                                <p className="text-[10px] text-gray-400 italic mt-1">Hashed in database. Please reset password to see here.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setViewingCredentials(null)}
                                    className="w-full py-4 bg-gray-900 hover:bg-black text-white font-bold rounded-2xl transition-all shadow-xl"
                                >
                                    Done
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {isModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden transform transition-all animate-in zoom-in duration-200">
                        <div className="bg-primary-600 p-6 text-white flex justify-between items-center">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                {editingUser ? <Edit2 className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
                                {editingUser ? "Edit User" : "Add New User"}
                            </h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary-500 text-sm"
                                        placeholder="e.g. John Doe"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Username *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary-500 text-sm"
                                        placeholder="johndoe"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Role *</label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary-500 text-sm"
                                    >
                                        <option value="admin">Admin</option>
                                        <option value="agent">Agent</option>
                                        <option value="rider">Rider</option>
                                        <option value="staff">Staff</option>
                                    </select>
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary-500 text-sm"
                                        placeholder="10-digit phone"
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary-500 text-sm"
                                        placeholder="john@example.com"
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Password {editingUser && "(Leave blank to keep current)"} *
                                    </label>
                                    <input
                                        type="password"
                                        required={!editingUser}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary-500 text-sm"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mt-4 p-3 bg-gray-50 rounded-xl">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4"
                                />
                                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">User is active and can login</label>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-lg shadow-primary-100 transition-all"
                                >
                                    {editingUser ? "Save Changes" : "Create User"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default UserManagement
