"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
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
    ClipboardList,
    IndianRupee,
    Building,
    Calendar,
    Plus,
    Trash,
    Download,
    Send,
    FileText,
    CheckCircle2,
    AlertCircle,
    Receipt,
    Wallet,
    Briefcase,
    Info,
    Check
} from "lucide-react"

// Months list
const MONTHS_LIST = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
]

const YEARS_LIST = ["2024", "2025", "2026", "2027", "2028"]

// Helper to convert numbers to Indian Rupee Words
const numberToWordsIndian = (num) => {
    num = Math.round(Number(num) || 0);
    if (num <= 0) return "Zero";
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const convertLessThanOneThousand = (n) => {
        let str = '';
        if (n >= 100) {
            str += a[Math.floor(n / 100)] + ' Hundred ';
            n %= 100;
        }
        if (n > 0) {
            if (n < 20) {
                str += a[n] + ' ';
            } else {
                str += b[Math.floor(n / 10)] + ' ';
                if (n % 10 > 0) {
                    str += a[n % 10] + ' ';
                }
            }
        }
        return str.trim();
    };

    let result = '';
    const crore = Math.floor(num / 10000000);
    num %= 10000000;
    const lakh = Math.floor(num / 100000);
    num %= 100000;
    const thousand = Math.floor(num / 1000);
    num %= 1000;
    const remainder = num;

    if (crore > 0) result += convertLessThanOneThousand(crore) + ' Crore ';
    if (lakh > 0) result += convertLessThanOneThousand(lakh) + ' Lakh ';
    if (thousand > 0) result += convertLessThanOneThousand(thousand) + ' Thousand ';
    if (remainder > 0) result += convertLessThanOneThousand(remainder) + ' ';

    return result.trim();
};

