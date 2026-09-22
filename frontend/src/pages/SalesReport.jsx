import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  Lock,
  Printer,
  IndianRupee,
  PieChart as PieChartIcon,
  Calendar,
  Filter,
  RotateCcw,
  TrendingUp,
  CreditCard,
  Activity,
  Package,
  BarChart2,
  PlusCircle,
  FileSpreadsheet,
  Search,
  Trash2,
  Edit2,
  Eye,
  X,
  Building,
  RefreshCw,
  Wallet,
  Percent
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

const EXPENSE_CATEGORIES = [
  "Monthly Rent",
  "Electricity & Utilities",
  "Salaries & Staff",
  "Food & Refreshments",
  "Courier Carrier Freight",
  "Packaging Material",
  "Rider & Fuel",
  "Marketing & Ads",
  "Equipment & Maintenance",
  "Other Expenses"
];

const PAYMENT_MODES = ["UPI", "Cash", "Bank Transfer", "Card", "Cheque"];

const BASE_SERVICES = [
  { value: "surface", label: "Surface" },
  { value: "campus-parcel", label: "Campus Parcel" },
  { value: "express", label: "Express" },
  { value: "air", label: "Air" },
  { value: "shifting", label: "Shifting" },
  { value: "premium", label: "Premium" },
  { value: "courier", label: "Courier" },
  { value: "international", label: "International" },
  { value: "local", label: "Local" },
  { value: "city-parcel", label: "City Parcel" },
  { value: "standard", label: "Standard" }
];

