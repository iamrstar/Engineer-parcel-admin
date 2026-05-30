import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Download, Calendar, User, Search, RefreshCw, BarChart2, CheckCircle, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';

export default function AttendanceReport() {
  const { user } = useAuth();
  
  const [reportData, setReportData] = useState([]);
  const [users, setUsers] = useState([]);
  
  // Date logic
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);
  
  const formatDate = (date) => date.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(formatDate(weekAgo));
  const [endDate, setEndDate] = useState(formatDate(today));
  const [selectedUserId, setSelectedUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUsers();
    fetchReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error("Error fetching users", err);
    }
  };

  const fetchReportData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      let url = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/attendance/report?startDate=${startDate}&endDate=${endDate}`;
      if (selectedUserId) {
        url += `&userId=${selectedUserId}`;
      }

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error("Failed to fetch report data");
      }

      const data = await res.json();
      setReportData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchReportData();
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    
    // Add Header
    doc.setFontSize(20);
    doc.text("Attendance & Task Completion Report", 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Report Period: ${startDate} to ${endDate}`, 14, 30);
    if (selectedUserId) {
      const u = users.find(u => u._id === selectedUserId);
      if (u) {
        doc.text(`Staff: ${u.name} (@${u.username})`, 14, 36);
      }
    }

    const tableColumn = ["Date", "Staff Name", "Role", "Login Time", "Attendance Status", "Tasks Completed"];
    const tableRows = [];

    reportData.forEach(row => {
      const rowData = [
        row.date,
        row.user.name,
        row.user.role,
        row.firstLoginAt ? new Date(row.firstLoginAt).toLocaleTimeString() : "-",
        row.attendanceStatus,
        row.tasksCompleted.toString()
      ];
      tableRows.push(rowData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: selectedUserId ? 42 : 36,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [79, 70, 229] } // Indigo 600
    });

    doc.save(`attendance_report_${startDate}_to_${endDate}.pdf`);
  };

  // Prepare chart data
  const chartData = useMemo(() => {
    // If a specific user is selected, show line chart over time for that user
    if (selectedUserId) {
      return [...reportData].reverse().map(d => ({
        date: d.date,
        tasksCompleted: d.tasksCompleted
      }));
    } else {
      // Aggregate by user for bar chart
      const userMap = {};
      reportData.forEach(d => {
        if (!userMap[d.user.name]) {
          userMap[d.user.name] = { name: d.user.name, tasksCompleted: 0 };
        }
        userMap[d.user.name].tasksCompleted += d.tasksCompleted;
      });
      return Object.values(userMap).sort((a, b) => b.tasksCompleted - a.tasksCompleted).slice(0, 10);
    }
  }, [reportData, selectedUserId]);


  if (user?.role !== 'admin') {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        You do not have permission to view this page.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Attendance & Performance Report</h1>
          <p className="text-gray-500 dark:text-gray-400">Track staff attendance and task completion</p>
        </div>
        <button
          onClick={downloadPDF}
          disabled={reportData.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
        >
          <Download size={18} />
          <span>Export PDF</span>
        </button>
      </div>

      {/* Filters Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white"
              />
            </div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white"
              />
            </div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Staff Member (Optional)</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white appearance-none"
              >
                <option value="">All Staff</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="w-full md:w-auto px-6 py-2 bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-gray-900 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <Search size={18} />
            <span>Generate</span>
          </button>
        </form>
      </div>

      {/* Stats & Charts */}
      {reportData.length > 0 && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Summary Cards */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex items-center gap-4">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                <CheckCircle size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Tasks Completed</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {reportData.reduce((acc, curr) => acc + curr.tasksCompleted, 0)}
                </p>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                <Clock size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Records Found</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {reportData.length}
                </p>
              </div>
            </div>
          </div>
          
          {/* Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <BarChart2 size={20} className="text-indigo-500" />
              {selectedUserId ? 'Daily Task Completion' : 'Top Performers (Tasks)'}
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                {selectedUserId ? (
                  <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} vertical={false} />
                    <XAxis dataKey="date" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                      itemStyle={{ color: '#818cf8' }}
                    />
                    <Line type="monotone" dataKey="tasksCompleted" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }} activeDot={{ r: 6 }} name="Tasks Completed" />
                  </LineChart>
                ) : (
                  <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} vertical={false} />
                    <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                      itemStyle={{ color: '#818cf8' }}
                      cursor={{fill: 'transparent'}}
                    />
                    <Bar dataKey="tasksCompleted" fill="#6366f1" radius={[4, 4, 0, 0]} name="Tasks Completed" />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Detailed Report</h2>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center p-12">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : reportData.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            No records found for the selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Staff Member</th>
                  <th className="px-6 py-4 font-medium">Role</th>
                  <th className="px-6 py-4 font-medium">Login Time</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-center">Tasks Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {reportData.map((row, idx) => (
                  <tr key={`${row.date}_${row.user._id}_${idx}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4 text-gray-900 dark:text-gray-300">{row.date}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-white">{row.user.name}</div>
                      <div className="text-xs text-gray-500">@{row.user.username}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="capitalize text-gray-600 dark:text-gray-400">{row.user.role}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                      {row.firstLoginAt ? new Date(row.firstLoginAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${row.attendanceStatus === 'Present' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
                          row.attendanceStatus === 'Late' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : 
                          'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'}`}
                      >
                        {row.attendanceStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold">
                        {row.tasksCompleted}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
