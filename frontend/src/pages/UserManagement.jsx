import { useState, useEffect } from "react"
import axios from "axios"
import toast from "react-hot-toast"
import { useAuth } from "../contexts/AuthContext"
import { Users, Plus, Edit2, Trash2, X, Shield, Bike, UserCheck, Eye, Key, Lock } from "lucide-react"

const UserManagement = () => {
    const { token } = useAuth()
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [roleFilter, setRoleFilter] = useState("all")
    const [showModal, setShowModal] = useState(false)
    const [editingUser, setEditingUser] = useState(null)
    const [form, setForm] = useState({
        name: "", email: "", phone: "", password: "", role: "rider", designation: "", username: ""
    })

    // Credentials viewer state
    const [showCredModal, setShowCredModal] = useState(false)
    const [credUser, setCredUser] = useState(null)
    const [adminPassword, setAdminPassword] = useState("")
    const [credentials, setCredentials] = useState(null)
    const [credLoading, setCredLoading] = useState(false)

    const currentToken = token || localStorage.getItem("adminToken") || localStorage.getItem("token")

    useEffect(() => {
        fetchUsers()
    }, [roleFilter])

    const fetchUsers = async () => {
        try {
            setLoading(true)
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/users?role=${roleFilter}`, {
                headers: { Authorization: `Bearer ${currentToken}` }
            })
            setUsers(res.data)
        } catch (error) {
            toast.error("Failed to fetch users")
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            if (editingUser) {
                const updateData = { ...form }
                if (!updateData.password) delete updateData.password
                await axios.put(`${import.meta.env.VITE_API_URL}/api/users/${editingUser._id}`, updateData, {
                    headers: { Authorization: `Bearer ${currentToken}` }
                })
                toast.success("User updated successfully")
            } else {
                await axios.post(`${import.meta.env.VITE_API_URL}/api/users`, form, {
                    headers: { Authorization: `Bearer ${currentToken}` }
                })
                toast.success("User created successfully")
            }
            setShowModal(false)
            setEditingUser(null)
            setForm({ name: "", email: "", phone: "", password: "", role: "rider", designation: "", username: "" })
            fetchUsers()
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to save user")
            console.error(error)
        }
    }

    const handleEdit = (user) => {
        setEditingUser(user)
        setForm({
            name: user.name, email: user.email || "", phone: user.phone,
            password: "", role: user.role, designation: user.designation || "",
            username: user.username || ""
        })
        setShowModal(true)
    }

    const handleDelete = async (userId) => {
        if (!window.confirm("Are you sure you want to permanently delete this user? This action cannot be undone.")) return
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL}/api/users/${userId}`, {
                headers: { Authorization: `Bearer ${currentToken}` }
            })
            toast.success("User deleted successfully")
            fetchUsers()
        } catch (error) {
            toast.error("Failed to delete user")
        }
    }

    const handleViewCredentials = (user) => {
        setCredUser(user)
        setAdminPassword("")
        setCredentials(null)
        setShowCredModal(true)
    }

    const handleVerifyAndShowCreds = async (e) => {
        e.preventDefault()
        setCredLoading(true)
        try {
            const res = await axios.post(
                `${import.meta.env.VITE_API_URL}/api/users/${credUser._id}/credentials`,
                { adminPassword },
                { headers: { Authorization: `Bearer ${currentToken}` } }
            )
            setCredentials(res.data)
        } catch (error) {
            toast.error(error.response?.data?.message || "Verification failed")
        } finally {
            setCredLoading(false)
        }
    }

    const getRoleIcon = (role) => {
        if (role === "admin") return <Shield className="h-4 w-4 text-purple-500" />
        if (role === "rider") return <Bike className="h-4 w-4 text-orange-500" />
        return <UserCheck className="h-4 w-4 text-blue-500" />
    }

    const getRoleBadge = (role) => {
        const colors = {
            admin: "bg-purple-100 text-purple-800",
            rider: "bg-orange-100 text-orange-800",
            agent: "bg-green-100 text-green-800",
            staff: "bg-blue-100 text-blue-800",
        }
        return colors[role] || "bg-gray-100 text-gray-800"
    }

    return (
        <div>
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Users className="h-6 w-6 text-primary-500" />
                        User Management
                    </h1>
                    <p className="text-gray-600 text-sm">Manage riders, agents, staff and admin users</p>
                </div>
                <div className="flex gap-3">
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="all">All Roles</option>
                        <option value="rider">Riders</option>
                        <option value="agent">Agents</option>
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                    </select>
                    <button
                        onClick={() => { setEditingUser(null); setForm({ name: "", email: "", phone: "", password: "", role: "rider", designation: "", username: "" }); setShowModal(true) }}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 text-sm font-medium shadow-sm"
                    >
                        <Plus className="h-4 w-4" /> Add User
                    </button>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-48">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500"></div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Designation</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {users.map((user) => (
                                    <tr key={user._id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                {getRoleIcon(user.role)}
                                                <span className="text-sm font-medium text-gray-900">{user.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{user.phone}</div>
                                            <div className="text-xs text-gray-500">{user.email || "—"}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${getRoleBadge(user.role)}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {user.designation || "—"}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.isActive !== false ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                                                {user.isActive !== false ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <div className="flex gap-2">
                                                <button onClick={() => handleViewCredentials(user)} className="text-amber-600 hover:text-amber-800 p-1" title="View Credentials">
                                                    <Key className="h-4 w-4" />
                                                </button>
                                                <button onClick={() => handleEdit(user)} className="text-blue-600 hover:text-blue-800 p-1" title="Edit">
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button onClick={() => handleDelete(user._id)} className="text-red-600 hover:text-red-800 p-1" title="Delete">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-gray-500 text-sm">No users found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-gray-900">{editingUser ? "Edit User" : "Add New User"}</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" placeholder="Full name" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                                <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" placeholder="Login username (e.g. vivek)" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                                <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" placeholder="Phone number" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" placeholder="Email (optional)" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{editingUser ? "New Password (leave empty to keep)" : "Password *"}</label>
                                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editingUser} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" placeholder="Password" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                    <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500">
                                        <option value="rider">Rider</option>
                                        <option value="agent">Agent</option>
                                        <option value="staff">Staff</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                                    <input type="text" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" placeholder="e.g. Sr. Rider" />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 font-medium">{editingUser ? "Update" : "Create"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Credentials Viewer Modal */}
            {showCredModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Lock className="h-5 w-5 text-amber-500" />
                                View Credentials
                            </h2>
                            <button onClick={() => { setShowCredModal(false); setCredentials(null) }} className="text-gray-400 hover:text-gray-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <p className="text-sm text-gray-600 mb-3">
                            Viewing credentials for: <strong>{credUser?.name}</strong>
                        </p>

                        {!credentials ? (
                            <form onSubmit={handleVerifyAndShowCreds} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Enter Admin Password</label>
                                    <input
                                        type="password"
                                        value={adminPassword}
                                        onChange={(e) => setAdminPassword(e.target.value)}
                                        required
                                        autoFocus
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                                        placeholder="Admin master password"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={credLoading}
                                    className="w-full px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {credLoading ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    ) : (
                                        <><Eye className="h-4 w-4" /> Verify & Show</>
                                    )}
                                </button>
                            </form>
                        ) : (
                            <div className="space-y-3">
                                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                    <div>
                                        <span className="text-xs font-medium text-gray-500 uppercase">Username</span>
                                        <p className="text-sm font-mono font-semibold text-gray-900 mt-0.5 select-all">{credentials.username}</p>
                                    </div>
                                    <div className="border-t border-gray-200 pt-3">
                                        <span className="text-xs font-medium text-gray-500 uppercase">Password</span>
                                        <p className="text-sm font-mono font-semibold text-gray-900 mt-0.5 select-all">{credentials.plainPassword}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setShowCredModal(false); setCredentials(null) }}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
                                >
                                    Close
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default UserManagement
