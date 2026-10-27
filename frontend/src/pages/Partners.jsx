"use client"

import React, { useState, useEffect } from "react"
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
  FileSpreadsheet,
  Layers,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ExternalLink,
  Link as LinkIcon,
  Truck,
  Calculator,
  Tag,
  FileCheck,
  Hash
} from "lucide-react"
import * as XLSX from "xlsx"
import ExcelJS from "exceljs"
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

const SHIFTING_PRESETS = [
  // Furniture
  { name: "Double Bed (King Size) with Mattress", category: "Furniture", unit: "Nos", defaultRate: 2500 },
  { name: "Double Bed (Queen Size) with Mattress", category: "Furniture", unit: "Nos", defaultRate: 2000 },
  { name: "Single Bed with Mattress", category: "Furniture", unit: "Nos", defaultRate: 1200 },
  { name: "3+1+1 Sofa Set (5 Seater)", category: "Furniture", unit: "Set", defaultRate: 3000 },
  { name: "L-Shape Sectional Sofa", category: "Furniture", unit: "Set", defaultRate: 3500 },
  { name: "Dining Table with 4 Chairs", category: "Furniture", unit: "Set", defaultRate: 2200 },
  { name: "Dining Table with 6 Chairs", category: "Furniture", unit: "Set", defaultRate: 2800 },
  { name: "Wardrobe / Almirah (Steel / Wooden)", category: "Furniture", unit: "Nos", defaultRate: 2000 },
  { name: "Study Table & Office Chair", category: "Furniture", unit: "Set", defaultRate: 1200 },
  { name: "Center / Coffee Table", category: "Furniture", unit: "Nos", defaultRate: 800 },
  { name: "TV Unit / Entertainment Console", category: "Furniture", unit: "Nos", defaultRate: 1500 },
  { name: "Shoe Rack", category: "Furniture", unit: "Nos", defaultRate: 600 },
  { name: "Dressing Table with Mirror", category: "Furniture", unit: "Nos", defaultRate: 1400 },

  // Appliances
  { name: "Double Door Refrigerator", category: "Appliances", unit: "Nos", defaultRate: 1800 },
  { name: "Single Door Refrigerator", category: "Appliances", unit: "Nos", defaultRate: 1200 },
  { name: "Side-by-Side Refrigerator", category: "Appliances", unit: "Nos", defaultRate: 2500 },
  { name: "Fully Automatic Washing Machine", category: "Appliances", unit: "Nos", defaultRate: 1400 },
  { name: "Semi Automatic Washing Machine", category: "Appliances", unit: "Nos", defaultRate: 1000 },
  { name: "LED TV 43\" - 55\" (Special Bubble Pack)", category: "Appliances", unit: "Nos", defaultRate: 1800 },
  { name: "LED TV 32\" (Special Bubble Pack)", category: "Appliances", unit: "Nos", defaultRate: 1200 },
  { name: "Split AC (Indoor + Outdoor Unit)", category: "Appliances", unit: "Set", defaultRate: 2200 },
  { name: "Window AC Unit", category: "Appliances", unit: "Nos", defaultRate: 1500 },
  { name: "Microwave Oven / OTG", category: "Appliances", unit: "Nos", defaultRate: 600 },
  { name: "Water Purifier (RO)", category: "Appliances", unit: "Nos", defaultRate: 500 },
  { name: "Room Air Cooler", category: "Appliances", unit: "Nos", defaultRate: 800 },

  // Boxes & Cartons
  { name: "Standard Carton Box (Clothes/Linens)", category: "Boxes", unit: "Boxes", defaultRate: 150 },
  { name: "Heavy Carton Box (Books/Documents)", category: "Boxes", unit: "Boxes", defaultRate: 200 },
  { name: "Kitchen Crockery & Utensil Box (Fragile)", category: "Boxes", unit: "Boxes", defaultRate: 250 },
  { name: "Large Suitcase / Trolley Bag", category: "Boxes", unit: "Nos", defaultRate: 300 },

  // Vehicles
  { name: "Motorcycle / Commuter Bike (up to 150cc)", category: "Vehicles", unit: "Nos", defaultRate: 4500 },
  { name: "Scooty / Activa", category: "Vehicles", unit: "Nos", defaultRate: 4000 },
  { name: "Royal Enfield / Cruiser Motorcycle", category: "Vehicles", unit: "Nos", defaultRate: 5500 },
  { name: "Hatchback Car Transportation", category: "Vehicles", unit: "Nos", defaultRate: 14000 },
  { name: "Sedan / Compact SUV Transportation", category: "Vehicles", unit: "Nos", defaultRate: 18000 },

  // Services & Charges
  { name: "Complete Professional 3-Layer Packing", category: "Services", unit: "Lot", defaultRate: 3500 },
  { name: "Loading Labor & Handling (Origin)", category: "Services", unit: "Lot", defaultRate: 2000 },
  { name: "Unloading Labor & Placement (Destination)", category: "Services", unit: "Lot", defaultRate: 2000 },
  { name: "Bed / AC Dismantling & Assembly Service", category: "Services", unit: "Service", defaultRate: 1500 },
  { name: "Transit Risk Insurance & Protection", category: "Services", unit: "Lot", defaultRate: 1000 }
];