const UserManagement = () => {
    const navigate = useNavigate()
    const [users, setUsers] = useState([])
    const [performanceStats, setPerformanceStats] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [roleFilter, setRoleFilter] = useState("all")

    // Add/Edit User Modal State
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [modalTab, setModalTab] = useState("general") // 'general' | 'salary'
    const [editingUser, setEditingUser] = useState(null)

    // Security Credentials Modal State
    const [viewingCredentials, setViewingCredentials] = useState(null)
    const [adminPasswordInput, setAdminPasswordInput] = useState("")
    const [isPasswordVerified, setIsPasswordVerified] = useState(false)

    // Form State for User
    const [formData, setFormData] = useState({
        name: "",
        username: "",
        phone: "",
        email: "",
        password: "",
        role: "staff",
        isActive: true,
        designation: "Operations Staff",
        department: "Operations",
        joiningDate: "",
        salaryDetails: {
            basicSalary: 0,
            hra: 0,
            conveyanceAllowance: 0,
            specialAllowance: 0,
            medicalAllowance: 0,
            pfDeduction: 0,
            tdsDeduction: 0,
            professionalTax: 0,
            otherDeductions: 0,
        },
        bankDetails: {
            bankName: "",
            accountNumber: "",
            ifscCode: "",
            panNumber: "",
            uanNumber: "",
        }
    })

    // ─── SALARY RELEASE & PAYSLIP MODAL STATE (Investrow Style with Engineers Parcel Branding) ───
    const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false)
    const [selectedSalaryUser, setSelectedSalaryUser] = useState(null)
    const [salaryTab, setSalaryTab] = useState("edit") // 'edit' | 'preview'
    const [payMonth, setPayMonth] = useState("November")
    const [payYear, setPayYear] = useState("2026")
    const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10))
    const [employeeIdInput, setEmployeeIdInput] = useState("")
    const [designationInput, setDesignationInput] = useState("")
    const [workingDays, setWorkingDays] = useState(30)
    const [paidDays, setPaidDays] = useState(30)
    const [lossOfPayDays, setLossOfPayDays] = useState(0)

    // Salary Structure inputs in modal
    const [baseSalary, setBaseSalary] = useState(0)
    const [allowancesList, setAllowancesList] = useState([])
    const [deductionsList, setDeductionsList] = useState([])
    const [remarksNote, setRemarksNote] = useState("")
    const [sendEmailChecked, setSendEmailChecked] = useState(true)
    const [updateDefaultChecked, setUpdateDefaultChecked] = useState(false)

    const [releasingSalary, setReleasingSalary] = useState(false)
    const [salaryHistory, setSalaryHistory] = useState([])
    const [lastReleasedSlip, setLastReleasedSlip] = useState(null)

    useEffect(() => {
        fetchUsers()
        fetchPerformanceStats()
    }, [roleFilter])

    const fetchPerformanceStats = async () => {
        try {
            const token = localStorage.getItem("adminToken") || localStorage.getItem("token")
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/tasks/performance?timeframe=monthly`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setPerformanceStats(res.data)
        } catch (error) {
            console.error("Failed to fetch performance stats:", error)
        }
    }

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
        setModalTab("general")
        if (user) {
            setEditingUser(user)
            setFormData({
                name: user.name || "",
                username: user.username || "",
                phone: user.phone || "",
                email: user.email || "",
                password: "",
                role: user.role || "staff",
                isActive: typeof user.isActive !== "undefined" ? user.isActive : true,
                designation: user.designation || "Operations Staff",
                department: user.department || "Operations",
                joiningDate: user.joiningDate ? user.joiningDate.slice(0, 10) : "",
                salaryDetails: {
                    basicSalary: user.salaryDetails?.basicSalary || 0,
                    hra: user.salaryDetails?.hra || 0,
                    conveyanceAllowance: user.salaryDetails?.conveyanceAllowance || 0,
                    specialAllowance: user.salaryDetails?.specialAllowance || 0,
                    medicalAllowance: user.salaryDetails?.medicalAllowance || 0,
                    pfDeduction: user.salaryDetails?.pfDeduction || 0,
                    tdsDeduction: user.salaryDetails?.tdsDeduction || 0,
                    professionalTax: user.salaryDetails?.professionalTax || 0,
                    otherDeductions: user.salaryDetails?.otherDeductions || 0,
                },
                bankDetails: {
                    bankName: user.bankDetails?.bankName || "",
                    accountNumber: user.bankDetails?.accountNumber || "",
                    ifscCode: user.bankDetails?.ifscCode || "",
                    panNumber: user.bankDetails?.panNumber || "",
                    uanNumber: user.bankDetails?.uanNumber || "",
                }
            })
        } else {
            setEditingUser(null)
            setFormData({
                name: "",
                username: "",
                phone: "",
                email: "",
                password: "",
                role: "staff",
                isActive: true,
                designation: "Operations Staff",
                department: "Operations",
                joiningDate: new Date().toISOString().slice(0, 10),
                salaryDetails: {
                    basicSalary: 0,
                    hra: 0,
                    conveyanceAllowance: 0,
                    specialAllowance: 0,
                    medicalAllowance: 0,
                    pfDeduction: 0,
                    tdsDeduction: 0,
                    professionalTax: 0,
                    otherDeductions: 0,
                },
                bankDetails: {
                    bankName: "",
                    accountNumber: "",
                    ifscCode: "",
                    panNumber: "",
                    uanNumber: "",
                }
            })
        }
        setIsModalOpen(true)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            const token = localStorage.getItem("adminToken") || localStorage.getItem("token")

            if (!formData.name || !formData.username || (!editingUser && !formData.password)) {
                return toast.error("Please fill all required fields")
            }

            const url = editingUser
                ? `${import.meta.env.VITE_API_URL}/api/users/${editingUser._id}`
                : `${import.meta.env.VITE_API_URL}/api/users`

            const method = editingUser ? "put" : "post"

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
        if (adminPasswordInput === "admin@engineers123") {
            setIsPasswordVerified(true)
        } else {
            toast.error("Incorrect Admin Password")
        }
    }

    // ─── SALARY RELEASE OPEN HANDLER ───
    const handleOpenSalaryModal = async (user) => {
        setSelectedSalaryUser(user)
        setSalaryTab("edit")
        setLastReleasedSlip(null)

        // Set Date and Month defaults
        const now = new Date()
        setPayMonth(MONTHS_LIST[now.getMonth()])
        setPayYear(String(now.getFullYear()))
        setPaymentDate(now.toISOString().slice(0, 10))
        setEmployeeIdInput(user.username ? `EMP-${user.username.toUpperCase()}` : "EMP-001")
        setDesignationInput(user.designation || "Operations Staff")
        setWorkingDays(30)
        setPaidDays(30)
        setLossOfPayDays(0)
        setSendEmailChecked(!!user.email)
        setUpdateDefaultChecked(false)

        const defaultPeriod = `${MONTHS_LIST[now.getMonth()]} ${now.getFullYear()}`
        setRemarksNote(`Salary released for ${defaultPeriod}`)

        // Populate base salary & allowances
        const s = user.salaryDetails || {}
        setBaseSalary(Number(s.basicSalary) || 0)

        const initialAllowances = []
        if (s.hra) initialAllowances.push({ id: "hra", name: "House Rent Allowance (HRA)", amount: Number(s.hra) })
        if (s.conveyanceAllowance) initialAllowances.push({ id: "conv", name: "Conveyance Allowance", amount: Number(s.conveyanceAllowance) })
        if (s.specialAllowance) initialAllowances.push({ id: "spec", name: "Special Allowance", amount: Number(s.specialAllowance) })
        if (s.medicalAllowance) initialAllowances.push({ id: "med", name: "Medical Allowance", amount: Number(s.medicalAllowance) })
        setAllowancesList(initialAllowances)

        // Populate deductions
        const initialDeductions = [
            { id: "pf", name: "Provident Fund (PF)", amount: Number(s.pfDeduction) || 0 },
            { id: "pt", name: "Professional Tax (PT)", amount: Number(s.professionalTax) || 0 },
            { id: "tds", name: "TDS / Income Tax", amount: Number(s.tdsDeduction) || 0 },
            { id: "lop", name: "Unpaid Leave (LOP)", amount: 0 },
        ]
        setDeductionsList(initialDeductions)

        setIsSalaryModalOpen(true)

        // Fetch user's previous slips
        try {
            const token = localStorage.getItem("adminToken") || localStorage.getItem("token")
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/salary/user/${user._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (res.data?.recentSlips) {
                setSalaryHistory(res.data.recentSlips)
            }
        } catch (e) {
            console.error("Failed to load user salary history:", e)
        }
    }

    // Quick Add Allowance Chip
    const handleQuickAddAllowance = (name) => {
        const exists = allowancesList.some(a => a.name.toLowerCase() === name.toLowerCase())
        if (exists) {
            toast.error(`${name} is already in the allowances list`)
            return
        }
        setAllowancesList([
            ...allowancesList,
            { id: "chip_" + Date.now(), name, amount: 0 }
        ])
    }

    // Quick Add Deduction Chip
    const handleQuickAddDeduction = (name) => {
        const exists = deductionsList.some(d => d.name.toLowerCase() === name.toLowerCase())
        if (exists) {
            toast.error(`${name} is already in the deductions list`)
            return
        }
        setDeductionsList([
            ...deductionsList,
            { id: "chip_" + Date.now(), name, amount: 0 }
        ])
    }

    // Calculations
    const totalAllowances = allowancesList.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
    const grossEarnings = Number(baseSalary || 0) + totalAllowances
    const totalDeductions = deductionsList.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
    const netPay = Math.max(0, grossEarnings - totalDeductions)
    const netPayInWords = numberToWordsIndian(netPay)
    const payPeriodText = `${payMonth} ${payYear}`
    const monthYyyyMm = `${payYear}-${String(MONTHS_LIST.indexOf(payMonth) + 1).padStart(2, "0")}`

    // Complete earnings array for backend and preview
    const fullEarningsArray = [
        { name: "Basic / Base Salary", amount: Number(baseSalary) || 0 },
        ...allowancesList.map(a => ({ name: a.name, amount: Number(a.amount) || 0 }))
    ]

    // Release & Email Action
    const handleReleaseSalary = async (sendEmail = true) => {
        if (!selectedSalaryUser) return
        try {
            setReleasingSalary(true)
            const token = localStorage.getItem("adminToken") || localStorage.getItem("token")

            const payload = {
                userId: selectedSalaryUser._id,
                employeeId: employeeIdInput || selectedSalaryUser.username,
                month: monthYyyyMm,
                payPeriod: payPeriodText,
                payDate: paymentDate,
                workingDays: Number(workingDays) || 30,
                paidDays: Number(paidDays) || 30,
                lossOfPayDays: Number(lossOfPayDays) || 0,
                earnings: fullEarningsArray,
                deductions: deductionsList.map(d => ({ name: d.name, amount: Number(d.amount) || 0 })),
                notes: remarksNote,
                sendEmail: sendEmail && sendEmailChecked,
                designation: designationInput,
                department: selectedSalaryUser.department,
                bankDetails: selectedSalaryUser.bankDetails,
                updateUserDefault: updateDefaultChecked,
                baseSalary: Number(baseSalary) || 0,
            }

            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/salary/release`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            })

            setLastReleasedSlip(res.data.slip)
            toast.success(res.data.message || "Salary released successfully!")

            // Refresh slip history
            const historyRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/salary/user/${selectedSalaryUser._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (historyRes.data?.recentSlips) {
                setSalaryHistory(historyRes.data.recentSlips)
            }

            fetchUsers() // in case default salary was updated
            setSalaryTab("preview")
        } catch (error) {
            console.error("Release salary failed:", error)
            toast.error(error.response?.data?.message || "Failed to release salary")
        } finally {
            setReleasingSalary(false)
        }
    }

    const handleDownloadPdf = async (slipId) => {
        const targetId = slipId || lastReleasedSlip?._id
        if (!targetId) {
            // If not yet saved to DB, release first without email
            await handleReleaseSalary(false)
            return
        }
        try {
            const token = localStorage.getItem("adminToken") || localStorage.getItem("token")
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/salary/slip/${targetId}/pdf`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: "blob",
            })
            const blob = new Blob([response.data], { type: "application/pdf" })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `SalarySlip_${selectedSalaryUser?.name?.replace(/ /g, "_")}_${payPeriodText?.replace(/ /g, "_")}.pdf`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            window.URL.revokeObjectURL(url)
            toast.success("Salary Statement PDF downloaded!")
        } catch (error) {
            console.error("Download error:", error)
            toast.error("Failed to download PDF")
        }
    }

    const filteredUsers = users.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone?.includes(searchTerm) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.designation?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const getRoleBadge = (role) => {
        const roles = {
            admin: "bg-red-50 text-red-700 border-red-200",
            agent: "bg-blue-50 text-blue-700 border-blue-200",
            rider: "bg-green-50 text-green-700 border-green-200",
            staff: "bg-purple-50 text-purple-700 border-purple-200",
        }
        return roles[role] || "bg-gray-50 text-gray-700 border-gray-200"
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <Users className="h-8 w-8 text-primary-600" />
                        Employee & Payroll Management
                    </h1>
                    <p className="text-gray-500 mt-1">Manage staff credentials, salary structure, PF/TDS, and release monthly payslips</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-primary-200 flex items-center gap-2 w-fit"
                >
                    <UserPlus className="h-5 w-5" />
                    Add New User / Staff
                </button>
            </div>

            {/* Control Bar */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                        type="text"
                        placeholder="Search by name, username, designation, phone, or email..."
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
                        <option value="staff">Staff</option>
                        <option value="agent">Agents</option>
                        <option value="rider">Riders</option>
                        <option value="admin">Admins</option>
                    </select>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                        <p className="text-gray-500 font-medium">Loading user and payroll records...</p>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                        <Users className="h-12 w-12 mb-4 opacity-20" />
                        <p className="text-lg">No users found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-gray-50/70 text-left">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee / User</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Designation & Dept</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Default Salary Structure</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Payroll Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredUsers.map((user) => {
                                    const basic = Number(user.salaryDetails?.basicSalary) || 0
                                    const pf = Number(user.salaryDetails?.pfDeduction) || 0
                                    const pt = Number(user.salaryDetails?.professionalTax) || 0

                                    return (
                                        <tr key={user._id} className="hover:bg-gray-50/60 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="h-10 w-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">
                                                        {user.name?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-semibold text-gray-900">{user.name}</div>
                                                        <div className="text-xs text-gray-500 flex items-center gap-1">
                                                            <Shield className="h-3 w-3" /> @{user.username}
                                                        </div>
                                                        {user.email && (
                                                            <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                                                                <Mail className="h-3 w-3" /> {user.email}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                                                    <Briefcase className="h-3.5 w-3.5 text-gray-400" />
                                                    {user.designation || "Staff Member"}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    Dept: <span className="font-medium text-gray-700">{user.department || "Operations"}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {basic > 0 ? (
                                                    <div className="space-y-0.5">
                                                        <div className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                                                            <IndianRupee className="h-3 w-3" />
                                                            {basic.toLocaleString("en-IN")}/mo (Base)
                                                        </div>
                                                        <div className="text-[11px] text-gray-500">
                                                            PF: ₹{pf} | PT: ₹{pt}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">Not configured</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2.5 py-1 text-xs font-bold rounded-lg uppercase tracking-wider border ${getRoleBadge(user.role)}`}>
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
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {/* ⭐ RELEASE SALARY ACTION BUTTON */}
                                                    <button
                                                        onClick={() => handleOpenSalaryModal(user)}
                                                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all hover:scale-[1.02]"
                                                        title="Release Monthly Salary Statement"
                                                    >
                                                        <IndianRupee className="h-3.5 w-3.5" />
                                                        <span>Release Salary</span>
                                                    </button>

                                                    <button
                                                        onClick={() => navigate(`/tracking-tasks?userId=${user._id}`)}
                                                        className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                                                        title="Assign Task"
                                                    >
                                                        <ClipboardList className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleViewCredentials(user)}
                                                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                                        title="View Credentials"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenModal(user)}
                                                        className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                                                        title="Edit User Profile"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(user._id)}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                        title="Delete User"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ══════════════════════════════════════════════════════════════════════
                ⭐ SALARY RELEASE & STATEMENT MODAL (Investrow Format with Engineers Parcel Logo)
            ══════════════════════════════════════════════════════════════════════ */}
            {isSalaryModalOpen && selectedSalaryUser && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsSalaryModalOpen(false)} />
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col relative z-10 overflow-hidden transform transition-all animate-in zoom-in duration-200 border border-gray-100">

                        {/* Top Header matching reference image */}
                        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold">
                                    <IndianRupee className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2.5">
                                        <h2 className="text-base font-bold text-gray-900">Salary Release & Statement</h2>
                                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                            {lastReleasedSlip ? "Released" : "Draft / Unreleased"}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Employee: <strong className="text-gray-800">{selectedSalaryUser.name}</strong> ({selectedSalaryUser.email || "No email"})
                                    </p>
                                </div>
                            </div>

                            {/* Segmented Switcher Controls */}
                            <div className="flex items-center gap-2">
                                <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 text-xs font-semibold">
                                    <button
                                        type="button"
                                        onClick={() => setSalaryTab("edit")}
                                        className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${salaryTab === "edit" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-800"}`}
                                    >
                                        <Edit2 className="h-3.5 w-3.5" />
                                        <span>Edit Breakdown</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSalaryTab("preview")}
                                        className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${salaryTab === "preview" ? "bg-emerald-600 text-white shadow-xs" : "text-gray-500 hover:text-gray-800"}`}
                                    >
                                        <Eye className="h-3.5 w-3.5" />
                                        <span>Preview Payslip</span>
                                    </button>
                                </div>
                                <button
                                    onClick={() => setIsSalaryModalOpen(false)}
                                    className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-white">

                            {/* ─── TAB 1: EDIT BREAKDOWN (Exact match with reference Image 2) ─── */}
                            {salaryTab === "edit" ? (
                                <div className="space-y-6">

                                    {/* Top Metadata Fields Card */}
                                    <div className="border border-gray-200 rounded-2xl p-5 bg-white shadow-2xs space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                            <div>
                                                <label className="text-xs font-semibold text-gray-700 block mb-1">Pay Month</label>
                                                <select
                                                    value={payMonth}
                                                    onChange={(e) => {
                                                        setPayMonth(e.target.value)
                                                        setRemarksNote(`Salary released for ${e.target.value} ${payYear}`)
                                                    }}
                                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500"
                                                >
                                                    {MONTHS_LIST.map(m => (
                                                        <option key={m} value={m}>{m}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-gray-700 block mb-1">Pay Year</label>
                                                <select
                                                    value={payYear}
                                                    onChange={(e) => {
                                                        setPayYear(e.target.value)
                                                        setRemarksNote(`Salary released for ${payMonth} ${e.target.value}`)
                                                    }}
                                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500"
                                                >
                                                    {YEARS_LIST.map(y => (
                                                        <option key={y} value={y}>{y}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-gray-700 block mb-1">Payment Date</label>
                                                <input
                                                    type="date"
                                                    value={paymentDate}
                                                    onChange={(e) => setPaymentDate(e.target.value)}
                                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-gray-700 block mb-1">Employee ID</label>
                                                <input
                                                    type="text"
                                                    value={employeeIdInput}
                                                    onChange={(e) => setEmployeeIdInput(e.target.value)}
                                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-primary-600 outline-none focus:ring-2 focus:ring-emerald-500"
                                                    placeholder="EMP-001"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2 border-t border-gray-100">
                                            <div>
                                                <label className="text-xs font-semibold text-gray-700 block mb-1">Designation</label>
                                                <input
                                                    type="text"
                                                    value={designationInput}
                                                    onChange={(e) => setDesignationInput(e.target.value)}
                                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500"
                                                    placeholder="Software Development Engineer"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-gray-700 block mb-1">Total Working Days</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="31"
                                                    value={workingDays}
                                                    onChange={(e) => setWorkingDays(Number(e.target.value) || 30)}
                                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-gray-700 block mb-1">Paid / Present Days</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="31"
                                                    value={paidDays}
                                                    onChange={(e) => {
                                                        const p = Number(e.target.value) || 0
                                                        setPaidDays(p)
                                                        setLossOfPayDays(Math.max(0, workingDays - p))
                                                    }}
                                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-gray-700 block mb-1">Loss of Pay (LOP) Days</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="31"
                                                    value={lossOfPayDays}
                                                    onChange={(e) => setLossOfPayDays(Number(e.target.value) || 0)}
                                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-rose-600 outline-none focus:ring-2 focus:ring-rose-500"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Two Cards Side by Side: Earnings vs Deductions */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                        {/* Card 1: Earnings & Allowances */}
                                        <div className="border border-gray-200 rounded-2xl p-5 bg-white shadow-2xs space-y-4">
                                            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500"></div>
                                                    <h3 className="text-sm font-bold text-gray-900">Earnings & Allowances</h3>
                                                </div>
                                                <span className="text-sm font-extrabold text-emerald-600">
                                                    ₹{grossEarnings.toLocaleString("en-IN")}
                                                </span>
                                            </div>

                                            {/* Base Monthly Salary */}
                                            <div>
                                                <label className="text-xs font-semibold text-gray-700 block mb-1">
                                                    Base / Basic Monthly Salary (₹) *
                                                </label>
                                                <input
                                                    type="number"
                                                    value={baseSalary}
                                                    onChange={(e) => setBaseSalary(Number(e.target.value) || 0)}
                                                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500"
                                                    placeholder="50000"
                                                />
                                            </div>

                                            {/* Dynamic Allowances List */}
                                            <div className="space-y-2.5">
                                                {allowancesList.map((item) => (
                                                    <div key={item.id} className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200">
                                                        <input
                                                            type="text"
                                                            value={item.name}
                                                            onChange={(e) => setAllowancesList(allowancesList.map(a => a.id === item.id ? { ...a, name: e.target.value } : a))}
                                                            className="flex-1 text-xs font-medium text-gray-800 bg-transparent border-none outline-none px-1"
                                                            placeholder="Allowance Name"
                                                        />
                                                        <div className="w-24 flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-gray-200">
                                                            <span className="text-xs text-gray-500">₹</span>
                                                            <input
                                                                type="number"
                                                                value={item.amount}
                                                                onChange={(e) => setAllowancesList(allowancesList.map(a => a.id === item.id ? { ...a, amount: Number(e.target.value) || 0 } : a))}
                                                                className="w-full text-right text-xs font-bold text-gray-900 bg-transparent border-none outline-none"
                                                            />
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setAllowancesList(allowancesList.filter(a => a.id !== item.id))}
                                                            className="text-gray-300 hover:text-red-500 p-1 transition-colors"
                                                        >
                                                            <Trash className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => handleQuickAddAllowance("Special Allowance")}
                                                className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl border border-dashed border-gray-300 flex items-center justify-center gap-1.5 transition-all"
                                            >
                                                <Plus className="h-3.5 w-3.5" />
                                                <span>+ Add Allowance / Incentive</span>
                                            </button>

                                            {/* Quick Add Chips */}
                                            <div className="pt-2">
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Quick add:</div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {["+Incentive", "+Performance Bonus", "+HRA", "+Travel Allowance"].map((chip) => (
                                                        <button
                                                            key={chip}
                                                            type="button"
                                                            onClick={() => handleQuickAddAllowance(chip.replace("+", ""))}
                                                            className="px-2.5 py-1 bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 text-gray-600 rounded-lg text-[11px] font-medium transition-colors border border-gray-200"
                                                        >
                                                            {chip}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card 2: Deductions */}
                                        <div className="border border-gray-200 rounded-2xl p-5 bg-white shadow-2xs space-y-4">
                                            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-2.5 w-2.5 rounded-full bg-rose-500"></div>
                                                    <h3 className="text-sm font-bold text-gray-900">Deductions</h3>
                                                </div>
                                                <span className="text-sm font-extrabold text-rose-600">
                                                    -₹{totalDeductions.toLocaleString("en-IN")}
                                                </span>
                                            </div>

                                            {/* Deductions Rows */}
                                            <div className="space-y-2.5">
                                                {deductionsList.map((item) => (
                                                    <div key={item.id} className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200">
                                                        <input
                                                            type="text"
                                                            value={item.name}
                                                            onChange={(e) => setDeductionsList(deductionsList.map(d => d.id === item.id ? { ...d, name: e.target.value } : d))}
                                                            className="flex-1 text-xs font-medium text-gray-800 bg-transparent border-none outline-none px-1"
                                                            placeholder="Deduction Name"
                                                        />
                                                        <div className="w-24 flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-gray-200">
                                                            <span className="text-xs text-rose-500">₹</span>
                                                            <input
                                                                type="number"
                                                                value={item.amount}
                                                                onChange={(e) => setDeductionsList(deductionsList.map(d => d.id === item.id ? { ...d, amount: Number(e.target.value) || 0 } : d))}
                                                                className="w-full text-right text-xs font-bold text-rose-600 bg-transparent border-none outline-none"
                                                            />
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setDeductionsList(deductionsList.filter(d => d.id !== item.id))}
                                                            className="text-gray-300 hover:text-red-500 p-1 transition-colors"
                                                        >
                                                            <Trash className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => handleQuickAddDeduction("Advance Salary Recovery")}
                                                className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl border border-dashed border-gray-300 flex items-center justify-center gap-1.5 transition-all"
                                            >
                                                <Plus className="h-3.5 w-3.5" />
                                                <span>+ Add Deduction</span>
                                            </button>

                                            {/* Quick Add Chips for Deductions */}
                                            <div className="pt-2">
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Quick add:</div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {["+Provident Fund (PF)", "+Professional Tax", "+TDS / Tax", "+Unpaid Leave (LOP)"].map((chip) => (
                                                        <button
                                                            key={chip}
                                                            type="button"
                                                            onClick={() => handleQuickAddDeduction(chip.replace("+", ""))}
                                                            className="px-2.5 py-1 bg-gray-100 hover:bg-rose-50 hover:text-rose-700 text-gray-600 rounded-lg text-[11px] font-medium transition-colors border border-gray-200"
                                                        >
                                                            {chip}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sleek Dark Navy Summary Bar matching Image 2 */}
                                    <div className="bg-slate-900 text-white rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
                                        <div className="flex items-center gap-8">
                                            <div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">GROSS EARNINGS</div>
                                                <div className="text-xl font-extrabold text-white mt-0.5">₹{grossEarnings.toLocaleString("en-IN")}</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">TOTAL DEDUCTIONS</div>
                                                <div className="text-xl font-extrabold text-rose-400 mt-0.5">-₹{totalDeductions.toLocaleString("en-IN")}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">NET TAKE-HOME PAY</div>
                                            <div className="text-3xl font-black text-emerald-400 mt-0.5">₹{netPay.toLocaleString("en-IN")}</div>
                                        </div>
                                    </div>

                                    {/* Remarks / Payment Note */}
                                    <div>
                                        <label className="text-xs font-semibold text-gray-700 block mb-1">
                                            Remarks / Payment Note
                                        </label>
                                        <input
                                            type="text"
                                            value={remarksNote}
                                            onChange={(e) => setRemarksNote(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500"
                                            placeholder="Salary released for November 2026"
                                        />
                                    </div>

                                    {/* Checkboxes matching reference Image 2 */}
                                    <div className="space-y-2 pt-1">
                                        <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-gray-700">
                                            <input
                                                type="checkbox"
                                                checked={sendEmailChecked}
                                                onChange={(e) => setSendEmailChecked(e.target.checked)}
                                                className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                                            />
                                            <span>
                                                Send official Salary Statement email to <strong>{selectedSalaryUser.email || "registered email"}</strong>
                                            </span>
                                        </label>
                                        <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-gray-700">
                                            <input
                                                type="checkbox"
                                                checked={updateDefaultChecked}
                                                onChange={(e) => setUpdateDefaultChecked(e.target.checked)}
                                                className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                                            />
                                            <span>
                                                Update base salary (₹{baseSalary.toLocaleString("en-IN")}) and designation as default for this employee profile
                                            </span>
                                        </label>
                                    </div>

                                </div>
                            ) : (
                                /* ─── TAB 2: INTERACTIVE PREVIEW (Ultra-Clean Executive Corporate Design) ─── */
                                <div className="py-2">
                                    <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-8 max-w-2xl mx-auto text-slate-800 font-sans text-xs">

                                        {/* 1. Company Letterhead Header */}
                                        <div className="flex items-start justify-between border-b border-slate-200 pb-5 mb-5">
                                            <div>
                                                <div className="h-11 mb-2.5 flex items-center">
                                                    <img
                                                        src="/company-logo.jpg"
                                                        alt="Engineers Parcel"
                                                        className="h-11 w-auto object-contain"
                                                        onError={(e) => {
                                                            e.target.src = "/logo.png"
                                                        }}
                                                    />
                                                </div>
                                                <h2 className="text-xs font-bold text-slate-900 tracking-tight">
                                                    SRQ Engineers Parcel and Haul Private Limited
                                                </h2>
                                                <p className="text-[10px] text-slate-500 mt-0.5">
                                                    IIT (ISM) Dhanbad - 826004, Jharkhand, India &bull; CIN: U63090JH2023PTC021234
                                                </p>
                                                <p className="text-[10px] text-slate-400">
                                                    Contact: 9708815717 / 9525801506 &bull; info@engineersparcel.in
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <span className="inline-block text-[10px] font-bold uppercase tracking-widest bg-cyan-50 text-cyan-700 px-3 py-1 rounded-full border border-cyan-200/80 mb-2 shadow-2xs">
                                                    CONFIDENTIAL PAYSLIP
                                                </span>
                                                <div className="text-lg font-black text-slate-900 uppercase tracking-tight">
                                                    {payPeriodText}
                                                </div>
                                                <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                                                    Pay Date: {new Date(paymentDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                                </div>
                                            </div>
                                        </div>

                                        {/* 2. Employee Details Card (Clean 4 Columns x 2 Rows) */}
                                        <div className="border border-slate-200/90 rounded-xl bg-slate-50/50 p-4 mb-3 text-[11px] grid grid-cols-2 sm:grid-cols-4 gap-y-3.5 gap-x-4">
                                            <div>
                                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">EMPLOYEE NAME</div>
                                                <div className="font-bold text-slate-900 mt-0.5 text-xs">{selectedSalaryUser.name}</div>
                                            </div>
                                            <div>
                                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">EMPLOYEE ID</div>
                                                <div className="font-bold text-primary-600 mt-0.5">{employeeIdInput || selectedSalaryUser.username || "EMP-001"}</div>
                                            </div>
                                            <div>
                                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">DESIGNATION</div>
                                                <div className="font-bold text-slate-900 mt-0.5">{designationInput || "Operations Executive"}</div>
                                            </div>
                                            <div>
                                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">PAYMENT METHOD</div>
                                                <div className="font-semibold text-slate-800 mt-0.5">Direct Bank Transfer / NEFT</div>
                                            </div>

                                            <div>
                                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">EMAIL ADDRESS</div>
                                                <div className="text-slate-600 mt-0.5 truncate">{selectedSalaryUser.email || "N/A"}</div>
                                            </div>
                                            <div>
                                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">MOBILE CONTACT</div>
                                                <div className="text-slate-800 mt-0.5">{selectedSalaryUser.phone || "N/A"}</div>
                                            </div>
                                            <div>
                                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">PAY PERIOD</div>
                                                <div className="font-medium text-slate-800 mt-0.5">{payPeriodText}</div>
                                            </div>
                                            <div>
                                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">RELEASE STATUS</div>
                                                <div className="font-bold text-emerald-600 mt-0.5 flex items-center gap-1.5">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                    Verified Ready
                                                </div>
                                            </div>
                                        </div>

                                        {/* 3. Dedicated Attendance & Bank Strip (Breathing Room) */}
                                        <div className="bg-slate-100/70 border border-slate-200/80 rounded-xl px-4 py-2.5 mb-5 text-[11px] text-slate-700 flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-slate-400 text-[10px] uppercase font-bold">Total Days:</span>
                                                <strong className="text-slate-900">{workingDays}</strong>
                                            </div>
                                            <div className="h-3 w-px bg-slate-300 hidden sm:block"></div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-slate-400 text-[10px] uppercase font-bold">Paid Days:</span>
                                                <strong className="text-slate-900">{paidDays}</strong>
                                            </div>
                                            <div className="h-3 w-px bg-slate-300 hidden sm:block"></div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-slate-400 text-[10px] uppercase font-bold">Loss of Pay (LOP):</span>
                                                <strong className={lossOfPayDays > 0 ? "text-rose-600" : "text-slate-900"}>{lossOfPayDays}</strong>
                                            </div>
                                            <div className="h-3 w-px bg-slate-300 hidden sm:block"></div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-slate-400 text-[10px] uppercase font-bold">Bank & A/C:</span>
                                                <strong className="text-slate-900 truncate">
                                                    {selectedSalaryUser.bankDetails?.bankName || "SBI"} ({selectedSalaryUser.bankDetails?.accountNumber?.slice(-4) ? '••••' + selectedSalaryUser.bankDetails.accountNumber.slice(-4) : 'NEFT'})
                                                </strong>
                                            </div>
                                        </div>

                                        {/* 4. Two-Column Table with Solid Dark Headers matching reference */}
                                        <div className="border border-slate-200 rounded-xl overflow-hidden mb-5">
                                            <div className="grid grid-cols-2 bg-slate-900 text-white font-bold text-[11px] uppercase tracking-wider px-5 py-3">
                                                <div className="flex justify-between pr-4">
                                                    <span>EARNINGS & ALLOWANCES</span>
                                                    <span>AMOUNT (₹)</span>
                                                </div>
                                                <div className="flex justify-between pl-4 border-l border-slate-700">
                                                    <span>DEDUCTIONS</span>
                                                    <span>AMOUNT (₹)</span>
                                                </div>
                                            </div>

                                            <div className="divide-y divide-slate-100 bg-white">
                                                {Array.from({ length: Math.max(fullEarningsArray.length, deductionsList.length, 4) }).map((_, idx) => {
                                                    const e = fullEarningsArray[idx]
                                                    const d = deductionsList[idx]
                                                    return (
                                                        <div key={idx} className="grid grid-cols-2 text-[11px] px-5 py-2.5 hover:bg-slate-50/60 transition-colors">
                                                            <div className="flex justify-between pr-4 items-center">
                                                                <span className={e ? "text-slate-700 font-medium" : "text-slate-300"}>
                                                                    {e ? e.name : "–"}
                                                                </span>
                                                                <span className={e ? "font-bold text-slate-900 font-mono tabular-nums" : "text-slate-300"}>
                                                                    {e ? `₹${Number(e.amount).toLocaleString("en-IN")}` : "–"}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between pl-4 border-l border-slate-200 items-center">
                                                                <span className={d ? "text-slate-700 font-medium" : "text-slate-300"}>
                                                                    {d ? d.name : "–"}
                                                                </span>
                                                                <span className={d ? (d.amount > 0 ? "font-bold text-rose-600 font-mono tabular-nums" : "font-bold text-slate-900 font-mono tabular-nums") : "text-slate-300"}>
                                                                    {d ? `₹${Number(d.amount).toLocaleString("en-IN")}` : "–"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>

                                            {/* Subtotals Row */}
                                            <div className="grid grid-cols-2 bg-slate-50/90 px-5 py-3 font-bold text-xs border-t border-slate-200">
                                                <div className="flex justify-between pr-4 text-slate-900 items-center">
                                                    <span>Total Gross Earnings</span>
                                                    <span className="font-extrabold text-slate-900 font-mono tabular-nums">
                                                        ₹{grossEarnings.toLocaleString("en-IN")}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between pl-4 border-l border-slate-200 text-slate-900 items-center">
                                                    <span>Total Deductions</span>
                                                    <span className="font-extrabold text-rose-600 font-mono tabular-nums">
                                                        ₹{totalDeductions.toLocaleString("en-IN")}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 5. Net Take-Home Pay Banner (Deep Emerald Green) */}
                                        <div className="bg-[#059669] rounded-xl p-4 sm:p-5 text-white flex items-center justify-between mb-4 shadow-sm">
                                            <div>
                                                <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-100">
                                                    NET TAKE-HOME PAY (IN-HAND)
                                                </div>
                                                <div className="text-xs text-emerald-50 mt-1 font-medium italic">
                                                    Amount in words: {netPayInWords} Rupees Only
                                                </div>
                                            </div>
                                            <div className="text-2xl sm:text-3xl font-black text-white font-mono tabular-nums tracking-tight">
                                                ₹{netPay.toLocaleString("en-IN")}
                                            </div>
                                        </div>

                                        {/* 6. Important Note Alert Box */}
                                        <div className="bg-amber-50/80 border border-amber-200/80 text-amber-900 text-[11px] rounded-xl px-4 py-3 mb-3 flex items-center gap-2.5">
                                            <Info className="h-4 w-4 text-amber-600 shrink-0" />
                                            <span>
                                                <strong>Important Note:</strong> After releasing, it may take up to 72 hours to credit to your source account.
                                            </span>
                                        </div>

                                        {/* 7. Remarks Box */}
                                        <div className="bg-slate-50 border border-slate-200/80 text-slate-700 text-[11px] rounded-xl px-4 py-3 mb-5 font-medium flex items-center justify-between">
                                            <div>
                                                <strong className="text-slate-900">Remarks:</strong> {remarksNote || `Salary released for ${payPeriodText}`}
                                            </div>
                                            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Payroll Verified</span>
                                        </div>

                                        {/* 8. Signatory & Legal Disclaimer Footer */}
                                        <div className="flex items-center justify-between pt-5 border-t border-slate-200 text-[10px] text-slate-400">
                                            <div className="max-w-xs leading-relaxed">
                                                Note: This is a computer-generated salary statement issued by Engineers Parcel. It does not require a physical signature. For discrepancies, please notify the Accounts/HR Department within 5 working days.
                                            </div>
                                            <div className="text-right">
                                                <div className="font-serif italic font-bold text-slate-900 text-sm">Engineers Parcel</div>
                                                <div className="text-slate-600 font-semibold mt-0.5">Authorized Signatory</div>
                                                <div className="text-[9px] text-slate-400">Management</div>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Modal Footer Actions */}
                        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                {salaryTab === "preview" ? (
                                    <button
                                        type="button"
                                        onClick={() => setSalaryTab("edit")}
                                        className="text-primary-600 hover:text-primary-800 font-bold flex items-center gap-1"
                                    >
                                        &larr; Back to Edit Breakdown
                                    </button>
                                ) : (
                                    <span className="flex items-center gap-1 text-gray-500">
                                        <Info className="h-3.5 w-3.5 text-gray-400" />
                                        Switch to <strong>Preview Payslip</strong> to review before releasing.
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-2.5 w-full sm:w-auto">
                                <button
                                    type="button"
                                    onClick={() => handleDownloadPdf()}
                                    className="px-4 py-2.5 bg-white hover:bg-gray-100 text-gray-700 font-bold text-xs rounded-xl border border-gray-300 flex items-center gap-1.5 transition-all shadow-2xs"
                                >
                                    <Download className="h-4 w-4" />
                                    Download Statement (PDF)
                                </button>

                                <button
                                    type="button"
                                    disabled={releasingSalary}
                                    onClick={() => handleReleaseSalary(true)}
                                    className="flex-1 sm:flex-initial px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                                >
                                    {releasingSalary ? (
                                        <>
                                            <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            <span>Releasing & Sending Mail...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send className="h-4 w-4" />
                                            <span>Release Salary & Send Email</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════════
                ⭐ ADD / EDIT USER & SALARY STRUCTURE MODAL
            ══════════════════════════════════════════════════════════════════════ */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col relative z-10 overflow-hidden transform transition-all animate-in zoom-in duration-200">
                        <div className="bg-primary-600 p-5 text-white flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    {editingUser ? <Edit2 className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
                                    {editingUser ? "Edit User Profile & Salary Structure" : "Add New User / Staff"}
                                </h2>
                                <p className="text-xs text-primary-100 mt-0.5">
                                    Configure credentials, role, default basic salary, PF, TDS, and bank account
                                </p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        {/* Modal Tab Switcher */}
                        <div className="flex border-b border-gray-100 bg-gray-50/80 px-6 pt-3">
                            <button
                                type="button"
                                onClick={() => setModalTab("general")}
                                className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${modalTab === "general" ? "border-primary-600 text-primary-600" : "border-transparent text-gray-400 hover:text-gray-600"}`}
                            >
                                <Users className="h-4 w-4" />
                                1. Account & Designation
                            </button>
                            <button
                                type="button"
                                onClick={() => setModalTab("salary")}
                                className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${modalTab === "salary" ? "border-primary-600 text-primary-600" : "border-transparent text-gray-400 hover:text-gray-600"}`}
                            >
                                <IndianRupee className="h-4 w-4" />
                                2. Salary Structure & Bank/Tax Details
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
                            {modalTab === "general" ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Full Name *</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 text-sm outline-none"
                                                placeholder="e.g. Rahul Sharma"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Username *</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.username}
                                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 text-sm outline-none"
                                                placeholder="rahul.sharma"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Role *</label>
                                            <select
                                                value={formData.role}
                                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 text-sm outline-none"
                                            >
                                                <option value="staff">Staff (Office / Operations)</option>
                                                <option value="agent">Agent (Booking Counter)</option>
                                                <option value="rider">Rider (Pickup / Delivery)</option>
                                                <option value="admin">Administrator</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Designation</label>
                                            <input
                                                type="text"
                                                value={formData.designation}
                                                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 text-sm outline-none"
                                                placeholder="e.g. Operations Executive"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Department</label>
                                            <input
                                                type="text"
                                                value={formData.department}
                                                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 text-sm outline-none"
                                                placeholder="e.g. Operations & Logistics"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Date of Joining</label>
                                            <input
                                                type="date"
                                                value={formData.joiningDate}
                                                onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 text-sm outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Phone Number</label>
                                            <input
                                                type="tel"
                                                value={formData.phone}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 text-sm outline-none"
                                                placeholder="10-digit mobile number"
                                            />
                                        </div>

                                        <div className="col-span-2">
                                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                                Email Address (Used for sending salary slips) *
                                            </label>
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 text-sm outline-none"
                                                placeholder="staff@engineersparcel.in"
                                            />
                                        </div>

                                        <div className="col-span-2">
                                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                                Password {editingUser && "(Leave blank to keep existing password)"} *
                                            </label>
                                            <input
                                                type="password"
                                                required={!editingUser}
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 text-sm outline-none"
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
                                        <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Account is active and can login</label>
                                    </div>
                                </div>
                            ) : (
                                /* Tab 2: Salary Structure & Bank/Tax Details */
                                <div className="space-y-6">
                                    {/* Default Monthly Salary & Allowances */}
                                    <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-4 space-y-3">
                                        <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                                            <IndianRupee className="h-4 w-4 text-emerald-600" />
                                            Default Monthly Salary & Allowances
                                        </h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Basic Salary (₹)</label>
                                                <input
                                                    type="number"
                                                    value={formData.salaryDetails.basicSalary}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        salaryDetails: { ...formData.salaryDetails, basicSalary: Number(e.target.value) || 0 }
                                                    })}
                                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500"
                                                    placeholder="20000"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-semibold text-gray-600 mb-1">House Rent Allowance (HRA) (₹)</label>
                                                <input
                                                    type="number"
                                                    value={formData.salaryDetails.hra}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        salaryDetails: { ...formData.salaryDetails, hra: Number(e.target.value) || 0 }
                                                    })}
                                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500"
                                                    placeholder="8000"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Conveyance Allowance (₹)</label>
                                                <input
                                                    type="number"
                                                    value={formData.salaryDetails.conveyanceAllowance}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        salaryDetails: { ...formData.salaryDetails, conveyanceAllowance: Number(e.target.value) || 0 }
                                                    })}
                                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500"
                                                    placeholder="1600"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Special Allowance (₹)</label>
                                                <input
                                                    type="number"
                                                    value={formData.salaryDetails.specialAllowance}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        salaryDetails: { ...formData.salaryDetails, specialAllowance: Number(e.target.value) || 0 }
                                                    })}
                                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500"
                                                    placeholder="2000"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Default Deductions */}
                                    <div className="bg-rose-50/40 border border-rose-200 rounded-2xl p-4 space-y-3">
                                        <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
                                            <Receipt className="h-4 w-4 text-rose-600" />
                                            Statutory Deductions (PF & TDS)
                                        </h4>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className="block text-[11px] font-semibold text-gray-600 mb-1">PF Deduction (₹)</label>
                                                <input
                                                    type="number"
                                                    value={formData.salaryDetails.pfDeduction}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        salaryDetails: { ...formData.salaryDetails, pfDeduction: Number(e.target.value) || 0 }
                                                    })}
                                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-rose-700 outline-none focus:ring-2 focus:ring-rose-500"
                                                    placeholder="1800"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-semibold text-gray-600 mb-1">TDS / Income Tax (₹)</label>
                                                <input
                                                    type="number"
                                                    value={formData.salaryDetails.tdsDeduction}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        salaryDetails: { ...formData.salaryDetails, tdsDeduction: Number(e.target.value) || 0 }
                                                    })}
                                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-rose-700 outline-none focus:ring-2 focus:ring-rose-500"
                                                    placeholder="500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Professional Tax (PT) (₹)</label>
                                                <input
                                                    type="number"
                                                    value={formData.salaryDetails.professionalTax}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        salaryDetails: { ...formData.salaryDetails, professionalTax: Number(e.target.value) || 0 }
                                                    })}
                                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-rose-700 outline-none focus:ring-2 focus:ring-rose-500"
                                                    placeholder="200"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bank Account & Tax Identifiers */}
                                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
                                        <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                                            <Building className="h-4 w-4 text-primary-600" />
                                            Bank Account & Statutory Identifiers
                                        </h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Bank Name</label>
                                                <input
                                                    type="text"
                                                    value={formData.bankDetails.bankName}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        bankDetails: { ...formData.bankDetails, bankName: e.target.value }
                                                    })}
                                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 outline-none focus:ring-2 focus:ring-primary-500"
                                                    placeholder="e.g. State Bank of India"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Account Number</label>
                                                <input
                                                    type="text"
                                                    value={formData.bankDetails.accountNumber}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        bankDetails: { ...formData.bankDetails, accountNumber: e.target.value }
                                                    })}
                                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-800 outline-none focus:ring-2 focus:ring-primary-500"
                                                    placeholder="Account number"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-semibold text-gray-600 mb-1">IFSC Code</label>
                                                <input
                                                    type="text"
                                                    value={formData.bankDetails.ifscCode}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        bankDetails: { ...formData.bankDetails, ifscCode: e.target.value.toUpperCase() }
                                                    })}
                                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-800 outline-none focus:ring-2 focus:ring-primary-500"
                                                    placeholder="SBIN0001234"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-semibold text-gray-600 mb-1">PAN Card Number</label>
                                                <input
                                                    type="text"
                                                    value={formData.bankDetails.panNumber}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        bankDetails: { ...formData.bankDetails, panNumber: e.target.value.toUpperCase() }
                                                    })}
                                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-800 outline-none focus:ring-2 focus:ring-primary-500"
                                                    placeholder="ABCDE1234F"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-[11px] font-semibold text-gray-600 mb-1">PF / UAN Number</label>
                                                <input
                                                    type="text"
                                                    value={formData.bankDetails.uanNumber}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        bankDetails: { ...formData.bankDetails, uanNumber: e.target.value }
                                                    })}
                                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-mono text-gray-800 outline-none focus:ring-2 focus:ring-primary-500"
                                                    placeholder="12-digit UAN"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4 border-t border-gray-100">
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
                                    {editingUser ? "Save User & Salary Structure" : "Create User"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

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
        </div>
    )
}

export default UserManagement