export const formatServiceName = (name) => {
  if (!name) return "Unknown";
  const clean = String(name).trim();
  if (clean.toLowerCase() === "campus-parcel") return "Campus Parcel";
  if (clean.toLowerCase() === "city-parcel") return "City Parcel";
  if (clean.toLowerCase() === "rakhi-parcel") return "Rakhi Parcel";
  return clean
    .split(/[-_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const SERVICE_PIE_COLORS = [
  "#0ea5e9", // Sky blue
  "#10b981", // Emerald green
  "#f59e0b", // Amber
  "#6366f1", // Indigo
  "#ec4899", // Pink
  "#8b5cf6", // Purple
  "#14b8a6", // Teal
  "#f97316", // Orange
  "#06b6d4", // Cyan
  "#84cc16", // Lime
  "#e11d48", // Rose
  "#64748b"  // Slate
];

const SalesReport = () => {
  // CEO Authentication Gate (persists across session until locked or tab closed)
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem("ceo_report_unlocked") === "true";
  });
  const [password, setPassword] = useState("");

  // Navigation Tabs: 'sales', 'pnl', 'expenses', 'shipments'
  const [activeTab, setActiveTab] = useState("sales");

  // Common Loading & Filters
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [serviceType, setServiceType] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [bookingStatus, setBookingStatus] = useState("active");
  const [marginPercent, setMarginPercent] = useState(40);

  // Sales Report Specific Data
  const [reportData, setReportData] = useState([]);
  const [serviceBreakdown, setServiceBreakdown] = useState([]);
  const [cancelledData, setCancelledData] = useState([]);

  // Dynamically computed service options (Base list + any custom services found in database)
  const serviceOptions = useMemo(() => {
    const knownValues = new Set(BASE_SERVICES.map((s) => s.value.toLowerCase()));
    const extraServices = [];

    (serviceBreakdown || []).forEach((item) => {
      const val = (item.serviceType || "").toLowerCase().trim();
      if (val && !knownValues.has(val) && val !== "unknown") {
        knownValues.add(val);
        extraServices.push({
          value: val,
          label: formatServiceName(val)
        });
      }
    });

    return [...BASE_SERVICES, ...extraServices];
  }, [serviceBreakdown]);

  // P&L & Expenses Data
  const [pnlData, setPnlData] = useState(null);
  const [loadingPnl, setLoadingPnl] = useState(false);

  // Expenses Ledger Data & Filters
  const [expenses, setExpenses] = useState([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [expenseTotalPages, setExpenseTotalPages] = useState(1);
  const [expensePage, setExpensePage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPaymentMode, setSelectedPaymentMode] = useState("all");
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState("all");
  const [expenseSearch, setExpenseSearch] = useState("");

  // Direct Shipment Costs Ledger Data & Filters
  const [shipments, setShipments] = useState([]);
  const [loadingShipments, setLoadingShipments] = useState(false);
  const [shipmentPage, setShipmentPage] = useState(1);
  const [shipmentTotal, setShipmentTotal] = useState(0);
  const [shipmentTotalPages, setShipmentTotalPages] = useState(1);
  const [shipmentSearch, setShipmentSearch] = useState("");

  // Modals
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [submittingExpense, setSubmittingExpense] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [expenseFormData, setExpenseFormData] = useState({
    title: "",
    category: "Monthly Rent",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    paymentMode: "UPI",
    paymentStatus: "Paid",
    vendor: "",
    notes: ""
  });

  const [shipmentModalOpen, setShipmentModalOpen] = useState(false);
  const [editingShipment, setEditingShipment] = useState(null);
  const [submittingShipment, setSubmittingShipment] = useState(false);
  const [shipmentFormData, setShipmentFormData] = useState({
    courierCost: "",
    packagingCost: "",
    riderCost: "",
    otherCost: "",
    notes: ""
  });

  // Fetch Sales Bookings Data
  const fetchReportData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/bookings/sales/report`, {
        params: { startDate, endDate, serviceType, paymentStatus, bookingStatus },
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setReportData(res.data.reportData || []);
        setServiceBreakdown(res.data.serviceBreakdown || []);
        setCancelledData(res.data.cancelledData || []);
      } else {
        toast.error("Failed to load sales report data");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error fetching report data");
    } finally {
      setLoading(false);
    }
  };

  // Fetch P&L Statement & Category Breakdown
  const fetchPnlAnalytics = async () => {
    try {
      setLoadingPnl(true);
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/expenses/pnl-analytics`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          startDate: startDate || undefined,
          endDate: endDate || undefined
        }
      });
      if (res.data.success) {
        setPnlData(res.data);
      }
    } catch (err) {
      console.error("Error loading P&L analytics:", err);
    } finally {
      setLoadingPnl(false);
    }
  };

  // Fetch Operating Expenses Table
  const fetchExpenses = async () => {
    try {
      setLoadingExpenses(true);
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/expenses`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page: expensePage,
          limit: 15,
          search: expenseSearch,
          category: selectedCategory,
          paymentMode: selectedPaymentMode,
          paymentStatus: selectedPaymentStatus,
          startDate: startDate || undefined,
          endDate: endDate || undefined
        }
      });
      if (res.data.success) {
        setExpenses(res.data.expenses || []);
        setExpenseTotalPages(res.data.pagination.totalPages || 1);
        setExpenseTotal(res.data.pagination.total || 0);
      }
    } catch (err) {
      console.error("Error loading expenses:", err);
      toast.error("Failed to load expenses list");
    } finally {
      setLoadingExpenses(false);
    }
  };

  // Fetch Shipments for Margin Audit
  const fetchShipments = async () => {
    try {
      setLoadingShipments(true);
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page: shipmentPage,
          limit: 15,
          search: shipmentSearch,
          serviceType: serviceType !== "all" ? serviceType : undefined,
          status: bookingStatus !== "all" ? bookingStatus : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined
        }
      });
      setShipments(res.data.bookings || []);
      setShipmentTotal(res.data.total || 0);
      setShipmentTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error("Error loading shipments for margin review:", err);
      toast.error("Failed to load shipments");
    } finally {
      setLoadingShipments(false);
    }
  };

  // Initial & Filter Triggers
  useEffect(() => {
    if (isAuthenticated) {
      fetchReportData();
      fetchPnlAnalytics();
    }
  }, [startDate, endDate, serviceType, paymentStatus, bookingStatus, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && activeTab === "expenses") {
      fetchExpenses();
    } else if (isAuthenticated && activeTab === "shipments") {
      fetchShipments();
    }
  }, [
    activeTab,
    expensePage,
    shipmentPage,
    selectedCategory,
    selectedPaymentMode,
    selectedPaymentStatus,
    serviceType,
    bookingStatus,
    shipmentSearch,
    startDate,
    endDate,
    isAuthenticated
  ]);

  // Auth Submit
  const handleLogin = (e) => {
    e.preventDefault();
    if (password === "only@CEO") {
      sessionStorage.setItem("ceo_report_unlocked", "true");
      setIsAuthenticated(true);
    } else {
      toast.error("Invalid CEO password");
      setPassword("");
    }
  };

  // Date Presets
  const setPresetDate = (type) => {
    const today = new Date();
    const formatDate = (d) => d.toISOString().split("T")[0];

    if (type === "today") {
      const s = formatDate(today);
      setStartDate(s);
      setEndDate(s);
    } else if (type === "yesterday") {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const s = formatDate(y);
      setStartDate(s);
      setEndDate(s);
    } else if (type === "this_month") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(formatDate(firstDay));
      setEndDate(formatDate(today));
    } else if (type === "last_month") {
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
      setStartDate(formatDate(firstDay));
      setEndDate(formatDate(lastDay));
    } else if (type === "this_year") {
      const firstDay = new Date(today.getFullYear(), 0, 1);
      setStartDate(formatDate(firstDay));
      setEndDate(formatDate(today));
    } else if (type === "all") {
      setStartDate("");
      setEndDate("");
    }
  };

  // Reset Filters
  const handleReset = () => {
    setStartDate("");
    setEndDate("");
    setServiceType("all");
    setPaymentStatus("all");
    setBookingStatus("active");
    setSelectedCategory("all");
    setSelectedPaymentMode("all");
    setSelectedPaymentStatus("all");
    setExpenseSearch("");
    setShipmentSearch("");
    setMarginPercent(40);
  };

  // Computed Values from Sales Data
  const totalRevenue = useMemo(() => reportData.reduce((sum, item) => sum + item.totalAmount, 0), [reportData]);
  const totalProfit = useMemo(() => totalRevenue * (marginPercent / 100), [totalRevenue, marginPercent]);
  const totalCollected = useMemo(() => reportData.reduce((sum, item) => sum + (item.collectedAmount || 0), 0), [reportData]);
  const totalBookings = useMemo(() => reportData.reduce((sum, item) => sum + item.totalBookings, 0), [reportData]);
  const totalPaidOrders = useMemo(() => reportData.reduce((sum, item) => sum + (item.paidOrders || 0), 0), [reportData]);
  const totalDueOrders = useMemo(() => reportData.reduce((sum, item) => sum + (item.dueOrders || 0), 0), [reportData]);
  const aov = totalBookings > 0 ? totalRevenue / totalBookings : 0;
  const collectionRate = totalBookings > 0 ? (totalPaidOrders / totalBookings) * 100 : 0;
  const totalCancelled = useMemo(() => cancelledData.reduce((sum, item) => sum + item.cancelledCount, 0), [cancelledData]);
  const totalCOD = useMemo(() => reportData.reduce((sum, item) => sum + (item.codAmount || 0), 0), [reportData]);
  const totalOnline = useMemo(() => reportData.reduce((sum, item) => sum + (item.onlineAmount || 0), 0), [reportData]);

  // Computed Values from P&L Data
  const pnlSummary = pnlData?.summary || {
    grossRevenue: totalRevenue,
    cashCollected: totalCollected,
    directCosts: { courierCost: 0, packagingCost: 0, riderCost: 0, otherCost: 0, total: 0 },
    operatingExpenses: { total: 0, paid: 0, pending: 0, count: 0 },
    totalAllExpenses: 0,
    actualNetProfit: totalRevenue,
    netProfitMarginPercent: 100,
    cashRealizedNetProfit: totalCollected
  };

  const isNetProfitable = pnlSummary.actualNetProfit >= 0;

  // Expense Modal Handlers
  const handleOpenAddExpense = () => {
    setEditingExpense(null);
    setReceiptFile(null);
    setExpenseFormData({
      title: "",
      category: "Monthly Rent",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      paymentMode: "UPI",
      paymentStatus: "Paid",
      vendor: "",
      notes: ""
    });
    setExpenseModalOpen(true);
  };

  const handleOpenEditExpense = (item) => {
    setEditingExpense(item);
    setReceiptFile(null);
    setExpenseFormData({
      title: item.title,
      category: item.category,
      amount: item.amount,
      date: new Date(item.date).toISOString().split("T")[0],
      paymentMode: item.paymentMode,
      paymentStatus: item.paymentStatus,
      vendor: item.vendor || "",
      notes: item.notes || ""
    });
    setExpenseModalOpen(true);
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    try {
      setSubmittingExpense(true);
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
      const bodyData = new FormData();
      Object.keys(expenseFormData).forEach((k) => bodyData.append(k, expenseFormData[k]));
      if (receiptFile) {
        bodyData.append("receipt", receiptFile);
      }

      if (editingExpense) {
        await axios.put(`${import.meta.env.VITE_API_URL}/api/expenses/${editingExpense._id}`, bodyData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data"
          }
        });
        toast.success("Expense updated successfully");
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/expenses`, bodyData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data"
          }
        });
        toast.success("Expense recorded successfully");
      }

      setExpenseModalOpen(false);
      fetchExpenses();
      fetchPnlAnalytics();
    } catch (err) {
      console.error("Error saving expense:", err);
      toast.error(err.response?.data?.message || "Failed to save expense");
    } finally {
      setSubmittingExpense(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm("Are you sure you want to delete this expense record?")) return;
    try {
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/expenses/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Expense deleted");
      fetchExpenses();
      fetchPnlAnalytics();
    } catch (err) {
      console.error("Delete expense error:", err);
      toast.error("Failed to delete expense");
    }
  };

  // Shipment Direct Cost Handlers
  const handleOpenEditShipment = (b) => {
    setEditingShipment(b);
    setShipmentFormData({
      courierCost: b.expenses?.courierCost || "",
      packagingCost: b.expenses?.packagingCost || "",
      riderCost: b.expenses?.riderCost || "",
      otherCost: b.expenses?.otherCost || "",
      notes: b.expenses?.notes || ""
    });
    setShipmentModalOpen(true);
  };

  const handleSaveShipmentCost = async (e) => {
    e.preventDefault();
    if (!editingShipment) return;
    try {
      setSubmittingShipment(true);
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
      const res = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/bookings/${editingShipment._id}/expenses`,
        shipmentFormData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        toast.success("Shipment direct expenses saved");
        setShipmentModalOpen(false);
        fetchShipments();
        fetchPnlAnalytics();
      }
    } catch (err) {
      console.error("Error updating shipment costs:", err);
      toast.error(err.response?.data?.message || "Failed to update shipment costs");
    } finally {
      setSubmittingShipment(false);
    }
  };

  // Print & Excel Handlers
  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    if (activeTab === "expenses") {
      if (expenses.length === 0) {
        toast.error("No expenses to export");
        return;
      }
      const data = expenses.map((item) => ({
        "Expense ID": item.expenseId,
        Date: new Date(item.date).toLocaleDateString("en-IN"),
        Title: item.title,
        Category: item.category,
        Vendor: item.vendor || "-",
        "Amount (₹)": item.amount,
        "Payment Mode": item.paymentMode,
        "Payment Status": item.paymentStatus,
        Notes: item.notes || ""
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Operating Expenses");
      XLSX.writeFile(wb, `Operating_Expenses_${new Date().toISOString().split("T")[0]}.xlsx`);
      return;
    }

    if (activeTab === "shipments") {
      if (shipments.length === 0) {
        toast.error("No shipment data to export");
        return;
      }
      const data = shipments.map((item) => {
        const rev = Number(item.pricing?.totalAmount || item.totalAmount || 0);
        const exp = item.expenses?.totalExpenses || 0;
        const prof = rev - exp;
        const margin = rev > 0 ? ((prof / rev) * 100).toFixed(1) : 0;
        return {
          "Booking ID": item.bookingId,
          "Tracking ID": item.trackingId || "-",
          Date: new Date(item.createdAt).toLocaleDateString("en-IN"),
          Service: formatServiceName(item.serviceType || "-"),
          Customer: item.senderDetails?.name || "-",
          "Billed Amount (₹)": rev,
          "Courier Freight (₹)": item.expenses?.courierCost || 0,
          "Packaging Cost (₹)": item.expenses?.packagingCost || 0,
          "Rider Payout (₹)": item.expenses?.riderCost || 0,
          "Total Costs (₹)": exp,
          "Order Net Profit (₹)": prof,
          "Margin (%)": `${margin}%`
        };
      });
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Shipment Order Margins");
      XLSX.writeFile(wb, `Shipment_Margins_${new Date().toISOString().split("T")[0]}.xlsx`);
      return;
    }

    // Default: Sales Report Export
    if (reportData.length === 0) {
      toast.error("No sales data to export");
      return;
    }
    const data = reportData.map((item) => {
      const isDaily = item.month.split("-").length === 3;
      let displayDate = item.month;
      if (!isDaily) {
        const [year, monthNum] = item.month.split("-");
        const date = new Date(year, monthNum - 1);
        displayDate = date.toLocaleString("default", { month: "long", year: "numeric" });
      }
      return {
        "Date/Month": displayDate,
        "Total Bookings": item.totalBookings,
        "Paid Orders": item.paidOrders || 0,
        "Revenue (₹)": item.totalAmount,
        [`Est. Profit @ ${marginPercent}% (₹)`]: Math.round((item.totalAmount * (marginPercent / 100)) * 100) / 100,
        "Collected (₹)": item.collectedAmount || 0,
        "Pending (₹)": Math.max(0, item.totalAmount - (item.collectedAmount || 0)),
        "₹0 Orders": item.dueOrders || 0
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales Report");

    if (serviceBreakdown && serviceBreakdown.length > 0) {
      const srvData = serviceBreakdown.map((s) => ({
        Service: formatServiceName(s.serviceType),
        "Total Bookings": s.totalBookings,
        "Total Revenue (₹)": s.totalRevenue || 0,
        "Collected Revenue (₹)": s.collectedRevenue || 0,
        "Paid Orders": s.paidOrders || 0
      }));
      const srvWs = XLSX.utils.json_to_sheet(srvData);
      XLSX.utils.book_append_sheet(wb, srvWs, "Service Breakdown");
    }

    XLSX.writeFile(wb, `Sales_Report_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // Password Lock Screen
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh]">
        <div className="bg-white dark:bg-[#1A1A1A] p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 dark:border-white/10">
          <div className="flex justify-center mb-6">
            <div className="bg-primary-100 dark:bg-primary-950/50 p-4 rounded-2xl">
              <Lock className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-center text-gray-900 dark:text-white mb-2">
            Restricted Access
          </h2>
          <p className="text-center text-gray-500 text-sm mb-6">
            Enter the CEO access key to view Sales, P&L, Monthly Rent, Electricity & Profit Reports.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                CEO Security Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm font-medium"
                placeholder="Enter password"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-primary-500/20 transition-all text-sm"
            >
              Unlock Executive Report
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 print:m-0 print:p-0">
      {/* 1. Page Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 print:mb-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-xl shadow-md text-white">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                Sales, Expenses & Profit Report
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Executive P&L command center • Gross Revenue, Monthly Rent, Electricity, Overheads & Net Profit
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 print:hidden">
          <button
            onClick={handleOpenAddExpense}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/25 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Record Expense</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-white dark:bg-[#1A1A1A] hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/10 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print PDF</span>
          </button>

          <button
            onClick={() => {
              sessionStorage.removeItem("ceo_report_unlocked");
              setIsAuthenticated(false);
              setPassword("");
            }}
            className="flex items-center gap-1.5 bg-white dark:bg-[#1A1A1A] hover:bg-rose-50 dark:hover:bg-rose-950/30 text-gray-500 hover:text-rose-600 border border-gray-200 dark:border-white/10 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all"
            title="Lock Report"
          >
            <Lock className="w-4 h-4" />
            <span>Lock</span>
          </button>
        </div>
      </div>

      {/* 2. Unified Executive KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Card 1: Gross Revenue */}
        <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl p-5 border border-gray-200/70 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Gross Revenue
            </span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-gray-900 dark:text-white">
              ₹{totalRevenue.toLocaleString("en-IN")}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1 font-medium">
            <span>Collected:</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              ₹{totalCollected.toLocaleString("en-IN")}
            </span>
            <span>•</span>
            <span className="text-rose-500 font-bold">
              ₹{Math.max(0, totalRevenue - totalCollected).toLocaleString("en-IN")} due
            </span>
          </p>
        </div>

        {/* Card 2: Est. Profit Margin */}
        <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl p-5 border border-emerald-200/70 dark:border-emerald-800/40 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              Est. Profit ({marginPercent}%)
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              ₹{totalProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-1 font-medium truncate">
            @ {marginPercent}% estimated gross margin
          </p>
        </div>

        {/* Card 2: Total Expenses (Rent + Electricity + Direct Costs) */}
        <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl p-5 border border-gray-200/70 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Total Expenses
            </span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-gray-900 dark:text-white">
              ₹{pnlSummary.totalAllExpenses.toLocaleString("en-IN")}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1 font-medium truncate">
            <span>Rent/Overheads: ₹{pnlSummary.operatingExpenses.total.toLocaleString("en-IN")}</span>
            <span>•</span>
            <span>Direct: ₹{pnlSummary.directCosts.total.toLocaleString("en-IN")}</span>
          </p>
        </div>

        {/* Card 3: Actual Net Profit */}
        <div
          className={`rounded-2xl p-5 border shadow-sm ${
            isNetProfitable
              ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40"
              : "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Actual Net Profit
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                isNetProfitable
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200"
                  : "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200"
              }`}
            >
              {pnlSummary.netProfitMarginPercent}% Margin
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-2xl sm:text-3xl font-black font-mono ${
                isNetProfitable ? "text-emerald-700 dark:text-emerald-300" : "text-rose-600 dark:text-rose-400"
              }`}
            >
              ₹{pnlSummary.actualNetProfit.toLocaleString("en-IN")}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
            Revenue − (Shipment Costs + Operating Expenses)
          </p>
        </div>

        {/* Card 4: Cash Realized Net Profit */}
        <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl p-5 border border-gray-200/70 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Cash Realized Profit
            </span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-gray-900 dark:text-white">
              ₹{pnlSummary.cashRealizedNetProfit.toLocaleString("en-IN")}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1 font-medium">
            Actual Cash Collected in Bank − Total Expenses
          </p>
        </div>
      </div>

      {/* 3. Filter Bar & Quick Date Presets */}
      <div className="bg-white dark:bg-[#1A1A1A] p-4 rounded-2xl border border-gray-200/70 dark:border-white/10 shadow-sm space-y-3 print:hidden">
        {/* Date presets pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 dark:border-white/10 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1">Period:</span>
            {[
              { label: "Today", id: "today" },
              { label: "Yesterday", id: "yesterday" },
              { label: "This Month", id: "this_month" },
              { label: "Last Month", id: "last_month" },
              { label: "This Year", id: "this_year" },
              { label: "All Time", id: "all" }
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPresetDate(p.id)}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        </div>

        {/* Granular date and select filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-[#111111] px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent border-none text-xs font-medium focus:ring-0 p-0 text-gray-700 dark:text-gray-300 outline-none"
            />
            <span className="text-gray-400 text-xs font-bold">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent border-none text-xs font-medium focus:ring-0 p-0 text-gray-700 dark:text-gray-300 outline-none"
            />
          </div>

          <div className="flex items-center gap-2 bg-gray-50 dark:bg-[#111111] px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={serviceType}
              onChange={(e) => {
                setServiceType(e.target.value);
                setShipmentPage(1);
              }}
              className="bg-transparent border-none text-xs font-bold focus:ring-0 p-0 pr-6 text-gray-700 dark:text-gray-300 outline-none cursor-pointer"
              title="Filter Sales by Service Type"
            >
              <option value="all">All Services</option>
              {serviceOptions.map((srv) => (
                <option key={srv.value} value={srv.value}>
                  {srv.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 dark:bg-[#111111] px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10">
            <CreditCard className="w-4 h-4 text-gray-400" />
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              className="bg-transparent border-none text-xs font-bold focus:ring-0 p-0 pr-6 text-gray-700 dark:text-gray-300 outline-none"
            >
              <option value="all">All Payment Statuses</option>
              <option value="paid">Paid Orders</option>
              <option value="due">Due / Unpaid</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 dark:bg-[#111111] px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10">
            <Activity className="w-4 h-4 text-gray-400" />
            <select
              value={bookingStatus}
              onChange={(e) => {
                setBookingStatus(e.target.value);
                setShipmentPage(1);
              }}
              className="bg-transparent border-none text-xs font-bold focus:ring-0 p-0 pr-6 text-gray-700 dark:text-gray-300 outline-none cursor-pointer"
              title="Filter by Booking Status"
            >
              <option value="active">Active (Non-Cancelled)</option>
              <option value="all">All Statuses</option>
              <option value="delivered">Delivered</option>
              <option value="confirmed">Confirmed</option>
              <option value="in-transit">In-Transit</option>
              <option value="out-for-delivery">Out for Delivery</option>
              <option value="pending">Pending</option>
              <option value="picked">Picked</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Margin Calculator Pill */}
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800/40">
            <Percent className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-200">Margin</span>
            <input
              type="number"
              min="0"
              max="100"
              value={marginPercent}
              onChange={(e) => setMarginPercent(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
              className="bg-transparent border-none text-xs focus:ring-0 p-0 w-10 font-bold text-emerald-700 dark:text-emerald-300 text-center outline-none"
            />
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">%</span>
          </div>
        </div>
      </div>

      {/* 4. Tab Navigation Strip */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-white/10 pb-1 print:hidden">
        {[
          { id: "sales", label: "Sales & Revenue", icon: BarChart2 },
          { id: "pnl", label: "Profit & Loss (P&L)", icon: TrendingUp },
          { id: "expenses", label: "Expenses Ledger (Rent, Electricity, etc.)", icon: Building },
          { id: "shipments", label: "Order Margins", icon: Package }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === tab.id
                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-md"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 5. TAB CONTENT */}

      {/* TAB 1: SALES & REVENUE */}
      {activeTab === "sales" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Secondary stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-[#1A1A1A] p-4 rounded-xl border border-gray-100 dark:border-white/10">
              <p className="text-xs text-gray-500 font-bold uppercase">Total Bookings</p>
              <p className="text-xl font-black font-mono text-gray-900 dark:text-white mt-1">
                {totalBookings.toLocaleString()}
              </p>
            </div>
            <div className="bg-white dark:bg-[#1A1A1A] p-4 rounded-xl border border-gray-100 dark:border-white/10">
              <p className="text-xs text-gray-500 font-bold uppercase">Avg Order Value</p>
              <p className="text-xl font-black font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                ₹{aov.toLocaleString(undefined, { maximumFractionDigits: 1 })}
              </p>
            </div>
            <div className="bg-white dark:bg-[#1A1A1A] p-4 rounded-xl border border-gray-100 dark:border-white/10">
              <p className="text-xs text-gray-500 font-bold uppercase">Collection Rate</p>
              <p className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                {collectionRate.toFixed(1)}%
              </p>
            </div>
            <div className="bg-white dark:bg-[#1A1A1A] p-4 rounded-xl border border-gray-100 dark:border-white/10">
              <p className="text-xs text-gray-500 font-bold uppercase">₹0 Amount Orders</p>
              <p className="text-xl font-black font-mono text-orange-600 dark:text-orange-400 mt-1">
                {totalDueOrders.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 p-6">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-primary-500" />
                <span>Revenue Trend</span>
              </h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[...reportData].reverse()} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="month"
                      tickFormatter={(val) => {
                        if (val.split("-").length === 3) return val;
                        const [year, month] = val.split("-");
                        return new Date(year, month - 1).toLocaleString("default", { month: "short", year: "2-digit" });
                      }}
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(val) => `₹${val >= 1000 ? `${val / 1000}k` : val}`}
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <RechartsTooltip
                      formatter={(value) => [`₹${value.toLocaleString()}`, "Revenue"]}
                      labelFormatter={(label) => `Period: ${label}`}
                      contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                    />
                    <Bar dataKey="totalAmount" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 p-6">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-primary-500" />
                <span>Bookings by Service</span>
              </h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={serviceBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="totalBookings"
                      nameKey="serviceType"
                    >
                      {serviceBreakdown.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={SERVICE_PIE_COLORS[index % SERVICE_PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value, name) => [value, formatServiceName(name)]}
                      contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      iconType="circle"
                      formatter={(value) => (
                        <span className="capitalize text-gray-700 dark:text-gray-300 font-medium text-xs">
                          {formatServiceName(value)}
                        </span>
                      )}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Service Breakdown Grid */}
          <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 p-6">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-primary-500" />
              <span>Service-wise Breakdown</span>
            </h3>
            {serviceBreakdown.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {serviceBreakdown.map((service) => (
                  <div
                    key={service.serviceType}
                    className="border border-gray-100 dark:border-white/10 rounded-xl p-4 bg-gray-50 dark:bg-[#111111]"
                  >
                    <p className="font-bold text-gray-900 dark:text-white text-sm mb-2">
                      {formatServiceName(service.serviceType)}
                    </p>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[11px] text-gray-400">Revenue</p>
                        <p className="font-bold text-gray-900 dark:text-white text-sm">
                          ₹{(service.totalRevenue || 0).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-gray-400">Collected</p>
                        <p className="font-bold text-emerald-600 text-sm">
                          ₹{(service.collectedRevenue || 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] text-gray-400">Bookings</p>
                        <p className="font-bold text-gray-700 dark:text-gray-300 text-sm">
                          {service.totalBookings}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-4">No service breakdown data available.</p>
            )}
          </div>

          {/* Sales Data Table */}
          <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Monthly & Daily Sales Summary
              </h3>
              <span className="text-xs text-gray-400 font-mono">
                {reportData.length} records
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10 text-xs">
                <thead className="bg-gray-50 dark:bg-[#111111]">
                  <tr>
                    <th className="px-5 py-3.5 text-left font-bold text-gray-500 uppercase tracking-wider">
                      {startDate && endDate ? "Date" : "Month"}
                    </th>
                    <th className="px-5 py-3.5 text-left font-bold text-gray-500 uppercase tracking-wider">
                      Total Bookings
                    </th>
                    <th className="px-5 py-3.5 text-right font-bold text-gray-500 uppercase tracking-wider">
                      Revenue (₹)
                    </th>
                    <th className="px-5 py-3.5 text-right font-bold text-emerald-600 uppercase tracking-wider">
                      Est. Profit ({marginPercent}%)
                    </th>
                    <th className="px-5 py-3.5 text-right font-bold text-emerald-600 uppercase tracking-wider">
                      Collected (₹)
                    </th>
                    <th className="px-5 py-3.5 text-right font-bold text-rose-500 uppercase tracking-wider">
                      Pending (₹)
                    </th>
                    <th className="px-5 py-3.5 text-center font-bold text-orange-500 uppercase tracking-wider">
                      ₹0 Orders
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {reportData.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-8 text-center text-gray-400">
                        No sales data found for the selected dates.
                      </td>
                    </tr>
                  ) : (
                    reportData.map((item) => {
                      const isDaily = item.month.split("-").length === 3;
                      let displayDate = item.month;
                      if (!isDaily) {
                        const [year, monthNum] = item.month.split("-");
                        const date = new Date(year, monthNum - 1);
                        displayDate = date.toLocaleString("default", { month: "long", year: "numeric" });
                      }
                      const pending = Math.max(0, item.totalAmount - (item.collectedAmount || 0));

                      return (
                        <tr key={item.month} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                          <td className="px-5 py-3.5 font-bold text-gray-900 dark:text-white">
                            {displayDate}
                          </td>
                          <td className="px-5 py-3.5 text-gray-600 dark:text-gray-400 font-medium">
                            {item.totalBookings} orders
                          </td>
                          <td className="px-5 py-3.5 font-bold font-mono text-gray-900 dark:text-white text-right">
                            ₹{item.totalAmount.toLocaleString()}
                          </td>
                          <td className="px-5 py-3.5 font-bold font-mono text-emerald-600 text-right">
                            ₹{(item.totalAmount * (marginPercent / 100)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-5 py-3.5 font-bold font-mono text-emerald-600 text-right">
                            ₹{(item.collectedAmount || 0).toLocaleString()}
                          </td>
                          <td className="px-5 py-3.5 font-bold font-mono text-rose-500 text-right">
                            ₹{pending.toLocaleString()}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            {(item.dueOrders || 0) > 0 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300">
                                {item.dueOrders} due
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300">
                                All priced
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PROFIT & LOSS (P&L STATEMENT & EXECUTIVE CHARTS) */}
      {activeTab === "pnl" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Revenue vs Expenses Side-by-Side Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 p-6">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span>Revenue vs Total Expenses Trend</span>
                </span>
                <span className="text-xs text-gray-400 font-normal">
                  Aggregated from bookings & overheads
                </span>
              </h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pnlData?.timeSeries || []} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#94a3b8", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(val) => `₹${val >= 1000 ? `${val / 1000}k` : val}`}
                      tick={{ fill: "#94a3b8", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <RechartsTooltip
                      formatter={(val, name) => [`₹${val.toLocaleString()}`, name]}
                      contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                    />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="totalExpenses" name="Total Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Comprehensive Category Donut Breakdown */}
            <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 p-6">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-emerald-500" />
                <span>Expense Categories Split</span>
              </h3>
              <div className="h-72 w-full">
                {pnlData?.categoryBreakdown?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={pnlData.categoryBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="amount"
                        nameKey="name"
                      >
                        {pnlData.categoryBreakdown.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              [
                                "#f43f5e",
                                "#f59e0b",
                                "#10b981",
                                "#6366f1",
                                "#8b5cf6",
                                "#06b6d4",
                                "#ec4899",
                                "#14b8a6",
                                "#84cc16"
                              ][index % 9]
                            }
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(val, name) => [`₹${val.toLocaleString()}`, name]}
                        contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={40}
                        iconType="circle"
                        formatter={(val) => <span className="text-[11px] text-gray-600 dark:text-gray-300">{val}</span>}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 text-xs">
                    No expense data logged in this period.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Full Executive P&L Statement Table */}
          <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-white/10">
              <h3 className="text-base font-black text-gray-900 dark:text-white">
                Executive Profit & Loss (P&L) Statement
              </h3>
              <p className="text-xs text-gray-400">
                Audited calculations based on all shipment bookings and verified operating overheads
              </p>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-white/5 text-xs">
              {/* Row: Gross Revenue */}
              <div className="p-4 flex items-center justify-between bg-gray-50/50 dark:bg-white/[0.02]">
                <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span>Gross Sales / Billed Revenue (A)</span>
                </div>
                <span className="font-mono font-black text-sm text-gray-900 dark:text-white">
                  ₹{pnlSummary.grossRevenue.toLocaleString("en-IN")}
                </span>
              </div>

              {/* Direct Shipment Costs Sub-items */}
              <div className="px-6 py-3 bg-white dark:bg-[#1A1A1A] space-y-2">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Direct Shipment Variable Costs (COGS)
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span>• Courier Carrier Freight (DTDC, Delhivery, etc.)</span>
                  <span className="font-mono">₹{pnlSummary.directCosts.courierCost.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span>• Packaging Materials (Boxes, Tape, Bubble wrap)</span>
                  <span className="font-mono">₹{pnlSummary.directCosts.packagingCost.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span>• Rider Payouts & Fuel</span>
                  <span className="font-mono">₹{pnlSummary.directCosts.riderCost.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 dark:text-white pt-1 border-t border-dashed border-gray-200 dark:border-white/10">
                  <span>Total Direct Costs (B)</span>
                  <span className="font-mono text-rose-600 dark:text-rose-400">
                    − ₹{pnlSummary.directCosts.total.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Row: Gross Profit */}
              <div className="p-4 flex items-center justify-between bg-blue-50/40 dark:bg-blue-950/20 font-bold">
                <span className="text-blue-900 dark:text-blue-200">
                  Gross Profit (A − B)
                </span>
                <span className="font-mono font-black text-sm text-blue-700 dark:text-blue-300">
                  ₹{(pnlSummary.grossRevenue - pnlSummary.directCosts.total).toLocaleString("en-IN")}
                </span>
              </div>

              {/* Operating Overheads Sub-items */}
              <div className="px-6 py-3 bg-white dark:bg-[#1A1A1A] space-y-2">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Operating Overheads (Ledger Expenses)
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span>• Monthly Hub / Office Rent & Utilities</span>
                  <span className="font-mono">
                    ₹{pnlSummary.operatingExpenses.total.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 dark:text-white pt-1 border-t border-dashed border-gray-200 dark:border-white/10">
                  <span>Total Operating Expenses (C)</span>
                  <span className="font-mono text-rose-600 dark:text-rose-400">
                    − ₹{pnlSummary.operatingExpenses.total.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Bottom Line: Actual Net Profit */}
              <div
                className={`p-5 flex items-center justify-between ${
                  isNetProfitable
                    ? "bg-emerald-100/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200"
                    : "bg-rose-100/60 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200"
                }`}
              >
                <div>
                  <div className="text-base font-black flex items-center gap-2">
                    <span>ACTUAL NET PROFIT (A − B − C)</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/70 dark:bg-black/30 font-bold">
                      {pnlSummary.netProfitMarginPercent}% Net Margin
                    </span>
                  </div>
                  <p className="text-[11px] opacity-80 mt-0.5">
                    Real bottom-line profit after subtracting all direct shipment and operating costs
                  </p>
                </div>
                <span className="text-2xl font-black font-mono">
                  ₹{pnlSummary.actualNetProfit.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: EXPENSES LEDGER (MONTHLY RENT, ELECTRICITY, OVERHEADS) */}
      {activeTab === "expenses" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Quick Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => {
                setSelectedCategory("all");
                setExpensePage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === "all"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
                  : "bg-white dark:bg-[#1A1A1A] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10 hover:bg-gray-50"
              }`}
            >
              All Categories ({expenseTotal})
            </button>
            {EXPENSE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setExpensePage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
                    : "bg-white dark:bg-[#1A1A1A] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10 hover:bg-gray-50"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search and Secondary Filter Row */}
          <div className="bg-white dark:bg-[#1A1A1A] p-3 rounded-xl border border-gray-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by title, vendor, notes, EXP ID..."
                value={expenseSearch}
                onChange={(e) => {
                  setExpenseSearch(e.target.value);
                  setExpensePage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 bg-gray-50 dark:bg-[#111111] text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedPaymentMode}
                onChange={(e) => {
                  setSelectedPaymentMode(e.target.value);
                  setExpensePage(1);
                }}
                className="px-2.5 py-1.5 bg-gray-50 dark:bg-[#111111] text-xs font-bold rounded-lg border border-gray-200 dark:border-white/10 outline-none text-gray-700 dark:text-gray-300"
              >
                <option value="all">All Modes</option>
                {PAYMENT_MODES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              <select
                value={selectedPaymentStatus}
                onChange={(e) => {
                  setSelectedPaymentStatus(e.target.value);
                  setExpensePage(1);
                }}
                className="px-2.5 py-1.5 bg-gray-50 dark:bg-[#111111] text-xs font-bold rounded-lg border border-gray-200 dark:border-white/10 outline-none text-gray-700 dark:text-gray-300"
              >
                <option value="all">All Status</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10 text-xs">
                <thead className="bg-gray-50 dark:bg-[#111111]">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-wider">Date & ID</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-wider">Title / Description</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-wider">Vendor / Paid To</th>
                    <th className="px-4 py-3 text-right font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-center font-bold text-gray-500 uppercase tracking-wider">Mode & Status</th>
                    <th className="px-4 py-3 text-center font-bold text-gray-500 uppercase tracking-wider">Receipt</th>
                    <th className="px-4 py-3 text-right font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {loadingExpenses ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-8 text-center text-gray-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                        <span>Loading expense records...</span>
                      </td>
                    </tr>
                  ) : expenses.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center text-gray-400">
                        <Building className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="font-bold text-sm text-gray-600 dark:text-gray-300">No expense records found</p>
                        <p className="text-xs mt-1">Click "+ Record Expense" to log Monthly Rent, Electricity, etc.</p>
                      </td>
                    </tr>
                  ) : (
                    expenses.map((item) => (
                      <tr key={item._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-bold text-gray-900 dark:text-white">
                            {new Date(item.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono">{item.expenseId}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-gray-900 dark:text-white">{item.title}</div>
                          {item.notes && <div className="text-[11px] text-gray-400 truncate max-w-xs">{item.notes}</div>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400 font-medium">
                          {item.vendor || "—"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right font-black font-mono text-gray-900 dark:text-white">
                          ₹{Number(item.amount).toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-[10px] text-gray-400 font-medium">{item.paymentMode}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                item.paymentStatus === "Paid"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                              }`}
                            >
                              {item.paymentStatus}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          {item.receiptUrl ? (
                            <a
                              href={`${import.meta.env.VITE_API_URL}${item.receiptUrl}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-bold text-xs"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </a>
                          ) : (
                            <span className="text-gray-300 dark:text-gray-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditExpense(item)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10"
                              title="Edit Expense"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteExpense(item._id)}
                              className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                              title="Delete Expense"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {expenseTotalPages > 1 && (
              <div className="p-3.5 border-t border-gray-100 dark:border-white/10 flex items-center justify-between text-xs">
                <span className="text-gray-400">
                  Page {expensePage} of {expenseTotalPages} ({expenseTotal} total)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setExpensePage((p) => Math.max(1, p - 1))}
                    disabled={expensePage === 1}
                    className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-white/10 disabled:opacity-40 font-bold"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setExpensePage((p) => Math.min(expenseTotalPages, p + 1))}
                    disabled={expensePage === expenseTotalPages}
                    className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-white/10 disabled:opacity-40 font-bold"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: SHIPMENT MARGINS (ORDER LEVEL DIRECT SHIPMENT COSTS) */}
      {activeTab === "shipments" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1A1A1A] p-3 rounded-xl border border-gray-200 dark:border-white/10 flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Order ID, Tracking ID, Customer..."
                value={shipmentSearch}
                onChange={(e) => {
                  setShipmentSearch(e.target.value);
                  setShipmentPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 bg-gray-50 dark:bg-[#111111] text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <span className="text-xs text-gray-400 font-mono">
              Total {shipmentTotal} orders
            </span>
          </div>

          <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10 text-xs">
                <thead className="bg-gray-50 dark:bg-[#111111]">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-wider">Booking ID</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-4 py-3 text-right font-bold text-gray-500 uppercase tracking-wider">Billed (₹)</th>
                    <th className="px-4 py-3 text-right font-bold text-gray-500 uppercase tracking-wider">Courier Freight (₹)</th>
                    <th className="px-4 py-3 text-right font-bold text-gray-500 uppercase tracking-wider">Packaging (₹)</th>
                    <th className="px-4 py-3 text-right font-bold text-gray-500 uppercase tracking-wider">Rider (₹)</th>
                    <th className="px-4 py-3 text-right font-bold text-gray-500 uppercase tracking-wider">Total Direct (₹)</th>
                    <th className="px-4 py-3 text-right font-bold text-emerald-600 uppercase tracking-wider">Order Net Profit</th>
                    <th className="px-4 py-3 text-center font-bold text-gray-500 uppercase tracking-wider">Margin %</th>
                    <th className="px-4 py-3 text-right font-bold text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {loadingShipments ? (
                    <tr>
                      <td colSpan="10" className="px-6 py-8 text-center text-gray-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                        <span>Loading orders...</span>
                      </td>
                    </tr>
                  ) : shipments.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="px-6 py-8 text-center text-gray-400">
                        No orders found for this search.
                      </td>
                    </tr>
                  ) : (
                    shipments.map((item) => {
                      const billed = Number(item.pricing?.totalAmount || item.totalAmount || 0);
                      const directCost = item.expenses?.totalExpenses || 0;
                      const orderProfit = billed - directCost;
                      const margin = billed > 0 ? ((orderProfit / billed) * 100).toFixed(1) : 0;
                      const hasCost = directCost > 0;

                      return (
                        <tr key={item._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="font-bold text-gray-900 dark:text-white font-mono">{item.bookingId}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-gray-400">
                                {new Date(item.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                              </span>
                              {item.serviceType && (
                                <span className="inline-block px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-[9px] font-bold">
                                  {formatServiceName(item.serviceType)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-700 dark:text-gray-300">
                            {item.senderDetails?.name || "—"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right font-bold font-mono text-gray-900 dark:text-white">
                            ₹{billed.toLocaleString("en-IN")}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right font-mono text-gray-600 dark:text-gray-400">
                            ₹{item.expenses?.courierCost || 0}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right font-mono text-gray-600 dark:text-gray-400">
                            ₹{item.expenses?.packagingCost || 0}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right font-mono text-gray-600 dark:text-gray-400">
                            ₹{item.expenses?.riderCost || 0}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right font-bold font-mono text-rose-500">
                            ₹{directCost.toLocaleString("en-IN")}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right font-bold font-mono">
                            <span className={orderProfit >= 0 ? "text-emerald-600" : "text-rose-600"}>
                              ₹{orderProfit.toLocaleString("en-IN")}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                orderProfit >= 0
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                                  : "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300"
                              }`}
                            >
                              {margin}%
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <button
                              onClick={() => handleOpenEditShipment(item)}
                              className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 text-xs font-bold transition-colors"
                            >
                              {hasCost ? "Edit" : "+ Add Cost"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {shipmentTotalPages > 1 && (
              <div className="p-3.5 border-t border-gray-100 dark:border-white/10 flex items-center justify-between text-xs">
                <span className="text-gray-400">
                  Page {shipmentPage} of {shipmentTotalPages} ({shipmentTotal} orders)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShipmentPage((p) => Math.max(1, p - 1))}
                    disabled={shipmentPage === 1}
                    className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-white/10 disabled:opacity-40 font-bold"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setShipmentPage((p) => Math.min(shipmentTotalPages, p + 1))}
                    disabled={shipmentPage === shipmentTotalPages}
                    className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-white/10 disabled:opacity-40 font-bold"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. RECORD / EDIT EXPENSE MODAL */}
      {expenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 max-w-lg w-full overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  {editingExpense ? "Edit Expense Record" : "Record New Expense"}
                </h3>
                <p className="text-xs text-gray-500">
                  Track Monthly Rent, Electricity & Utilities, Salaries, Tea, and other overheads
                </p>
              </div>
              <button
                onClick={() => setExpenseModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  Expense Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. September Office Rent, CESC Electricity Bill..."
                  value={expenseFormData.title}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#111111] text-gray-900 dark:text-white border border-gray-300 dark:border-white/10 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                    Category *
                  </label>
                  <select
                    value={expenseFormData.category}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, category: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-[#111111] text-gray-900 dark:text-white border border-gray-300 dark:border-white/10 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    placeholder="e.g. 15000"
                    value={expenseFormData.amount}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, amount: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-[#111111] text-gray-900 dark:text-white border border-gray-300 dark:border-white/10 rounded-xl text-xs font-bold font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                    Expense Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={expenseFormData.date}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, date: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-[#111111] text-gray-900 dark:text-white border border-gray-300 dark:border-white/10 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={expenseFormData.paymentMode}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, paymentMode: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-[#111111] text-gray-900 dark:text-white border border-gray-300 dark:border-white/10 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {PAYMENT_MODES.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                    Payment Status
                  </label>
                  <select
                    value={expenseFormData.paymentStatus}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, paymentStatus: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-[#111111] text-gray-900 dark:text-white border border-gray-300 dark:border-white/10 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                    Vendor / Paid To
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Landlord Name, CESC, Vendor"
                    value={expenseFormData.vendor}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, vendor: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-[#111111] text-gray-900 dark:text-white border border-gray-300 dark:border-white/10 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  Attach Bill / Receipt (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setReceiptFile(e.target.files[0] || null)}
                  className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  Notes / Audit Remarks
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional remarks, cheque number, meter reading, etc."
                  value={expenseFormData.notes}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#111111] text-gray-900 dark:text-white border border-gray-300 dark:border-white/10 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setExpenseModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-white/10 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingExpense}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-200 dark:shadow-none transition-all flex items-center gap-1.5"
                >
                  {submittingExpense && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingExpense ? "Update Expense" : "Save Expense"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. EDIT SHIPMENT COSTS MODAL */}
      {shipmentModalOpen && editingShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 max-w-md w-full overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Direct Shipment Costs
                </h3>
                <p className="text-xs text-gray-500 font-mono">
                  {editingShipment.bookingId} — Billed: ₹
                  {Number(editingShipment.pricing?.totalAmount || editingShipment.totalAmount || 0).toLocaleString("en-IN")}
                </p>
              </div>
              <button
                onClick={() => setShipmentModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveShipmentCost} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  Courier Carrier Freight Cost (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="e.g. 350 (Paid to DTDC/Delhivery)"
                  value={shipmentFormData.courierCost}
                  onChange={(e) => setShipmentFormData({ ...shipmentFormData, courierCost: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#111111] text-gray-900 dark:text-white border border-gray-300 dark:border-white/10 rounded-xl text-xs font-bold font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                    Packaging Cost (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 40 (Boxes, tape)"
                    value={shipmentFormData.packagingCost}
                    onChange={(e) => setShipmentFormData({ ...shipmentFormData, packagingCost: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-[#111111] text-gray-900 dark:text-white border border-gray-300 dark:border-white/10 rounded-xl text-xs font-bold font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                    Rider Payout / Fuel (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 30"
                    value={shipmentFormData.riderCost}
                    onChange={(e) => setShipmentFormData({ ...shipmentFormData, riderCost: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-[#111111] text-gray-900 dark:text-white border border-gray-300 dark:border-white/10 rounded-xl text-xs font-bold font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  Other Direct Costs (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="e.g. Loading / handling charges"
                  value={shipmentFormData.otherCost}
                  onChange={(e) => setShipmentFormData({ ...shipmentFormData, otherCost: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#111111] text-gray-900 dark:text-white border border-gray-300 dark:border-white/10 rounded-xl text-xs font-bold font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  Cost Notes / Audit Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g. Docket AWB K50003... DTDC invoice"
                  value={shipmentFormData.notes}
                  onChange={(e) => setShipmentFormData({ ...shipmentFormData, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#111111] text-gray-900 dark:text-white border border-gray-300 dark:border-white/10 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Instant Calculated Margin Preview */}
              {(() => {
                const billed = Number(editingShipment.pricing?.totalAmount || editingShipment.totalAmount || 0);
                const courier = parseFloat(shipmentFormData.courierCost) || 0;
                const pack = parseFloat(shipmentFormData.packagingCost) || 0;
                const rider = parseFloat(shipmentFormData.riderCost) || 0;
                const other = parseFloat(shipmentFormData.otherCost) || 0;
                const totalCost = courier + pack + rider + other;
                const profit = billed - totalCost;
                const margin = billed > 0 ? ((profit / billed) * 100).toFixed(1) : 0;
                const isProfitable = profit >= 0;

                return (
                  <div
                    className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-bold ${
                      isProfitable
                        ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200"
                        : "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/40 text-rose-900 dark:text-rose-200"
                    }`}
                  >
                    <div>
                      <span>Estimated Order Profit:</span>
                      <div className="text-base font-mono font-black mt-0.5">
                        ₹{profit.toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div className="text-right">
                      <span>Margin:</span>
                      <div className="text-base font-mono font-black mt-0.5">
                        {margin}%
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShipmentModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-white/10 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingShipment}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-200 dark:shadow-none transition-all flex items-center gap-1.5"
                >
                  {submittingShipment && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Shipment Costs</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Footer */}
      <div className="hidden print:block mt-12 text-center text-gray-500 text-xs">
        Executive Sales, Expenses & Net Profit Report • Generated on {new Date().toLocaleDateString("en-IN")} at{" "}
        {new Date().toLocaleTimeString("en-IN")}
      </div>
    </div>
  );
};

export default SalesReport;