const PRESET_MOVE_BUNDLES = {
  "1BHK": [
    { name: "Double Bed (Queen Size) with Mattress", category: "Furniture", qty: 1, unit: "Nos", rate: 2000 },
    { name: "Wardrobe / Almirah (Steel / Wooden)", category: "Furniture", qty: 1, unit: "Nos", rate: 2000 },
    { name: "Single Door Refrigerator", category: "Appliances", qty: 1, unit: "Nos", rate: 1200 },
    { name: "Washing Machine", category: "Appliances", qty: 1, unit: "Nos", rate: 1200 },
    { name: "LED TV 32\" (Special Bubble Pack)", category: "Appliances", qty: 1, unit: "Nos", rate: 1200 },
    { name: "Standard Carton Box (Clothes/Linens)", category: "Boxes", qty: 8, unit: "Boxes", rate: 150 },
    { name: "Kitchen Crockery & Utensil Box (Fragile)", category: "Boxes", qty: 4, unit: "Boxes", rate: 250 },
    { name: "Complete Professional 3-Layer Packing", category: "Services", qty: 1, unit: "Lot", rate: 3000 },
    { name: "Loading & Unloading Labor Service", category: "Services", qty: 1, unit: "Lot", rate: 3500 }
  ],
  "2BHK": [
    { name: "Double Bed (King Size) with Mattress", category: "Furniture", qty: 1, unit: "Nos", rate: 2500 },
    { name: "Double Bed (Queen Size) with Mattress", category: "Furniture", qty: 1, unit: "Nos", rate: 2000 },
    { name: "3+1+1 Sofa Set (5 Seater)", category: "Furniture", qty: 1, unit: "Set", rate: 3000 },
    { name: "Dining Table with 4 Chairs", category: "Furniture", qty: 1, unit: "Set", rate: 2200 },
    { name: "Wardrobe / Almirah (Steel / Wooden)", category: "Furniture", qty: 2, unit: "Nos", rate: 2000 },
    { name: "Double Door Refrigerator", category: "Appliances", qty: 1, unit: "Nos", rate: 1800 },
    { name: "Fully Automatic Washing Machine", category: "Appliances", qty: 1, unit: "Nos", rate: 1400 },
    { name: "Split AC (Indoor + Outdoor Unit)", category: "Appliances", qty: 1, unit: "Set", rate: 2200 },
    { name: "LED TV 43\" - 55\" (Special Bubble Pack)", category: "Appliances", qty: 1, unit: "Nos", rate: 1800 },
    { name: "Standard Carton Box (Clothes/Linens)", category: "Boxes", qty: 15, unit: "Boxes", rate: 150 },
    { name: "Kitchen Crockery & Utensil Box (Fragile)", category: "Boxes", qty: 6, unit: "Boxes", rate: 250 },
    { name: "Complete Professional 3-Layer Packing", category: "Services", qty: 1, unit: "Lot", rate: 4500 },
    { name: "Loading & Unloading Labor Service", category: "Services", qty: 1, unit: "Lot", rate: 4500 }
  ],
  "3BHK": [
    { name: "Double Bed (King Size) with Mattress", category: "Furniture", qty: 2, unit: "Nos", rate: 2500 },
    { name: "Single Bed with Mattress", category: "Furniture", qty: 1, unit: "Nos", rate: 1200 },
    { name: "L-Shape Sectional Sofa", category: "Furniture", qty: 1, unit: "Set", rate: 3500 },
    { name: "Dining Table with 6 Chairs", category: "Furniture", qty: 1, unit: "Set", rate: 2800 },
    { name: "Wardrobe / Almirah (Steel / Wooden)", category: "Furniture", qty: 3, unit: "Nos", rate: 2000 },
    { name: "Side-by-Side Refrigerator", category: "Appliances", qty: 1, unit: "Nos", rate: 2500 },
    { name: "Fully Automatic Washing Machine", category: "Appliances", qty: 1, unit: "Nos", rate: 1400 },
    { name: "Split AC (Indoor + Outdoor Unit)", category: "Appliances", qty: 2, unit: "Set", rate: 2200 },
    { name: "LED TV 43\" - 55\" (Special Bubble Pack)", category: "Appliances", qty: 2, unit: "Nos", rate: 1800 },
    { name: "Standard Carton Box (Clothes/Linens)", category: "Boxes", qty: 25, unit: "Boxes", rate: 150 },
    { name: "Kitchen Crockery & Utensil Box (Fragile)", category: "Boxes", qty: 10, unit: "Boxes", rate: 250 },
    { name: "Complete Professional 3-Layer Packing", category: "Services", qty: 1, unit: "Lot", rate: 6500 },
    { name: "Loading & Unloading Labor Service", category: "Services", qty: 1, unit: "Lot", rate: 6000 }
  ],
  "SINGLE_ITEM": [
    { name: "Single Parcel / Cargo Consignment", category: "General", qty: 1, unit: "Item", rate: 1200 }
  ],
  "VEHICLE": [
    { name: "Motorcycle / Bike (up to 150cc)", category: "Vehicles", qty: 1, unit: "Nos", rate: 4500 },
    { name: "Vehicle Specialized Transit Cover & Packaging", category: "Services", qty: 1, unit: "Lot", rate: 1000 }
  ]
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

  // Partner Invoice / Invoice Builder States
  const [partnerInvoiceModalOpen, setPartnerInvoiceModalOpen] = useState(false)
  const [isGeneratingInvoicePdf, setIsGeneratingInvoicePdf] = useState(false)
  const [selectedInvoiceOrderIds, setSelectedInvoiceOrderIds] = useState([])
  const [lookupBookingId, setLookupBookingId] = useState("")
  const [isLookingUpBooking, setIsLookingUpBooking] = useState(false)
  const [invoiceCustomer, setInvoiceCustomer] = useState({
    name: "",
    company: "",
    partnerId: "",
    gstNumber: "",
    address: "",
    address2: "",
    city: "",
    state: "Jharkhand",
    pincode: "",
    phone: "",
    email: "",
    placeOfSupply: "Jharkhand (State Code: 20)"
  })
  const [invoiceItems, setInvoiceItems] = useState([])
  const [invoiceConfig, setInvoiceConfig] = useState({
    invoiceNumber: "",
    invoiceDate: new Date().toISOString().substring(0, 10),
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString().substring(0, 10),
    companyKey: "SRQ",
    gstType: "inclusive",
    deductPayments: false,
    paidAmount: 0,
    notes: "Payment due within 15 days from invoice date. Subject to Dhanbad jurisdiction."
  })

  // Quotation / Price Estimate Builder States
  const [quotationModalOpen, setQuotationModalOpen] = useState(false)
  const [isGeneratingQuotationPdf, setIsGeneratingQuotationPdf] = useState(false)
  const [quoteLookupBookingId, setQuoteLookupBookingId] = useState("")
  const [isLookingUpQuoteBooking, setIsLookingUpQuoteBooking] = useState(false)
  const [quotePresetFilter, setQuotePresetFilter] = useState("All")
  const [quotePresetSearch, setQuotePresetSearch] = useState("")
  const [quoteCustomer, setQuoteCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    originCity: "Dhanbad",
    originAddress: "",
    originFloor: "Ground",
    originLift: "Yes",
    destinationCity: "Bangalore",
    destinationAddress: "",
    destinationFloor: "1st Floor",
    destinationLift: "Yes",
    moveScope: "2 BHK Shifting"
  })
  const [quoteItems, setQuoteItems] = useState([])
  const [quoteConfig, setQuoteConfig] = useState({
    quotationNumber: "",
    quoteDate: new Date().toISOString().substring(0, 10),
    validUntil: new Date(Date.now() + 15 * 86400000).toISOString().substring(0, 10),
    moveDate: new Date(Date.now() + 3 * 86400000).toISOString().substring(0, 10),
    serviceType: "House Shifting (Packers & Movers)",
    companyKey: "SRQ",
    gstRate: 18,
    discountAmount: 0,
    packingCharge: 0,
    loadingCharge: 0,
    unloadingCharge: 0,
    insurancePercent: 0,
    insuranceGoodsValue: 0,
    otherCharges: 0,
    terms: "1. 50% advance upon packing commencement, balance 50% upon safe door delivery.\n2. Specialized 3-layer bubble & corrugated packing included for furniture and fragile articles.\n3. Quotation valid for 15 days from issue date.\n4. Subject to Dhanbad jurisdiction."
  })

  // Monthly Corporate GST Report Modal States
  const [monthlyGstModalOpen, setMonthlyGstModalOpen] = useState(false)
  const [monthlyGstLoading, setMonthlyGstLoading] = useState(false)
  const [monthlyGstData, setMonthlyGstData] = useState(null)
  const [originalMonthlyGstData, setOriginalMonthlyGstData] = useState(null)
  const [selectedFy, setSelectedFy] = useState("2026-2027")
  const [activeMonthKey, setActiveMonthKey] = useState("2026-09") // Default to September 2026 as in screenshot
  const [selectedCompanyKey, setSelectedCompanyKey] = useState("SRQ")
  const [reportScope, setReportScope] = useState("all_corporate") // "all_corporate" or "registered_only"
  const [expandedPartnerRowId, setExpandedPartnerRowId] = useState(null)
  const [isExportingExcel, setIsExportingExcel] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)

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

    setInvoiceCustomer({
      name: selectedVendorForFinance.name || "",
      company: selectedVendorForFinance.name || "",
      partnerId: selectedVendorForFinance.partnerId || "",
      gstNumber: selectedVendorForFinance.gstNumber || "",
      address: selectedVendorForFinance.address || "",
      address2: selectedVendorForFinance.address2 || "",
      city: selectedVendorForFinance.city || "",
      state: selectedVendorForFinance.state || "Jharkhand",
      pincode: selectedVendorForFinance.pincode || "",
      phone: selectedVendorForFinance.phone || "",
      email: selectedVendorForFinance.email || "",
      placeOfSupply: "Jharkhand (State Code: 20)"
    });

    const items = vendorOrders.map(order => ({
      _id: order._id,
      date: order.createdAt ? new Date(order.createdAt).toISOString().substring(0, 10) : today.toISOString().substring(0, 10),
      docketNo: order.trackingId || order.bookingId,
      origin: order.senderDetails?.city || "Origin",
      destination: order.receiverDetails?.city || "Destination",
      serviceType: order.serviceType || "Standard",
      weight: order.pricing?.totalWeight || order.weight || 1,
      amount: Number(order.pricing?.totalAmount || 0)
    }));
    setInvoiceItems(items);
    setSelectedInvoiceOrderIds(vendorOrders.map(o => o._id));
    setLookupBookingId("");

    const totalPaid = vendorOrders.reduce((sum, o) => sum + (o.vendorPaidAmount || 0), 0);

    setInvoiceConfig({
      invoiceNumber: invNo,
      invoiceDate: today.toISOString().substring(0, 10),
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString().substring(0, 10),
      companyKey: "SRQ",
      gstType: selectedVendorForFinance.gstNumber ? "inclusive" : "exempt",
      deductPayments: totalPaid > 0,
      paidAmount: totalPaid,
      notes: "Payment due within 15 days from invoice date. Subject to Dhanbad jurisdiction."
    });

    setPartnerInvoiceModalOpen(true);
  };

  const handleOpenSingleOrderInvoice = (order) => {
    if (!order) return;
    const sender = order.senderDetails || {};
    const receiver = order.receiverDetails || {};

    const customerName = sender.name || order.senderName || selectedVendorForFinance?.name || "Customer";
    const customerCompany = sender.company || "";
    const customerGst = sender.gstNumber || selectedVendorForFinance?.gstNumber || "";
    const customerAddress = sender.address || selectedVendorForFinance?.address || "";
    const customerCity = sender.city || selectedVendorForFinance?.city || "";
    const customerState = sender.state || selectedVendorForFinance?.state || "Jharkhand";
    const customerPincode = sender.pincode || selectedVendorForFinance?.pincode || "";
    const customerPhone = sender.phone || selectedVendorForFinance?.phone || "";
    const customerEmail = sender.email || selectedVendorForFinance?.email || "";
    const placeOfSupply = `${customerState || "Jharkhand"} (State Code: ${customerState?.toLowerCase().includes("jharkhand") ? "20" : "Auto"})`;

    setInvoiceCustomer({
      name: customerName,
      company: customerCompany,
      partnerId: selectedVendorForFinance?.partnerId || "",
      gstNumber: customerGst,
      address: customerAddress,
      address2: selectedVendorForFinance?.address2 || "",
      city: customerCity,
      state: customerState,
      pincode: customerPincode,
      phone: customerPhone,
      email: customerEmail,
      placeOfSupply: placeOfSupply
    });

    const orderDate = order.createdAt ? new Date(order.createdAt).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10);
    const trackingNo = order.trackingId || order.bookingId || "ORD";
    const itemAmount = Number(order.pricing?.totalAmount || order.totalAmount || 0);
    const itemWeight = Number(order.pricing?.totalWeight || order.weight || 1);

    setInvoiceItems([{
      _id: order._id || String(Date.now()),
      date: orderDate,
      docketNo: trackingNo,
      origin: sender.city || order.origin || "Origin",
      destination: receiver.city || order.destination || "Destination",
      serviceType: order.serviceType || "Standard",
      weight: itemWeight,
      amount: itemAmount
    }]);

    setSelectedInvoiceOrderIds([order._id]);
    setLookupBookingId(trackingNo);

    const today = new Date();
    const curYear = today.getFullYear();
    const fy = today.getMonth() >= 2 ? `${String(curYear).slice(2)}-${String(curYear + 1).slice(2)}` : `${String(curYear - 1).slice(2)}-${String(curYear).slice(2)}`;
    const invNo = `INV/${fy}/${trackingNo}`;

    const paid = Number(order.vendorPaidAmount || order.paidAmount || (order.paymentStatus === 'paid' ? itemAmount : 0));

    setInvoiceConfig({
      invoiceNumber: invNo,
      invoiceDate: orderDate,
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString().substring(0, 10),
      companyKey: "SRQ",
      gstType: customerGst ? "inclusive" : "exempt",
      deductPayments: paid > 0,
      paidAmount: paid,
      notes: "Payment due within 15 days from invoice date. Subject to Dhanbad jurisdiction."
    });

    setPartnerInvoiceModalOpen(true);
  };

  const handleOpenStandaloneInvoiceBuilder = () => {
    const today = new Date();
    const curYear = today.getFullYear();
    const fy = today.getMonth() >= 2 ? `${String(curYear).slice(2)}-${String(curYear + 1).slice(2)}` : `${String(curYear - 1).slice(2)}-${String(curYear).slice(2)}`;
    const randomSeq = String(Math.floor(1000 + Math.random() * 9000));
    const invNo = `INV/${fy}/BLD-${randomSeq}`;

    setInvoiceCustomer({
      name: "",
      company: "",
      partnerId: "",
      gstNumber: "",
      address: "",
      address2: "",
      city: "",
      state: "Jharkhand",
      pincode: "",
      phone: "",
      email: "",
      placeOfSupply: "Jharkhand (State Code: 20)"
    });

    setInvoiceItems([]);
    setSelectedInvoiceOrderIds([]);
    setLookupBookingId("");

    setInvoiceConfig({
      invoiceNumber: invNo,
      invoiceDate: today.toISOString().substring(0, 10),
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString().substring(0, 10),
      companyKey: "SRQ",
      gstType: "inclusive",
      deductPayments: false,
      paidAmount: 0,
      notes: "Payment due within 15 days from invoice date. Subject to Dhanbad jurisdiction."
    });

    setPartnerInvoiceModalOpen(true);
  };

  const handleImportBooking = async (idToSearch) => {
    const queryId = (idToSearch || lookupBookingId || "").trim();
    if (!queryId) {
      toast.error("Please enter a Booking ID or Tracking ID");
      return;
    }
    try {
      setIsLookingUpBooking(true);
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/bookings/${encodeURIComponent(queryId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const booking = res.data?.data || res.data;
      if (!booking || (!booking._id && !booking.bookingId)) {
        toast.error("Booking not found. Please check the ID.");
        return;
      }

      const sender = booking.senderDetails || {};
      const receiver = booking.receiverDetails || {};

      const customerName = sender.name || booking.senderName || booking.customerName || selectedVendorForFinance?.name || "Customer";
      const customerCompany = sender.company || booking.company || "";
      const customerGst = sender.gstNumber || booking.gstNumber || "";
      const customerAddress = sender.address || booking.address || "";
      const customerCity = sender.city || booking.city || "";
      const customerState = sender.state || booking.state || "Jharkhand";
      const customerPincode = sender.pincode || booking.pincode || "";
      const customerPhone = sender.phone || booking.phone || "";
      const customerEmail = sender.email || booking.email || "";
      const placeOfSupply = `${customerState || "Jharkhand"} (State Code: ${customerState?.toLowerCase().includes("jharkhand") ? "20" : "Auto"})`;

      setInvoiceCustomer({
        name: customerName,
        company: customerCompany,
        partnerId: booking.vendorId?.partnerId || booking.vendorPartnerId || selectedVendorForFinance?.partnerId || "",
        gstNumber: customerGst,
        address: customerAddress,
        address2: "",
        city: customerCity,
        state: customerState,
        pincode: customerPincode,
        phone: customerPhone,
        email: customerEmail,
        placeOfSupply: placeOfSupply
      });

      const bookingDate = booking.createdAt ? new Date(booking.createdAt).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10);
      const trackingNo = booking.trackingId || booking.bookingId || queryId;
      const itemAmount = Number(booking.pricing?.totalAmount || booking.totalAmount || booking.grandTotal || 0);
      const itemWeight = Number(booking.pricing?.totalWeight || booking.weight || 1);
      const originCity = sender.city || booking.origin || "Origin";
      const destCity = receiver.city || booking.destination || "Destination";
      const service = booking.serviceType || "Standard";

      const newItem = {
        _id: booking._id || String(Date.now()),
        date: bookingDate,
        docketNo: trackingNo,
        origin: originCity,
        destination: destCity,
        serviceType: service,
        weight: itemWeight,
        amount: itemAmount
      };

      setInvoiceItems([newItem]);
      setSelectedInvoiceOrderIds(booking._id ? [booking._id] : []);

      const today = new Date();
      const curYear = today.getFullYear();
      const fy = today.getMonth() >= 2 ? `${String(curYear).slice(2)}-${String(curYear + 1).slice(2)}` : `${String(curYear - 1).slice(2)}-${String(curYear).slice(2)}`;
      const invNo = `INV/${fy}/${trackingNo}`;

      const paid = Number(booking.vendorPaidAmount || booking.paidAmount || (booking.paymentStatus === 'paid' ? itemAmount : 0));

      setInvoiceConfig(prev => ({
        ...prev,
        invoiceNumber: invNo,
        invoiceDate: bookingDate,
        dueDate: new Date(Date.now() + 15 * 86400000).toISOString().substring(0, 10),
        gstType: customerGst ? "inclusive" : (prev.gstType || "inclusive"),
        deductPayments: paid > 0,
        paidAmount: paid
      }));

      toast.success(`Booking ${trackingNo} details loaded into Invoice Builder!`);
    } catch (err) {
      console.error("Failed to import booking:", err);
      toast.error(err.response?.data?.message || "Booking not found with this ID");
    } finally {
      setIsLookingUpBooking(false);
    }
  };

  const handleItemChange = (index, field, value) => {
    setInvoiceItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAddItem = () => {
    setInvoiceItems(prev => [
      ...prev,
      {
        _id: String(Date.now()),
        date: new Date().toISOString().substring(0, 10),
        docketNo: `EP${Math.floor(1000 + Math.random() * 9000)}`,
        origin: "Origin",
        destination: "Destination",
        serviceType: "Standard",
        weight: 1,
        amount: 0
      }
    ]);
  };

  const handleDeleteItem = (index) => {
    setInvoiceItems(prev => prev.filter((_, idx) => idx !== index));
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

      const cleanNum = (invoiceConfig.invoiceNumber || "INV").replace(/[\/\\?%*:|"<>]/g, "-");
      const custName = (invoiceCustomer.name || selectedVendorForFinance?.partnerId || "Customer").replace(/[\/\\?%*:|"<>]/g, "_");
      const filename = `Invoice_${custName}_${cleanNum}.pdf`;
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

  const handleSendWhatsApp = (finalPayableAmount, invoicePeriodLabel, itemsCount) => {
    const customerPhone = invoiceCustomer.phone || (selectedVendorForFinance?.phone || "");
    const phone = customerPhone.replace(/\D/g, "");
    const formattedPhone = phone.length === 10 ? `91${phone}` : phone;
    const company = COMPANY_PROFILES[invoiceConfig.companyKey] || COMPANY_PROFILES.SRQ;

    const billedToTitle = invoiceCustomer.name || selectedVendorForFinance?.name || "Customer";
    const billedToSub = invoiceCustomer.company ? ` (${invoiceCustomer.company})` : (invoiceCustomer.partnerId ? ` (${invoiceCustomer.partnerId})` : "");

    const message = `*INVOICE: ${invoiceConfig.invoiceNumber}*
*To:* ${billedToTitle}${billedToSub}
*Billing Period:* ${invoicePeriodLabel}
*Invoice Date:* ${invoiceConfig.invoiceDate}
*Payment Due Date:* ${invoiceConfig.dueDate}
*Total Consignments:* ${itemsCount}
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

    if (!formattedPhone) {
      toast.error("Please provide a phone number for WhatsApp message");
      return;
    }
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleCopyInvoiceSummary = (finalPayableAmount, invoicePeriodLabel, itemsCount) => {
    const company = COMPANY_PROFILES[invoiceConfig.companyKey] || COMPANY_PROFILES.SRQ;
    const billedToTitle = invoiceCustomer.name || selectedVendorForFinance?.name || "Customer";
    const billedToSub = invoiceCustomer.company ? ` (${invoiceCustomer.company})` : (invoiceCustomer.partnerId ? ` (${invoiceCustomer.partnerId})` : "");

    const text = `INVOICE: ${invoiceConfig.invoiceNumber}
To: ${billedToTitle}${billedToSub}
Billing Period: ${invoicePeriodLabel}
Date: ${invoiceConfig.invoiceDate}
Due Date: ${invoiceConfig.dueDate}
Total Consignments: ${itemsCount}
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

  const handleOpenQuotationBuilder = (vendor = null) => {
    const today = new Date();
    const curYear = today.getFullYear();
    const fy = today.getMonth() >= 2 ? `${String(curYear).slice(2)}-${String(curYear + 1).slice(2)}` : `${String(curYear - 1).slice(2)}-${String(curYear).slice(2)}`;
    const randomSeq = String(Math.floor(1000 + Math.random() * 9000));
    const quoNo = `QUO/${fy}/EP-${randomSeq}`;

    setQuoteConfig({
      quotationNumber: quoNo,
      quoteDate: today.toISOString().substring(0, 10),
      validUntil: new Date(Date.now() + 15 * 86400000).toISOString().substring(0, 10),
      moveDate: new Date(Date.now() + 3 * 86400000).toISOString().substring(0, 10),
      serviceType: "House Shifting (Packers & Movers)",
      companyKey: "SRQ",
      gstRate: 18,
      discountAmount: 0,
      packingCharge: 0,
      loadingCharge: 0,
      unloadingCharge: 0,
      insurancePercent: 0,
      insuranceGoodsValue: 0,
      otherCharges: 0,
      terms: "1. 50% advance upon packing commencement, balance 50% upon safe door delivery.\n2. Specialized 3-layer bubble & corrugated packing included for furniture and fragile articles.\n3. Quotation valid for 15 days from issue date.\n4. Subject to Dhanbad jurisdiction."
    });

    if (vendor) {
      setQuoteCustomer({
        name: vendor.name || "",
        phone: vendor.phone || "",
        email: vendor.email || "",
        originCity: vendor.city || "Dhanbad",
        originAddress: vendor.address || "",
        originFloor: "Ground",
        originLift: "Yes",
        destinationCity: "Bangalore",
        destinationAddress: "",
        destinationFloor: "1st Floor",
        destinationLift: "Yes",
        moveScope: "Corporate Move"
      });
    } else {
      setQuoteCustomer({
        name: "",
        phone: "",
        email: "",
        originCity: "Dhanbad",
        originAddress: "",
        originFloor: "Ground",
        originLift: "Yes",
        destinationCity: "Bangalore",
        destinationAddress: "",
        destinationFloor: "1st Floor",
        destinationLift: "Yes",
        moveScope: "2 BHK Shifting"
      });
    }

    const defaultBundle = PRESET_MOVE_BUNDLES["2BHK"].map((item, idx) => ({
      id: String(Date.now() + idx),
      name: item.name,
      category: item.category,
      qty: item.qty,
      unit: item.unit,
      rate: item.rate,
      amount: item.qty * item.rate
    }));
    setQuoteItems(defaultBundle);
    setQuotePresetFilter("All");
    setQuotePresetSearch("");
    setQuoteLookupBookingId("");
    setQuotationModalOpen(true);
  };

  const handleQuoteImportBooking = async (idToSearch) => {
    const queryId = (idToSearch || quoteLookupBookingId || "").trim();
    if (!queryId) {
      toast.error("Please enter a Booking ID or Tracking ID");
      return;
    }
    try {
      setIsLookingUpQuoteBooking(true);
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/bookings/${encodeURIComponent(queryId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const booking = res.data?.data || res.data;
      if (!booking || (!booking._id && !booking.bookingId)) {
        toast.error("Booking not found. Please check the ID.");
        return;
      }

      const sender = booking.senderDetails || {};
      const receiver = booking.receiverDetails || {};

      const customerName = sender.name || booking.senderName || booking.customerName || "Customer";
      const customerPhone = sender.phone || booking.phone || "";
      const customerEmail = sender.email || booking.email || "";
      const originCity = sender.city || booking.origin || "Origin";
      const originAddress = sender.address || booking.pickupAddress || "";
      const destCity = receiver.city || booking.destination || "Destination";
      const destAddress = receiver.address || booking.deliveryAddress || "";

      setQuoteCustomer(prev => ({
        ...prev,
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
        originCity: originCity,
        originAddress: originAddress,
        destinationCity: destCity,
        destinationAddress: destAddress,
        moveScope: booking.serviceType?.toLowerCase().includes("shift") ? "House Shifting" : "Individual Consignment"
      }));

      const bookingAmount = Number(booking.pricing?.totalAmount || booking.totalAmount || booking.grandTotal || 0);
      const bookingWeight = Number(booking.pricing?.totalWeight || booking.weight || 1);
      const bookingDeclaredVal = Number(booking.declaredValue || booking.insurance?.declaredValue || 0);

      if (Array.isArray(booking.items) && booking.items.length > 0) {
        const importedItems = booking.items.map((it, idx) => ({
          id: String(Date.now() + idx),
          name: it.name || it.description || `Article ${idx + 1}`,
          category: it.category || "General",
          qty: Number(it.quantity || it.qty || 1),
          unit: it.unit || "Nos",
          rate: Number(it.rate || it.price || 0),
          amount: Number(it.amount || (Number(it.quantity || 1) * Number(it.rate || 0)))
        }));
        setQuoteItems(importedItems);
      } else {
        const desc = booking.packageDetails?.description || booking.itemDescription || `${booking.serviceType || "Cargo Shipment"} (${bookingWeight} kg)`;
        setQuoteItems([
          {
            id: String(Date.now()),
            name: desc,
            category: "Parcel / Cargo",
            qty: 1,
            unit: `${bookingWeight} kg`,
            rate: bookingAmount > 0 ? bookingAmount : 1500,
            amount: bookingAmount > 0 ? bookingAmount : 1500
          }
        ]);
      }

      if (bookingDeclaredVal > 0) {
        setQuoteConfig(prev => ({
          ...prev,
          insuranceGoodsValue: bookingDeclaredVal,
          insurancePercent: 1.5
        }));
      }

      toast.success(`Imported details from Booking #${booking.bookingId || queryId}!`);
    } catch (err) {
      console.error("Booking import error for quote:", err);
      toast.error(err.response?.data?.message || "Booking lookup failed. Please verify ID.");
    } finally {
      setIsLookingUpQuoteBooking(false);
    }
  };

  const handleApplyMoveBundle = (bundleKey) => {
    const bundle = PRESET_MOVE_BUNDLES[bundleKey];
    if (!bundle) return;
    const items = bundle.map((item, idx) => ({
      id: String(Date.now() + idx),
      name: item.name,
      category: item.category,
      qty: item.qty,
      unit: item.unit,
      rate: item.rate,
      amount: item.qty * item.rate
    }));
    setQuoteItems(items);

    let scopeLabel = "Custom Move";
    let serviceLabel = quoteConfig.serviceType;
    if (bundleKey === "1BHK") { scopeLabel = "1 BHK Shifting"; serviceLabel = "House Shifting (Packers & Movers)"; }
    else if (bundleKey === "2BHK") { scopeLabel = "2 BHK Shifting"; serviceLabel = "House Shifting (Packers & Movers)"; }
    else if (bundleKey === "3BHK") { scopeLabel = "3 BHK Shifting"; serviceLabel = "House Shifting (Packers & Movers)"; }
    else if (bundleKey === "SINGLE_ITEM") { scopeLabel = "Single Consignment"; serviceLabel = "Parcel / Courier Shipment"; }
    else if (bundleKey === "VEHICLE") { scopeLabel = "Vehicle Relocation"; serviceLabel = "Vehicle Transportation"; }

    setQuoteCustomer(prev => ({ ...prev, moveScope: scopeLabel }));
    setQuoteConfig(prev => ({ ...prev, serviceType: serviceLabel }));
    toast.success(`Loaded ${scopeLabel} preset items!`);
  };

  const handleQuickAddPreset = (preset) => {
    const newItem = {
      id: String(Date.now()),
      name: preset.name,
      category: preset.category,
      qty: 1,
      unit: preset.unit,
      rate: preset.defaultRate,
      amount: preset.defaultRate
    };
    setQuoteItems(prev => [...prev, newItem]);
    toast.success(`Added "${preset.name}" to quotation`);
  };

  const handleQuoteItemChange = (index, field, value) => {
    setQuoteItems(prev => {
      const next = [...prev];
      const item = { ...next[index], [field]: value };
      if (field === "qty" || field === "rate") {
        const q = parseFloat(field === "qty" ? value : item.qty) || 0;
        const r = parseFloat(field === "rate" ? value : item.rate) || 0;
        item.amount = Math.round(q * r * 100) / 100;
      }
      next[index] = item;
      return next;
    });
  };

  const handleAddQuoteItem = () => {
    setQuoteItems(prev => [
      ...prev,
      {
        id: String(Date.now()),
        name: "Custom Article / Item",
        category: "General",
        qty: 1,
        unit: "Nos",
        rate: 500,
        amount: 500
      }
    ]);
  };

  const handleDeleteQuoteItem = (index) => {
    setQuoteItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handlePrintQuotation = () => {
    window.print();
  };

  const handleDownloadQuotationPDF = async () => {
    const element = document.getElementById("quotation-printable");
    if (!element) {
      toast.error("Quotation printable view not found");
      return;
    }
    try {
      setIsGeneratingQuotationPdf(true);
      toast.loading("Generating High-Resolution Quotation PDF...", { id: "quote-pdf" });

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff"
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const pageHeight = 297;
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

      const cleanNum = (quoteConfig.quotationNumber || "QUO").replace(/[\/\\?%*:|"<>]/g, "-");
      const custName = (quoteCustomer.name || "Customer").replace(/[\/\\?%*:|"<>]/g, "_");
      const filename = `Quotation_${custName}_${cleanNum}.pdf`;
      pdf.save(filename);
      toast.success("Quotation PDF downloaded successfully!", { id: "quote-pdf" });
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("Error creating PDF, launching print view...", { id: "quote-pdf" });
      window.print();
    } finally {
      setIsGeneratingQuotationPdf(false);
    }
  };

  const handleSendQuoteWhatsApp = (quoteGrandTotal, itemsSubtotal, packingCharge, loadingCharge, unloadingCharge, discountAmount, gstAmount) => {
    const customerPhone = (quoteCustomer.phone || "").replace(/\D/g, "");
    const formattedPhone = customerPhone.length === 10 ? `91${customerPhone}` : customerPhone;
    const company = COMPANY_PROFILES[quoteConfig.companyKey] || COMPANY_PROFILES.SRQ;

    const message = `*PRICE ESTIMATE / QUOTATION: ${quoteConfig.quotationNumber}*
*Customer:* ${quoteCustomer.name || "Valued Client"}
*Service Type:* ${quoteConfig.serviceType} (${quoteCustomer.moveScope || ""})
*Route:* ${quoteCustomer.originCity || "Origin"} ➔ ${quoteCustomer.destinationCity || "Destination"}
*Quotation Date:* ${quoteConfig.quoteDate}
*Estimated Moving Date:* ${quoteConfig.moveDate}
*Total Items / Articles:* ${quoteItems.length}

*Estimated Pricing Breakdown:*
• Articles / Consignment Freight: Rs. ${itemsSubtotal.toLocaleString('en-IN')}
${packingCharge > 0 ? `• Packing & Material: Rs. ${packingCharge.toLocaleString('en-IN')}\n` : ""}${loadingCharge > 0 ? `• Loading Labor: Rs. ${loadingCharge.toLocaleString('en-IN')}\n` : ""}${unloadingCharge > 0 ? `• Unloading Labor: Rs. ${unloadingCharge.toLocaleString('en-IN')}\n` : ""}${discountAmount > 0 ? `• Special Discount: -Rs. ${discountAmount.toLocaleString('en-IN')}\n` : ""}${gstAmount > 0 ? `• GST (${quoteConfig.gstRate}%): Rs. ${gstAmount.toLocaleString('en-IN')}\n` : ""}*Total Estimated Cost:* Rs. ${quoteGrandTotal.toLocaleString('en-IN')} (${numberToWordsIndian(quoteGrandTotal)})

*Bank Payment Transfer Details (for Booking Advance):*
*Account Name:* ${company.accountName}
*Bank:* ${company.bank}
*A/c No:* ${company.accountNo}
*IFSC:* ${company.ifsc}
*UPI ID:* ${company.upi}

*Validity:* This estimate is valid for 15 days from issuance.
Thank you for choosing Engineers Parcel!`;

    if (!formattedPhone) {
      toast.error("Please enter a phone number to send WhatsApp quote");
      return;
    }
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleCopyQuoteSummary = (quoteGrandTotal) => {
    const company = COMPANY_PROFILES[quoteConfig.companyKey] || COMPANY_PROFILES.SRQ;
    const text = `PRICE ESTIMATE / QUOTATION: ${quoteConfig.quotationNumber}
Customer: ${quoteCustomer.name || "Valued Client"}
Service: ${quoteConfig.serviceType} (${quoteCustomer.moveScope || ""})
Route: ${quoteCustomer.originCity || "Origin"} to ${quoteCustomer.destinationCity || "Destination"}
Estimated Total: Rs. ${quoteGrandTotal.toLocaleString('en-IN')} (${numberToWordsIndian(quoteGrandTotal)})

Bank Details:
Company: ${company.name}
Bank: ${company.bank}
A/c No: ${company.accountNo}
IFSC: ${company.ifsc}
UPI: ${company.upi}

Quote Valid Till: ${quoteConfig.validUntil}`;

    navigator.clipboard.writeText(text);
    toast.success("Quotation summary copied to clipboard!");
  };

  const recalculateReportTotals = (monthsArray) => {
    let grandQty = 0;
    let grandWeight = 0;
    let grandTaxable = 0;
    let grandGst = 0;
    let grandValue = 0;

    const updatedMonths = monthsArray.map((m) => {
      const rows = m.rows || [];
      const qty = rows.reduce((sum, r) => sum + (parseInt(r.qty, 10) || 0), 0);
      const weight = Math.round(rows.reduce((sum, r) => sum + (parseFloat(r.weight) || 0), 0) * 100) / 100;
      const taxableAmount = Math.round(rows.reduce((sum, r) => sum + (parseFloat(r.taxableAmount) || 0), 0) * 100) / 100;
      const gstAmount = Math.round(rows.reduce((sum, r) => sum + (parseFloat(r.gstAmount) || 0), 0) * 100) / 100;
      const invoiceValue = Math.round(rows.reduce((sum, r) => sum + (parseFloat(r.invoiceValue) || 0), 0) * 100) / 100;

      grandQty += qty;
      grandWeight += weight;
      grandTaxable += taxableAmount;
      grandGst += gstAmount;
      grandValue += invoiceValue;

      return {
        ...m,
        partnerCount: rows.length,
        totals: {
          qty,
          weight,
          taxableAmount,
          gstRate: "18%",
          gstAmount,
          invoiceValue
        }
      };
    });

    return {
      updatedMonths,
      fyTotals: {
        grandTotalQty: grandQty,
        grandTotalWeight: Math.round(grandWeight * 100) / 100,
        grandTotalTaxableAmount: Math.round(grandTaxable * 100) / 100,
        grandTotalGstAmount: Math.round(grandGst * 100) / 100,
        grandTotalInvoiceValue: Math.round(grandValue * 100) / 100
      }
    };
  };

  const handleCellChange = (monthKey, rowIndex, field, value) => {
    if (!monthlyGstData || !monthlyGstData.months) return;

    setMonthlyGstData((prev) => {
      const newMonths = prev.months.map((m) => {
        if (m.monthKey !== monthKey) return m;

        const newRows = m.rows.map((r, idx) => {
          if (idx !== rowIndex) return r;

          const updated = { ...r, [field]: value };

          // Automatically recalculate GST (18%) and Invoice Value when taxableAmount is updated
          if (field === "taxableAmount") {
            const numTaxable = parseFloat(value) || 0;
            const autoGst = Math.round(numTaxable * 0.18 * 100) / 100;
            updated.taxableAmount = value;
            updated.gstAmount = autoGst;
            updated.invoiceValue = Math.round((numTaxable + autoGst) * 100) / 100;
          } else if (field === "gstAmount") {
            const numGst = parseFloat(value) || 0;
            const currentTaxable = parseFloat(updated.taxableAmount) || 0;
            updated.gstAmount = value;
            updated.invoiceValue = Math.round((currentTaxable + numGst) * 100) / 100;
          } else if (field === "invoiceValue") {
            updated.invoiceValue = value;
          }

          return updated;
        });

        return { ...m, rows: newRows };
      });

      const { updatedMonths, fyTotals } = recalculateReportTotals(newMonths);
      return {
        ...prev,
        months: updatedMonths,
        fyTotals
      };
    });
  };

  const handleAddRow = (monthKey) => {
    if (!monthlyGstData || !monthlyGstData.months) return;

    setMonthlyGstData((prev) => {
      const newMonths = prev.months.map((m) => {
        if (m.monthKey !== monthKey) return m;

        const newSNo = (m.rows?.length || 0) + 1;
        const fyShort = selectedFy === "2026-2027" ? "26-27" : selectedFy.slice(2, 4) + "-" + selectedFy.slice(7, 9);
        const [year, monthNum] = monthKey.split("-");
        const defaultDate = `1/${parseInt(monthNum, 10)}/${year.slice(2)}`;

        const newRow = {
          sNo: newSNo,
          billTo: "NEW CORPORATE CLIENT",
          partnerId: "",
          gstNumber: "B2C / URP",
          invoiceNo: `INV/${fyShort}/${50 + newSNo}`,
          invoiceDate: defaultDate,
          qty: 1,
          weight: 1.0,
          taxableAmount: 1000.0,
          gstRate: "18%",
          gstAmount: 180.0,
          invoiceValue: 1180.0,
          period: m.sheetName,
          bookings: []
        };

        return { ...m, rows: [...(m.rows || []), newRow] };
      });

      const { updatedMonths, fyTotals } = recalculateReportTotals(newMonths);
      return {
        ...prev,
        months: updatedMonths,
        fyTotals
      };
    });
    toast.success("Added new row. You can now edit its values.");
  };

  const handleDeleteRow = (monthKey, rowIndex) => {
    if (!monthlyGstData || !monthlyGstData.months) return;

    setMonthlyGstData((prev) => {
      const newMonths = prev.months.map((m) => {
        if (m.monthKey !== monthKey) return m;

        const filteredRows = m.rows
          .filter((_, idx) => idx !== rowIndex)
          .map((r, idx) => ({
            ...r,
            sNo: idx + 1
          }));

        return { ...m, rows: filteredRows };
      });

      const { updatedMonths, fyTotals } = recalculateReportTotals(newMonths);
      return {
        ...prev,
        months: updatedMonths,
        fyTotals
      };
    });
    toast.success("Row removed");
  };

  const handleResetMonth = (monthKey) => {
    if (!originalMonthlyGstData || !originalMonthlyGstData.months) return;

    const originalMonth = originalMonthlyGstData.months.find((m) => m.monthKey === monthKey);
    if (!originalMonth) return;

    setMonthlyGstData((prev) => {
      const newMonths = prev.months.map((m) => {
        if (m.monthKey !== monthKey) return m;
        return JSON.parse(JSON.stringify(originalMonth));
      });

      const { updatedMonths, fyTotals } = recalculateReportTotals(newMonths);
      return {
        ...prev,
        months: updatedMonths,
        fyTotals
      };
    });
    toast.success(`Reset ${originalMonth.sheetName} to original data.`);
  };

  const fetchMonthlyGstReport = async (fy = selectedFy, scope = reportScope, company = selectedCompanyKey) => {
    setMonthlyGstLoading(true);
    try {
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/partners/reports/monthly-gst?financialYear=${fy}&scope=${scope}&company=${company}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMonthlyGstData(res.data);
      setOriginalMonthlyGstData(JSON.parse(JSON.stringify(res.data)));
      if (res.data?.months?.length) {
        const currentExists = res.data.months.some(m => m.monthKey === activeMonthKey);
        if (!currentExists) {
          const withData = res.data.months.find(m => m.partnerCount > 0) || res.data.months[0];
          setActiveMonthKey(withData.monthKey);
        }
      }
    } catch (err) {
      console.error("Failed to load monthly GST report:", err);
      toast.error(err.response?.data?.message || "Failed to load monthly GST report");
    } finally {
      setMonthlyGstLoading(false);
    }
  };

  const handleOpenMonthlyGstModal = () => {
    setMonthlyGstModalOpen(true);
    fetchMonthlyGstReport(selectedFy, reportScope, selectedCompanyKey);
  };

  const buildStyledWorksheet = (workbook, monthData, company) => {
    const ws = workbook.addWorksheet(monthData.sheetName, {
      views: [{ showGridLines: true }]
    });

    // Column widths
    ws.columns = [
      { key: "sNo", width: 9 },
      { key: "billTo", width: 38 },
      { key: "b2b_b2c", width: 24 },
      { key: "invoiceNo", width: 18 },
      { key: "invoiceDate", width: 16 },
      { key: "qty", width: 10 },
      { key: "weight", width: 14 },
      { key: "taxableAmount", width: 20 },
      { key: "gstRate", width: 12 },
      { key: "gstAmount", width: 18 },
      { key: "invoiceValue", width: 20 }
    ];

    // Row 1: Merged Title Banner - CENTER AND BOLD FORMAT
    ws.mergeCells("A1:K1");
    const titleRow = ws.getRow(1);
    titleRow.height = 36;
    const titleCell = ws.getCell("A1");
    titleCell.value = `${company.name.toUpperCase()} (${monthData.sheetName})`;
    titleCell.font = { name: "Calibri", size: 12, bold: true, color: { argb: "FF000000" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFFFFF" }
    };
    titleCell.border = {
      top: { style: "thin", color: { argb: "FF000000" } },
      left: { style: "thin", color: { argb: "FF000000" } },
      bottom: { style: "thin", color: { argb: "FF000000" } },
      right: { style: "thin", color: { argb: "FF000000" } }
    };

    // Row 2: Column Headers - LIGHT ORANGE 3 AND ALL LETTERS IN BOLD
    // Light Orange 3 in Excel Theme Colors palette: F8CBAD (RGB 248, 203, 173)
    const LIGHT_ORANGE_3 = "FFF8CBAD";

    const headers = [
      "S NO.", "BILL TO", "B2B/B2C", "INVOICE NO.", "INVOICE DATE",
      "QTY.", "WT. (kg)", "TAXABLE AMOUNT", "GST RATE", "GST AMOUNT", "INVOICE VALUE"
    ];

    const headerRow = ws.getRow(2);
    headerRow.height = 28;
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF000000" } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: LIGHT_ORANGE_3 }
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FF000000" } },
        left: { style: "thin", color: { argb: "FF000000" } },
        bottom: { style: "thin", color: { argb: "FF000000" } },
        right: { style: "thin", color: { argb: "FF000000" } }
      };
    });

    // Rows 3..N: Data Rows
    monthData.rows.forEach((r) => {
      const numQty = parseInt(r.qty, 10) || 0;
      const numWeight = parseFloat(r.weight) || 0;
      const numTaxable = parseFloat(r.taxableAmount) || 0;
      const numGst = parseFloat(r.gstAmount) || 0;
      const numInvoiceValue = parseFloat(r.invoiceValue) || 0;

      const row = ws.addRow([
        r.sNo,
        r.billTo,
        r.gstNumber,
        r.invoiceNo,
        r.invoiceDate,
        numQty,
        numWeight,
        numTaxable,
        r.gstRate || "18%",
        numGst,
        numInvoiceValue
      ]);
      row.height = 22;

      row.eachCell((cell, colNum) => {
        const isBold = colNum === 2 || colNum === 3 || colNum === 11;
        cell.font = { name: "Calibri", size: 10, bold: isBold };
        cell.border = {
          top: { style: "thin", color: { argb: "FFD9D9D9" } },
          left: { style: "thin", color: { argb: "FF000000" } },
          bottom: { style: "thin", color: { argb: "FFD9D9D9" } },
          right: { style: "thin", color: { argb: "FF000000" } }
        };

        if (colNum === 1 || colNum === 4 || colNum === 5 || colNum === 6 || colNum === 9) {
          cell.alignment = { horizontal: "center", vertical: "middle" };
        } else if (colNum === 2 || colNum === 3) {
          cell.alignment = { horizontal: "left", vertical: "middle" };
        } else {
          cell.alignment = { horizontal: "right", vertical: "middle" };
          if (colNum === 7 || colNum === 8 || colNum === 10 || colNum === 11) {
            cell.numFmt = "#,##0.00";
          }
        }
      });
    });

    // Total Row
    const totQty = parseInt(monthData.totals.qty, 10) || 0;
    const totWeight = parseFloat(monthData.totals.weight) || 0;
    const totTaxable = parseFloat(monthData.totals.taxableAmount) || 0;
    const totGst = parseFloat(monthData.totals.gstAmount) || 0;
    const totInvoiceValue = parseFloat(monthData.totals.invoiceValue) || 0;

    const totalRow = ws.addRow([
      "TOTAL",
      "",
      "",
      "",
      "",
      totQty,
      totWeight,
      totTaxable,
      monthData.totals.gstRate || "18%",
      totGst,
      totInvoiceValue
    ]);
    totalRow.height = 26;
    ws.mergeCells(`A${totalRow.number}:E${totalRow.number}`);

    totalRow.eachCell((cell, colNum) => {
      cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF000000" } };
      cell.border = {
        top: { style: "medium", color: { argb: "FF000000" } },
        bottom: { style: "double", color: { argb: "FF000000" } },
        left: { style: "thin", color: { argb: "FF000000" } },
        right: { style: "thin", color: { argb: "FF000000" } }
      };
      if (colNum <= 5 || colNum === 6 || colNum === 9) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else {
        cell.alignment = { horizontal: "right", vertical: "middle" };
        if (colNum === 7 || colNum === 8 || colNum === 10 || colNum === 11) {
          cell.numFmt = "#,##0.00";
        }
      }
    });

    return ws;
  };

  const exportCurrentMonthXlsx = async (monthData) => {
    if (!monthData) return;
    try {
      setIsExportingExcel(true);
      toast.loading("Generating Styled Excel Spreadsheet...", { id: "monthly-gst-xlsx" });

      const company = COMPANY_PROFILES[selectedCompanyKey] || COMPANY_PROFILES.SRQ;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = company.shortName || "Engineers Parcel";
      workbook.created = new Date();

      buildStyledWorksheet(workbook, monthData, company);

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const fileName = `GST (${selectedCompanyKey}) ${monthData.sheetName}.xlsx`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(`Exported ${fileName}`, { id: "monthly-gst-xlsx" });
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Failed to generate Excel", { id: "monthly-gst-xlsx" });
    } finally {
      setIsExportingExcel(false);
    }
  };

  const exportFullYearWorkbookXlsx = async () => {
    if (!monthlyGstData || !monthlyGstData.months) return;
    try {
      setIsExportingExcel(true);
      toast.loading("Generating 12-Month Financial Year Workbook with Styled Sheets...", { id: "fy-gst-xlsx" });

      const company = COMPANY_PROFILES[selectedCompanyKey] || COMPANY_PROFILES.SRQ;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = company.shortName || "Engineers Parcel";
      workbook.created = new Date();

      monthlyGstData.months.forEach((monthData) => {
        buildStyledWorksheet(workbook, monthData, company);
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const fileName = monthlyGstData.fileName || `GST (${selectedCompanyKey}) APR ${monthlyGstData.startYear}-MAR ${monthlyGstData.endYear} .xlsx`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(`Exported complete workbook: ${fileName}`, { id: "fy-gst-xlsx" });
    } catch (err) {
      console.error("Export FY error:", err);
      toast.error("Failed to generate Full Year Workbook", { id: "fy-gst-xlsx" });
    } finally {
      setIsExportingExcel(false);
    }
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
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleOpenQuotationBuilder()}
            className="bg-amber-600 hover:bg-amber-700 active:scale-95 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 w-fit text-sm"
            title="Create shifting or single item price quote / estimate"
          >
            <Calculator className="h-5 w-5" />
            <span>Quotation Builder</span>
          </button>
          <button
            onClick={handleOpenStandaloneInvoiceBuilder}
            className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2 w-fit text-sm"
            title="Create custom or individual branded invoice with Booking ID lookup"
          >
            <Receipt className="h-5 w-5" />
            <span>Invoice Builder</span>
          </button>
          <button
            onClick={handleOpenMonthlyGstModal}
            className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 w-fit text-sm"
            title="Total Corporate Orders Month-by-Month in Excel format (as attached)"
          >
            <FileSpreadsheet className="h-5 w-5" />
            <span>Monthly GST Report (XLSX)</span>
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-orange-200 flex items-center gap-2 w-fit"
          >
            <Plus className="h-5 w-5" />
            Add New Partner
          </button>
        </div>
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
                onClick={() => handleOpenQuotationBuilder(selectedVendorForFinance)}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-sm"
                title="Generate Price Quotation / Estimate for Shifting or Courier"
              >
                <Calculator className="h-4 w-4" />
                <span>Make Quote</span>
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
          {/* Invoice Builder & Generator Modal */}
          {partnerInvoiceModalOpen && (() => {
            const activeCompany = COMPANY_PROFILES[invoiceConfig.companyKey] || COMPANY_PROFILES.SRQ;
            const rawOrdersTotal = invoiceItems.reduce((sum, o) => sum + (parseFloat(o.amount) || 0), 0);
            const deductions = invoiceConfig.deductPayments ? (parseFloat(invoiceConfig.paidAmount) || 0) : 0;

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

            const finalPayableAmount = Math.max(0, Math.round((grossInvoiceTotal - deductions) * 100) / 100);

            const invoicePeriodLabel = dateFilterType === 'month' 
              ? formatMonthName(financeMonth)
              : dateFilterType === 'custom' && customStartDate
                ? `${customStartDate} to ${customEndDate || customStartDate}`
                : 'Billing Cycle';

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
                        <span>Invoice Builder</span>
                        <span className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 px-2.5 py-0.5 rounded-full font-mono font-bold">
                          {invoiceCustomer.partnerId || (selectedVendorForFinance?.partnerId ? selectedVendorForFinance.partnerId : "CUSTOM")}
                        </span>
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Customizable Branded Invoice &bull; Import by Booking ID &bull; Ready to print, download or send
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
                      disabled={isGeneratingInvoicePdf || invoiceItems.length === 0}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                      title="Download high-resolution PDF directly"
                    >
                      <Download className="h-4 w-4" />
                      <span>{isGeneratingInvoicePdf ? "Generating..." : "Download PDF"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendWhatsApp(finalPayableAmount, invoicePeriodLabel, invoiceItems.length)}
                      disabled={invoiceItems.length === 0}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                      title="Send invoice details to customer via WhatsApp"
                    >
                      <Send className="h-4 w-4" />
                      <span>Send WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyInvoiceSummary(finalPayableAmount, invoicePeriodLabel, invoiceItems.length)}
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
                  <div className="w-full lg:w-[380px] xl:w-[400px] shrink-0 bg-gray-50 dark:bg-[#161616] border-r border-gray-200 dark:border-white/10 p-4 sm:p-5 overflow-y-auto space-y-5 no-print text-xs">
                    
                    {/* Booking Lookup & Import Bar */}
                    <div className="bg-gradient-to-br from-indigo-50 to-orange-50/40 dark:from-indigo-950/20 dark:to-[#1a1a1a] p-3.5 rounded-xl border border-indigo-200/80 dark:border-indigo-800/40 shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
                          <Search className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>Import Order by Booking ID</span>
                        </label>
                        {isLookingUpBooking && (
                          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 animate-pulse font-medium">Fetching details...</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={lookupBookingId}
                          onChange={(e) => setLookupBookingId(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleImportBooking(lookupBookingId)}
                          placeholder="e.g. EP5334, 2026090151..."
                          className="flex-1 px-3 py-2 bg-white dark:bg-[#202020] border border-indigo-200 dark:border-indigo-800/50 rounded-xl font-mono font-bold text-gray-900 dark:text-white placeholder:font-normal placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleImportBooking(lookupBookingId)}
                          disabled={isLookingUpBooking || !lookupBookingId.trim()}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs transition-all shadow-sm flex items-center gap-1.5"
                        >
                          {isLookingUpBooking ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                          <span>Import</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
                        Fetches sender, receiver, route, service, weight and charges automatically. All imported details can be freely edited below.
                      </p>
                    </div>

                    {/* Billed To (Customer / Consignor) Editable Details */}
                    <div className="bg-white dark:bg-[#1f1f1f] p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm space-y-3">
                      <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-2">
                        <span className="font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                          <span>Billed To Details (Live Editable)</span>
                        </span>
                        <span className="text-[10px] text-gray-400">Updates Preview</span>
                      </div>

                      <div>
                        <label className="block text-gray-600 dark:text-gray-400 font-semibold mb-1">
                          Customer / Consignor Name
                        </label>
                        <input
                          type="text"
                          value={invoiceCustomer.name}
                          onChange={(e) => setInvoiceCustomer({ ...invoiceCustomer, name: e.target.value })}
                          placeholder="Full Name (e.g. Rahul Sharma)"
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg font-bold text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-gray-600 dark:text-gray-400 font-semibold mb-1">
                            Company / Org
                          </label>
                          <input
                            type="text"
                            value={invoiceCustomer.company}
                            onChange={(e) => setInvoiceCustomer({ ...invoiceCustomer, company: e.target.value })}
                            placeholder="Company Name"
                            className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-600 dark:text-gray-400 font-semibold mb-1">
                            GSTIN (Optional)
                          </label>
                          <input
                            type="text"
                            value={invoiceCustomer.gstNumber}
                            onChange={(e) => setInvoiceCustomer({ ...invoiceCustomer, gstNumber: e.target.value.toUpperCase() })}
                            placeholder="20AAAAA0000A1Z5"
                            className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg font-mono text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-gray-600 dark:text-gray-400 font-semibold mb-1">
                          Billing Address
                        </label>
                        <input
                          type="text"
                          value={invoiceCustomer.address}
                          onChange={(e) => setInvoiceCustomer({ ...invoiceCustomer, address: e.target.value })}
                          placeholder="Street Address, Area"
                          className="w-full px-3 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-gray-600 dark:text-gray-400 font-semibold mb-1">
                            City
                          </label>
                          <input
                            type="text"
                            value={invoiceCustomer.city}
                            onChange={(e) => setInvoiceCustomer({ ...invoiceCustomer, city: e.target.value })}
                            placeholder="City"
                            className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-600 dark:text-gray-400 font-semibold mb-1">
                            State
                          </label>
                          <input
                            type="text"
                            value={invoiceCustomer.state}
                            onChange={(e) => setInvoiceCustomer({ ...invoiceCustomer, state: e.target.value })}
                            placeholder="State"
                            className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-600 dark:text-gray-400 font-semibold mb-1">
                            Pincode
                          </label>
                          <input
                            type="text"
                            value={invoiceCustomer.pincode}
                            onChange={(e) => setInvoiceCustomer({ ...invoiceCustomer, pincode: e.target.value })}
                            placeholder="826001"
                            className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-gray-600 dark:text-gray-400 font-semibold mb-1">
                            Phone
                          </label>
                          <input
                            type="text"
                            value={invoiceCustomer.phone}
                            onChange={(e) => setInvoiceCustomer({ ...invoiceCustomer, phone: e.target.value })}
                            placeholder="9876543210"
                            className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-600 dark:text-gray-400 font-semibold mb-1">
                            Email
                          </label>
                          <input
                            type="email"
                            value={invoiceCustomer.email}
                            onChange={(e) => setInvoiceCustomer({ ...invoiceCustomer, email: e.target.value })}
                            placeholder="email@example.com"
                            className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-gray-600 dark:text-gray-400 font-semibold mb-1">
                          Place of Supply
                        </label>
                        <input
                          type="text"
                          value={invoiceCustomer.placeOfSupply}
                          onChange={(e) => setInvoiceCustomer({ ...invoiceCustomer, placeOfSupply: e.target.value })}
                          placeholder="Jharkhand (State Code: 20)"
                          className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Invoice Configuration */}
                    <div className="bg-white dark:bg-[#1f1f1f] p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm space-y-3">
                      <div>
                        <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                          Issuing Company & Bank
                        </label>
                        <select
                          value={invoiceConfig.companyKey}
                          onChange={(e) => setInvoiceConfig({ ...invoiceConfig, companyKey: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg font-bold text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                        >
                          <option value="SRQ">SRQ ENGINEERS PARCEL (UCO Bank)</option>
                          <option value="ENGGPARCEL">ENGGPARCEL SERVICES (ICICI Bank)</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                            Invoice No.
                          </label>
                          <input
                            type="text"
                            value={invoiceConfig.invoiceNumber}
                            onChange={(e) => setInvoiceConfig({ ...invoiceConfig, invoiceNumber: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg font-mono font-bold text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                            Invoice Date
                          </label>
                          <input
                            type="date"
                            value={invoiceConfig.invoiceDate}
                            onChange={(e) => setInvoiceConfig({ ...invoiceConfig, invoiceDate: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg font-bold text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                            Due Date
                          </label>
                          <input
                            type="date"
                            value={invoiceConfig.dueDate}
                            onChange={(e) => setInvoiceConfig({ ...invoiceConfig, dueDate: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg font-bold text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                            GST Mode
                          </label>
                          <select
                            value={invoiceConfig.gstType}
                            onChange={(e) => setInvoiceConfig({ ...invoiceConfig, gstType: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg font-bold text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                          >
                            <option value="inclusive">GST 18% Included</option>
                            <option value="extra18">+18% GST Extra</option>
                            <option value="exempt">Bill of Supply (Zero)</option>
                          </select>
                        </div>
                      </div>

                      <div className="p-3 bg-gray-50 dark:bg-[#282828] rounded-xl border border-gray-200 dark:border-white/10 space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-800 dark:text-gray-200">
                          <input
                            type="checkbox"
                            checked={invoiceConfig.deductPayments}
                            onChange={(e) => setInvoiceConfig({ ...invoiceConfig, deductPayments: e.target.checked })}
                            className="h-4 w-4 text-indigo-600 rounded"
                          />
                          <span>Deduct Paid Advances / Payment</span>
                        </label>
                        {invoiceConfig.deductPayments && (
                          <div className="flex items-center gap-2 pl-6">
                            <span className="font-bold text-gray-500">₹</span>
                            <input
                              type="number"
                              value={invoiceConfig.paidAmount}
                              onChange={(e) => setInvoiceConfig({ ...invoiceConfig, paidAmount: parseFloat(e.target.value) || 0 })}
                              placeholder="0.00"
                              className="w-32 px-2.5 py-1 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-white/15 rounded font-bold text-gray-900 dark:text-white font-mono"
                            />
                            <span className="text-[11px] text-gray-400">deducted from net payable</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Consignments Line Items Editor */}
                    <div className="bg-white dark:bg-[#1f1f1f] p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm space-y-3">
                      <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-2">
                        <label className="font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                          <Package className="h-3.5 w-3.5 text-orange-600" />
                          <span>Consignments ({invoiceItems.length})</span>
                        </label>
                        <button
                          type="button"
                          onClick={handleAddItem}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all"
                        >
                          <Plus className="h-3 w-3" /> Add Item
                        </button>
                      </div>

                      <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1">
                        {invoiceItems.map((item, idx) => (
                          <div
                            key={item._id || idx}
                            className="p-3 bg-gray-50 dark:bg-[#252525] rounded-xl border border-gray-200 dark:border-white/10 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-black text-gray-500 text-[10px]">
                                ITEM #{idx + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(idx)}
                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-all"
                                title="Remove consignment"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] text-gray-500 font-semibold mb-0.5">Docket / Tracking</label>
                                <input
                                  type="text"
                                  value={item.docketNo}
                                  onChange={(e) => handleItemChange(idx, "docketNo", e.target.value)}
                                  className="w-full px-2 py-1 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-white/15 rounded text-xs font-mono font-bold text-gray-900 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-gray-500 font-semibold mb-0.5">Date</label>
                                <input
                                  type="date"
                                  value={item.date}
                                  onChange={(e) => handleItemChange(idx, "date", e.target.value)}
                                  className="w-full px-2 py-1 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-white/15 rounded text-xs text-gray-900 dark:text-white"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] text-gray-500 font-semibold mb-0.5">Origin City</label>
                                <input
                                  type="text"
                                  value={item.origin}
                                  onChange={(e) => handleItemChange(idx, "origin", e.target.value)}
                                  className="w-full px-2 py-1 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-white/15 rounded text-xs text-gray-900 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-gray-500 font-semibold mb-0.5">Destination City</label>
                                <input
                                  type="text"
                                  value={item.destination}
                                  onChange={(e) => handleItemChange(idx, "destination", e.target.value)}
                                  className="w-full px-2 py-1 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-white/15 rounded text-xs text-gray-900 dark:text-white"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="block text-[10px] text-gray-500 font-semibold mb-0.5">Service</label>
                                <input
                                  type="text"
                                  value={item.serviceType}
                                  onChange={(e) => handleItemChange(idx, "serviceType", e.target.value)}
                                  className="w-full px-2 py-1 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-white/15 rounded text-xs text-gray-900 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-gray-500 font-semibold mb-0.5">Weight (kg)</label>
                                <input
                                  type="number"
                                  step="0.1"
                                  value={item.weight}
                                  onChange={(e) => handleItemChange(idx, "weight", e.target.value)}
                                  className="w-full px-2 py-1 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-white/15 rounded text-xs font-mono text-gray-900 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-gray-500 font-semibold mb-0.5">Amount (₹)</label>
                                <input
                                  type="number"
                                  value={item.amount}
                                  onChange={(e) => handleItemChange(idx, "amount", e.target.value)}
                                  className="w-full px-2 py-1 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-white/15 rounded text-xs font-mono font-bold text-gray-900 dark:text-white"
                                />
                              </div>
                            </div>
                          </div>
                        ))}

                        {invoiceItems.length === 0 && (
                          <div className="text-center py-6 text-gray-400 italic bg-gray-50 dark:bg-[#252525] rounded-xl border border-dashed border-gray-300 dark:border-white/10">
                            No consignments added yet.<br />
                            <span className="text-[11px] text-gray-500">Import a Booking ID above or click "+ Add Item"</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Terms & Notes */}
                    <div className="bg-white dark:bg-[#1f1f1f] p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm space-y-1.5">
                      <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Terms & Notes
                      </label>
                      <textarea
                        rows={2}
                        value={invoiceConfig.notes}
                        onChange={(e) => setInvoiceConfig({ ...invoiceConfig, notes: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                        placeholder="Invoice terms..."
                      />
                    </div>
                  </div>

                  {/* Right Live A4 Sheet Preview Canvas */}
                  <div className="flex-1 overflow-x-auto overflow-y-auto p-3 sm:p-6 bg-gray-200 dark:bg-[#0d0d0d] min-w-0">
                    <div
                      id="partner-invoice-printable"
                      className="bg-white text-gray-900 shadow-2xl rounded-2xl w-full max-w-[800px] p-6 sm:p-8 border border-gray-300 mx-auto my-auto min-w-0"
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
                            <p className="text-gray-500">Date: <span className="font-bold text-gray-900">{invoiceConfig.invoiceDate ? new Date(invoiceConfig.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : "-"}</span></p>
                            <p className="text-gray-500">Period: <span className="font-bold text-orange-700">{invoicePeriodLabel}</span></p>
                            <p className="text-gray-500">Due Date: <span className="font-bold text-red-600">{invoiceConfig.dueDate ? new Date(invoiceConfig.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : "-"}</span></p>
                          </div>
                        </div>
                      </div>

                      {/* Billed To Customer / Partner & Summary Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6 text-xs">
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">
                            Billed To {invoiceCustomer.company ? "(Consignor / Corporate)" : "(Client / Consignor)"}
                          </p>
                          <h2 className="text-base font-black text-gray-950">
                            {invoiceCustomer.name || "Customer / Consignor Name"}
                          </h2>
                          {invoiceCustomer.company && (
                            <p className="text-xs font-bold text-gray-700 mt-0.5">{invoiceCustomer.company}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {invoiceCustomer.partnerId && (
                              <span className="text-[11px] font-mono font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded">
                                Partner: {invoiceCustomer.partnerId}
                              </span>
                            )}
                            {invoiceCustomer.gstNumber ? (
                              <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                                GSTIN: {invoiceCustomer.gstNumber}
                              </span>
                            ) : (
                              <span className="text-[11px] text-gray-500 italic">Unregistered Consignor</span>
                            )}
                          </div>
                          <p className="text-gray-700 mt-2 leading-relaxed">
                            {[invoiceCustomer.address, invoiceCustomer.address2, invoiceCustomer.city, invoiceCustomer.state].filter(Boolean).join(", ")}
                            {invoiceCustomer.pincode ? ` - ${invoiceCustomer.pincode}` : ""}
                          </p>
                          <div className="mt-2 text-gray-600 flex flex-wrap gap-x-3">
                            {invoiceCustomer.phone && <span>Phone: <b>{invoiceCustomer.phone}</b></span>}
                            {invoiceCustomer.email && <span>Email: <b>{invoiceCustomer.email}</b></span>}
                          </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col justify-between">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">
                              Payment Summary
                            </p>
                            <div className="flex justify-between items-center py-1 border-b border-gray-200">
                              <span className="text-gray-600">Total Consignments:</span>
                              <span className="font-bold text-gray-900">{invoiceItems.length} items</span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-gray-200">
                              <span className="text-gray-600">Payment Status:</span>
                              <span className={`font-bold uppercase ${finalPayableAmount === 0 ? "text-green-600" : "text-red-600"}`}>
                                {finalPayableAmount === 0 ? "Paid in Full" : "Pending Payment"}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-1">
                              <span className="text-gray-600">Place of Supply:</span>
                              <span className="font-bold text-gray-900">{invoiceCustomer.placeOfSupply || "Jharkhand (State Code: 20)"}</span>
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
                            {invoiceItems.map((item, idx) => (
                              <tr key={item._id || idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                                <td className="py-2 px-3 text-center text-gray-400 font-mono">{idx + 1}</td>
                                <td className="py-2 px-3 text-gray-600 whitespace-nowrap">
                                  {item.date ? new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : "-"}
                                </td>
                                <td className="py-2 px-3 font-mono font-bold text-gray-900">
                                  {item.docketNo}
                                </td>
                                <td className="py-2 px-3 text-gray-700 font-medium">
                                  {item.origin || "Origin"} ➔ {item.destination || "Destination"}
                                </td>
                                <td className="py-2 px-3 text-center text-gray-600">
                                  {item.serviceType || "Standard"} &bull; {item.weight || 1} kg
                                </td>
                                <td className="py-2 px-3 text-right font-black text-gray-900">
                                  ₹{(parseFloat(item.amount) || 0).toLocaleString('en-IN')}
                                </td>
                              </tr>
                            ))}
                            {invoiceItems.length === 0 && (
                              <tr>
                                <td colSpan="6" className="py-8 text-center text-gray-400 italic">
                                  No consignments added to this invoice yet.
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

          {/* Quotation / Price Estimate Builder Modal */}
          {quotationModalOpen && (() => {
            const activeCompany = COMPANY_PROFILES[quoteConfig.companyKey] || COMPANY_PROFILES.SRQ;
            const itemsSubtotal = quoteItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
            const packingCharge = parseFloat(quoteConfig.packingCharge) || 0;
            const loadingCharge = parseFloat(quoteConfig.loadingCharge) || 0;
            const unloadingCharge = parseFloat(quoteConfig.unloadingCharge) || 0;
            const otherCharges = parseFloat(quoteConfig.otherCharges) || 0;
            const insuranceGoodsVal = parseFloat(quoteConfig.insuranceGoodsValue) || 0;
            const insuranceRate = parseFloat(quoteConfig.insurancePercent) || 0;
            const insuranceCharge = (insuranceGoodsVal > 0 && insuranceRate > 0) ? Math.round((insuranceGoodsVal * (insuranceRate / 100)) * 100) / 100 : 0;
            const discountAmount = parseFloat(quoteConfig.discountAmount) || 0;

            const netTaxable = Math.max(0, itemsSubtotal + packingCharge + loadingCharge + unloadingCharge + otherCharges + insuranceCharge - discountAmount);
            const gstAmount = quoteConfig.gstRate > 0 ? Math.round((netTaxable * (parseFloat(quoteConfig.gstRate) / 100)) * 100) / 100 : 0;
            const quoteGrandTotal = Math.round((netTaxable + gstAmount) * 100) / 100;
            const totalArticlesCount = quoteItems.reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);

            const filteredPresets = SHIFTING_PRESETS.filter(p => {
              const matchCat = quotePresetFilter === "All" || p.category === quotePresetFilter;
              const matchSearch = !quotePresetSearch.trim() || p.name.toLowerCase().includes(quotePresetSearch.toLowerCase());
              return matchCat && matchSearch;
            });

            return (
              <div className="fixed inset-0 z-[85] bg-black/75 backdrop-blur-sm flex flex-col justify-between overflow-hidden animate-in fade-in duration-200">
                <style>{`
                  @media print {
                    body * {
                      visibility: hidden !important;
                    }
                    #quotation-printable, #quotation-printable * {
                      visibility: visible !important;
                    }
                    #quotation-printable {
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
                        <span>Quotation Builder</span>
                        <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-2.5 py-0.5 rounded-full font-bold">
                          {quoteCustomer.moveScope || "Custom Estimate"}
                        </span>
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Official Relocation & Cargo Quotation &bull; Ready to print, download or send
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handlePrintQuotation}
                      className="px-3.5 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                      title="Print quotation or save as PDF"
                    >
                      <Printer className="h-4 w-4" />
                      <span>Print / PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadQuotationPDF}
                      disabled={isGeneratingQuotationPdf || quoteItems.length === 0}
                      className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                      title="Download high-resolution PDF directly"
                    >
                      <Download className="h-4 w-4" />
                      <span>{isGeneratingQuotationPdf ? "Generating..." : "Download PDF"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendQuoteWhatsApp(quoteGrandTotal, itemsSubtotal, packingCharge, loadingCharge, unloadingCharge, discountAmount, gstAmount)}
                      disabled={quoteItems.length === 0}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                      title="Send quotation breakdown to customer via WhatsApp"
                    >
                      <Send className="h-4 w-4" />
                      <span>Send WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyQuoteSummary(quoteGrandTotal)}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                      title="Copy quote summary to clipboard"
                    >
                      <Copy className="h-4 w-4" />
                      <span className="hidden sm:inline">Copy Text</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setQuotationModalOpen(false)}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-all ml-1"
                      title="Close Modal"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                {/* Main Body: Controls Drawer + Live Paper Canvas */}
                <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                  {/* Left Controls Drawer */}
                  <div className="w-full lg:w-[380px] xl:w-[400px] shrink-0 bg-gray-50 dark:bg-[#161616] border-r border-gray-200 dark:border-white/10 p-4 sm:p-5 overflow-y-auto space-y-4 no-print text-xs">
                    
                    {/* Booking ID Lookup Bar */}
                    <div className="bg-white dark:bg-[#1f1f1f] p-3.5 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                          <Search className="h-3.5 w-3.5 text-indigo-600" />
                          <span>Import From Booking ID (Optional)</span>
                        </label>
                        <span className="text-[10px] text-gray-400">Auto-fill details</span>
                      </div>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                          <input
                            type="text"
                            value={quoteLookupBookingId}
                            onChange={(e) => setQuoteLookupBookingId(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleQuoteImportBooking()}
                            placeholder="e.g. EP5334 or Tracking ID..."
                            className="w-full pl-8 pr-2.5 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg text-xs font-mono text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-amber-500 uppercase"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleQuoteImportBooking()}
                          disabled={isLookingUpQuoteBooking}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                          title="Import customer and shipment data from existing booking"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>{isLookingUpQuoteBooking ? "Loading..." : "Import"}</span>
                        </button>
                      </div>
                    </div>

                    {/* Quick Move Bundles / Presets */}
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-950/20 dark:to-[#1a1a1a] p-3.5 rounded-xl border border-amber-200 dark:border-amber-800/40 shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-amber-950 dark:text-amber-200 uppercase tracking-wider flex items-center gap-1.5">
                          <Truck className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                          <span>Quick Move Bundles (1-Click Setup)</span>
                        </label>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleApplyMoveBundle("1BHK")}
                          className="px-2.5 py-1.5 bg-white dark:bg-[#202020] hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800/50 rounded-lg font-bold text-amber-900 dark:text-amber-200 transition-all shadow-sm"
                        >
                          1 BHK Shifting
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyMoveBundle("2BHK")}
                          className="px-2.5 py-1.5 bg-white dark:bg-[#202020] hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800/50 rounded-lg font-bold text-amber-900 dark:text-amber-200 transition-all shadow-sm"
                        >
                          2 BHK Shifting
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyMoveBundle("3BHK")}
                          className="px-2.5 py-1.5 bg-white dark:bg-[#202020] hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800/50 rounded-lg font-bold text-amber-900 dark:text-amber-200 transition-all shadow-sm"
                        >
                          3 BHK Shifting
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyMoveBundle("SINGLE_ITEM")}
                          className="px-2.5 py-1.5 bg-white dark:bg-[#202020] hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800/50 rounded-lg font-bold text-amber-900 dark:text-amber-200 transition-all shadow-sm"
                        >
                          Single Parcel / Item
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyMoveBundle("VEHICLE")}
                          className="px-2.5 py-1.5 bg-white dark:bg-[#202020] hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800/50 rounded-lg font-bold text-amber-900 dark:text-amber-200 transition-all shadow-sm"
                        >
                          Vehicle Transport
                        </button>
                      </div>
                    </div>

                    {/* Shifting Item Catalog Picker */}
                    <div className="bg-white dark:bg-[#1f1f1f] p-3.5 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm space-y-2.5">
                      <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-2">
                        <span className="font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                          <Package className="h-3.5 w-3.5 text-orange-600" />
                          <span>Shifting Catalog Presets</span>
                        </span>
                        <span className="text-[10px] text-gray-400">Click to add</span>
                      </div>

                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                          <input
                            type="text"
                            value={quotePresetSearch}
                            onChange={(e) => setQuotePresetSearch(e.target.value)}
                            placeholder="Search shifting items..."
                            className="w-full pl-8 pr-2.5 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg text-xs text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <select
                          value={quotePresetFilter}
                          onChange={(e) => setQuotePresetFilter(e.target.value)}
                          className="px-2.5 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-200 outline-none"
                        >
                          <option value="All">All Categories</option>
                          <option value="Furniture">Furniture</option>
                          <option value="Appliances">Appliances</option>
                          <option value="Boxes">Boxes</option>
                          <option value="Vehicles">Vehicles</option>
                          <option value="Services">Services</option>
                        </select>
                      </div>

                      <div className="max-h-36 overflow-y-auto space-y-1 pr-1 divide-y divide-gray-100 dark:divide-white/5">
                        {filteredPresets.map((preset, idx) => (
                          <div
                            key={idx}
                            onClick={() => handleQuickAddPreset(preset)}
                            className="flex items-center justify-between py-1.5 px-2 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded cursor-pointer transition-all group"
                          >
                            <div className="flex items-center gap-2">
                              <Plus className="h-3.5 w-3.5 text-amber-600 group-hover:scale-125 transition-transform" />
                              <span className="text-gray-800 dark:text-gray-200 font-medium">{preset.name}</span>
                            </div>
                            <span className="font-mono font-bold text-gray-600 dark:text-gray-400">
                              ₹{preset.defaultRate.toLocaleString('en-IN')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Customer & Route Details */}
                    <div className="bg-white dark:bg-[#1f1f1f] p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm space-y-3">
                      <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-2">
                        <span className="font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider text-[11px]">
                          Customer & Route Details
                        </span>
                        <span className="text-[10px] text-gray-400">Live Preview</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-gray-600 dark:text-gray-400 font-semibold mb-1">
                            Customer Name
                          </label>
                          <input
                            type="text"
                            value={quoteCustomer.name}
                            onChange={(e) => setQuoteCustomer({ ...quoteCustomer, name: e.target.value })}
                            placeholder="Full Name"
                            className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg font-bold text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-600 dark:text-gray-400 font-semibold mb-1">
                            Phone / WhatsApp
                          </label>
                          <input
                            type="text"
                            value={quoteCustomer.phone}
                            onChange={(e) => setQuoteCustomer({ ...quoteCustomer, phone: e.target.value })}
                            placeholder="Mobile No."
                            className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg font-mono text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-gray-600 dark:text-gray-400 font-semibold mb-1">
                            Email (Optional)
                          </label>
                          <input
                            type="email"
                            value={quoteCustomer.email}
                            onChange={(e) => setQuoteCustomer({ ...quoteCustomer, email: e.target.value })}
                            placeholder="customer@email.com"
                            className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-600 dark:text-gray-400 font-semibold mb-1">
                            Move Scope / Size
                          </label>
                          <input
                            type="text"
                            value={quoteCustomer.moveScope}
                            onChange={(e) => setQuoteCustomer({ ...quoteCustomer, moveScope: e.target.value })}
                            placeholder="e.g. 2 BHK, Single Item, Villa"
                            className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg font-bold text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>

                      {/* Origin Details */}
                      <div className="p-2.5 bg-gray-50 dark:bg-[#282828] rounded-xl border border-gray-200 dark:border-white/10 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-700 dark:text-gray-300 text-[11px] uppercase tracking-wider">Pickup / Origin</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-1">
                            <input
                              type="text"
                              value={quoteCustomer.originCity}
                              onChange={(e) => setQuoteCustomer({ ...quoteCustomer, originCity: e.target.value })}
                              placeholder="City"
                              className="w-full px-2 py-1 bg-white dark:bg-[#1f1f1f] border border-gray-300 dark:border-white/15 rounded text-xs font-bold"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              value={quoteCustomer.originFloor}
                              onChange={(e) => setQuoteCustomer({ ...quoteCustomer, originFloor: e.target.value })}
                              placeholder="Floor"
                              className="w-full px-2 py-1 bg-white dark:bg-[#1f1f1f] border border-gray-300 dark:border-white/15 rounded text-xs"
                            />
                          </div>
                          <div>
                            <select
                              value={quoteCustomer.originLift}
                              onChange={(e) => setQuoteCustomer({ ...quoteCustomer, originLift: e.target.value })}
                              className="w-full px-2 py-1 bg-white dark:bg-[#1f1f1f] border border-gray-300 dark:border-white/15 rounded text-xs"
                            >
                              <option value="Yes">Lift: Yes</option>
                              <option value="No">Lift: No</option>
                            </select>
                          </div>
                        </div>
                        <input
                          type="text"
                          value={quoteCustomer.originAddress}
                          onChange={(e) => setQuoteCustomer({ ...quoteCustomer, originAddress: e.target.value })}
                          placeholder="Complete pickup street address..."
                          className="w-full px-2 py-1 bg-white dark:bg-[#1f1f1f] border border-gray-300 dark:border-white/15 rounded text-xs text-gray-800 dark:text-gray-200"
                        />
                      </div>

                      {/* Destination Details */}
                      <div className="p-2.5 bg-gray-50 dark:bg-[#282828] rounded-xl border border-gray-200 dark:border-white/10 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-700 dark:text-gray-300 text-[11px] uppercase tracking-wider">Delivery / Destination</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-1">
                            <input
                              type="text"
                              value={quoteCustomer.destinationCity}
                              onChange={(e) => setQuoteCustomer({ ...quoteCustomer, destinationCity: e.target.value })}
                              placeholder="City"
                              className="w-full px-2 py-1 bg-white dark:bg-[#1f1f1f] border border-gray-300 dark:border-white/15 rounded text-xs font-bold"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              value={quoteCustomer.destinationFloor}
                              onChange={(e) => setQuoteCustomer({ ...quoteCustomer, destinationFloor: e.target.value })}
                              placeholder="Floor"
                              className="w-full px-2 py-1 bg-white dark:bg-[#1f1f1f] border border-gray-300 dark:border-white/15 rounded text-xs"
                            />
                          </div>
                          <div>
                            <select
                              value={quoteCustomer.destinationLift}
                              onChange={(e) => setQuoteCustomer({ ...quoteCustomer, destinationLift: e.target.value })}
                              className="w-full px-2 py-1 bg-white dark:bg-[#1f1f1f] border border-gray-300 dark:border-white/15 rounded text-xs"
                            >
                              <option value="Yes">Lift: Yes</option>
                              <option value="No">Lift: No</option>
                            </select>
                          </div>
                        </div>
                        <input
                          type="text"
                          value={quoteCustomer.destinationAddress}
                          onChange={(e) => setQuoteCustomer({ ...quoteCustomer, destinationAddress: e.target.value })}
                          placeholder="Complete delivery street address..."
                          className="w-full px-2 py-1 bg-white dark:bg-[#1f1f1f] border border-gray-300 dark:border-white/15 rounded text-xs text-gray-800 dark:text-gray-200"
                        />
                      </div>
                    </div>

                    {/* Quote Configuration */}
                    <div className="bg-white dark:bg-[#1f1f1f] p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm space-y-3">
                      <div>
                        <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                          Issuing Entity & Bank
                        </label>
                        <select
                          value={quoteConfig.companyKey}
                          onChange={(e) => setQuoteConfig({ ...quoteConfig, companyKey: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg font-bold text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                        >
                          <option value="SRQ">SRQ ENGINEERS PARCEL (UCO Bank)</option>
                          <option value="ENGGPARCEL">ENGGPARCEL SERVICES (ICICI Bank)</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                            Quote No.
                          </label>
                          <input
                            type="text"
                            value={quoteConfig.quotationNumber}
                            onChange={(e) => setQuoteConfig({ ...quoteConfig, quotationNumber: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg font-mono font-bold text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                            Service Type
                          </label>
                          <select
                            value={quoteConfig.serviceType}
                            onChange={(e) => setQuoteConfig({ ...quoteConfig, serviceType: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg font-bold text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-amber-500"
                          >
                            <option value="House Shifting (Packers & Movers)">House Shifting</option>
                            <option value="Office Relocation">Office Relocation</option>
                            <option value="Vehicle Transportation">Vehicle Transport</option>
                            <option value="Parcel / Courier Shipment">Parcel / Courier</option>
                            <option value="Custom Freight">Custom Freight</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                            Quote Date
                          </label>
                          <input
                            type="date"
                            value={quoteConfig.quoteDate}
                            onChange={(e) => setQuoteConfig({ ...quoteConfig, quoteDate: e.target.value })}
                            className="w-full px-2 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg font-bold text-gray-800 dark:text-gray-200 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                            Move Date
                          </label>
                          <input
                            type="date"
                            value={quoteConfig.moveDate}
                            onChange={(e) => setQuoteConfig({ ...quoteConfig, moveDate: e.target.value })}
                            className="w-full px-2 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg font-bold text-gray-800 dark:text-gray-200 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                            Valid Until
                          </label>
                          <input
                            type="date"
                            value={quoteConfig.validUntil}
                            onChange={(e) => setQuoteConfig({ ...quoteConfig, validUntil: e.target.value })}
                            className="w-full px-2 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg font-bold text-gray-800 dark:text-gray-200 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Itemized Inventory Table in Drawer */}
                    <div className="bg-white dark:bg-[#1f1f1f] p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm space-y-3">
                      <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-2">
                        <label className="font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                          <Package className="h-3.5 w-3.5 text-amber-600" />
                          <span>Inventory Items ({quoteItems.length})</span>
                        </label>
                        <button
                          type="button"
                          onClick={handleAddQuoteItem}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all"
                        >
                          <Plus className="h-3 w-3" /> Add Item
                        </button>
                      </div>

                      <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                        {quoteItems.map((item, idx) => (
                          <div
                            key={item.id || idx}
                            className="p-2.5 bg-gray-50 dark:bg-[#252525] rounded-xl border border-gray-200 dark:border-white/10 space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-[10px] text-gray-400 font-bold">#{idx + 1}</span>
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => handleQuoteItemChange(idx, "name", e.target.value)}
                                placeholder="Item description..."
                                className="flex-1 px-2 py-1 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-white/15 rounded text-xs font-bold text-gray-900 dark:text-white"
                              />
                              <button
                                type="button"
                                onClick={() => handleDeleteQuoteItem(idx)}
                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-all"
                                title="Remove item"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            <div className="grid grid-cols-4 gap-1.5 text-[11px]">
                              <div>
                                <label className="block text-[10px] text-gray-500 font-semibold">Category</label>
                                <input
                                  type="text"
                                  value={item.category}
                                  onChange={(e) => handleQuoteItemChange(idx, "category", e.target.value)}
                                  className="w-full px-1.5 py-0.5 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-white/15 rounded text-xs"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-gray-500 font-semibold">Qty</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.qty}
                                  onChange={(e) => handleQuoteItemChange(idx, "qty", e.target.value)}
                                  className="w-full px-1.5 py-0.5 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-white/15 rounded text-xs font-mono font-bold"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-gray-500 font-semibold">Rate (₹)</label>
                                <input
                                  type="number"
                                  value={item.rate}
                                  onChange={(e) => handleQuoteItemChange(idx, "rate", e.target.value)}
                                  className="w-full px-1.5 py-0.5 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-white/15 rounded text-xs font-mono font-bold"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-gray-500 font-semibold">Amount (₹)</label>
                                <input
                                  type="number"
                                  value={item.amount}
                                  onChange={(e) => handleQuoteItemChange(idx, "amount", e.target.value)}
                                  className="w-full px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800/40 rounded text-xs font-mono font-black text-amber-950 dark:text-amber-200"
                                />
                              </div>
                            </div>
                          </div>
                        ))}

                        {quoteItems.length === 0 && (
                          <div className="text-center py-6 text-gray-400 italic bg-gray-50 dark:bg-[#252525] rounded-xl border border-dashed border-gray-300 dark:border-white/10">
                            No items added yet. Click a bundle above or "+ Add Item".
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Additional Charges, Insurance, Discount, GST */}
                    <div className="bg-white dark:bg-[#1f1f1f] p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm space-y-3">
                      <span className="font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider text-[11px] block border-b border-gray-100 dark:border-white/5 pb-2">
                        Charges, Insurance & Tax Breakdown
                      </span>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-bold text-gray-600 dark:text-gray-400 mb-1">
                            Packing & Material (₹)
                          </label>
                          <input
                            type="number"
                            value={quoteConfig.packingCharge}
                            onChange={(e) => setQuoteConfig({ ...quoteConfig, packingCharge: e.target.value })}
                            placeholder="0"
                            className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg font-mono font-bold text-gray-800 dark:text-gray-200 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-gray-600 dark:text-gray-400 mb-1">
                            Loading Labor (₹)
                          </label>
                          <input
                            type="number"
                            value={quoteConfig.loadingCharge}
                            onChange={(e) => setQuoteConfig({ ...quoteConfig, loadingCharge: e.target.value })}
                            placeholder="0"
                            className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg font-mono font-bold text-gray-800 dark:text-gray-200 outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-bold text-gray-600 dark:text-gray-400 mb-1">
                            Unloading Labor (₹)
                          </label>
                          <input
                            type="number"
                            value={quoteConfig.unloadingCharge}
                            onChange={(e) => setQuoteConfig({ ...quoteConfig, unloadingCharge: e.target.value })}
                            placeholder="0"
                            className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg font-mono font-bold text-gray-800 dark:text-gray-200 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-gray-600 dark:text-gray-400 mb-1">
                            Other / Toll Surcharge (₹)
                          </label>
                          <input
                            type="number"
                            value={quoteConfig.otherCharges}
                            onChange={(e) => setQuoteConfig({ ...quoteConfig, otherCharges: e.target.value })}
                            placeholder="0"
                            className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg font-mono font-bold text-gray-800 dark:text-gray-200 outline-none"
                          />
                        </div>
                      </div>

                      <div className="p-2.5 bg-gray-50 dark:bg-[#282828] rounded-xl border border-gray-200 dark:border-white/10 space-y-1.5">
                        <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[10px]">
                          Transit Insurance & Risk Cover
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] text-gray-400 block mb-0.5">Goods Declared Value (₹)</span>
                            <input
                              type="number"
                              value={quoteConfig.insuranceGoodsValue}
                              onChange={(e) => setQuoteConfig({ ...quoteConfig, insuranceGoodsValue: e.target.value })}
                              placeholder="e.g. 100000"
                              className="w-full px-2 py-1 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-white/15 rounded text-xs font-mono font-bold"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 block mb-0.5">Insurance Rate (%)</span>
                            <input
                              type="number"
                              step="0.5"
                              value={quoteConfig.insurancePercent}
                              onChange={(e) => setQuoteConfig({ ...quoteConfig, insurancePercent: e.target.value })}
                              placeholder="e.g. 1.5%"
                              className="w-full px-2 py-1 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-white/15 rounded text-xs font-mono font-bold"
                            />
                          </div>
                        </div>
                        {insuranceCharge > 0 && (
                          <div className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
                            Insurance Premium: ₹{insuranceCharge.toLocaleString('en-IN')}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-bold text-gray-600 dark:text-gray-400 mb-1">
                            Special Discount (₹)
                          </label>
                          <input
                            type="number"
                            value={quoteConfig.discountAmount}
                            onChange={(e) => setQuoteConfig({ ...quoteConfig, discountAmount: e.target.value })}
                            placeholder="0"
                            className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg font-mono font-bold text-emerald-700 dark:text-emerald-400 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-gray-600 dark:text-gray-400 mb-1">
                            GST Rate
                          </label>
                          <select
                            value={quoteConfig.gstRate}
                            onChange={(e) => setQuoteConfig({ ...quoteConfig, gstRate: parseFloat(e.target.value) || 0 })}
                            className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg font-bold text-gray-800 dark:text-gray-200 outline-none"
                          >
                            <option value={18}>18% (Comprehensive Relocation)</option>
                            <option value={5}>5% (GTA Transport Service)</option>
                            <option value={0}>0% (Tax Exempt / Nil)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Terms & Notes */}
                    <div className="bg-white dark:bg-[#1f1f1f] p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm space-y-1.5">
                      <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Terms & Conditions / Guidelines
                      </label>
                      <textarea
                        rows={3}
                        value={quoteConfig.terms}
                        onChange={(e) => setQuoteConfig({ ...quoteConfig, terms: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                        placeholder="Quotation terms..."
                      />
                    </div>
                  </div>

                  {/* Right Live A4 Sheet Preview Canvas */}
                  <div className="flex-1 overflow-x-auto overflow-y-auto p-3 sm:p-6 bg-gray-200 dark:bg-[#0d0d0d] min-w-0">
                    <div
                      id="quotation-printable"
                      className="bg-white text-gray-900 shadow-2xl rounded-2xl w-full max-w-[800px] p-6 sm:p-8 border border-gray-300 mx-auto my-auto min-w-0"
                      style={{ minHeight: "1050px" }}
                    >
                      {/* Header with Company Logo */}
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-5 pb-6 border-b-2 border-amber-600">
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
                            <p className="text-xs font-bold text-amber-600 tracking-wide mt-0.5">
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
                          <span className="inline-block px-3.5 py-1 bg-amber-600 text-white font-black text-xs uppercase tracking-widest rounded-lg shadow-sm">
                            PRICE QUOTATION / ESTIMATE
                          </span>
                          <div className="mt-3 text-xs space-y-1">
                            <p className="text-gray-500">Quote No: <span className="font-mono font-bold text-gray-900">{quoteConfig.quotationNumber}</span></p>
                            <p className="text-gray-500">Date: <span className="font-bold text-gray-900">{quoteConfig.quoteDate ? new Date(quoteConfig.quoteDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : "-"}</span></p>
                            <p className="text-gray-500">Est. Moving Date: <span className="font-bold text-amber-700">{quoteConfig.moveDate ? new Date(quoteConfig.moveDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : "-"}</span></p>
                            <p className="text-gray-500">Valid Till: <span className="font-bold text-red-600">{quoteConfig.validUntil ? new Date(quoteConfig.validUntil).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : "-"}</span></p>
                          </div>
                        </div>
                      </div>

                      {/* Prepared For & Moving Route Summary */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6 text-xs">
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">
                            Quotation Prepared For
                          </p>
                          <h2 className="text-base font-black text-gray-950">
                            {quoteCustomer.name || "Valued Client"}
                          </h2>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                              {quoteConfig.serviceType}
                            </span>
                            <span className="text-[11px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
                              {quoteCustomer.moveScope}
                            </span>
                          </div>
                          <div className="mt-2.5 text-gray-600 space-y-1">
                            {quoteCustomer.phone && <p>Phone / WhatsApp: <b className="text-gray-900">{quoteCustomer.phone}</b></p>}
                            {quoteCustomer.email && <p>Email: <b>{quoteCustomer.email}</b></p>}
                          </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col justify-between">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">
                              Relocation Route & Specifications
                            </p>
                            <div className="bg-white p-2.5 rounded-lg border border-gray-200 space-y-1 mb-2">
                              <div className="flex items-center justify-between font-bold text-gray-900">
                                <span>{quoteCustomer.originCity || "Origin"}</span>
                                <span className="text-amber-600">➔</span>
                                <span>{quoteCustomer.destinationCity || "Destination"}</span>
                              </div>
                              <div className="flex justify-between text-[11px] text-gray-500">
                                <span>Floor: {quoteCustomer.originFloor} (Lift: {quoteCustomer.originLift})</span>
                                <span>Floor: {quoteCustomer.destinationFloor} (Lift: {quoteCustomer.destinationLift})</span>
                              </div>
                            </div>
                            <div className="text-[11px] text-gray-600 space-y-0.5">
                              {quoteCustomer.originAddress && <p className="truncate">From: {quoteCustomer.originAddress}</p>}
                              {quoteCustomer.destinationAddress && <p className="truncate">To: {quoteCustomer.destinationAddress}</p>}
                            </div>
                          </div>
                          <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between items-center text-[11px]">
                            <span className="text-gray-600 font-medium">Articles Count:</span>
                            <span className="font-black text-gray-900">{quoteItems.length} items ({totalArticlesCount} total articles)</span>
                          </div>
                        </div>
                      </div>

                      {/* Itemized Articles Table */}
                      <div className="mb-6 overflow-hidden rounded-xl border border-gray-200">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                            <tr>
                              <th className="py-2.5 px-3 text-center w-10">#</th>
                              <th className="py-2.5 px-3">Article / Item Description</th>
                              <th className="py-2.5 px-3">Category</th>
                              <th className="py-2.5 px-3 text-center">Qty / Unit</th>
                              <th className="py-2.5 px-3 text-right">Unit Rate (₹)</th>
                              <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {quoteItems.map((item, idx) => (
                              <tr key={item.id || idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                                <td className="py-2 px-3 text-center text-gray-400 font-mono">{idx + 1}</td>
                                <td className="py-2 px-3 font-bold text-gray-900">
                                  {item.name}
                                </td>
                                <td className="py-2 px-3 text-gray-600">
                                  <span className="inline-block px-2 py-0.5 bg-gray-100 rounded text-[10px] font-medium text-gray-700">
                                    {item.category || "General"}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-center text-gray-800 font-mono font-bold">
                                  {item.qty} {item.unit || "Nos"}
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-gray-700">
                                  ₹{(parseFloat(item.rate) || 0).toLocaleString('en-IN')}
                                </td>
                                <td className="py-2 px-3 text-right font-black text-gray-900 font-mono">
                                  ₹{(parseFloat(item.amount) || 0).toLocaleString('en-IN')}
                                </td>
                              </tr>
                            ))}
                            {quoteItems.length === 0 && (
                              <tr>
                                <td colSpan="6" className="py-8 text-center text-gray-400 italic">
                                  No items included in quotation yet.
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
                          <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">
                            Booking Advance & Bank Payment Details
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

                        {/* Charges Breakdown Table */}
                        <div className="w-full sm:w-1/2 space-y-2">
                          <div className="space-y-1.5 text-right">
                            <div className="flex justify-between text-gray-600">
                              <span>Inventory Articles Subtotal:</span>
                              <span className="font-bold text-gray-900">₹{itemsSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>

                            {packingCharge > 0 && (
                              <div className="flex justify-between text-gray-600">
                                <span>Packaging Material & Labor:</span>
                                <span className="font-bold text-gray-900">₹{packingCharge.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              </div>
                            )}

                            {loadingCharge > 0 && (
                              <div className="flex justify-between text-gray-600">
                                <span>Loading Labor Charges (Origin):</span>
                                <span className="font-bold text-gray-900">₹{loadingCharge.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              </div>
                            )}

                            {unloadingCharge > 0 && (
                              <div className="flex justify-between text-gray-600">
                                <span>Unloading & Placement Labor:</span>
                                <span className="font-bold text-gray-900">₹{unloadingCharge.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              </div>
                            )}

                            {insuranceCharge > 0 && (
                              <div className="flex justify-between text-gray-600">
                                <span>Transit Risk Insurance Cover ({quoteConfig.insurancePercent}%):</span>
                                <span className="font-bold text-gray-900">₹{insuranceCharge.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              </div>
                            )}

                            {otherCharges > 0 && (
                              <div className="flex justify-between text-gray-600">
                                <span>Toll / Floor Handling / Surcharge:</span>
                                <span className="font-bold text-gray-900">₹{otherCharges.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              </div>
                            )}

                            {discountAmount > 0 && (
                              <div className="flex justify-between text-emerald-700 font-bold">
                                <span>Special Discount:</span>
                                <span>-₹{discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              </div>
                            )}

                            <div className="flex justify-between text-gray-800 font-bold pt-1 border-t border-gray-200">
                              <span>Net Taxable Value:</span>
                              <span>₹{netTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>

                            {gstAmount > 0 && (
                              <div className="flex justify-between text-gray-600">
                                <span>GST ({quoteConfig.gstRate}%):</span>
                                <span className="font-bold text-gray-900">₹{gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              </div>
                            )}

                            <div className="flex justify-between items-center text-sm font-black text-gray-950 p-2.5 bg-amber-50 rounded-xl border border-amber-200 mt-2">
                              <span>Estimated Total Cost:</span>
                              <span className="text-lg text-amber-950">
                                ₹{quoteGrandTotal.toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>

                          <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200 text-left">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                              Amount in Words:
                            </span>
                            <span className="font-bold text-gray-800 italic">
                              {numberToWordsIndian(quoteGrandTotal)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Terms & Authorized Signatory Footer */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-gray-200 text-xs">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">
                            Terms & Conditions / Guidelines:
                          </p>
                          <p className="text-[11px] text-gray-600 leading-relaxed whitespace-pre-line">
                            {quoteConfig.terms || "1. 50% advance upon packing commencement, balance 50% upon safe door delivery. 2. Quotation valid for 15 days from issue date. 3. Subject to Dhanbad jurisdiction."}
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
                        This is an official price quotation generated by Engineers Parcel. To confirm booking, reply with approval or call +91 9708815717.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Monthly Corporate GST Report Modal */}
          {monthlyGstModalOpen && (() => {
            const activeCompany = COMPANY_PROFILES[selectedCompanyKey] || COMPANY_PROFILES.SRQ;
            const currentMonthData = monthlyGstData?.months?.find(m => m.monthKey === activeMonthKey) || monthlyGstData?.months?.[0];

            return (
              <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
                <div className="bg-white dark:bg-[#121212] rounded-2xl shadow-2xl border border-gray-200 dark:border-neutral-800 w-full max-w-7xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
                  {/* Top Bar Header (shrink-0 prevents flex collapse) */}
                  <div className="shrink-0 p-4 sm:p-5 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-600/30">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md border border-white/20">
                        <FileSpreadsheet className="h-6 w-6 text-emerald-200" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-xl font-bold tracking-tight">
                            Corporate Orders Month-by-Month GST Report
                          </h2>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/30 border border-emerald-300/40 text-emerald-100 font-semibold uppercase tracking-wider">
                            XLSX Compatible
                          </span>
                        </div>
                        <p className="text-xs text-emerald-100/90 mt-0.5">
                          {activeCompany.name} • FY {selectedFy}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => currentMonthData && exportCurrentMonthXlsx(currentMonthData)}
                        disabled={isExportingExcel || !currentMonthData}
                        className="px-3.5 py-2 bg-white/15 hover:bg-white/25 active:scale-95 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all border border-white/25 shadow-sm disabled:opacity-50"
                        title="Download active month spreadsheet (includes any edits)"
                      >
                        <Download className="h-4 w-4" />
                        <span>Export Month (.xlsx)</span>
                      </button>

                      <button
                        onClick={exportFullYearWorkbookXlsx}
                        disabled={isExportingExcel || !monthlyGstData}
                        className="px-4 py-2 bg-emerald-950 hover:bg-emerald-900 active:scale-95 text-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border border-emerald-400/40 shadow-lg shadow-black/20 disabled:opacity-50"
                        title="Download entire 12-month financial year workbook with separate sheet tabs"
                      >
                        <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                        <span>Export Full FY Workbook (12 Months)</span>
                      </button>

                      <button
                        onClick={() => setMonthlyGstModalOpen(false)}
                        className="p-2 hover:bg-white/20 rounded-xl transition-colors text-white/90 hover:text-white ml-1"
                        title="Close Modal"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Filters and Controls Toolbar (shrink-0 prevents flex collapse) */}
                  <div className="shrink-0 p-4 bg-gray-50 dark:bg-[#181818] border-b border-gray-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Financial Year Selector */}
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-500 dark:text-gray-400">Financial Year:</span>
                        <select
                          value={selectedFy}
                          onChange={(e) => {
                            const newFy = e.target.value;
                            setSelectedFy(newFy);
                            fetchMonthlyGstReport(newFy, reportScope, selectedCompanyKey);
                          }}
                          className="bg-white dark:bg-[#222] border border-gray-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 font-medium text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="2026-2027">FY 2026-2027</option>
                          <option value="2025-2026">FY 2025-2026</option>
                          <option value="2027-2028">FY 2027-2028</option>
                        </select>
                      </div>

                      {/* Scope Filter */}
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-500 dark:text-gray-400">Partners Scope:</span>
                        <select
                          value={reportScope}
                          onChange={(e) => {
                            const newScope = e.target.value;
                            setReportScope(newScope);
                            fetchMonthlyGstReport(selectedFy, newScope, selectedCompanyKey);
                          }}
                          className="bg-white dark:bg-[#222] border border-gray-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 font-medium text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="all_corporate">All Corporate & Business Orders</option>
                          <option value="registered_only">Registered Corporate Partners Only</option>
                        </select>
                      </div>

                      {/* Company Profile */}
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-500 dark:text-gray-400">Issuing Entity:</span>
                        <select
                          value={selectedCompanyKey}
                          onChange={(e) => {
                            const newComp = e.target.value;
                            setSelectedCompanyKey(newComp);
                            fetchMonthlyGstReport(selectedFy, reportScope, newComp);
                          }}
                          className="bg-white dark:bg-[#222] border border-gray-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 font-medium text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="SRQ">SRQ Engineers Parcel (Pvt Ltd)</option>
                          <option value="ENGGPARCEL">EnggParcel Services LLP</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Toggle Edit Mode Button */}
                      <button
                        onClick={() => setIsEditMode(!isEditMode)}
                        className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all text-xs border ${
                          isEditMode
                            ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-sm ring-2 ring-amber-400/30"
                            : "bg-white dark:bg-[#222] hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-neutral-700"
                        }`}
                        title={isEditMode ? "Switch to Preview View" : "Enable inline cell editing"}
                      >
                        {isEditMode ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-white" />
                            <span>Done Editing</span>
                          </>
                        ) : (
                          <>
                            <Edit2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                            <span>Edit Table Cells</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => fetchMonthlyGstReport(selectedFy, reportScope, selectedCompanyKey)}
                        disabled={monthlyGstLoading}
                        className="px-3 py-1.5 bg-white dark:bg-[#222] hover:bg-gray-100 dark:hover:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${monthlyGstLoading ? 'animate-spin text-emerald-600' : ''}`} />
                        <span>Refresh Data</span>
                      </button>
                    </div>
                  </div>

                  {/* 12-Month Tabs Navigation Strip (shrink-0 + relative z-10 ensures it NEVER collapses or overlaps KPI cards) */}
                  <div className="shrink-0 relative z-10 bg-gray-100 dark:bg-[#1a1a1a] px-3 pt-2.5 border-b border-gray-200 dark:border-neutral-800 overflow-x-auto scrollbar-thin min-h-[48px]">
                    <div className="flex items-center gap-1.5 min-w-max pb-2">
                      {monthlyGstData?.months?.map(m => {
                        const isActive = m.monthKey === activeMonthKey;
                        const hasOrders = (m.rows?.length || 0) > 0;

                        return (
                          <button
                            key={m.monthKey}
                            onClick={() => {
                              setActiveMonthKey(m.monthKey);
                              setExpandedPartnerRowId(null);
                            }}
                            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer select-none border ${
                              isActive
                                ? "bg-white dark:bg-[#121212] text-emerald-700 dark:text-emerald-400 border-emerald-500/40 shadow-sm ring-1 ring-emerald-500/30"
                                : "bg-gray-200/60 dark:bg-neutral-800/60 hover:bg-white/60 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-300 border-transparent"
                            }`}
                          >
                            <span>{m.sheetName}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                                isActive
                                  ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                                  : hasOrders
                                  ? "bg-gray-300 dark:bg-neutral-700 text-gray-800 dark:text-gray-200"
                                  : "bg-gray-200 dark:bg-neutral-800 text-gray-400"
                              }`}
                            >
                              {m.totals?.qty || 0}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Modal Body with KPI Cards & Spreadsheet Preview (flex-1 min-h-0 prevents flex sibling overflow) */}
                  <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6">
                    {monthlyGstLoading ? (
                      <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
                        <p className="text-sm text-gray-500 font-medium">Aggregating corporate orders month-by-month...</p>
                      </div>
                    ) : !currentMonthData ? (
                      <div className="text-center py-16 text-gray-400">
                        No report data available for this selection.
                      </div>
                    ) : (
                      <>
                        {/* Month Summary KPI Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                          <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl p-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                              Partners Billed
                            </span>
                            <p className="text-lg font-black text-gray-900 dark:text-white mt-1">
                              {currentMonthData.partnerCount}
                            </p>
                            <span className="text-[10px] text-gray-500">Corporate clients</span>
                          </div>

                          <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl p-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                              Total Quantity (Qty)
                            </span>
                            <p className="text-lg font-black text-gray-900 dark:text-white mt-1">
                              {currentMonthData.totals.qty}
                            </p>
                            <span className="text-[10px] text-gray-500">Parcels dispatched</span>
                          </div>

                          <div className="bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 rounded-xl p-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block">
                              Total Weight (kg)
                            </span>
                            <p className="text-lg font-black text-gray-900 dark:text-white mt-1">
                              {(Number(currentMonthData.totals.weight) || 0).toLocaleString('en-IN')} kg
                            </p>
                            <span className="text-[10px] text-gray-500">Chargeable weight</span>
                          </div>

                          <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 rounded-xl p-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                              Taxable Amount
                            </span>
                            <p className="text-lg font-black text-gray-900 dark:text-white mt-1">
                              ₹{(Number(currentMonthData.totals.taxableAmount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </p>
                            <span className="text-[10px] text-gray-500">Base freight</span>
                          </div>

                          <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-xl p-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
                              GST Amount (18%)
                            </span>
                            <p className="text-lg font-black text-gray-900 dark:text-white mt-1">
                              ₹{(Number(currentMonthData.totals.gstAmount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </p>
                            <span className="text-[10px] text-gray-500">IGST / CGST+SGST</span>
                          </div>

                          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-xl p-3 shadow-md">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-100 block">
                              Invoice Value
                            </span>
                            <p className="text-lg font-black mt-1">
                              ₹{(Number(currentMonthData.totals.invoiceValue) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </p>
                            <span className="text-[10px] text-emerald-200">Gross billing</span>
                          </div>
                        </div>

                        {/* Interactive Edit Banner when in Edit Mode */}
                        {isEditMode && (
                          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 p-3 sm:p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200 animate-in fade-in duration-150">
                            <div className="flex items-center gap-2.5">
                              <span className="p-1.5 bg-amber-200 dark:bg-amber-800 rounded-lg text-amber-900 dark:text-amber-100 font-bold shrink-0">
                                <Edit2 className="h-4 w-4" />
                              </span>
                              <div>
                                <span className="font-bold block">Interactive Edit Mode Active:</span>
                                <span className="text-amber-800/90 dark:text-amber-300/90">
                                  You can directly edit client names, GSTIN, invoice dates, quantities, weights, and amounts in the table below. Changing Taxable Amount auto-recalculates 18% GST and Invoice Value in real-time. Exported Excel files will include all your edits.
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleAddRow(currentMonthData.monthKey)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-sm transition-colors text-xs"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Add Row</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleResetMonth(currentMonthData.monthKey)}
                                className="px-3 py-1.5 bg-white dark:bg-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold flex items-center gap-1.5 border border-amber-300 dark:border-amber-700 shadow-sm transition-colors text-xs"
                                title="Reset active month back to server data"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                <span>Reset Month</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Exact Excel Format Spreadsheet View */}
                        <div className="bg-white dark:bg-[#161616] rounded-2xl border border-gray-200 dark:border-neutral-800 shadow-sm overflow-hidden">
                          {/* Title Banner - Matches the screenshot top merged row */}
                          <div className="bg-white dark:bg-[#1f1f1f] px-4 py-3 border-b border-gray-300 dark:border-neutral-700 text-center font-bold tracking-wide text-gray-950 dark:text-gray-100 text-sm sm:text-base uppercase flex items-center justify-between relative">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-left sm:text-center">
                                {activeCompany.name} ({currentMonthData.sheetName})
                              </span>
                              {isEditMode && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-bold uppercase tracking-wider border border-amber-300 dark:border-amber-700">
                                  Editable
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {isEditMode && (
                                <button
                                  type="button"
                                  onClick={() => handleAddRow(currentMonthData.monthKey)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-colors sm:hidden"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  <span>Add</span>
                                </button>
                              )}
                              <span className="text-xs text-gray-500 font-normal hidden sm:inline">
                                Sheet: <span className="font-mono text-emerald-600 font-bold">{currentMonthData.sheetName}</span>
                              </span>
                            </div>
                          </div>

                          {/* Spreadsheet Table */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left border-collapse">
                              <thead>
                                <tr className="bg-[#F8CBAD] dark:bg-[#b8764a] text-gray-950 dark:text-gray-100 font-bold uppercase tracking-wider text-[11px] border-b border-gray-400 dark:border-neutral-600">
                                  <th className="py-2.5 px-3 border-r border-gray-400 dark:border-neutral-600 text-center w-12 font-bold text-gray-950 dark:text-white">S NO.</th>
                                  <th className="py-2.5 px-4 border-r border-gray-400 dark:border-neutral-600 min-w-[220px] font-bold text-gray-950 dark:text-white">BILL TO</th>
                                  <th className="py-2.5 px-3 border-r border-gray-400 dark:border-neutral-600 min-w-[150px] font-bold text-gray-950 dark:text-white">B2B/B2C</th>
                                  <th className="py-2.5 px-3 border-r border-gray-400 dark:border-neutral-600 min-w-[120px] font-bold text-gray-950 dark:text-white">INVOICE NO.</th>
                                  <th className="py-2.5 px-3 border-r border-gray-400 dark:border-neutral-600 text-center min-w-[100px] font-bold text-gray-950 dark:text-white">INVOICE DATE</th>
                                  <th className="py-2.5 px-3 border-r border-gray-400 dark:border-neutral-600 text-center w-16 font-bold text-gray-950 dark:text-white">QTY.</th>
                                  <th className="py-2.5 px-3 border-r border-gray-400 dark:border-neutral-600 text-right min-w-[90px] font-bold text-gray-950 dark:text-white">WT. (kg)</th>
                                  <th className="py-2.5 px-3 border-r border-gray-400 dark:border-neutral-600 text-right min-w-[120px] font-bold text-gray-950 dark:text-white">TAXABLE AMOUNT</th>
                                  <th className="py-2.5 px-2 border-r border-gray-400 dark:border-neutral-600 text-center w-20 font-bold text-gray-950 dark:text-white">GST RATE</th>
                                  <th className="py-2.5 px-3 border-r border-gray-400 dark:border-neutral-600 text-right min-w-[110px] font-bold text-gray-950 dark:text-white">GST AMOUNT</th>
                                  <th className="py-2.5 px-3 border-r border-gray-400 dark:border-neutral-600 text-right min-w-[120px] font-bold text-gray-950 dark:text-white">INVOICE VALUE</th>
                                  <th className="py-2.5 px-3 text-center w-14 font-bold text-gray-950 dark:text-white">
                                    {isEditMode ? "ACTION" : "DETAILS"}
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 dark:divide-neutral-800">
                                {currentMonthData.rows.length === 0 ? (
                                  <tr>
                                    <td colSpan={12} className="py-12 text-center text-gray-400">
                                      No corporate orders recorded for {currentMonthData.sheetName}.
                                      {isEditMode && (
                                        <div className="mt-2">
                                          <button
                                            type="button"
                                            onClick={() => handleAddRow(currentMonthData.monthKey)}
                                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-colors"
                                          >
                                            <Plus className="h-3.5 w-3.5" />
                                            <span>Add First Row</span>
                                          </button>
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                ) : (
                                  currentMonthData.rows.map((row, rowIdx) => {
                                    const isExpanded = expandedPartnerRowId === row.invoiceNo;
                                    const isGstRegistered = row.gstNumber && row.gstNumber !== "B2C / URP";

                                    return (
                                      <React.Fragment key={row.invoiceNo || rowIdx}>
                                        <tr
                                          onClick={() => !isEditMode && setExpandedPartnerRowId(isExpanded ? null : row.invoiceNo)}
                                          className={`${
                                            isEditMode
                                              ? "hover:bg-amber-50/20 dark:hover:bg-amber-950/10"
                                              : "hover:bg-emerald-50/40 dark:hover:bg-emerald-950/10 cursor-pointer"
                                          } transition-colors ${
                                            isExpanded && !isEditMode ? "bg-emerald-50/30 dark:bg-emerald-950/20" : ""
                                          }`}
                                        >
                                          {/* S NO */}
                                          <td className="py-2 px-2.5 border-r border-gray-200 dark:border-neutral-800 text-center font-bold text-gray-600 dark:text-gray-400">
                                            {row.sNo}
                                          </td>

                                          {/* BILL TO */}
                                          <td className="py-2 px-3 border-r border-gray-200 dark:border-neutral-800 font-bold text-gray-900 dark:text-gray-100">
                                            {isEditMode ? (
                                              <input
                                                type="text"
                                                value={row.billTo || ""}
                                                onChange={(e) => handleCellChange(currentMonthData.monthKey, rowIdx, "billTo", e.target.value)}
                                                className="w-full px-2 py-1 text-xs font-bold bg-amber-50/50 dark:bg-neutral-800 border border-amber-200 dark:border-neutral-700 rounded focus:border-emerald-500 focus:bg-white dark:focus:bg-[#1a1a1a] outline-none text-gray-900 dark:text-gray-100"
                                              />
                                            ) : (
                                              <div className="flex items-center justify-between gap-2">
                                                <span>{row.billTo}</span>
                                                {row.partnerId && (
                                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-neutral-800 text-gray-500 font-mono">
                                                    {row.partnerId}
                                                  </span>
                                                )}
                                              </div>
                                            )}
                                          </td>

                                          {/* B2B/B2C */}
                                          <td className="py-2 px-2.5 border-r border-gray-200 dark:border-neutral-800 font-mono text-[11px]">
                                            {isEditMode ? (
                                              <input
                                                type="text"
                                                value={row.gstNumber || ""}
                                                placeholder="GSTIN or B2C / URP"
                                                onChange={(e) => handleCellChange(currentMonthData.monthKey, rowIdx, "gstNumber", e.target.value)}
                                                className="w-full px-2 py-1 text-xs font-mono font-semibold bg-amber-50/50 dark:bg-neutral-800 border border-amber-200 dark:border-neutral-700 rounded focus:border-emerald-500 focus:bg-white dark:focus:bg-[#1a1a1a] outline-none text-emerald-800 dark:text-emerald-300"
                                              />
                                            ) : isGstRegistered ? (
                                              <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                                                {row.gstNumber}
                                              </span>
                                            ) : (
                                              <span className="text-gray-400">B2C / URP</span>
                                            )}
                                          </td>

                                          {/* INVOICE NO */}
                                          <td className="py-2 px-2.5 border-r border-gray-200 dark:border-neutral-800 font-mono text-gray-800 dark:text-gray-300 font-semibold">
                                            {isEditMode ? (
                                              <input
                                                type="text"
                                                value={row.invoiceNo || ""}
                                                onChange={(e) => handleCellChange(currentMonthData.monthKey, rowIdx, "invoiceNo", e.target.value)}
                                                className="w-full px-2 py-1 text-xs font-mono font-bold bg-amber-50/50 dark:bg-neutral-800 border border-amber-200 dark:border-neutral-700 rounded focus:border-emerald-500 focus:bg-white dark:focus:bg-[#1a1a1a] outline-none text-gray-900 dark:text-gray-100"
                                              />
                                            ) : (
                                              row.invoiceNo
                                            )}
                                          </td>

                                          {/* INVOICE DATE */}
                                          <td className="py-2 px-2 border-r border-gray-200 dark:border-neutral-800 text-center font-mono text-gray-700 dark:text-gray-300">
                                            {isEditMode ? (
                                              <input
                                                type="text"
                                                value={row.invoiceDate || ""}
                                                onChange={(e) => handleCellChange(currentMonthData.monthKey, rowIdx, "invoiceDate", e.target.value)}
                                                className="w-full px-1.5 py-1 text-xs text-center font-mono bg-amber-50/50 dark:bg-neutral-800 border border-amber-200 dark:border-neutral-700 rounded focus:border-emerald-500 focus:bg-white dark:focus:bg-[#1a1a1a] outline-none text-gray-900 dark:text-gray-100"
                                              />
                                            ) : (
                                              row.invoiceDate
                                            )}
                                          </td>

                                          {/* QTY */}
                                          <td className="py-2 px-2 border-r border-gray-200 dark:border-neutral-800 text-center font-bold text-gray-900 dark:text-gray-100">
                                            {isEditMode ? (
                                              <input
                                                type="number"
                                                min="0"
                                                value={row.qty ?? ""}
                                                onChange={(e) => handleCellChange(currentMonthData.monthKey, rowIdx, "qty", e.target.value)}
                                                className="w-full px-1 py-1 text-xs text-center font-bold bg-amber-50/50 dark:bg-neutral-800 border border-amber-200 dark:border-neutral-700 rounded focus:border-emerald-500 focus:bg-white dark:focus:bg-[#1a1a1a] outline-none text-gray-900 dark:text-gray-100"
                                              />
                                            ) : (
                                              row.qty
                                            )}
                                          </td>

                                          {/* WT (kg) */}
                                          <td className="py-2 px-2 border-r border-gray-200 dark:border-neutral-800 text-right font-medium text-gray-800 dark:text-gray-200">
                                            {isEditMode ? (
                                              <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={row.weight ?? ""}
                                                onChange={(e) => handleCellChange(currentMonthData.monthKey, rowIdx, "weight", e.target.value)}
                                                className="w-full px-1 py-1 text-xs text-right font-medium bg-amber-50/50 dark:bg-neutral-800 border border-amber-200 dark:border-neutral-700 rounded focus:border-emerald-500 focus:bg-white dark:focus:bg-[#1a1a1a] outline-none text-gray-900 dark:text-gray-100"
                                              />
                                            ) : (
                                              (Number(row.weight) || 0).toLocaleString('en-IN')
                                            )}
                                          </td>

                                          {/* TAXABLE AMOUNT */}
                                          <td className="py-2 px-2 border-r border-gray-200 dark:border-neutral-800 text-right font-bold text-gray-900 dark:text-gray-100">
                                            {isEditMode ? (
                                              <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={row.taxableAmount ?? ""}
                                                onChange={(e) => handleCellChange(currentMonthData.monthKey, rowIdx, "taxableAmount", e.target.value)}
                                                className="w-full px-1.5 py-1 text-xs text-right font-bold bg-amber-50/50 dark:bg-neutral-800 border border-amber-200 dark:border-neutral-700 rounded focus:border-emerald-500 focus:bg-white dark:focus:bg-[#1a1a1a] outline-none text-gray-900 dark:text-gray-100"
                                              />
                                            ) : (
                                              (Number(row.taxableAmount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })
                                            )}
                                          </td>

                                          {/* GST RATE */}
                                          <td className="py-2 px-1.5 border-r border-gray-200 dark:border-neutral-800 text-center font-medium text-gray-600 dark:text-gray-400">
                                            {isEditMode ? (
                                              <input
                                                type="text"
                                                value={row.gstRate || "18%"}
                                                onChange={(e) => handleCellChange(currentMonthData.monthKey, rowIdx, "gstRate", e.target.value)}
                                                className="w-full px-1 py-1 text-xs text-center bg-amber-50/50 dark:bg-neutral-800 border border-amber-200 dark:border-neutral-700 rounded focus:border-emerald-500 focus:bg-white dark:focus:bg-[#1a1a1a] outline-none text-gray-900 dark:text-gray-100"
                                              />
                                            ) : (
                                              row.gstRate || "18%"
                                            )}
                                          </td>

                                          {/* GST AMOUNT */}
                                          <td className="py-2 px-2 border-r border-gray-200 dark:border-neutral-800 text-right font-bold text-emerald-700 dark:text-emerald-400">
                                            {isEditMode ? (
                                              <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={row.gstAmount ?? ""}
                                                onChange={(e) => handleCellChange(currentMonthData.monthKey, rowIdx, "gstAmount", e.target.value)}
                                                className="w-full px-1.5 py-1 text-xs text-right font-bold text-emerald-700 dark:text-emerald-400 bg-amber-50/50 dark:bg-neutral-800 border border-amber-200 dark:border-neutral-700 rounded focus:border-emerald-500 focus:bg-white dark:focus:bg-[#1a1a1a] outline-none"
                                              />
                                            ) : (
                                              (Number(row.gstAmount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })
                                            )}
                                          </td>

                                          {/* INVOICE VALUE */}
                                          <td className="py-2 px-2 border-r border-gray-200 dark:border-neutral-800 text-right font-black text-gray-950 dark:text-white">
                                            {isEditMode ? (
                                              <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={row.invoiceValue ?? ""}
                                                onChange={(e) => handleCellChange(currentMonthData.monthKey, rowIdx, "invoiceValue", e.target.value)}
                                                className="w-full px-1.5 py-1 text-xs text-right font-black text-gray-950 dark:text-white bg-amber-50/50 dark:bg-neutral-800 border border-amber-200 dark:border-neutral-700 rounded focus:border-emerald-500 focus:bg-white dark:focus:bg-[#1a1a1a] outline-none"
                                              />
                                            ) : (
                                              (Number(row.invoiceValue) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })
                                            )}
                                          </td>

                                          {/* DETAILS / ACTION */}
                                          <td className="py-2 px-2 text-center">
                                            {isEditMode ? (
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDeleteRow(currentMonthData.monthKey, rowIdx);
                                                }}
                                                className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors mx-auto block"
                                                title="Delete this row"
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </button>
                                            ) : (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setExpandedPartnerRowId(isExpanded ? null : row.invoiceNo);
                                                }}
                                                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-neutral-800 text-gray-500 hover:text-emerald-600 transition-colors"
                                                title={isExpanded ? "Collapse orders list" : "Expand constituent orders list"}
                                              >
                                                {isExpanded ? (
                                                  <ChevronUp className="h-4 w-4" />
                                                ) : (
                                                  <ChevronDown className="h-4 w-4" />
                                                )}
                                              </button>
                                            )}
                                          </td>
                                        </tr>

                                        {/* Constituent Bookings Drilldown Accordion */}
                                        {isExpanded && !isEditMode && (
                                          <tr className="bg-gray-50/80 dark:bg-neutral-900/50">
                                            <td colSpan={12} className="p-3 sm:p-4 border-b border-gray-300 dark:border-neutral-700">
                                              <div className="bg-white dark:bg-[#181818] rounded-xl border border-gray-200 dark:border-neutral-800 p-3 sm:p-4 shadow-inner space-y-3">
                                                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-gray-100 dark:border-neutral-800 pb-2">
                                                  <div className="flex items-center gap-2">
                                                    <Package className="h-4 w-4 text-emerald-600" />
                                                    <span className="font-bold text-gray-800 dark:text-gray-200">
                                                      Consignment Dockets for {row.billTo}
                                                    </span>
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold">
                                                      {row.qty} {row.qty === 1 ? 'Docket' : 'Dockets'}
                                                    </span>
                                                  </div>
                                                  <span className="text-xs text-gray-500">
                                                    Period: {row.period}
                                                  </span>
                                                </div>

                                                <div className="overflow-x-auto max-h-56 scrollbar-thin">
                                                  <table className="w-full text-[11px] text-left">
                                                    <thead>
                                                      <tr className="text-gray-400 font-semibold border-b border-gray-100 dark:border-neutral-800">
                                                        <th className="py-1.5 px-2">Docket / Tracking ID</th>
                                                        <th className="py-1.5 px-2">Date</th>
                                                        <th className="py-1.5 px-2">Sender</th>
                                                        <th className="py-1.5 px-2">Receiver</th>
                                                        <th className="py-1.5 px-2">Route</th>
                                                        <th className="py-1.5 px-2 text-right">Weight</th>
                                                        <th className="py-1.5 px-2 text-right">Amount</th>
                                                        <th className="py-1.5 px-2 text-center">Status</th>
                                                      </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100 dark:divide-neutral-800/60 font-mono">
                                                      {row.bookings?.map((b) => (
                                                        <tr key={b._id} className="hover:bg-gray-50 dark:hover:bg-neutral-800/40">
                                                          <td className="py-1.5 px-2 font-bold text-orange-600">
                                                            {b.trackingId || b.bookingId}
                                                          </td>
                                                          <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400 font-sans">
                                                            {b.dateFormatted}
                                                          </td>
                                                          <td className="py-1.5 px-2 text-gray-800 dark:text-gray-200 font-sans">
                                                            {b.sender}
                                                          </td>
                                                          <td className="py-1.5 px-2 text-gray-800 dark:text-gray-200 font-sans">
                                                            {b.receiver}
                                                          </td>
                                                          <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400 font-sans">
                                                            {b.origin} → {b.destination}
                                                          </td>
                                                          <td className="py-1.5 px-2 text-right text-gray-700 dark:text-gray-300">
                                                            {b.weight} kg
                                                          </td>
                                                          <td className="py-1.5 px-2 text-right font-bold text-gray-900 dark:text-white">
                                                            ₹{Number(b.amount || 0).toLocaleString('en-IN')}
                                                          </td>
                                                          <td className="py-1.5 px-2 text-center font-sans">
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                                                              {b.status}
                                                            </span>
                                                          </td>
                                                        </tr>
                                                      ))}
                                                    </tbody>
                                                  </table>
                                                </div>
                                              </div>
                                            </td>
                                          </tr>
                                        )}
                                      </React.Fragment>
                                    );
                                  })
                                )}
                              </tbody>

                              {/* Total Row - Matches screenshot summary row */}
                              {currentMonthData.rows.length > 0 && (
                                <tfoot>
                                  <tr className="bg-amber-100/60 dark:bg-neutral-800/80 font-black text-gray-900 dark:text-white border-t-2 border-gray-400 dark:border-neutral-600 text-xs">
                                    <td className="py-3 px-3 border-r border-gray-300 dark:border-neutral-700 text-center font-bold">
                                      TOTAL
                                    </td>
                                    <td colSpan={4} className="py-3 px-4 border-r border-gray-300 dark:border-neutral-700 font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                                      Monthly Summary ({currentMonthData.rows.length} Partners Billed)
                                    </td>
                                    <td className="py-3 px-3 border-r border-gray-300 dark:border-neutral-700 text-center text-sm">
                                      {currentMonthData.totals.qty}
                                    </td>
                                    <td className="py-3 px-3 border-r border-gray-300 dark:border-neutral-700 text-right text-sm">
                                      {(Number(currentMonthData.totals.weight) || 0).toLocaleString('en-IN')}
                                    </td>
                                    <td className="py-3 px-3 border-r border-gray-300 dark:border-neutral-700 text-right text-sm">
                                      {(Number(currentMonthData.totals.taxableAmount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-3 px-2 border-r border-gray-300 dark:border-neutral-700 text-center text-sm">
                                      {currentMonthData.totals.gstRate || "18%"}
                                    </td>
                                    <td className="py-3 px-3 border-r border-gray-300 dark:border-neutral-700 text-right text-sm text-emerald-700 dark:text-emerald-400">
                                      {(Number(currentMonthData.totals.gstAmount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-3 px-3 border-r border-gray-300 dark:border-neutral-700 text-right text-sm text-emerald-950 dark:text-emerald-300">
                                      {(Number(currentMonthData.totals.invoiceValue) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-3 px-3"></td>
                                  </tr>
                                </tfoot>
                              )}
                            </table>
                          </div>
                        </div>

                        {/* Bottom Banner with Financial Year Grand Totals */}
                        {monthlyGstData?.fyTotals && (
                          <div className="bg-gradient-to-r from-gray-900 via-neutral-900 to-gray-900 text-white p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 border border-neutral-800 shadow-lg text-xs">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                                <Layers className="h-5 w-5" />
                              </div>
                              <div>
                                <h4 className="font-bold text-sm text-white">
                                  Financial Year {monthlyGstData.financialYear} Grand Cumulative Summary
                                </h4>
                                <p className="text-gray-400 text-xs">
                                  Includes all 12 operational months across registered corporate partners and corporate shipments
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-6 flex-wrap font-mono">
                              <div>
                                <span className="text-[10px] text-gray-400 block uppercase">Total Packages</span>
                                <span className="font-bold text-white text-sm">
                                  {monthlyGstData.fyTotals.grandTotalQty} pkgs
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-gray-400 block uppercase">Total Weight</span>
                                <span className="font-bold text-white text-sm">
                                  {(Number(monthlyGstData.fyTotals.grandTotalWeight) || 0).toLocaleString('en-IN')} kg
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-gray-400 block uppercase">Base Freight</span>
                                <span className="font-bold text-white text-sm">
                                  ₹{(Number(monthlyGstData.fyTotals.grandTotalTaxableAmount) || 0).toLocaleString('en-IN')}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-emerald-400 block uppercase">Total 18% GST</span>
                                <span className="font-bold text-emerald-400 text-sm">
                                  ₹{(Number(monthlyGstData.fyTotals.grandTotalGstAmount) || 0).toLocaleString('en-IN')}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-emerald-300 block uppercase">Cumulative Value</span>
                                <span className="font-bold text-emerald-300 text-base">
                                  ₹{(Number(monthlyGstData.fyTotals.grandTotalInvoiceValue) || 0).toLocaleString('en-IN')}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
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
