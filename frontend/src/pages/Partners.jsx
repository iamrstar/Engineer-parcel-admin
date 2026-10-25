"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import axios from "axios"
import toast from "react-hot-toast"
import {
  Building,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Phone,
  Mail,
  MapPin,
  Map,
  Globe,
  Eye,
  Home,
  Wallet,
  History,
  TrendingDown,
  TrendingUp,
  DollarSign,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  Package,
  Check,
  XCircle,
  FileText,
  Key,
  Calendar,
  Download,
  RotateCcw,
  Filter,
  Printer,
  Share2,
  Copy,
  Send,
  Receipt,
  Link as LinkIcon
} from "lucide-react"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"

const COMPANY_PROFILES = {
  SRQ: {
    key: "SRQ",
    name: "SRQ ENGINEERS PARCEL AND HAUL PRIVATE LIMITED",
    shortName: "Engineers Parcel",
    tagline: "Complete Logistics & Express Courier Solutions",
    address: "IIT (ISM) Dhanbad, Sardar Patel Nagar, Dhanbad - 826004, Jharkhand, India",
    phone: "+91 9708815717 / 9525801506",
    email: "info@engineersparcel.in",
    website: "www.engineersparcel.in",
    cin: "U63090JH2023PTC020726",
    gstin: "20AAHCS7825E1ZY",
    bank: "UCO Bank",
    accountName: "SRQ ENGINEERS PARCEL AND HAUL PVT LTD",
    accountNo: "01910210001448",
    accountType: "Current Account (CAA)",
    ifsc: "UCBA0000191",
    branch: "Hirapur, Dhanbad",
    upi: "engineersparcel@uco"
  },
  ENGGPARCEL: {
    key: "ENGGPARCEL",
    name: "ENGGPARCEL SERVICES LLP",
    shortName: "EnggParcel Services",
    tagline: "Premier Express Courier & Cargo Solutions",
    address: "IIT (ISM) Dhanbad - 826004, Jharkhand, India",
    phone: "+91 9708815717 / 9525801506",
    email: "info@engineersparcel.in",
    website: "www.engineersparcel.in",
    cin: "AAZ-3942",
    gstin: "20AAQFE4312Q1ZX",
    bank: "ICICI Bank",
    accountName: "ENGGPARCEL SERVICES LLP",
    accountNo: "196005001234",
    accountType: "Current Account",
    ifsc: "ICIC0000196",
    branch: "Dhanbad Branch",
    upi: "enggparcel@icici"
  }
};

const numberToWordsIndian = (num) => {
  if (!num || isNaN(num) || num <= 0) return "Zero Rupees Only";
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const convert = (n) => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : "");
    if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " and " + convert(n % 100) : "");
    if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + convert(n % 1000) : "");
    if (n < 10000000) return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 !== 0 ? " " + convert(n % 100000) : "");
    return convert(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 !== 0 ? " " + convert(n % 10000000) : "");
  };
  const rounded = Math.round(Number(num));
  return `Rupees ${convert(rounded)} Only`;
};

const getTimeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (isNaN(seconds)) return "N/A";
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return Math.floor(seconds) + " seconds ago";
};

const getStatusColor = (status) => {
  const colors = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    confirmed: "bg-blue-100 text-blue-800 border-blue-200",
    picked: "bg-purple-100 text-purple-800 border-purple-200",
    "in-transit": "bg-indigo-100 text-indigo-800 border-indigo-200",
    "out-for-delivery": "bg-orange-100 text-orange-800 border-orange-200",
    delivered: "bg-green-100 text-green-800 border-green-200",
    cancelled: "bg-red-100 text-red-800 border-red-200",
    empty_box_delivered: "bg-blue-100 text-blue-800 border-blue-200",
    filled_box_picked: "bg-teal-100 text-teal-800 border-teal-200",
  }
  return colors[status] || "bg-gray-100 dark:bg-[#111111] text-gray-800 dark:text-gray-200 border-gray-200 dark:border-white/10"
};

const TrackingHistoryTooltip = ({ booking }) => {
  const realTrackingHistory = (booking?.trackingHistory || []).filter(t => {
    const desc = (t?.description || '').toLowerCase();
    return !desc.includes('seed') && !desc.includes('sync to main') && !desc.includes('verified and seeded') && !desc.includes('booking verified by');
  });

  const lastTrack = realTrackingHistory.length > 0
    ? realTrackingHistory[realTrackingHistory.length - 1]
    : null;

  return (
    <div className="absolute hidden group-hover:flex flex-col gap-1.5 z-30 w-64 p-3 bg-slate-900/95 backdrop-blur-md text-white rounded-xl shadow-2xl border border-slate-700/80 bottom-full mb-2.5 left-1/2 -translate-x-1/2 transition-all duration-200 ease-out origin-bottom scale-95 group-hover:scale-100 pointer-events-none">
      {/* Tooltip arrow */}
      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 border-r border-b border-gray-200 dark:border-white/10 border-slate-700/80 rotate-45"></div>
      
      {/* Tooltip Content */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 border-slate-700 pb-1.5 mb-0.5">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last Status Update</span>
        {lastTrack?.timestamp && (
          <span className="text-[9px] text-slate-400 font-medium">
            {getTimeAgo(lastTrack.timestamp)}
          </span>
        )}
      </div>

      {lastTrack ? (
        <div className="space-y-1.5 text-left whitespace-normal">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] font-semibold text-slate-400 select-none">Status:</span>
            <span className="text-xs font-bold text-orange-400 capitalize">
              {lastTrack.status === 'empty_box_delivered' ? 'Empty Box Delivered' :
               lastTrack.status === 'filled_box_picked' ? 'Filled Box Picked' :
               lastTrack.status}
            </span>
          </div>
          {lastTrack.location && (
            <div className="flex items-baseline gap-1.5">
              <span className="text-[10px] font-semibold text-slate-400 select-none">Location:</span>
              <span className="text-xs text-slate-200 font-medium">{lastTrack.location}</span>
            </div>
          )}
          {lastTrack.description && (
            <div className="flex flex-col mt-0.5 pt-0.5 border-t border-slate-800">
              <span className="text-[9px] font-semibold text-slate-400 uppercase select-none">Message:</span>
              <p className="text-[11px] text-slate-300 leading-relaxed italic font-serif">
                "{lastTrack.description}"
              </p>
            </div>
          )}
          <div className="text-[9px] text-slate-500 text-right mt-1 font-mono select-none">
            {new Date(lastTrack.timestamp).toLocaleString()}
          </div>
        </div>
      ) : (
        <div className="text-center py-2 text-slate-400 text-xs italic">
          No updates recorded
        </div>
      )}
    </div>
  );
};

