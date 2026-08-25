import React, { useState, useEffect } from "react";
import axios from "axios";
import { Download, Calendar, Filter, Users, FileText, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';

const IncentiveReport = () => {
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState([]);
  
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    userId: "all"
  });

  useEffect(() => {
    fetchStaff();
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [filters]);

  const fetchStaff = async () => {
    try {
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStaffList(res.data);
    } catch (error) {
      console.error("Failed to fetch staff:", error);
    }
  };

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/bookings/stats/incentive-report`, {
        headers: { Authorization: `Bearer ${token}` },
        params: filters
      });
      setReportData(res.data);
    } catch (error) {
      console.error("Failed to fetch incentive report:", error);
      toast.error("Failed to load incentive report");
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = () => {
    if (reportData.length === 0) {
      return toast.error("No data to export");
    }

    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text("Incentive Earnings Report", 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Report Period: ${filters.startDate} to ${filters.endDate}`, 14, 30);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 36);

    const totalIncentive = reportData.reduce((acc, curr) => acc + curr.incentiveEarned, 0);
    doc.text(`Total Incentive Payout: Rs. ${totalIncentive.toFixed(2)}`, 14, 42);

    const tableColumn = ["Date", "Booking ID", "Staff Name", "Role", "Order Value", "Incentive Earned"];
    const tableRows = [];

    reportData.forEach(row => {
      const rowData = [
        new Date(row.date).toLocaleDateString(),
        row.bookingId,
        row.staffName || 'Unknown',
        row.role,
        `Rs. ${row.orderValue || 0}`,
        `Rs. ${row.incentiveEarned || 0}`
      ];
      tableRows.push(rowData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 50,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [249, 115, 22] }, // orange-500
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });

    doc.save(`incentive_report_${filters.startDate}_to_${filters.endDate}.pdf`);
    toast.success("PDF exported successfully!");
  };

  const totalIncentives = reportData.reduce((acc, curr) => acc + curr.incentiveEarned, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-[#111111] p-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <FileText className="w-8 h-8 text-orange-500" />
              Incentive Report
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Detailed view of staff incentives per order</p>
          </div>
          
          <button
            onClick={exportPDF}
            disabled={reportData.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-[#111111] p-5 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm flex flex-col md:flex-row gap-4">
          <div className="flex-1 flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Staff Member</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={filters.userId}
                  onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-white outline-none"
                >
                  <option value="all">All Staff</option>
                  {staffList.map(staff => (
                    <option key={staff._id} value={staff._id}>{staff.name} ({staff.role})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Start Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-white outline-none"
                />
              </div>
            </div>

            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">End Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-white outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Summary Metric */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white flex items-center justify-between shadow-lg">
          <div>
            <p className="text-orange-100 font-medium mb-1">Total Incentives Payout</p>
            <h3 className="text-3xl font-bold flex items-center gap-2">
              ₹ {totalIncentives.toFixed(2)}
            </h3>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
            <ArrowRight className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white dark:bg-[#111111] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#1A1A1A] text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-bold border-b border-gray-100 dark:border-white/5">Date</th>
                  <th className="px-6 py-4 font-bold border-b border-gray-100 dark:border-white/5">Booking ID</th>
                  <th className="px-6 py-4 font-bold border-b border-gray-100 dark:border-white/5">Staff</th>
                  <th className="px-6 py-4 font-bold border-b border-gray-100 dark:border-white/5">Role</th>
                  <th className="px-6 py-4 font-bold border-b border-gray-100 dark:border-white/5 text-right">Order Value</th>
                  <th className="px-6 py-4 font-bold border-b border-gray-100 dark:border-white/5 text-right text-orange-600 dark:text-orange-400">Incentive</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                        <p>Loading reports...</p>
                      </div>
                    </td>
                  </tr>
                ) : reportData.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      No incentive data found for these filters.
                    </td>
                  </tr>
                ) : (
                  reportData.map((row, idx) => (
                    <tr key={`${row.bookingId}-${idx}`} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                        {new Date(row.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {row.bookingId}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{row.staffName || 'Unknown'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          row.role === 'Handled by' 
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' 
                            : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                        }`}>
                          {row.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-600 dark:text-gray-300">
                        ₹ {row.orderValue || 0}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                          + ₹ {row.incentiveEarned}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default IncentiveReport;
