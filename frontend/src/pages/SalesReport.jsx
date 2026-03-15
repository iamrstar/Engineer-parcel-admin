import React, { useState, useEffect } from "react"
import axios from "axios"
import toast from "react-hot-toast"
import { Lock, Printer, IndianRupee, PieChart } from "lucide-react"

const SalesReport = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [reportData, setReportData] = useState([])

    // Calculate totals
    const totalRevenue = reportData.reduce((sum, item) => sum + item.totalAmount, 0)
    const totalBookings = reportData.reduce((sum, item) => sum + item.totalBookings, 0)

    const handleLogin = (e) => {
        e.preventDefault()
        if (password === "only@CEO") {
            setIsAuthenticated(true)
            fetchReportData()
        } else {
            toast.error("Invalid password")
            setPassword("")
        }
    }

    const fetchReportData = async () => {
        try {
            setLoading(true)
            const token = localStorage.getItem("token")
            const res = await axios.get("http://localhost:8000/api/bookings/sales/report", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
            if (res.data.success) {
                setReportData(res.data.reportData)
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
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-5 py-2.5 rounded-lg font-medium transition-colors print:hidden shadow-sm"
                >
                    <Printer className="w-5 h-5" />
                    Export to PDF
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
                            <div className="bg-green-100 p-4 rounded-full">
                                <IndianRupee className="w-8 h-8 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500 mb-1">Total Lifetime Revenue</p>
                                <h3 className="text-3xl font-bold text-gray-900">₹{totalRevenue.toLocaleString()}</h3>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
                            <div className="bg-blue-100 p-4 rounded-full">
                                <PieChart className="w-8 h-8 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500 mb-1">Total Successful Bookings</p>
                                <h3 className="text-3xl font-bold text-gray-900">{totalBookings.toLocaleString()}</h3>
                            </div>
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Month
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Total Bookings
                                        </th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Revenue
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {reportData.length === 0 ? (
                                        <tr>
                                            <td colSpan="3" className="px-6 py-8 text-center text-gray-500">
                                                No sales data available yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        reportData.map((item) => {
                                            const [year, monthNum] = item.month.split("-")
                                            const date = new Date(year, monthNum - 1)
                                            const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' })

                                            return (
                                                <tr key={item.month} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {monthName}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                        {item.totalBookings} bookings
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                                                        ₹{item.totalAmount.toLocaleString()}
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