const Vendors = () => {
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingVendor, setEditingVendor] = useState(null)
  const [pincodeLoading, setPincodeLoading] = useState(false)
  const [pincodeSuccess, setPincodeSuccess] = useState(false)

  // Finance States & Date Filtering
  const [selectedVendorForFinance, setSelectedVendorForFinance] = useState(null)
  const [vendorOrders, setVendorOrders] = useState([])
  const [vendorPayments, setVendorPayments] = useState([])
  const [financeSummary, setFinanceSummary] = useState(null)
  const [financeLoading, setFinanceLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('orders') // 'orders' or 'settlements'
  
  // Date filter: 'month', 'custom', 'all'
  const [dateFilterType, setDateFilterType] = useState("month")
  const [financeMonth, setFinanceMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  })
  const [customStartDate, setCustomStartDate] = useState(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    return `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}-01`;
  })
  const [customEndDate, setCustomEndDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  })

  // Edit Order Payment Modal
  const [editingOrder, setEditingOrder] = useState(null)
  const [orderPaymentData, setOrderPaymentData] = useState({
    totalAmount: 0,
    vendorPaidAmount: 0,
    vendorPaymentMethod: "Cash",
    vendorReceivedBy: localStorage.getItem("adminName") || "Admin",
    vendorPaymentDate: new Date().toISOString().split("T")[0]
  })

  const [editingHistoryId, setEditingHistoryId] = useState(null)
  const [editingHistoryAmount, setEditingHistoryAmount] = useState(0)

  // Bulk Settlement Modal
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false)
  const [settlementData, setSettlementData] = useState({
    amount: 0,
    paymentMethod: "Cash",
    receivedBy: localStorage.getItem("adminName") || "Admin",
    month: new Date().toISOString().substring(0, 7),
    notes: ""
  })

  // PDF Options Modal States
  const [pdfModalOpen, setPdfModalOpen] = useState(false)
  const [pdfBooking, setPdfBooking] = useState(null)
  const [pdfOptions, setPdfOptions] = useState({ receipt: true, label: true, declaration: true })

  // Partner Invoice Modal States
  const [partnerInvoiceModalOpen, setPartnerInvoiceModalOpen] = useState(false)
  const [isGeneratingInvoicePdf, setIsGeneratingInvoicePdf] = useState(false)
  const [selectedInvoiceOrderIds, setSelectedInvoiceOrderIds] = useState([])
  const [invoiceConfig, setInvoiceConfig] = useState({
    invoiceNumber: "",
    invoiceDate: new Date().toISOString().substring(0, 10),
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString().substring(0, 10),
    companyKey: "SRQ",
    gstType: "inclusive",
    deductPayments: true,
    notes: "Payment due within 15 days from invoice date. Subject to Dhanbad jurisdiction."
  })

  // Form State
  const [formData, setFormData] = useState({
    partnerId: "",
    name: "",
    email: "",
    phone: "",
    gstNumber: "",
    address: "",
    address2: "",
    city: "",
    state: "",
    pincode: "",
    landmark: "",
    apiKey: "",
    webhookUrl: "",
    password: "",
    pricePerKg: 0
  })

  useEffect(() => {
    fetchVendors()
  }, [])

  useEffect(() => {
    const fetchAddress = async () => {
      if (formData.pincode.length === 6) {
        setPincodeLoading(true)
        try {
          const token = localStorage.getItem("adminToken") || localStorage.getItem("token")
          const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/pincodes?code=${formData.pincode}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          if (res.data.available) {
            setFormData(prev => ({
              ...prev,
              city: res.data.city,
              state: res.data.state
            }))
            setPincodeSuccess(true)
            toast.success("Location details fetched!")
          } else {
            setPincodeSuccess(false)
          }
        } catch (error) {
          console.error("Pincode fetch error:", error)
        } finally {
          setPincodeLoading(false)
        }
      }
    }
    if (formData.pincode.length < 6) setPincodeSuccess(false)
    fetchAddress()
  }, [formData.pincode])

  const fetchVendors = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token")
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/partners`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setVendors(res.data)
    } catch (error) {
      toast.error("Failed to fetch vendors")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const buildDateQueryParams = (override = {}) => {
    const type = override.dateFilterType !== undefined ? override.dateFilterType : dateFilterType;
    if (type === "all") return "?filterType=all";
    if (type === "custom") {
      const s = override.customStartDate !== undefined ? override.customStartDate : customStartDate;
      const e = override.customEndDate !== undefined ? override.customEndDate : customEndDate;
      if (s && e) return `?filterType=custom&startDate=${s}&endDate=${e}`;
      if (s) return `?filterType=custom&startDate=${s}&endDate=${s}`;
    }
    const m = override.financeMonth !== undefined ? override.financeMonth : financeMonth;
    return m ? `?filterType=month&month=${m}` : "?filterType=all";
  };

  const fetchVendorFinances = async (vendor = selectedVendorForFinance, overrideFilter = null) => {
    const targetVendor = vendor || selectedVendorForFinance;
    if (!targetVendor) return;
    try {
      setFinanceLoading(true);
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      
      const queryParams = buildDateQueryParams(overrideFilter || {});

      const [ordersRes, paymentsRes, summaryRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/api/partners/${targetVendor._id}/orders${queryParams}`, { headers }),
        axios.get(`${import.meta.env.VITE_API_URL}/api/vendor-payments/${targetVendor.partnerId}${queryParams}`, { headers }),
        axios.get(`${import.meta.env.VITE_API_URL}/api/partners/${targetVendor._id}/finances${queryParams}`, { headers })
      ]);

      setVendorOrders(ordersRes.data || []);
      setVendorPayments(paymentsRes.data || []);
      setFinanceSummary(summaryRes.data || null);
      setSelectedVendorForFinance(targetVendor);
    } catch (error) {
      toast.error("Failed to fetch financial data");
      console.error(error);
    } finally {
      setFinanceLoading(false);
    }
  };

  const handlePrevMonth = () => {
    const cur = financeMonth || new Date().toISOString().substring(0, 7);
    const [y, m] = cur.split("-").map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const newMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
    setFinanceMonth(newMonth);
    setDateFilterType("month");
    fetchVendorFinances(selectedVendorForFinance, { dateFilterType: "month", financeMonth: newMonth });
  };

  const handleNextMonth = () => {
    const cur = financeMonth || new Date().toISOString().substring(0, 7);
    const [y, m] = cur.split("-").map(Number);
    const nextDate = new Date(y, m, 1);
    const newMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`;
    setFinanceMonth(newMonth);
    setDateFilterType("month");
    fetchVendorFinances(selectedVendorForFinance, { dateFilterType: "month", financeMonth: newMonth });
  };

  const handleSetCurrentMonth = () => {
    const today = new Date();
    const curMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    setFinanceMonth(curMonth);
    setDateFilterType("month");
    fetchVendorFinances(selectedVendorForFinance, { dateFilterType: "month", financeMonth: curMonth });
  };

  const handleSetQuickPreset = (preset) => {
    const today = new Date();
    const formatDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    let s = "";
    let e = formatDate(today);

    if (preset === "today") {
      s = e;
    } else if (preset === "yesterday") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      s = formatDate(y);
      e = s;
    } else if (preset === "last7") {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      s = formatDate(d);
    } else if (preset === "thisMonth") {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      s = formatDate(first);
    } else if (preset === "lastMonth") {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const last = new Date(today.getFullYear(), today.getMonth(), 0);
      s = formatDate(first);
      e = formatDate(last);
    } else if (preset === "last30") {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      s = formatDate(d);
    }

    setCustomStartDate(s);
    setCustomEndDate(e);
    setDateFilterType("custom");
    fetchVendorFinances(selectedVendorForFinance, {
      dateFilterType: "custom",
      customStartDate: s,
      customEndDate: e
    });
  };

  const handleApplyCustomRange = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!customStartDate) {
      toast.error("Please enter a start date");
      return;
    }
    const end = customEndDate || customStartDate;
    setDateFilterType("custom");
    fetchVendorFinances(selectedVendorForFinance, {
      dateFilterType: "custom",
      customStartDate,
      customEndDate: end
    });
  };

  const handleSetAllTime = () => {
    setDateFilterType("all");
    fetchVendorFinances(selectedVendorForFinance, { dateFilterType: "all" });
  };

  const formatMonthName = (monthStr) => {
    if (!monthStr || !monthStr.includes("-")) return monthStr || "";
    const [y, m] = monthStr.split("-").map(Number);
    const date = new Date(y, m - 1, 1);
    return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  };

  const handleExportPartnerOrders = () => {
    if (vendorOrders.length === 0) {
      toast.error("No orders to export for this period");
      return;
    }
    const exportData = vendorOrders.map((order, idx) => ({
      "S.No": idx + 1,
      "Order / Tracking ID": order.trackingId || order.bookingId,
      "Booking Date": new Date(order.createdAt).toLocaleDateString("en-IN"),
      "Sender Name": order.senderDetails?.name || "",
      "Sender City": order.senderDetails?.city || "",
      "Receiver Name": order.receiverDetails?.name || "",
      "Receiver City": order.receiverDetails?.city || "",
      "Total Amount (Rs)": order.pricing?.totalAmount || 0,
      "Paid Amount (Rs)": order.vendorPaidAmount || 0,
      "Due Balance (Rs)": Math.max(0, (order.pricing?.totalAmount || 0) - (order.vendorPaidAmount || 0)),
      "Payment Status": order.vendorPaymentStatus || "Pending",
      "Shipment Status": order.status || ""
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");
    const partnerNameSafe = (selectedVendorForFinance?.name || "Partner").replace(/[^a-zA-Z0-9]/g, "_");
    const periodLabel = dateFilterType === 'month' ? financeMonth : dateFilterType === 'custom' ? `${customStartDate}_to_${customEndDate}` : 'All_Time';
    XLSX.writeFile(workbook, `${partnerNameSafe}_Orders_${periodLabel}.xlsx`);
    toast.success("Excel report exported!");
  };

  const handleOpenPartnerInvoiceModal = () => {
    if (!selectedVendorForFinance) return;
    if (vendorOrders.length === 0) {
      toast.error("No orders found for the active filter to generate an invoice.");
      return;
    }
    const today = new Date();
    const curYear = today.getFullYear();
    const fy = today.getMonth() >= 2 ? `${String(curYear).slice(2)}-${String(curYear + 1).slice(2)}` : `${String(curYear - 1).slice(2)}-${String(curYear).slice(2)}`;
    const monthNum = String(today.getMonth() + 1).padStart(2, '0');
    const partnerCode = selectedVendorForFinance.partnerId || 'PAT';
    const randomSeq = String(Math.floor(100 + Math.random() * 900));
    const invNo = `INV/${fy}/${partnerCode}-${monthNum}${randomSeq}`;

    setInvoiceConfig({
      invoiceNumber: invNo,
      invoiceDate: today.toISOString().substring(0, 10),
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString().substring(0, 10),
      companyKey: "SRQ",
      gstType: selectedVendorForFinance.gstNumber ? "inclusive" : "exempt",
      deductPayments: true,
      notes: "Payment due within 15 days from invoice date. Subject to Dhanbad jurisdiction."
    });
    setSelectedInvoiceOrderIds(vendorOrders.map(o => o._id));
    setPartnerInvoiceModalOpen(true);
  };

  const handleOpenSingleOrderInvoice = (order) => {
    if (!selectedVendorForFinance || !order) return;
    const today = new Date();
    const curYear = today.getFullYear();
    const fy = today.getMonth() >= 2 ? `${String(curYear).slice(2)}-${String(curYear + 1).slice(2)}` : `${String(curYear - 1).slice(2)}-${String(curYear).slice(2)}`;
    const tid = order.trackingId || order.bookingId || 'ORD';
    const invNo = `INV/${fy}/${tid}`;

    setInvoiceConfig({
      invoiceNumber: invNo,
      invoiceDate: today.toISOString().substring(0, 10),
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString().substring(0, 10),
      companyKey: "SRQ",
      gstType: selectedVendorForFinance.gstNumber ? "inclusive" : "exempt",
      deductPayments: true,
      notes: "Payment due within 15 days from invoice date. Subject to Dhanbad jurisdiction."
    });
    setSelectedInvoiceOrderIds([order._id]);
    setPartnerInvoiceModalOpen(true);
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  const handleDownloadInvoicePDF = async () => {
    const element = document.getElementById("partner-invoice-printable");
    if (!element) {
      toast.error("Invoice printable view not found");
      return;
    }
    try {
      setIsGeneratingInvoicePdf(true);
      toast.loading("Generating High-Resolution Invoice PDF...", { id: "partner-inv-pdf" });

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff"
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210; // A4 mm
      const pageHeight = 297; // A4 mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const cleanNum = invoiceConfig.invoiceNumber.replace(/[\/\\?%*:|"<>]/g, "-");
      const filename = `Invoice_${selectedVendorForFinance?.partnerId || "PARTNER"}_${cleanNum}.pdf`;
      pdf.save(filename);
      toast.success("Invoice PDF downloaded successfully!", { id: "partner-inv-pdf" });
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("Error creating PDF, launching print view...", { id: "partner-inv-pdf" });
      window.print();
    } finally {
      setIsGeneratingInvoicePdf(false);
    }
  };

  const handleSendWhatsApp = (finalPayableAmount, invoicePeriodLabel, selectedOrdersCount) => {
    if (!selectedVendorForFinance) return;
    const phone = (selectedVendorForFinance.phone || "").replace(/\D/g, "");
    const formattedPhone = phone.length === 10 ? `91${phone}` : phone;
    const company = COMPANY_PROFILES[invoiceConfig.companyKey] || COMPANY_PROFILES.SRQ;

    const message = `*INVOICE: ${invoiceConfig.invoiceNumber}*
*To:* ${selectedVendorForFinance.name} (${selectedVendorForFinance.partnerId})
*Billing Period:* ${invoicePeriodLabel}
*Invoice Date:* ${invoiceConfig.invoiceDate}
*Payment Due Date:* ${invoiceConfig.dueDate}
*Total Consignments:* ${selectedOrdersCount}
*Total Net Payable:* Rs. ${finalPayableAmount.toLocaleString('en-IN')} (${numberToWordsIndian(finalPayableAmount)})

*Bank Payment Transfer Details:*
*Account Name:* ${company.accountName}
*Bank:* ${company.bank}
*A/c No:* ${company.accountNo}
*IFSC:* ${company.ifsc}
*Branch:* ${company.branch}
*UPI ID:* ${company.upi}

Kindly review the invoice and process payment before ${invoiceConfig.dueDate}.
Thank you for partnering with Engineers Parcel!`;

    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleCopyInvoiceSummary = (finalPayableAmount, invoicePeriodLabel, selectedOrdersCount) => {
    if (!selectedVendorForFinance) return;
    const company = COMPANY_PROFILES[invoiceConfig.companyKey] || COMPANY_PROFILES.SRQ;
    const text = `INVOICE: ${invoiceConfig.invoiceNumber}
To: ${selectedVendorForFinance.name} (${selectedVendorForFinance.partnerId})
Billing Period: ${invoicePeriodLabel}
Date: ${invoiceConfig.invoiceDate}
Due Date: ${invoiceConfig.dueDate}
Total Consignments: ${selectedOrdersCount}
Total Net Payable: Rs. ${finalPayableAmount.toLocaleString('en-IN')} (${numberToWordsIndian(finalPayableAmount)})

Bank Details:
Company: ${company.name}
Bank: ${company.bank}
A/c No: ${company.accountNo}
IFSC: ${company.ifsc}
Branch: ${company.branch}
UPI ID: ${company.upi}`;

    navigator.clipboard.writeText(text);
    toast.success("Invoice summary copied to clipboard!");
  };

  const handleUpdateOrderPayment = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token")
      
      const payload = {
        ...orderPaymentData,
        vendorPaidAmount: (Number(orderPaymentData.vendorPaidAmount) || 0) + (Number(orderPaymentData.newPaymentAmount) || 0)
      }

      await axios.put(
        `${import.meta.env.VITE_API_URL}/api/partners/order/${editingOrder._id}/payment`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success("Order payment updated")
      setEditingOrder(null)
      fetchVendorFinances(selectedVendorForFinance)
    } catch (error) {
      toast.error("Failed to update order payment")
    }
  }

  const handleEditHistory = async (historyId, newAmount) => {
    try {
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token")
      await axios.put(
        `${import.meta.env.VITE_API_URL}/api/partners/order/${editingOrder._id}/history/${historyId}`,
        { amount: newAmount },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success("Payment history updated")
      
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/partners/${selectedVendorForFinance._id}/orders${buildDateQueryParams()}`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setVendorOrders(res.data)
      const updatedOrder = res.data.find(o => o._id === editingOrder._id);
      if (updatedOrder) {
         setEditingOrder(updatedOrder);
         setOrderPaymentData(prev => ({...prev, vendorPaidAmount: updatedOrder.vendorPaidAmount}));
      }
      
      fetchVendorFinances(selectedVendorForFinance);
      setEditingHistoryId(null);
    } catch (error) {
      toast.error("Failed to update history")
    }
  }

  const handleDeleteHistory = async (historyId) => {
    if (!window.confirm("Are you sure you want to delete this payment record?")) return;
    try {
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token")
      await axios.delete(
        `${import.meta.env.VITE_API_URL}/api/partners/order/${editingOrder._id}/history/${historyId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success("Payment history deleted")
      
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/partners/${selectedVendorForFinance._id}/orders${buildDateQueryParams()}`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setVendorOrders(res.data)
      const updatedOrder = res.data.find(o => o._id === editingOrder._id);
      if (updatedOrder) {
         setEditingOrder(updatedOrder);
         setOrderPaymentData(prev => ({...prev, vendorPaidAmount: updatedOrder.vendorPaidAmount}));
      }
      
      fetchVendorFinances(selectedVendorForFinance);
    } catch (error) {
      toast.error("Failed to delete history")
    }
  }

  const handleRecordSettlement = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token")
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/vendor-payments`,
        { ...settlementData, vendorId: selectedVendorForFinance.partnerId },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success("Settlement recorded")
      setIsSettlementModalOpen(false)
      fetchVendorFinances(selectedVendorForFinance)
    } catch (error) {
      toast.error("Failed to record settlement")
    }
  }

  const handleOpenModal = (vendor = null) => {
    if (vendor) {
      setEditingVendor(vendor)
      setFormData({
        partnerId: vendor.partnerId,
        name: vendor.name,
        phone: vendor.phone,
        email: vendor.email || "",
        gstNumber: vendor.gstNumber || "",
        address: vendor.address,
        address2: vendor.address2 || "",
        city: vendor.city,
        state: vendor.state,
        pincode: vendor.pincode || "",
        landmark: vendor.landmark || "",
        apiKey: vendor.apiKey || "",
        webhookUrl: vendor.webhookUrl || "",
        password: "",
        pricePerKg: vendor.pricePerKg || 0
      })
    } else {
      setEditingVendor(null)
      setFormData({
        partnerId: "",
        name: "",
        phone: "",
        email: "",
        gstNumber: "",
        address: "",
        address2: "",
        city: "",
        state: "",
        pincode: "",
        landmark: "",
        apiKey: "",
        webhookUrl: "",
        password: "",
        pricePerKg: 0
      })
    }
    setPincodeSuccess(vendor ? true : false)
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token")
      const url = editingVendor
        ? `${import.meta.env.VITE_API_URL}/api/partners/${editingVendor._id}`
        : `${import.meta.env.VITE_API_URL}/api/partners`

      const method = editingVendor ? "put" : "post"

      await axios[method](url, formData, {
        headers: { Authorization: `Bearer ${token}` }
      })

      toast.success(editingVendor ? "Partner updated successfully" : "Partner created successfully")
      setIsModalOpen(false)
      fetchVendors()
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save partner")
      console.error(error)
    }
  }

  const handleDelete = async (vendorId) => {
    if (!window.confirm("Are you sure you want to delete this vendor?")) return

    try {
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token")
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/partners/${vendorId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success("Partner deleted successfully")
      fetchVendors()
    } catch (error) {
      toast.error("Failed to delete partner")
      console.error(error)
    }
  }

  const filteredVendors = vendors.filter(vendor =>
    vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.partnerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.phone.includes(searchTerm) ||
    (vendor.gstNumber && vendor.gstNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Building className="h-8 w-8 text-orange-600" />
            Partner Management
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage bulk shipping partners and individual partners</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-orange-200 flex items-center gap-2 w-fit"
        >
          <Plus className="h-5 w-5" />
          Add New Partner
        </button>
      </div>

      {/* Control Bar */}
      <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search by vendor name, ID, phone, or GST..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-[#111111] border-none rounded-xl focus:ring-2 focus:ring-orange-500 text-sm"
          />
        </div>
      </div>

      {/* Vendors Table */}
      <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b border-gray-200 dark:border-white/10-2 border-orange-600"></div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">Loading partner data...</p>
          </div>
        ) : filteredVendors.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            <Building className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-lg">No partners found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50 dark:bg-[#111111]/50 text-left">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Partner Info</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Address</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredVendors.map((vendor) => (
                  <tr key={vendor._id} className="hover:bg-gray-50 dark:bg-[#111111]/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-sm">
                          {vendor.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">{vendor.name}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-orange-600 font-mono font-bold">ID: {vendor.partnerId}</span>
                            {vendor.gstNumber && (
                              <span className="text-[10px] font-mono font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                                GST: {vendor.gstNumber}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-900 dark:text-white max-w-xs truncate">{vendor.address}</div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400">{vendor.city}, {vendor.state} - {vendor.pincode}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-gray-400" /> {vendor.phone}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
                        <Mail className="h-3.5 w-3.5 text-gray-400" /> {vendor.email || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => fetchVendorFinances(vendor)}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                          title="View Financials"
                        >
                          <Wallet className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleOpenModal(vendor)}
                          className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                          title="Edit Partner"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(vendor._id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete Partner"
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

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl shadow-2xl w-full max-w-2xl relative z-10 overflow-hidden transform transition-all animate-in zoom-in duration-200">
            <div className="bg-orange-600 p-6 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                {editingVendor ? <Edit2 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                {editingVendor ? "Edit Partner" : "Add New Partner"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white dark:bg-[#1A1A1A]/10 rounded-full transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Partner ID (Unique)</label>
                  <input
                    type="text"
                    value={formData.partnerId || ""}
                    onChange={(e) => setFormData({ ...formData, partnerId: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                    placeholder={editingVendor ? "Enter Partner ID" : "Leave blank to auto-generate"}
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Partner Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                    placeholder="e.g. Acme Corp"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                    placeholder="10-digit phone"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                    placeholder="vendor@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">GST Number</label>
                  <input
                    type="text"
                    maxLength={15}
                    value={formData.gstNumber || ""}
                    onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm uppercase font-mono"
                    placeholder="e.g. 22AAAAA0000A1Z5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Price Per Kg (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.pricePerKg}
                    onChange={(e) => setFormData({ ...formData, pricePerKg: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                    placeholder="e.g. 50"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Password {editingVendor && "(Leave blank to keep current)"}</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                    placeholder="Portal Password"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Address (Permanent/Registered) *</label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                    placeholder="Street, Building, etc."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Address Line 2</label>
                  <input
                    type="text"
                    value={formData.address2}
                    onChange={(e) => setFormData({ ...formData, address2: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                    placeholder="Area, Colony, etc."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2">
                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                      <Key className="h-4 w-4 text-orange-600" /> API Key
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. sk_live_12345 (Leave blank to auto-generate)"
                      value={formData.apiKey}
                      onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                      <LinkIcon className="h-4 w-4 text-orange-600" /> Webhook URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://partner.com/api/webhook"
                      value={formData.webhookUrl}
                      onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                    />
                  </div>
                </div>

                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 bg-orange-50/30 p-4 rounded-2xl border border-orange-100">
                  <div className="md:col-span-1">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Pincode *</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={formData.pincode}
                        onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, "") })}
                        className={`w-full px-4 py-2.5 bg-white dark:bg-[#1A1A1A] border-2 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm font-bold tracking-widest transition-all ${pincodeSuccess ? 'border-green-500 bg-green-50/10' : 'border-gray-200 dark:border-white/10'}`}
                        placeholder="6-digit PIN"
                      />
                      {pincodeLoading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b border-gray-200 dark:border-white/10-2 border-orange-600"></div>
                        </div>
                      )}
                      {pincodeSuccess && !pincodeLoading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600 animate-in zoom-in duration-300">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">City *</label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                      placeholder="Auto-filled"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">State *</label>
                    <input
                      type="text"
                      required
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                      placeholder="Auto-filled"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Landmark</label>
                  <input
                    type="text"
                    value={formData.landmark}
                    onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 dark:bg-[#111111] hover:bg-gray-200 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-100 transition-all"
                >
                  {editingVendor ? "Save Changes" : "Create Partner"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Finance View Overlay */}
      {selectedVendorForFinance && (
        <div className="fixed inset-0 z-[70] bg-gray-50 dark:bg-[#111111] flex flex-col animate-in slide-in-from-right duration-300">
          {/* Local Header */}
          <div className="bg-white dark:bg-[#1A1A1A] border-b border-gray-200 dark:border-white/10 px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSelectedVendorForFinance(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-all"
                title="Back to Partners"
              >
                <ArrowLeft className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </button>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedVendorForFinance.name}</h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 font-mono font-bold border border-orange-200 dark:border-orange-900">
                    {selectedVendorForFinance.partnerId}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Partner Financial & Order Ledger</p>
                  {selectedVendorForFinance.gstNumber && (
                    <span className="text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                      GST: {selectedVendorForFinance.gstNumber}
                    </span>
                  )}
                  {selectedVendorForFinance.phone && (
                    <span className="text-[10px] text-gray-400 font-mono">
                      • {selectedVendorForFinance.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={handleExportPartnerOrders}
                disabled={vendorOrders.length === 0}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-sm"
                title="Export filtered orders to Excel"
              >
                <Download className="h-4 w-4" />
                <span>Export Excel</span>
                {vendorOrders.length > 0 && (
                  <span className="bg-emerald-700 px-1.5 py-0.5 text-[10px] rounded-md font-mono">
                    {vendorOrders.length}
                  </span>
                )}
              </button>

              <button
                onClick={handleOpenPartnerInvoiceModal}
                disabled={vendorOrders.length === 0}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-sm"
                title="Generate official Partner Invoice with Company Logo"
              >
                <FileText className="h-4 w-4" />
                <span>Make Invoice</span>
                {vendorOrders.length > 0 && (
                  <span className="bg-indigo-700 px-1.5 py-0.5 text-[10px] rounded-md font-mono">
                    {vendorOrders.length}
                  </span>
                )}
              </button>

              <button 
                onClick={() => setIsSettlementModalOpen(true)}
                className="bg-orange-600 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 hover:bg-orange-700 transition-all shadow-lg shadow-orange-100 dark:shadow-none"
              >
                <DollarSign className="h-4 w-4" /> Record Settlement
              </button>

              <button 
                onClick={() => setSelectedVendorForFinance(null)} 
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-all"
                title="Close"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Date Filter & Control Bar */}
          <div className="bg-white dark:bg-[#1A1A1A] border-b border-gray-200 dark:border-white/10 px-6 py-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Filter Mode Selector Pills */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1 flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5" /> Filter By:
                </span>
                <div className="inline-flex p-1 bg-gray-100 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setDateFilterType("month");
                      fetchVendorFinances(selectedVendorForFinance, { dateFilterType: "month" });
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                      dateFilterType === "month"
                        ? "bg-orange-600 text-white shadow-sm"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    Month by Month
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDateFilterType("custom");
                      if (customStartDate) {
                        fetchVendorFinances(selectedVendorForFinance, { dateFilterType: "custom" });
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                      dateFilterType === "custom"
                        ? "bg-orange-600 text-white shadow-sm"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    Custom Range
                  </button>

                  <button
                    type="button"
                    onClick={handleSetAllTime}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                      dateFilterType === "all"
                        ? "bg-orange-600 text-white shadow-sm"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    All Time
                  </button>
                </div>
              </div>

              {/* Mode-Specific Controls */}
              {dateFilterType === "month" && (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center bg-gray-50 dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-2xl p-1 shadow-sm">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="p-1.5 hover:bg-white dark:hover:bg-white/10 rounded-xl text-gray-600 dark:text-gray-300 transition-all flex items-center gap-1 text-xs font-semibold px-2.5"
                      title="Previous Month"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline">Prev</span>
                    </button>

                    <div className="relative flex items-center px-2">
                      <span className="text-xs font-black text-gray-800 dark:text-gray-200 px-2 min-w-[130px] text-center cursor-pointer">
                        {formatMonthName(financeMonth)}
                      </span>
                      <input
                        type="month"
                        value={financeMonth}
                        onChange={(e) => {
                          setFinanceMonth(e.target.value);
                          setDateFilterType("month");
                          fetchVendorFinances(selectedVendorForFinance, {
                            dateFilterType: "month",
                            financeMonth: e.target.value,
                          });
                        }}
                        className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                        title="Pick Month"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="p-1.5 hover:bg-white dark:hover:bg-white/10 rounded-xl text-gray-600 dark:text-gray-300 transition-all flex items-center gap-1 text-xs font-semibold px-2.5"
                      title="Next Month"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleSetCurrentMonth}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition-all"
                  >
                    This Month
                  </button>
                </div>
              )}

              {dateFilterType === "custom" && (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-2xl px-3 py-1.5 shadow-sm">
                    <span className="text-[11px] font-bold text-gray-400">From:</span>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="bg-transparent text-xs font-bold text-gray-800 dark:text-gray-200 outline-none cursor-pointer"
                    />
                    <span className="text-[11px] font-bold text-gray-400 mx-1">To:</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="bg-transparent text-xs font-bold text-gray-800 dark:text-gray-200 outline-none cursor-pointer"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyCustomRange}
                    className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                  >
                    <Filter className="h-3.5 w-3.5" />
                    Apply
                  </button>
                </div>
              )}

              {dateFilterType === "all" && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10">
                    Showing all records across all time
                  </span>
                  <button
                    type="button"
                    onClick={handleSetCurrentMonth}
                    className="text-xs text-orange-600 hover:underline font-bold"
                  >
                    Reset to This Month
                  </button>
                </div>
              )}
            </div>

            {/* Quick Presets row when Custom Range is active */}
            {dateFilterType === "custom" && (
              <div className="flex items-center gap-1.5 flex-wrap mt-2.5 pt-2 border-t border-gray-100 dark:border-white/5">
                <span className="text-[11px] font-bold text-gray-400 mr-1">Quick Presets:</span>
                {[
                  { id: "today", label: "Today" },
                  { id: "yesterday", label: "Yesterday" },
                  { id: "last7", label: "Last 7 Days" },
                  { id: "thisMonth", label: "This Month" },
                  { id: "lastMonth", label: "Last Month" },
                  { id: "last30", label: "Last 30 Days" },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSetQuickPreset(preset.id)}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-gray-100 dark:bg-white/5 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-950/40 dark:hover:text-orange-400 text-gray-600 dark:text-gray-400 rounded-lg transition-all border border-transparent hover:border-orange-200 dark:hover:border-orange-800"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Active Period / Filter Indicator Banner */}
          <div className="bg-orange-50/70 dark:bg-orange-950/20 border-b border-orange-100 dark:border-orange-900/30 px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <span className="font-bold text-orange-950 dark:text-orange-200">
                Period:
              </span>
              <span className="text-orange-900 dark:text-orange-300 font-medium">
                {dateFilterType === "month" && `${formatMonthName(financeMonth)} (Full Calendar Month)`}
                {dateFilterType === "custom" && (
                  customStartDate
                    ? `${customStartDate} to ${customEndDate || customStartDate}`
                    : "Custom Range (Select dates above and click Apply)"
                )}
                {dateFilterType === "all" && "All Time (Complete Partner History)"}
              </span>
              {financeLoading && (
                <span className="text-orange-600 font-semibold text-[11px] ml-2 animate-pulse">
                  Updating records...
                </span>
              )}
            </div>
            <div className="text-[11px] text-orange-800 dark:text-orange-400 font-mono">
              Showing <b>{vendorOrders.length}</b> orders &bull; <b>{vendorPayments.length}</b> settlements
            </div>
          </div>

          {/* Dashboard Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-[#1A1A1A] p-5 rounded-3xl border border-gray-100 dark:border-white/10 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div className="p-2 bg-orange-50 dark:bg-orange-950/50 rounded-xl text-orange-600"><TrendingUp className="h-5 w-5" /></div>
                    <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest bg-orange-50 dark:bg-orange-950/50 px-2 py-0.5 rounded">Total Due (Period)</span>
                  </div>
                  <div className="text-2xl font-black text-gray-900 dark:text-white">₹{(financeSummary?.totalDue || 0).toLocaleString('en-IN')}</div>
                  <p className="text-[10px] text-gray-400 mt-1 font-bold italic">Across {financeSummary?.bookingCount || 0} orders in this period</p>
                </div>
                {financeSummary?.allTime && (
                  <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-[11px]">
                    <span className="text-gray-400">All-Time Due:</span>
                    <span className="font-bold text-gray-700 dark:text-gray-300">₹{(financeSummary.allTime.totalDue || 0).toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-[#1A1A1A] p-5 rounded-3xl border border-gray-100 dark:border-white/10 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div className="p-2 bg-green-50 dark:bg-green-950/50 rounded-xl text-green-600"><CheckCircle2 className="h-5 w-5" /></div>
                    <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest bg-green-50 dark:bg-green-950/50 px-2 py-0.5 rounded">Total Paid (Period)</span>
                  </div>
                  <div className="text-2xl font-black text-gray-900 dark:text-white">₹{((financeSummary?.totalPaidOnOrders || 0) + (financeSummary?.totalBulkPayments || 0)).toLocaleString('en-IN')}</div>
                  <p className="text-[10px] text-gray-400 mt-1 font-bold italic">Orders: ₹{(financeSummary?.totalPaidOnOrders || 0).toLocaleString('en-IN')} | Bulk: ₹{(financeSummary?.totalBulkPayments || 0).toLocaleString('en-IN')}</p>
                </div>
                {financeSummary?.allTime && (
                  <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-[11px]">
                    <span className="text-gray-400">All-Time Paid:</span>
                    <span className="font-bold text-green-600">₹{(financeSummary.allTime.totalPaidCombined || 0).toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-[#1A1A1A] p-5 rounded-3xl border border-gray-100 dark:border-white/10 shadow-sm border-l-4 border-l-red-500 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div className="p-2 bg-red-50 dark:bg-red-950/50 rounded-xl text-red-600"><AlertCircle className="h-5 w-5" /></div>
                    <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest bg-red-50 dark:bg-red-950/50 px-2 py-0.5 rounded">Net Balance (Period)</span>
                  </div>
                  <div className="text-2xl font-black text-red-600">₹{(financeSummary?.netBalance || 0).toLocaleString('en-IN')}</div>
                  <p className="text-[10px] text-gray-400 mt-1 font-bold italic underline">Period pending balance</p>
                </div>
                {financeSummary?.allTime && (
                  <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-[11px]">
                    <span className="text-gray-400">All-Time Balance:</span>
                    <span className="font-bold text-red-600">₹{(financeSummary.allTime.netBalance || 0).toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-[#1A1A1A] p-5 rounded-3xl border border-gray-100 dark:border-white/10 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div className="p-2 bg-blue-50 dark:bg-blue-950/50 rounded-xl text-blue-600"><ClipboardList className="h-5 w-5" /></div>
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded">Orders (Period)</span>
                  </div>
                  <div className="text-2xl font-black text-gray-900 dark:text-white">{financeSummary?.bookingCount || 0}</div>
                  <p className="text-[10px] text-gray-400 mt-1 font-bold italic">Bookings in selected period</p>
                </div>
                {financeSummary?.allTime && (
                  <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-[11px]">
                    <span className="text-gray-400">All-Time Bookings:</span>
                    <span className="font-bold text-gray-700 dark:text-gray-300">{financeSummary.allTime.bookingCount || 0}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex border-b border-gray-200 dark:border-white/10">
                <button 
                  onClick={() => setActiveTab('orders')}
                  className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 border-b border-gray-200 dark:border-white/10-2 transition-all ${activeTab === 'orders' ? 'border-orange-600 text-orange-600 bg-orange-50/20' : 'border-transparent text-gray-400 hover:text-gray-600 dark:text-gray-400'}`}
                >
                  <Package className="h-4 w-4" /> ASSOCIATED ORDERS
                </button>
                <button 
                  onClick={() => setActiveTab('settlements')}
                  className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 border-b border-gray-200 dark:border-white/10-2 transition-all ${activeTab === 'settlements' ? 'border-orange-600 text-orange-600 bg-orange-50/20' : 'border-transparent text-gray-400 hover:text-gray-600 dark:text-gray-400'}`}
                >
                  <History className="h-4 w-4" /> SETTLEMENT HISTORY
                </button>
              </div>

              <div className="p-0">
                {activeTab === 'orders' ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                      <thead className="bg-gray-50 dark:bg-[#111111]/50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Order ID</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Route</th>
                          <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Amount</th>
                          <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Paid</th>
                          <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payment Status</th>
                          <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Shipment Status</th>
                          <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {vendorOrders.map(order => (
                          <tr key={order._id} className="hover:bg-gray-50 dark:bg-[#111111]/30 transition-colors">
                            <td className="px-6 py-4 font-mono font-bold text-sm text-gray-900 dark:text-white">{order.trackingId || order.bookingId}</td>
                            <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</td>
                            <td className="px-6 py-4 text-[10px] font-bold uppercase text-gray-600 dark:text-gray-400">{order.senderDetails?.city} ➔ {order.receiverDetails?.city}</td>
                            <td className="px-6 py-4 text-right font-black text-gray-900 dark:text-white">₹{(order.pricing?.totalAmount || 0).toLocaleString('en-IN')}</td>
                            <td className="px-6 py-4 text-right font-bold text-green-600">₹{(order.vendorPaidAmount || 0).toLocaleString('en-IN')}</td>
                            <td className="px-6 py-4 text-center">
                              <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${
                                order.vendorPaymentStatus === 'Paid' ? 'bg-green-100 text-green-700' :
                                order.vendorPaymentStatus === 'Partially Paid' ? 'bg-orange-100 text-orange-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {order.vendorPaymentStatus || 'Pending'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center overflow-visible">
                              <div className="inline-flex items-center space-x-1.5 group relative cursor-help">
                                <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${getStatusColor(order.status)}`}>
                                  {order.status}
                                </span>
                                <TrackingHistoryTooltip booking={order} />
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Link
                                  to={`/bookings/${order._id}`}
                                  className="p-1.5 px-3 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-lg hover:bg-blue-100 transition-all flex items-center gap-1.5 border border-blue-200"
                                >
                                  <Eye className="h-3 w-3" /> View Order
                                </Link>
                                <button
                                  onClick={() => {
                                    setPdfBooking(order);
                                    setPdfOptions({ receipt: true, label: true, declaration: true });
                                    setPdfModalOpen(true);
                                  }}
                                  className="p-1.5 px-3 bg-red-50 text-red-600 text-[10px] font-bold rounded-lg hover:bg-red-100 transition-all flex items-center gap-1.5 border border-red-200"
                                  title="Print Records"
                                >
                                  <FileText className="h-3 w-3" /> PDF
                                </button>
                                <button
                                  onClick={() => handleOpenSingleOrderInvoice(order)}
                                  className="p-1.5 px-3 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-lg hover:bg-indigo-100 transition-all flex items-center gap-1.5 border border-indigo-200"
                                  title="Generate official invoice for this order"
                                >
                                  <Receipt className="h-3 w-3" /> Invoice
                                </button>
                                <button 
                                  onClick={() => {
                                    setEditingOrder(order);
                                    setOrderPaymentData({
                                      totalAmount: order.pricing?.totalAmount || 0,
                                      vendorPaidAmount: order.vendorPaidAmount || 0,
                                      newPaymentAmount: 0,
                                      vendorPaymentMethod: order.vendorPaymentMethod || "Cash",
                                      vendorReceivedBy: order.vendorReceivedBy || localStorage.getItem("adminName") || "Admin",
                                      vendorPaymentDate: (new Date().toISOString()).split("T")[0]
                                    });
                                  }}
                                  className="bg-gray-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-black transition-all"
                                >Update Payment</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {vendorOrders.length === 0 && (
                          <tr>
                            <td colSpan="8" className="py-20 text-center text-gray-400 italic">
                              No orders found for the selected {dateFilterType === 'month' ? 'month' : dateFilterType === 'custom' ? 'date range' : 'time period'}.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                      <thead className="bg-gray-50 dark:bg-[#111111]/50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Month</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Method</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Received By</th>
                          <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {vendorPayments.map(payment => (
                          <tr key={payment._id} className="hover:bg-gray-50 dark:bg-[#111111]/30">
                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{new Date(payment.paymentDate).toLocaleDateString()}</td>
                            <td className="px-6 py-4 text-xs font-bold text-orange-600 uppercase tracking-tighter">{payment.month}</td>
                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{payment.paymentMethod}</td>
                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{payment.receivedBy}</td>
                            <td className="px-6 py-4 text-right font-black text-green-600">₹{(payment.amount || 0).toLocaleString('en-IN')}</td>
                          </tr>
                        ))}
                        {vendorPayments.length === 0 && (
                          <tr><td colSpan="5" className="py-20 text-center text-gray-400 italic">No settlement history found.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Order Payment Modal */}
          {editingOrder && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/60" onClick={() => setEditingOrder(null)} />
              <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl shadow-2xl w-full max-w-lg relative z-10 p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Update Order Payment</h3>
                  <button onClick={() => setEditingOrder(null)}><X className="h-6 w-6 text-gray-400" /></button>
                </div>
                <p className="text-xs text-orange-600 font-mono font-bold mb-6">ORDER: {editingOrder.trackingId || editingOrder.bookingId}</p>
                
                <form onSubmit={handleUpdateOrderPayment} className="space-y-4">
                  {/* Summary Card */}
                  <div className="bg-gray-50 dark:bg-[#111111] p-4 rounded-xl mb-4 flex justify-between border border-gray-100 divide-x divide-gray-200">
                     <div className="px-2 w-1/3">
                        <span className="text-[10px] uppercase text-gray-500 dark:text-gray-400 font-bold tracking-wider">Total Bill</span>
                        <div className="font-black text-gray-900 dark:text-white text-lg">₹{(orderPaymentData.totalAmount || 0).toLocaleString('en-IN')}</div>
                     </div>
                     <div className="px-4 w-1/3 text-center border-l border-gray-200 dark:border-white/10">
                        <span className="text-[10px] uppercase text-gray-500 dark:text-gray-400 font-bold tracking-wider">Already Paid</span>
                        <div className="font-black text-green-600 text-lg">₹{(orderPaymentData.vendorPaidAmount || 0).toLocaleString('en-IN')}</div>
                     </div>
                     <div className="px-4 w-1/3 text-right">
                        <span className="text-[10px] uppercase text-gray-500 dark:text-gray-400 font-bold tracking-wider">Remaining Due</span>
                        <div className="font-black text-red-600 text-lg">₹{Math.max(0, (orderPaymentData.totalAmount || 0) - (orderPaymentData.vendorPaidAmount || 0) - (orderPaymentData.newPaymentAmount || 0)).toLocaleString('en-IN')}</div>
                     </div>
                  </div>

                  <div className="p-4 bg-green-50 rounded-xl border border-green-200 mb-6 group relative">
                    <label className="block text-xs font-black text-green-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                       <Plus className="h-4 w-4 bg-green-200 rounded-full p-0.5 text-green-800" /> 
                       Add New Payment (₹)
                    </label>
                    <input 
                      type="number" 
                      value={orderPaymentData.newPaymentAmount || ""}
                      onChange={(e) => setOrderPaymentData({...orderPaymentData, newPaymentAmount: Number(e.target.value)})}
                      className="w-full px-4 py-3 bg-white dark:bg-[#1A1A1A] border border-green-200 rounded-xl font-black text-green-700 focus:ring-2 focus:ring-green-500 outline-none text-2xl transition-all shadow-sm"
                      placeholder="0"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Payment Method</label>
                      <select 
                        value={orderPaymentData.vendorPaymentMethod}
                        onChange={(e) => setOrderPaymentData({...orderPaymentData, vendorPaymentMethod: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-[#111111] border border-gray-100 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-green-500 outline-none"
                      >
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cheque">Cheque</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Received By</label>
                      <input 
                        type="text" 
                        value={orderPaymentData.vendorReceivedBy}
                        onChange={(e) => setOrderPaymentData({...orderPaymentData, vendorReceivedBy: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-[#111111] border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Payment Date</label>
                    <input 
                      type="date" 
                      value={orderPaymentData.vendorPaymentDate}
                      onChange={(e) => setOrderPaymentData({...orderPaymentData, vendorPaymentDate: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-[#111111] border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  </div>

                  <details className="group [&_summary::-webkit-details-marker]:hidden bg-orange-50/30 p-4 rounded-xl border border-orange-100/50 mt-4">
                    <summary className="flex cursor-pointer items-center justify-between text-[10px] font-bold text-orange-600 uppercase tracking-wider">
                      <span className="flex items-center gap-2">
                        See Previous Collections & Adjustments 
                        {editingOrder?.vendorPaymentHistory?.length > 0 && <span className="bg-orange-600 text-white rounded-full px-1.5 py-0.5 text-[8px]">{editingOrder.vendorPaymentHistory.length}</span>}
                      </span>
                      <span className="shrink-0 transition duration-300 group-open:-rotate-180 bg-orange-100 p-1 rounded-full text-orange-800">
                        <ChevronRight className="h-3 w-3" />
                      </span>
                    </summary>
                    <div className="mt-4 border-t border-orange-100/50 pt-4 space-y-6">

                      {/* Display the History Table directly inside here */}
                      {editingOrder.vendorPaymentHistory && editingOrder.vendorPaymentHistory.length > 0 ? (
                        <div className="border border-orange-100/50 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-[#1A1A1A]">
                          <div className="max-h-40 overflow-y-auto">
                            <table className="min-w-full divide-y divide-gray-50">
                              <thead className="bg-orange-50/50 sticky top-0">
                                <tr>
                                  <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase">Date</th>
                                  <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase">Method</th>
                                  <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase">Receiver</th>
                                  <th className="px-4 py-2 text-right text-[10px] font-bold text-gray-400 uppercase">Amount</th>
                                  <th className="px-4 py-2 text-center text-[10px] font-bold text-gray-400 uppercase w-20">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50 bg-white dark:bg-[#1A1A1A]">
                                {editingOrder.vendorPaymentHistory.map((hist, idx) => (
                                  <tr key={hist._id || idx} className="hover:bg-orange-50/30 transition-colors group/row">
                                    <td className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">{new Date(hist.date).toLocaleDateString()}</td>
                                    <td className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300">{hist.method || '-'}</td>
                                    <td className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">{hist.receivedBy || '-'}</td>
                                    <td className="px-4 py-2 text-right">
                                      {editingHistoryId === hist._id ? (
                                        <input 
                                          type="number" 
                                          value={editingHistoryAmount}
                                          onChange={(e) => setEditingHistoryAmount(Number(e.target.value))}
                                          className="w-20 px-2 py-1 text-xs font-black text-green-700 bg-green-50 rounded border border-green-200 outline-none focus:ring-1 focus:ring-green-500 text-right"
                                          autoFocus
                                        />
                                      ) : (
                                        <span className="text-xs font-black text-green-600">₹{hist.amount.toLocaleString('en-IN')}</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      {editingHistoryId === hist._id ? (
                                        <div className="flex items-center justify-center gap-2">
                                          <button type="button" onClick={() => handleEditHistory(hist._id, editingHistoryAmount)} className="text-green-600 hover:text-green-800"><Check className="h-4 w-4" /></button>
                                          <button type="button" onClick={() => setEditingHistoryId(null)} className="text-gray-400 hover:text-gray-600 dark:text-gray-400"><XCircle className="h-4 w-4" /></button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover/row:opacity-100 transition-opacity">
                                          <button type="button" onClick={() => { setEditingHistoryId(hist._id); setEditingHistoryAmount(hist.amount); }} className="text-blue-500 hover:text-blue-700" title="Edit Amount"><Edit2 className="h-3 w-3" /></button>
                                          <button type="button" onClick={() => handleDeleteHistory(hist._id)} className="text-red-500 hover:text-red-700" title="Delete Record"><Trash2 className="h-3 w-3" /></button>
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-xs text-gray-400 italic py-2 bg-white dark:bg-[#1A1A1A] rounded-xl border border-orange-50">No previous collections exist for this order.</div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-orange-400 uppercase mb-1">Override Base Bill</label>
                          <input 
                            type="number" 
                            title="Edit if the total bill was negotiated differently"
                            value={orderPaymentData.totalAmount}
                            onChange={(e) => setOrderPaymentData({...orderPaymentData, totalAmount: Number(e.target.value)})}
                            className="w-full px-4 py-2 bg-white dark:bg-[#1A1A1A] border border-orange-200 rounded-xl font-bold text-sm shadow-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-orange-400 uppercase mb-1">Override Base Paid</label>
                          <input 
                            type="number" 
                            title="Edit the historical total if there was an error in past entry"
                            value={orderPaymentData.vendorPaidAmount}
                            onChange={(e) => setOrderPaymentData({...orderPaymentData, vendorPaidAmount: Number(e.target.value)})}
                            className="w-full px-4 py-2 bg-white dark:bg-[#1A1A1A] border border-orange-200 rounded-xl font-bold text-gray-600 dark:text-gray-400 text-sm shadow-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </details>
                  
                  <div className="pt-2 flex gap-3">
                    <button 
                      type="button" 
                      onClick={() => setEditingOrder(null)}
                      className="flex-1 px-6 py-3 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 font-bold rounded-xl hover:bg-gray-50 dark:bg-[#111111] transition-all"
                    >Cancel</button>
                    <button 
                      type="submit"
                      className="flex-[2] px-6 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-all shadow-lg"
                    >Save Changes</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Settlement Modal */}
          {isSettlementModalOpen && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/60" onClick={() => setIsSettlementModalOpen(false)} />
              <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl shadow-2xl w-full max-w-lg relative z-10 p-8 border-t-8 border-green-500">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white">Record Bulk Settlement</h3>
                  <button onClick={() => setIsSettlementModalOpen(false)}><X className="h-6 w-6 text-gray-400" /></button>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                  Record a general payment made by the vendor. This will be deducted from their total net balance.
                </p>
                
                <form onSubmit={handleRecordSettlement} className="space-y-6">
                  <div className="p-6 bg-green-50 rounded-3xl border border-green-100 text-center">
                    <label className="block text-[10px] font-black text-green-600 uppercase tracking-[0.2em] mb-3">Settlement Amount (₹)</label>
                    <input 
                      type="number" 
                      required
                      value={settlementData.amount}
                      onChange={(e) => setSettlementData({...settlementData, amount: Number(e.target.value)})}
                      className="w-full bg-transparent border-none text-center text-4xl font-black text-green-700 focus:ring-0 placeholder-green-200"
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Month Attribution</label>
                      <input 
                        type="month" 
                        value={settlementData.month}
                        onChange={(e) => setSettlementData({...settlementData, month: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-[#111111] border border-transparent rounded-2xl text-sm font-bold focus:bg-white dark:bg-[#1A1A1A] focus:border-green-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Payment Method</label>
                      <select 
                        value={settlementData.paymentMethod}
                        onChange={(e) => setSettlementData({...settlementData, paymentMethod: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-[#111111] border border-transparent rounded-2xl text-sm font-bold focus:bg-white dark:bg-[#1A1A1A] focus:border-green-500 transition-all"
                      >
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cheque">Cheque</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Notes / Description</label>
                    <textarea 
                      value={settlementData.notes}
                      onChange={(e) => setSettlementData({...settlementData, notes: e.target.value})}
                      placeholder="Transaction details, reference numbers, etc."
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-[#111111] border border-transparent rounded-2xl text-sm focus:bg-white dark:bg-[#1A1A1A] focus:border-green-500 transition-all h-24"
                    />
                  </div>
                  
                  <div className="pt-4 flex gap-4">
                    <button 
                      type="button" 
                      onClick={() => setIsSettlementModalOpen(false)}
                      className="flex-1 px-8 py-4 text-gray-500 dark:text-gray-400 font-bold rounded-2xl hover:bg-gray-100 dark:bg-[#111111] transition-all"
                    >Cancel</button>
                    <button 
                      type="submit"
                      className="flex-[2] px-8 py-4 bg-green-600 text-white font-bold rounded-2xl hover:bg-green-700 transition-all shadow-xl shadow-green-100"
                    >Record Settlement</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* PDF Options Modal */}
          {pdfModalOpen && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/60" onClick={() => setPdfModalOpen(false)} />
              <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl shadow-2xl w-full max-w-md relative z-10 p-8 border-t-8 border-red-500">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                    <FileText className="h-6 w-6 text-red-500" /> Print Options
                  </h3>
                  <button onClick={() => setPdfModalOpen(false)}><X className="h-6 w-6 text-gray-400" /></button>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                  Select which documents you want to include in the generated PDF for <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{pdfBooking?.trackingId || pdfBooking?.bookingId}</span>
                </p>

                <div className="space-y-4 bg-gray-50 dark:bg-[#111111] p-5 rounded-2xl border border-gray-200 dark:border-white/10 mb-6">
                  <label className="flex items-center p-3.5 bg-white dark:bg-[#1A1A1A] rounded-xl border border-gray-200 dark:border-white/10 hover:border-red-300 transition-colors cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={pdfOptions.receipt}
                      onChange={(e) => setPdfOptions({ ...pdfOptions, receipt: e.target.checked })}
                      className="h-5 w-5 text-red-600 border-gray-300 dark:border-white/10 rounded focus:ring-red-500 cursor-pointer"
                    />
                    <div className="ml-3">
                      <span className="block text-sm font-bold text-gray-900 dark:text-white group-hover:text-red-700">Booking Receipt</span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">Official proof of booking and charges</span>
                    </div>
                  </label>

                  <label className="flex items-center p-3.5 bg-white dark:bg-[#1A1A1A] rounded-xl border border-gray-200 dark:border-white/10 hover:border-red-300 transition-colors cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={pdfOptions.label}
                      onChange={(e) => setPdfOptions({ ...pdfOptions, label: e.target.checked })}
                      className="h-5 w-5 text-red-600 border-gray-300 dark:border-white/10 rounded focus:ring-red-500 cursor-pointer"
                    />
                    <div className="ml-3">
                      <span className="block text-sm font-bold text-gray-900 dark:text-white group-hover:text-red-700">Shipping Label (A6)</span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">Compact label with QR code for the box</span>
                    </div>
                  </label>

                  <label className="flex items-center p-3.5 bg-white dark:bg-[#1A1A1A] rounded-xl border border-gray-200 dark:border-white/10 hover:border-red-300 transition-colors cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={pdfOptions.declaration}
                      onChange={(e) => setPdfOptions({ ...pdfOptions, declaration: e.target.checked })}
                      className="h-5 w-5 text-red-600 border-gray-300 dark:border-white/10 rounded focus:ring-red-500 cursor-pointer"
                    />
                    <div className="ml-3">
                      <span className="block text-sm font-bold text-gray-900 dark:text-white group-hover:text-red-700">Self-Declaration Form</span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">Legal declaration signed by sender</span>
                    </div>
                  </label>
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setPdfModalOpen(false)}
                    className="flex-1 px-6 py-3.5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 font-bold rounded-xl hover:bg-gray-50 dark:bg-[#111111] transition-all text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!pdfOptions.receipt && !pdfOptions.label && !pdfOptions.declaration) {
                        toast.error("Please select at least one document");
                        return;
                      }
                      try {
                        const t = localStorage.getItem("adminToken") || localStorage.getItem("token")
                        const response = await axios.get(
                          `${import.meta.env.VITE_API_URL}/api/bookings/${pdfBooking?._id}/receipt?receipt=${pdfOptions.receipt}&label=${pdfOptions.label}&declaration=${pdfOptions.declaration}`,
                          {
                            headers: { Authorization: `Bearer ${t}` },
                            responseType: "blob"
                          }
                        );
                        const url = window.URL.createObjectURL(new Blob([response.data]));
                        const link = document.createElement("a");
                        link.href = url;
                        link.setAttribute("download", `Booking_${pdfBooking?.trackingId || pdfBooking?.bookingId}.pdf`);
                        document.body.appendChild(link);
                        link.click();
                        link.remove();
                        setPdfModalOpen(false);
                        toast.success("PDF generated successfully");
                      } catch (error) {
                        toast.error("Failed to generate PDF");
                      }
                    }}
                    className="flex-[2] px-6 py-3.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg text-sm"
                  >
                    Download PDF
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Corporate Partner Invoice Modal */}
          {partnerInvoiceModalOpen && selectedVendorForFinance && (() => {
            const activeCompany = COMPANY_PROFILES[invoiceConfig.companyKey] || COMPANY_PROFILES.SRQ;
            const selectedInvoiceOrders = vendorOrders.filter(o => selectedInvoiceOrderIds.includes(o._id));
            const rawOrdersTotal = selectedInvoiceOrders.reduce((sum, o) => sum + (o.pricing?.totalAmount || 0), 0);
            const totalPaidOnSelected = selectedInvoiceOrders.reduce((sum, o) => sum + (o.vendorPaidAmount || 0), 0);

            let taxableAmount = 0;
            let cgstAmount = 0;
            let sgstAmount = 0;
            let gstTotal = 0;
            let grossInvoiceTotal = 0;

            if (invoiceConfig.gstType === "inclusive") {
              taxableAmount = Math.round((rawOrdersTotal / 1.18) * 100) / 100;
              gstTotal = Math.round((rawOrdersTotal - taxableAmount) * 100) / 100;
              cgstAmount = Math.round((gstTotal / 2) * 100) / 100;
              sgstAmount = Math.round((gstTotal / 2) * 100) / 100;
              grossInvoiceTotal = rawOrdersTotal;
            } else if (invoiceConfig.gstType === "extra18") {
              taxableAmount = rawOrdersTotal;
              cgstAmount = Math.round((taxableAmount * 0.09) * 100) / 100;
              sgstAmount = Math.round((taxableAmount * 0.09) * 100) / 100;
              gstTotal = cgstAmount + sgstAmount;
              grossInvoiceTotal = taxableAmount + gstTotal;
            } else {
              taxableAmount = rawOrdersTotal;
              cgstAmount = 0;
              sgstAmount = 0;
              gstTotal = 0;
              grossInvoiceTotal = rawOrdersTotal;
            }

            const deductions = invoiceConfig.deductPayments ? totalPaidOnSelected : 0;
            const finalPayableAmount = Math.max(0, grossInvoiceTotal - deductions);

            const invoicePeriodLabel = dateFilterType === 'month' 
              ? formatMonthName(financeMonth)
              : dateFilterType === 'custom' && customStartDate
                ? `${customStartDate} to ${customEndDate || customStartDate}`
                : 'All Lifetime Records';

            const toggleOrderSelection = (id) => {
              if (selectedInvoiceOrderIds.includes(id)) {
                setSelectedInvoiceOrderIds(selectedInvoiceOrderIds.filter(x => x !== id));
              } else {
                setSelectedInvoiceOrderIds([...selectedInvoiceOrderIds, id]);
              }
            };

            const toggleSelectAllOrders = () => {
              if (selectedInvoiceOrderIds.length === vendorOrders.length) {
                setSelectedInvoiceOrderIds([]);
              } else {
                setSelectedInvoiceOrderIds(vendorOrders.map(o => o._id));
              }
            };

            return (
              <div className="fixed inset-0 z-[85] bg-black/75 backdrop-blur-sm flex flex-col justify-between overflow-hidden animate-in fade-in duration-200">
                <style>{`
                  @media print {
                    body * {
                      visibility: hidden !important;
                    }
                    #partner-invoice-printable, #partner-invoice-printable * {
                      visibility: visible !important;
                    }
                    #partner-invoice-printable {
                      position: fixed !important;
                      left: 0 !important;
                      top: 0 !important;
                      width: 100% !important;
                      max-width: 100% !important;
                      margin: 0 !important;
                      padding: 10mm 15mm !important;
                      border: none !important;
                      box-shadow: none !important;
                      background: white !important;
                      color: black !important;
                      z-index: 999999 !important;
                    }
                    .no-print {
                      display: none !important;
                    }
                  }
                `}</style>

                {/* Top Control Header Bar */}
                <div className="bg-white dark:bg-[#1A1A1A] border-b border-gray-200 dark:border-white/10 px-6 py-3 flex flex-wrap items-center justify-between gap-3 shadow-md z-20 no-print">
                  <div className="flex items-center gap-3">
                    <img
                      src="/logo.png"
                      alt="Engineers Parcel Logo"
                      className="h-8 w-auto object-contain shrink-0"
                    />
                    <div>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <span>Invoice Generator</span>
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-mono">
                          {selectedVendorForFinance.partnerId}
                        </span>
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Official Partner Billing &bull; Ready to print, download or send
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handlePrintInvoice}
                      className="px-3.5 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                      title="Print invoice or save as PDF via system dialog"
                    >
                      <Printer className="h-4 w-4" />
                      <span>Print / PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadInvoicePDF}
                      disabled={isGeneratingInvoicePdf || selectedInvoiceOrders.length === 0}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                      title="Download PDF directly"
                    >
                      <Download className="h-4 w-4" />
                      <span>{isGeneratingInvoicePdf ? "Generating..." : "Download PDF"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendWhatsApp(finalPayableAmount, invoicePeriodLabel, selectedInvoiceOrders.length)}
                      disabled={selectedInvoiceOrders.length === 0}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                      title="Send invoice details to partner via WhatsApp"
                    >
                      <Send className="h-4 w-4" />
                      <span>Send WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyInvoiceSummary(finalPayableAmount, invoicePeriodLabel, selectedInvoiceOrders.length)}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                      title="Copy invoice summary to clipboard"
                    >
                      <Copy className="h-4 w-4" />
                      <span className="hidden sm:inline">Copy Text</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPartnerInvoiceModalOpen(false)}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-all ml-1"
                      title="Close Modal"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                {/* Main Body: Settings Sidepanel + Live Paper Sheet */}
                <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                  {/* Left Controls Drawer */}
                  <div className="w-full lg:w-80 xl:w-96 bg-gray-50 dark:bg-[#161616] border-r border-gray-200 dark:border-white/10 p-5 overflow-y-auto space-y-4 no-print text-xs">
                    <div>
                      <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                        Issuing Company & Bank
                      </label>
                      <select
                        value={invoiceConfig.companyKey}
                        onChange={(e) => setInvoiceConfig({ ...invoiceConfig, companyKey: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-[#222222] border border-gray-200 dark:border-white/10 rounded-xl font-bold text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="SRQ">SRQ ENGINEERS PARCEL (UCO Bank)</option>
                        <option value="ENGGPARCEL">ENGGPARCEL SERVICES (ICICI Bank)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                          Invoice No.
                        </label>
                        <input
                          type="text"
                          value={invoiceConfig.invoiceNumber}
                          onChange={(e) => setInvoiceConfig({ ...invoiceConfig, invoiceNumber: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-[#222222] border border-gray-200 dark:border-white/10 rounded-xl font-mono font-bold text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                          Invoice Date
                        </label>
                        <input
                          type="date"
                          value={invoiceConfig.invoiceDate}
                          onChange={(e) => setInvoiceConfig({ ...invoiceConfig, invoiceDate: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-[#222222] border border-gray-200 dark:border-white/10 rounded-xl font-bold text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                          Due Date
                        </label>
                        <input
                          type="date"
                          value={invoiceConfig.dueDate}
                          onChange={(e) => setInvoiceConfig({ ...invoiceConfig, dueDate: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-[#222222] border border-gray-200 dark:border-white/10 rounded-xl font-bold text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                          GST Mode
                        </label>
                        <select
                          value={invoiceConfig.gstType}
                          onChange={(e) => setInvoiceConfig({ ...invoiceConfig, gstType: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-[#222222] border border-gray-200 dark:border-white/10 rounded-xl font-bold text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                        >
                          <option value="inclusive">GST 18% Included</option>
                          <option value="extra18">+18% GST Extra</option>
                          <option value="exempt">Bill of Supply (Zero)</option>
                        </select>
                      </div>
                    </div>

                    <div className="p-3 bg-white dark:bg-[#222222] rounded-xl border border-gray-200 dark:border-white/10">
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-800 dark:text-gray-200">
                        <input
                          type="checkbox"
                          checked={invoiceConfig.deductPayments}
                          onChange={(e) => setInvoiceConfig({ ...invoiceConfig, deductPayments: e.target.checked })}
                          className="h-4 w-4 text-indigo-600 rounded"
                        />
                        <span>Deduct Paid Advances (₹{totalPaidOnSelected.toLocaleString('en-IN')})</span>
                      </label>
                      <p className="text-[11px] text-gray-400 mt-1 ml-6">
                        Subtract payments already collected from net payable
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Consignments ({selectedInvoiceOrderIds.length}/{vendorOrders.length})
                        </label>
                        <button
                          type="button"
                          onClick={toggleSelectAllOrders}
                          className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                        >
                          {selectedInvoiceOrderIds.length === vendorOrders.length ? "Deselect All" : "Select All"}
                        </button>
                      </div>
                      <div className="max-h-44 overflow-y-auto space-y-1 bg-white dark:bg-[#222222] p-2 rounded-xl border border-gray-200 dark:border-white/10 divide-y divide-gray-100 dark:divide-white/5">
                        {vendorOrders.map((order) => (
                          <label
                            key={order._id}
                            className="flex items-center justify-between py-1.5 px-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded cursor-pointer text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={selectedInvoiceOrderIds.includes(order._id)}
                                onChange={() => toggleOrderSelection(order._id)}
                                className="h-3.5 w-3.5 text-indigo-600 rounded cursor-pointer"
                              />
                              <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
                                {order.trackingId || order.bookingId}
                              </span>
                            </div>
                            <span className="font-bold text-gray-900 dark:text-white">
                              ₹{(order.pricing?.totalAmount || 0).toLocaleString('en-IN')}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                        Terms & Notes
                      </label>
                      <textarea
                        rows={2}
                        value={invoiceConfig.notes}
                        onChange={(e) => setInvoiceConfig({ ...invoiceConfig, notes: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-[#222222] border border-gray-200 dark:border-white/10 rounded-xl text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                        placeholder="Invoice notes..."
                      />
                    </div>
                  </div>

                  {/* Right Live A4 Sheet Preview Canvas */}
                  <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-200 dark:bg-[#0d0d0d] flex justify-center">
                    <div
                      id="partner-invoice-printable"
                      className="bg-white text-gray-900 shadow-2xl rounded-2xl w-full max-w-[850px] p-8 md:p-10 border border-gray-300 my-auto"
                      style={{ minHeight: "1050px" }}
                    >
                      {/* Company Header with Logo */}
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-5 pb-6 border-b-2 border-orange-500">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                          <img
                            src="/logo.png"
                            alt="Engineers Parcel"
                            className="h-14 sm:h-16 w-auto max-w-[240px] object-contain shrink-0"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                          <div className="border-t sm:border-t-0 sm:border-l border-gray-200 pt-2 sm:pt-0 sm:pl-4">
                            <h1 className="text-base font-black text-gray-950 uppercase tracking-tight leading-snug">
                              {activeCompany.name}
                            </h1>
                            <p className="text-xs font-bold text-orange-600 tracking-wide mt-0.5">
                              {activeCompany.tagline}
                            </p>
                            <p className="text-[11px] text-gray-600 mt-1 max-w-sm">
                              {activeCompany.address}
                            </p>
                            <div className="text-[11px] text-gray-600 mt-0.5 flex flex-wrap gap-x-3">
                              <span>Phone: <b>{activeCompany.phone}</b></span>
                              <span>Email: <b>{activeCompany.email}</b></span>
                            </div>
                            <div className="text-[11px] text-gray-600 mt-0.5 flex flex-wrap gap-x-3">
                              <span>GSTIN: <b className="font-mono text-gray-900">{activeCompany.gstin}</b></span>
                              <span>CIN: <b className="font-mono text-gray-900">{activeCompany.cin}</b></span>
                            </div>
                          </div>
                        </div>

                        <div className="sm:text-right shrink-0 mt-2 sm:mt-0">
                          <span className="inline-block px-3.5 py-1 bg-orange-600 text-white font-black text-xs uppercase tracking-widest rounded-lg shadow-sm">
                            {invoiceConfig.gstType === "exempt" ? "BILL OF SUPPLY" : "TAX INVOICE"}
                          </span>
                          <div className="mt-3 text-xs space-y-1">
                            <p className="text-gray-500">Invoice No: <span className="font-mono font-bold text-gray-900">{invoiceConfig.invoiceNumber}</span></p>
                            <p className="text-gray-500">Date: <span className="font-bold text-gray-900">{new Date(invoiceConfig.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span></p>
                            <p className="text-gray-500">Period: <span className="font-bold text-orange-700">{invoicePeriodLabel}</span></p>
                            <p className="text-gray-500">Due Date: <span className="font-bold text-red-600">{new Date(invoiceConfig.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span></p>
                          </div>
                        </div>
                      </div>

                      {/* Billed To Partner & Summary Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6 text-xs">
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">
                            Billed To (Corporate Partner)
                          </p>
                          <h2 className="text-base font-black text-gray-950">
                            {selectedVendorForFinance.name}
                          </h2>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] font-mono font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded">
                              {selectedVendorForFinance.partnerId}
                            </span>
                            {selectedVendorForFinance.gstNumber ? (
                              <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                                GSTIN: {selectedVendorForFinance.gstNumber}
                              </span>
                            ) : (
                              <span className="text-[11px] text-gray-500 italic">Unregistered Partner</span>
                            )}
                          </div>
                          <p className="text-gray-700 mt-2 leading-relaxed">
                            {[selectedVendorForFinance.address, selectedVendorForFinance.address2, selectedVendorForFinance.city, selectedVendorForFinance.state].filter(Boolean).join(", ")}
                            {selectedVendorForFinance.pincode ? ` - ${selectedVendorForFinance.pincode}` : ""}
                          </p>
                          <div className="mt-2 text-gray-600 flex flex-wrap gap-x-3">
                            {selectedVendorForFinance.phone && <span>Phone: <b>{selectedVendorForFinance.phone}</b></span>}
                            {selectedVendorForFinance.email && <span>Email: <b>{selectedVendorForFinance.email}</b></span>}
                          </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col justify-between">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">
                              Payment Summary
                            </p>
                            <div className="flex justify-between items-center py-1 border-b border-gray-200">
                              <span className="text-gray-600">Selected Consignments:</span>
                              <span className="font-bold text-gray-900">{selectedInvoiceOrders.length} bookings</span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-gray-200">
                              <span className="text-gray-600">Payment Status:</span>
                              <span className={`font-bold uppercase ${finalPayableAmount === 0 ? "text-green-600" : "text-red-600"}`}>
                                {finalPayableAmount === 0 ? "Paid in Full" : "Pending Payment"}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-1">
                              <span className="text-gray-600">Place of Supply:</span>
                              <span className="font-bold text-gray-900">Jharkhand (State Code: 20)</span>
                            </div>
                          </div>
                          <div className="mt-3 pt-2 border-t-2 border-dashed border-gray-300 flex justify-between items-center">
                            <span className="font-bold text-gray-700">Total Amount Due:</span>
                            <span className="text-xl font-black text-gray-900">
                              ₹{finalPayableAmount.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Itemized Consignments Table */}
                      <div className="mb-6 overflow-hidden rounded-xl border border-gray-200">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                            <tr>
                              <th className="py-2.5 px-3 text-center w-10">#</th>
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Docket / Tracking ID</th>
                              <th className="py-2.5 px-3">Route (Origin ➔ Destination)</th>
                              <th className="py-2.5 px-3 text-center">Service / Weight</th>
                              <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {selectedInvoiceOrders.map((order, idx) => (
                              <tr key={order._id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                                <td className="py-2 px-3 text-center text-gray-400 font-mono">{idx + 1}</td>
                                <td className="py-2 px-3 text-gray-600 whitespace-nowrap">
                                  {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                </td>
                                <td className="py-2 px-3 font-mono font-bold text-gray-900">
                                  {order.trackingId || order.bookingId}
                                </td>
                                <td className="py-2 px-3 text-gray-700 font-medium">
                                  {order.senderDetails?.city || "Origin"} ➔ {order.receiverDetails?.city || "Destination"}
                                </td>
                                <td className="py-2 px-3 text-center text-gray-600">
                                  {order.serviceType || "Standard"} &bull; {order.pricing?.totalWeight || order.weight || 1} kg
                                </td>
                                <td className="py-2 px-3 text-right font-black text-gray-900">
                                  ₹{(order.pricing?.totalAmount || 0).toLocaleString('en-IN')}
                                </td>
                              </tr>
                            ))}
                            {selectedInvoiceOrders.length === 0 && (
                              <tr>
                                <td colSpan="6" className="py-8 text-center text-gray-400 italic">
                                  No consignments selected for this invoice.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Calculations & Totals Breakdown */}
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-6 my-6 text-xs">
                        {/* Bank Transfer Details Box */}
                        <div className="w-full sm:w-1/2 p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-1.5">
                          <p className="text-[10px] font-black uppercase tracking-wider text-orange-700">
                            Bank Transfer & Payment Details
                          </p>
                          <div className="text-gray-800 space-y-1">
                            <p>Account Name: <b>{activeCompany.accountName}</b></p>
                            <p>Bank: <b>{activeCompany.bank}</b> ({activeCompany.accountType})</p>
                            <p>Account No: <b className="font-mono text-gray-900 text-sm tracking-wide">{activeCompany.accountNo}</b></p>
                            <p>IFSC Code: <b className="font-mono text-gray-900">{activeCompany.ifsc}</b></p>
                            <p>Branch: <b>{activeCompany.branch}</b></p>
                            <p>UPI ID: <b className="font-mono text-gray-900">{activeCompany.upi}</b></p>
                          </div>
                        </div>

                        {/* Totals Table */}
                        <div className="w-full sm:w-1/2 space-y-2">
                          <div className="space-y-1.5 text-right">
                            <div className="flex justify-between text-gray-600">
                              <span>Freight Charges / Taxable Value:</span>
                              <span className="font-bold text-gray-900">₹{taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>

                            {cgstAmount > 0 && (
                              <div className="flex justify-between text-gray-600">
                                <span>CGST (9%):</span>
                                <span className="font-bold text-gray-900">₹{cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              </div>
                            )}

                            {sgstAmount > 0 && (
                              <div className="flex justify-between text-gray-600">
                                <span>SGST (9%):</span>
                                <span className="font-bold text-gray-900">₹{sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              </div>
                            )}

                            <div className="flex justify-between text-gray-800 font-bold pt-1 border-t border-gray-200">
                              <span>Gross Invoice Total:</span>
                              <span>₹{grossInvoiceTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>

                            {deductions > 0 && (
                              <div className="flex justify-between text-green-700 font-bold">
                                <span>Less Payments / Advance Received:</span>
                                <span>-₹{deductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              </div>
                            )}

                            <div className="flex justify-between items-center text-sm font-black text-gray-950 p-2.5 bg-orange-50 rounded-xl border border-orange-200 mt-2">
                              <span>Net Amount Payable:</span>
                              <span className="text-lg text-orange-950">
                                ₹{finalPayableAmount.toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>

                          <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200 text-left">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                              Amount in Words:
                            </span>
                            <span className="font-bold text-gray-800 italic">
                              {numberToWordsIndian(finalPayableAmount)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Terms & Authorized Signatory Footer */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-gray-200 text-xs">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">
                            Terms & Conditions:
                          </p>
                          <p className="text-[11px] text-gray-600 leading-relaxed">
                            {invoiceConfig.notes || "1. Payment is due upon receipt or as per agreed credit terms. 2. Subject to Dhanbad jurisdiction only. 3. Delay in payments may attract interest as per applicable laws."}
                          </p>
                        </div>

                        <div className="text-right flex flex-col justify-between items-end">
                          <p className="text-[11px] font-bold text-gray-800">
                            For {activeCompany.name}
                          </p>
                          <div className="h-12 w-36 border border-dashed border-gray-300 rounded flex items-center justify-center my-2 text-[10px] text-gray-400 font-mono">
                            [ Official Stamp / Seal ]
                          </div>
                          <p className="text-xs font-black text-gray-900 border-t border-gray-300 pt-1 w-40 text-center">
                            Authorized Signatory
                          </p>
                        </div>
                      </div>

                      {/* Small Bottom Disclaimer */}
                      <div className="mt-8 pt-3 border-t border-gray-100 text-center text-[10px] text-gray-400">
                        This is an electronically generated invoice issued by Engineers Parcel. For billing assistance, contact info@engineersparcel.in
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  )
}

export default Vendors
