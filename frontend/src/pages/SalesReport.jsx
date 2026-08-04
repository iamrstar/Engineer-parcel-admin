import React, { useState, useEffect } from "react"
import axios from "axios"
import toast from "react-hot-toast"
import { Lock, Printer, IndianRupee, PieChart, FileDown, Calendar, Filter, RotateCcw, AlertCircle, TrendingUp, Percent, CreditCard, XCircle, Activity, Package, BarChart2 } from "lucide-react"
import * as XLSX from "xlsx"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Legend } from "recharts"

const SalesReport = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [reportData, setReportData] = useState([])
    const [serviceBreakdown, setServiceBreakdown] = useState([])
    const [cancelledData, setCancelledData] = useState([])
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [serviceType, setServiceType] = useState("all")
    const [marginPercent, setMarginPercent] = useState(40)

    // Calculate totals
    const totalRevenue = reportData.reduce((sum, item) => sum + item.totalAmount, 0)
    const totalBookings = reportData.reduce((sum, item) => sum + item.totalBookings, 0)
    const totalPaidOrders = reportData.reduce((sum, item) => sum + (item.paidOrders || 0), 0)
    const totalDueOrders = reportData.reduce((sum, item) => sum + (item.dueOrders || 0), 0)
    const totalProfit = totalRevenue * (marginPercent / 100)
    
    // Analytics
    const aov = totalPaidOrders > 0 ? (totalRevenue / totalPaidOrders) : 0
    const collectionRate = totalBookings > 0 ? (totalPaidOrders / totalBookings) * 100 : 0
    const totalCancelled = cancelledData.reduce((sum, item) => sum + item.cancelledCount, 0)
    
    const totalCOD = reportData.reduce((sum, item) => sum + (item.codAmount || 0), 0)
    const totalOnline = reportData.reduce((sum, item) => sum + (item.onlineAmount || 0), 0)

    useEffect(() => {
        if (isAuthenticated) {
            fetchReportData()
        }
    }, [startDate, endDate, serviceType, isAuthenticated])

    const handleLogin = (e) => {
        e.preventDefault()
        if (password === "only@CEO") {
            setIsAuthenticated(true)
            // fetchReportData() is now handled by useEffect
        } else {
            toast.error("Invalid password")
            setPassword("")
        }
    }

    const fetchReportData = async () => {
        try {
            setLoading(true)
            const token = localStorage.getItem("adminToken") || localStorage.getItem("token")
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/bookings/sales/report`, {
                params: { startDate, endDate, serviceType },
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
            if (res.data.success) {
                setReportData(res.data.reportData)
                setServiceBreakdown(res.data.serviceBreakdown || [])
                setCancelledData(res.data.cancelledData || [])
            } else {
                toast.error("Failed to load report data")
            }
        } catch (error) {
            console.error(error)
            toast.error("Error fetching report data")
        } finally {
            setLoading(false)
        }
    }

    const handlePrint = () => {
        window.print()
    }

    const handleExportExcel = () => {
        if (reportData.length === 0) {
            toast.error("No data to export")
            return
        }
        const data = reportData.map(item => {
            const isDaily = item.month.split("-").length === 3
            let displayDate = item.month
            if (!isDaily) {
                const [year, monthNum] = item.month.split("-")
                const date = new Date(year, monthNum - 1)
                displayDate = date.toLocaleString('default', { month: 'long', year: 'numeric' })
            }
            const profit = item.totalAmount * (marginPercent / 100)
            return {
                "Date/Month": displayDate,
                "Total Bookings": item.totalBookings,
                "Paid Orders": item.paidOrders || 0,
                "Revenue (₹)": item.totalAmount,
                [`Est. Profit @ ${marginPercent}% (₹)`]: Math.round(profit * 100) / 100,
                "₹0 Orders": item.dueOrders || 0
            }
        })
        const ws = XLSX.utils.json_to_sheet(data)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Sales Report")
        XLSX.writeFile(wb, `Sales_Report_${new Date().toISOString().split('T')[0]}.xlsx`)
    }

    const handleReset = () => {
        setStartDate("")
        setEndDate("")
        setServiceType("all")
    }

    if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-gray-100">
                    <div className="flex justify-center mb-6">
                        <div className="bg-primary-100 p-4 rounded-full">
                            <Lock className="w-8 h-8 text-primary-600" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">Restricted Access</h2>
                    <p className="text-center text-gray-500 mb-8">Please enter the CEO password to view sales reports.</p>

                    <form onSubmit={handleLogin}>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                placeholder="Enter password"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                        >
                            Access Report
                        </button>
                    </form>
                </div>
            </div>
        )
    }

    return (
        <div className="print:m-0 print:p-0">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 print:mb-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <PieChart className="w-8 h-8 text-primary-500" />
                        Monthly Sales Report
                    </h1>
                    <p className="text-gray-500 mt-1">Overview of revenue and total bookings</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 print:hidden">
                    <button
                        onClick={handleExportExcel}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
                    >
                        <FileDown className="w-5 h-5" />
                        Export Excel
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
                    >
                        <Printer className="w-5 h-5" />
                        Print PDF
                    </button>
                </div>
            </div>

            {/* Filter Section */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-8 print:hidden">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-transparent border-none text-sm focus:ring-0 p-0"
                            placeholder="Start Date"
                        />
                        <span className="text-gray-400">to</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-transparent border-none text-sm focus:ring-0 p-0"
                            placeholder="End Date"
                        />
                    </div>

                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <select
                            value={serviceType}
                            onChange={(e) => setServiceType(e.target.value)}
                            className="bg-transparent border-none text-sm focus:ring-0 p-0 pr-8 font-medium"
                        >
                            <option value="all">All Services</option>
                            <option value="courier">Courier</option>
                            <option value="campus-parcel">Campus Parcel</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
                        <Percent className="w-4 h-4 text-emerald-600" />
                        <span className="text-sm font-medium text-emerald-700">Margin</span>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            value={marginPercent}
                            onChange={(e) => setMarginPercent(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                            className="bg-transparent border-none text-sm focus:ring-0 p-0 w-12 font-bold text-emerald-700 text-center"
                        />
                        <span className="text-sm font-medium text-emerald-700">%</span>
                    </div>

                    <button
                        onClick={handleReset}
                        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 font-medium text-sm px-2"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Reset
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
                            <div className="bg-green-100 p-3.5 rounded-full flex-shrink-0">
                                <IndianRupee className="w-7 h-7 text-green-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-500 mb-1 truncate">Total Revenue</p>
                                <h3 className="text-2xl font-bold text-gray-900 truncate">₹{totalRevenue.toLocaleString()}</h3>
                            </div>
                        </div>
                        
                        <div className="bg-white rounded-xl shadow-sm border border-emerald-200 p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
                            <div className="bg-emerald-100 p-3.5 rounded-full flex-shrink-0">
                                <TrendingUp className="w-7 h-7 text-emerald-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-500 mb-1 truncate">Est. Profit ({marginPercent}%)</p>
                                <h3 className="text-2xl font-bold text-emerald-600 truncate">₹{totalProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })}</h3>
                                <p className="text-xs text-emerald-500 font-medium truncate">@ {marginPercent}% margin</p>
                            </div>
                        </div>
                        
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
                            <div className="bg-blue-100 p-3.5 rounded-full flex-shrink-0">
                                <PieChart className="w-7 h-7 text-blue-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-500 mb-1 truncate">Total Bookings</p>
                                <h3 className="text-2xl font-bold text-gray-900 truncate">{totalBookings.toLocaleString()}</h3>
                            </div>
                        </div>
                        
                        <div className="bg-white rounded-xl shadow-sm border border-orange-200 p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
                            <div className="bg-orange-100 p-3.5 rounded-full flex-shrink-0">
                                <AlertCircle className="w-7 h-7 text-orange-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-500 mb-1 truncate">₹0 Amount Orders</p>
                                <h3 className="text-2xl font-bold text-orange-600 truncate">{totalDueOrders.toLocaleString()}</h3>
                                <p className="text-xs text-orange-500 font-medium truncate">Needs pricing</p>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
                            <div className="bg-indigo-100 p-3.5 rounded-full flex-shrink-0">
                                <Activity className="w-7 h-7 text-indigo-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-500 mb-1 truncate">Average Order Value</p>
                                <h3 className="text-2xl font-bold text-gray-900 truncate">₹{aov.toLocaleString(undefined, { maximumFractionDigits: 2 })}</h3>
                            </div>
                        </div>
                        
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
                            <div className="bg-teal-100 p-3.5 rounded-full flex-shrink-0">
                                <Percent className="w-7 h-7 text-teal-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-500 mb-1 truncate">Collection Rate</p>
                                <h3 className="text-2xl font-bold text-gray-900 truncate">{collectionRate.toFixed(1)}%</h3>
                                <p className="text-xs text-gray-500 font-medium truncate">{totalPaidOrders} paid out of {totalBookings}</p>
                            </div>
                        </div>
                        
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
                            <div className="bg-purple-100 p-3.5 rounded-full flex-shrink-0">
                                <CreditCard className="w-7 h-7 text-purple-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-500 mb-1 truncate">Payment Split</p>
                                <h3 className="text-lg font-bold text-gray-900 truncate">COD: ₹{totalCOD.toLocaleString()}</h3>
                                <p className="text-sm text-purple-600 font-semibold truncate">Online: ₹{totalOnline.toLocaleString()}</p>
                            </div>
                        </div>
                        
                        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
                            <div className="bg-red-100 p-3.5 rounded-full flex-shrink-0">
                                <XCircle className="w-7 h-7 text-red-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-500 mb-1 truncate">Cancelled Orders</p>
                                <h3 className="text-2xl font-bold text-red-600 truncate">{totalCancelled.toLocaleString()}</h3>
                            </div>
                        </div>
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 print:hidden">
                        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <BarChart2 className="w-5 h-5 text-primary-500" />
                                Revenue Trend
                            </h3>
                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={[...reportData].reverse()} // Reverse so oldest is on left
                                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                        <XAxis 
                                            dataKey="month" 
                                            tickFormatter={(val) => {
                                                if (val.split("-").length === 3) return val // Daily
                                                const [year, month] = val.split("-")
                                                return new Date(year, month - 1).toLocaleString('default', { month: 'short', year: '2-digit' })
                                            }}
                                            tick={{ fill: '#6b7280', fontSize: 12 }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis 
                                            tickFormatter={(val) => `₹${val/1000}k`}
                                            tick={{ fill: '#6b7280', fontSize: 12 }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <RechartsTooltip 
                                            formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']}
                                            labelFormatter={(label) => `Period: ${label}`}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Bar dataKey="totalAmount" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <PieChart className="w-5 h-5 text-primary-500" />
                                Bookings by Service
                            </h3>
                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RechartsPieChart>
                                        <Pie
                                            data={serviceBreakdown}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={90}
                                            paddingAngle={5}
                                            dataKey="totalBookings"
                                            nameKey="serviceType"
                                        >
                                            {serviceBreakdown.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={['#0ea5e9', '#10b981', '#f59e0b', '#6366f1', '#8b5cf6'][index % 5]} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip 
                                            formatter={(value, name) => [value, name.charAt(0).toUpperCase() + name.slice(1)]}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" formatter={(value) => <span className="capitalize text-gray-700 font-medium">{value}</span>} />
                                    </RechartsPieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Service Breakdown */}
                    <div className="mb-8 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Package className="w-5 h-5 text-primary-500" />
                            Service-wise Breakdown
                        </h3>
                        {serviceBreakdown.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {serviceBreakdown.map((service) => (
                                    <div key={service.serviceType} className="border border-gray-100 rounded-lg p-4 bg-gray-50">
                                        <p className="font-semibold text-gray-800 capitalize mb-2">{service.serviceType || 'Unknown'}</p>
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-xs text-gray-500">Revenue</p>
                                                <p className="font-bold text-gray-900">₹{(service.totalRevenue || 0).toLocaleString()}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-gray-500">Bookings</p>
                                                <p className="font-semibold text-gray-700">{service.totalBookings}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 text-center py-4">No service breakdown data available.</p>
                        )}
                    </div>

                    {/* Data Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            {startDate && endDate ? 'Date' : 'Month'}
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Total Bookings
                                        </th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Revenue
                                        </th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                                            Est. Profit ({marginPercent}%)
                                        </th>
                                        <th className="px-6 py-4 text-center text-xs font-semibold text-orange-500 uppercase tracking-wider">
                                            ₹0 Orders
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {reportData.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                                No sales data available yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        reportData.map((item) => {
                                            const isDaily = item.month.split("-").length === 3
                                            let displayDate = item.month
                                            if (!isDaily) {
                                                const [year, monthNum] = item.month.split("-")
                                                const date = new Date(year, monthNum - 1)
                                                displayDate = date.toLocaleString('default', { month: 'long', year: 'numeric' })
                                            }

                                            return (
                                                <tr key={item.month} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {displayDate}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                        {item.totalBookings} bookings
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                                                        ₹{item.totalAmount.toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-600 text-right">
                                                        ₹{(item.totalAmount * (marginPercent / 100)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                                        {(item.dueOrders || 0) > 0 ? (
                                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                                                                {item.dueOrders} due
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                                                                All paid
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="hidden print:block mt-12 text-center text-gray-500 text-sm">
                        Report generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                    </div>
                </>
            )}
        </div>
    )
}

export default SalesReport
