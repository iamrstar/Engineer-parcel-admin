import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  Receipt,
  Search,
  Download,
  Printer,
  Send,
  Copy,
  Plus,
  Trash2,
  Building,
  RotateCcw,
  CheckCircle,
  Hash,
  ArrowLeft,
  FileText,
  Eye,
  Columns
} from "lucide-react";
import { COMPANY_PROFILES, numberToWordsIndian } from "../utils/billingConstants";

export default function InvoiceBuilder() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [lookupBookingId, setLookupBookingId] = useState(searchParams.get("bookingId") || "");
  const [isLookingUpBooking, setIsLookingUpBooking] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [previewScale, setPreviewScale] = useState(0.85);
  const [isAutoFit, setIsAutoFit] = useState(true);
  const [viewMode, setViewMode] = useState("split"); // "split" | "preview"
  const previewContainerRef = useRef(null);

  // Auto-fit dynamic scale listener
  useEffect(() => {
    if (!previewContainerRef.current) return;

    const calculateFit = () => {
      if (!previewContainerRef.current || !isAutoFit) return;
      const containerW = previewContainerRef.current.clientWidth;
      const padding = containerW > 640 ? 48 : 24;
      const availableW = containerW - padding;
      const calculated = Math.min(1.0, Math.max(0.35, Math.round((availableW / 800) * 100) / 100));
      setPreviewScale(calculated);
    };

    calculateFit();
    const ro = new ResizeObserver(() => {
      calculateFit();
    });
    ro.observe(previewContainerRef.current);
    return () => ro.disconnect();
  }, [isAutoFit, viewMode]);

  // Invoice Customer Details
  const [invoiceCustomer, setInvoiceCustomer] = useState({
    name: "",
    company: "",
    partnerId: searchParams.get("partnerId") || "",
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

  // Invoice Items
  const [invoiceItems, setInvoiceItems] = useState([
    {
      _id: "1",
      date: new Date().toISOString().substring(0, 10),
      docketNo: "EP-" + Math.floor(100000 + Math.random() * 900000),
      origin: "Dhanbad",
      destination: "Kolkata",
      serviceType: "Express Cargo",
      weight: 15,
      amount: 1500
    }
  ]);

  // Invoice Configuration
  const [invoiceConfig, setInvoiceConfig] = useState(() => {
    const today = new Date();
    const curYear = today.getFullYear();
    const fy = today.getMonth() >= 2
      ? `${String(curYear).slice(2)}-${String(curYear + 1).slice(2)}`
      : `${String(curYear - 1).slice(2)}-${String(curYear).slice(2)}`;
    const randomSeq = String(Math.floor(1000 + Math.random() * 9000));
    return {
      invoiceNumber: `INV/${fy}/EP-${randomSeq}`,
      invoiceDate: today.toISOString().substring(0, 10),
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString().substring(0, 10),
      sacCode: "996511",
      sacDescription: "Road Transport Services of Goods / Express Courier",
      reverseCharge: "No",
      companyKey: "SRQ",
      paidAmount: 0,
      paymentStatus: "Unpaid",
      tdsDeducted: 0,
      gstRate: 18,
      notes: "Thank you for your business! Please settle the invoice within 15 days of receipt.",
      terms: "1. Goods carried at owner's risk.\n2. Interest @ 18% p.a. will be charged after due date.\n3. Subject to Dhanbad jurisdiction only."
    };
  });

  // If bookingId passed in URL on mount, fetch automatically
  useEffect(() => {
    const bookingParam = searchParams.get("bookingId");
    if (bookingParam) {
      handleImportBooking(bookingParam);
    }
  }, []);

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

      const customerName = sender.name || booking.senderName || booking.customerName || "Customer";
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
        partnerId: booking.vendorId?.partnerId || booking.vendorPartnerId || "",
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

      const today = new Date();
      const curYear = today.getFullYear();
      const fy = today.getMonth() >= 2 ? `${String(curYear).slice(2)}-${String(curYear + 1).slice(2)}` : `${String(curYear - 1).slice(2)}-${String(curYear).slice(2)}`;
      const invNo = `INV/${fy}/${trackingNo}`;

      const paid = Number(booking.vendorPaidAmount || booking.paidAmount || (booking.paymentStatus === 'paid' ? itemAmount : 0));
      const status = paid >= itemAmount && itemAmount > 0 ? "Paid" : (paid > 0 ? "Partially Paid" : "Unpaid");

      setInvoiceConfig(prev => ({
        ...prev,
        invoiceNumber: invNo,
        paidAmount: paid,
        paymentStatus: status
      }));

      toast.success(`Loaded details from Booking #${trackingNo}!`);
    } catch (err) {
      console.error("Lookup error:", err);
      toast.error(err.response?.data?.message || "Booking lookup failed. Please verify ID.");
    } finally {
      setIsLookingUpBooking(false);
    }
  };

  const handleAddItem = () => {
    setInvoiceItems(prev => [
      ...prev,
      {
        _id: String(Date.now()),
        date: new Date().toISOString().substring(0, 10),
        docketNo: "EP-" + Math.floor(100000 + Math.random() * 900000),
        origin: "Dhanbad",
        destination: "Kolkata",
        serviceType: "Express Cargo",
        weight: 10,
        amount: 1000
      }
    ]);
  };

  const handleItemChange = (index, field, value) => {
    setInvoiceItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleDeleteItem = (index) => {
    setInvoiceItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById("invoice-printable");
    if (!element) {
      toast.error("Invoice printable view not found");
      return;
    }
    try {
      setIsGeneratingPdf(true);
      toast.loading("Generating High-Resolution Invoice PDF...", { id: "pdf-gen" });

      const prevTransform = element.style.transform;
      element.style.transform = "none";

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 1200
      });

      element.style.transform = prevTransform;

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

      const cleanNum = (invoiceConfig.invoiceNumber || "INV").replace(/[\/\\?%*:|"<>]/g, "-");
      const filename = `Invoice_${cleanNum}.pdf`;
      pdf.save(filename);
      toast.success("Invoice PDF downloaded successfully!", { id: "pdf-gen" });
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("Error creating PDF, launching print view...", { id: "pdf-gen" });
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSendWhatsApp = (grandTotal, subtotal, gstAmount, balanceDue) => {
    const customerPhone = (invoiceCustomer.phone || "").replace(/\D/g, "");
    const formattedPhone = customerPhone.length === 10 ? `91${customerPhone}` : customerPhone;
    const company = COMPANY_PROFILES[invoiceConfig.companyKey] || COMPANY_PROFILES.SRQ;

    const message = `*TAX INVOICE: ${invoiceConfig.invoiceNumber}*
*Issued by:* ${company.name}
*Customer:* ${invoiceCustomer.name || "Valued Client"}${invoiceCustomer.company ? ` (${invoiceCustomer.company})` : ""}
*Date:* ${invoiceConfig.invoiceDate}
*Total Consignments:* ${invoiceItems.length}

*Summary:*
• Taxable Subtotal: Rs. ${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
• GST (${invoiceConfig.gstRate}%): Rs. ${gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
• *Total Invoice Amount:* Rs. ${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
• Amount Paid: Rs. ${(parseFloat(invoiceConfig.paidAmount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
• *Balance Due:* Rs. ${balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}

*Bank Transfer Details:*
Account Name: ${company.accountName}
Bank: ${company.bank}
A/c No: ${company.accountNo}
IFSC: ${company.ifsc}
UPI ID: ${company.upi}

Thank you for shipping with Engineers Parcel!`;

    if (!formattedPhone) {
      toast.error("Please enter a customer phone number to send WhatsApp");
      return;
    }
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleCopySummary = (grandTotal, subtotal, gstAmount, balanceDue) => {
    const company = COMPANY_PROFILES[invoiceConfig.companyKey] || COMPANY_PROFILES.SRQ;
    const text = `TAX INVOICE: ${invoiceConfig.invoiceNumber}
Customer: ${invoiceCustomer.name || "Customer"}${invoiceCustomer.company ? ` (${invoiceCustomer.company})` : ""}
Date: ${invoiceConfig.invoiceDate}
Total: Rs. ${grandTotal.toLocaleString('en-IN')}
Paid: Rs. ${(parseFloat(invoiceConfig.paidAmount) || 0).toLocaleString('en-IN')}
Balance Due: Rs. ${balanceDue.toLocaleString('en-IN')}

Bank Details:
${company.name}
${company.bank} | A/c: ${company.accountNo} | IFSC: ${company.ifsc} | UPI: ${company.upi}`;

    navigator.clipboard.writeText(text);
    toast.success("Invoice summary copied to clipboard!");
  };

  const handleReset = () => {
    const today = new Date();
    const curYear = today.getFullYear();
    const fy = today.getMonth() >= 2
      ? `${String(curYear).slice(2)}-${String(curYear + 1).slice(2)}`
      : `${String(curYear - 1).slice(2)}-${String(curYear).slice(2)}`;
    const randomSeq = String(Math.floor(1000 + Math.random() * 9000));

    setInvoiceConfig({
      invoiceNumber: `INV/${fy}/EP-${randomSeq}`,
      invoiceDate: today.toISOString().substring(0, 10),
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString().substring(0, 10),
      sacCode: "996511",
      sacDescription: "Road Transport Services of Goods / Express Courier",
      reverseCharge: "No",
      companyKey: "SRQ",
      paidAmount: 0,
      paymentStatus: "Unpaid",
      tdsDeducted: 0,
      gstRate: 18,
      notes: "Thank you for your business! Please settle the invoice within 15 days of receipt.",
      terms: "1. Goods carried at owner's risk.\n2. Interest @ 18% p.a. will be charged after due date.\n3. Subject to Dhanbad jurisdiction only."
    });
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
    setInvoiceItems([
      {
        _id: "1",
        date: new Date().toISOString().substring(0, 10),
        docketNo: "EP-" + Math.floor(100000 + Math.random() * 900000),
        origin: "Dhanbad",
        destination: "Kolkata",
        serviceType: "Express Cargo",
        weight: 15,
        amount: 1500
      }
    ]);
    setLookupBookingId("");
    toast.success("Invoice builder reset to blank state");
  };

  // Calculations
  const activeCompany = COMPANY_PROFILES[invoiceConfig.companyKey] || COMPANY_PROFILES.SRQ;
  const subtotal = invoiceItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const totalWeight = invoiceItems.reduce((sum, item) => sum + (parseFloat(item.weight) || 0), 0);
  const gstRate = parseFloat(invoiceConfig.gstRate) || 0;
  const isInterState = !(invoiceCustomer.state || "").toLowerCase().includes("jharkhand");
  const gstAmount = gstRate > 0 ? Math.round((subtotal * (gstRate / 100)) * 100) / 100 : 0;
  const cgst = !isInterState ? gstAmount / 2 : 0;
  const sgst = !isInterState ? gstAmount / 2 : 0;
  const igst = isInterState ? gstAmount : 0;
  const grandTotal = Math.round((subtotal + gstAmount) * 100) / 100;
  const paidAmount = parseFloat(invoiceConfig.paidAmount) || 0;
  const tdsDeducted = parseFloat(invoiceConfig.tdsDeducted) || 0;
  const balanceDue = Math.max(0, Math.round((grandTotal - paidAmount - tdsDeducted) * 100) / 100);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#121212]">
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #invoice-printable, #invoice-printable * {
            visibility: visible !important;
          }
          #invoice-printable {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            transform: none !important;
            margin: 0 !important;
            margin-bottom: 0 !important;
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

      {/* Top Header Controls Bar */}
      <div className="bg-white dark:bg-[#1A1A1A] border-b border-gray-200 dark:border-white/10 px-4 md:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3 shadow-sm sticky top-0 z-20 no-print">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600 dark:text-indigo-400">
            <Receipt className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
              <span>Invoice Builder</span>
              <span className="text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 px-2.5 py-0.5 rounded-full font-bold">
                Tax Invoice
              </span>
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Create, edit, print, or download official GST invoices with live preview
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle: Split View vs Full Preview */}
          <div className="flex items-center bg-gray-100 dark:bg-white/10 p-0.5 rounded-xl text-xs font-bold mr-1">
            <button
              type="button"
              onClick={() => {
                setViewMode("split");
                setIsAutoFit(true);
              }}
              className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                viewMode === "split"
                  ? "bg-white dark:bg-[#252525] text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              }`}
              title="Side-by-side Editor & Preview"
            >
              <Columns className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Split View</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode("preview");
                setIsAutoFit(true);
              }}
              className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                viewMode === "preview"
                  ? "bg-white dark:bg-[#252525] text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              }`}
              title="Expand Live Preview to full width"
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Preview Only</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
            title="Print invoice or save as PDF"
          >
            <Printer className="h-4 w-4" />
            <span>Print / PDF</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isGeneratingPdf || invoiceItems.length === 0}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
            title="Download high-resolution PDF"
          >
            <Download className="h-4 w-4" />
            <span>{isGeneratingPdf ? "Generating..." : "Download PDF"}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSendWhatsApp(grandTotal, subtotal, gstAmount, balanceDue)}
            disabled={invoiceItems.length === 0}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
            title="Send invoice breakdown to customer via WhatsApp"
          >
            <Send className="h-4 w-4" />
            <span>Send WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={() => handleCopySummary(grandTotal, subtotal, gstAmount, balanceDue)}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            title="Copy invoice summary to clipboard"
          >
            <Copy className="h-4 w-4" />
            <span className="hidden sm:inline">Copy Text</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            title="Reset form"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Main Workspace: Left Controls Drawer + Right Live Sheet Preview */}
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-65px)]">
        {/* Left Controls Drawer */}
        <div className={`${viewMode === "preview" ? "hidden" : "w-full lg:w-[380px] xl:w-[400px] shrink-0"} bg-gray-50 dark:bg-[#161616] border-r border-gray-200 dark:border-white/10 p-4 sm:p-5 space-y-4 no-print text-xs overflow-y-auto`}>
          
          {/* Booking ID Lookup Bar */}
          <div className="bg-white dark:bg-[#1f1f1f] p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5 text-indigo-600" />
                <span>Import from Booking ID / Tracking No.</span>
              </label>
              <span className="text-[10px] text-gray-400">Live Auto-Fill</span>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  value={lookupBookingId}
                  onChange={(e) => setLookupBookingId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleImportBooking()}
                  placeholder="e.g. EP5334 or Tracking ID..."
                  className="w-full pl-8 pr-2.5 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg text-xs font-mono text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                />
              </div>
              <button
                type="button"
                onClick={() => handleImportBooking()}
                disabled={isLookingUpBooking}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{isLookingUpBooking ? "Loading..." : "Import"}</span>
              </button>
            </div>
            <p className="text-[10px] text-gray-400">
              Type any existing booking ID to automatically import customer info, routes, docket numbers, and pricing.
            </p>
          </div>

          {/* Customer / Billed To Details */}
          <div className="bg-white dark:bg-[#1f1f1f] p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm space-y-3">
            <span className="font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider text-[11px] block border-b border-gray-100 dark:border-white/5 pb-2">
              Billed To / Customer Details
            </span>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-gray-600 dark:text-gray-400 font-semibold mb-1">
                  Customer / Contact Name
                </label>
                <input
                  type="text"
                  value={invoiceCustomer.name}
                  onChange={(e) => setInvoiceCustomer({ ...invoiceCustomer, name: e.target.value })}
                  placeholder="Full Name"
                  className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg font-bold text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-gray-600 dark:text-gray-400 font-semibold mb-1">
                  Company / Organization
                </label>
                <input
                  type="text"
                  value={invoiceCustomer.company}
                  onChange={(e) => setInvoiceCustomer({ ...invoiceCustomer, company: e.target.value })}
                  placeholder="Company Name (optional)"
                  className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-gray-600 dark:text-gray-400 font-semibold mb-1">
                  Partner ID (Optional)
                </label>
                <input
                  type="text"
                  value={invoiceCustomer.partnerId}
                  onChange={(e) => setInvoiceCustomer({ ...invoiceCustomer, partnerId: e.target.value })}
                  placeholder="e.g. PAT13"
                  className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg font-mono text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                />
              </div>
              <div>
                <label className="block text-gray-600 dark:text-gray-400 font-semibold mb-1">
                  Customer GSTIN
                </label>
                <input
                  type="text"
                  value={invoiceCustomer.gstNumber}
                  onChange={(e) => setInvoiceCustomer({ ...invoiceCustomer, gstNumber: e.target.value })}
                  placeholder="20XXXXX0000X0Z0"
                  className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg font-mono text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-gray-600 dark:text-gray-400 font-semibold mb-1">
                  Phone / WhatsApp
                </label>
                <input
                  type="text"
                  value={invoiceCustomer.phone}
                  onChange={(e) => setInvoiceCustomer({ ...invoiceCustomer, phone: e.target.value })}
                  placeholder="Mobile No."
                  className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg font-mono text-gray-800 dark:text-gray-100 outline-none"
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
                  placeholder="customer@email.com"
                  className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg text-gray-800 dark:text-gray-100 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-600 dark:text-gray-400 font-semibold mb-1">
                Street Address
              </label>
              <input
                type="text"
                value={invoiceCustomer.address}
                onChange={(e) => setInvoiceCustomer({ ...invoiceCustomer, address: e.target.value })}
                placeholder="Address line 1"
                className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg text-gray-800 dark:text-gray-100 outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-gray-600 dark:text-gray-400 font-semibold mb-1">City</label>
                <input
                  type="text"
                  value={invoiceCustomer.city}
                  onChange={(e) => setInvoiceCustomer({ ...invoiceCustomer, city: e.target.value })}
                  placeholder="City"
                  className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg text-gray-800 dark:text-gray-100 outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-600 dark:text-gray-400 font-semibold mb-1">State</label>
                <input
                  type="text"
                  value={invoiceCustomer.state}
                  onChange={(e) => setInvoiceCustomer({ ...invoiceCustomer, state: e.target.value })}
                  placeholder="State"
                  className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg text-gray-800 dark:text-gray-100 outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-600 dark:text-gray-400 font-semibold mb-1">Pincode</label>
                <input
                  type="text"
                  value={invoiceCustomer.pincode}
                  onChange={(e) => setInvoiceCustomer({ ...invoiceCustomer, pincode: e.target.value })}
                  placeholder="Pincode"
                  className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg font-mono text-gray-800 dark:text-gray-100 outline-none"
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
                className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg text-gray-800 dark:text-gray-100 outline-none"
              />
            </div>
          </div>

          {/* Invoice Configuration */}
          <div className="bg-white dark:bg-[#1f1f1f] p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm space-y-3">
            <div>
              <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Issuing Company Entity & Bank
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

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Invoice No.
                </label>
                <input
                  type="text"
                  value={invoiceConfig.invoiceNumber}
                  onChange={(e) => setInvoiceConfig({ ...invoiceConfig, invoiceNumber: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg font-mono font-bold text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  GST Rate
                </label>
                <select
                  value={invoiceConfig.gstRate}
                  onChange={(e) => setInvoiceConfig({ ...invoiceConfig, gstRate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg font-bold text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value={18}>18% (Courier & Relocation)</option>
                  <option value={5}>5% (GTA Transport)</option>
                  <option value={0}>0% (Exempt)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Invoice Date
                </label>
                <input
                  type="date"
                  value={invoiceConfig.invoiceDate}
                  onChange={(e) => setInvoiceConfig({ ...invoiceConfig, invoiceDate: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg font-bold text-gray-800 dark:text-gray-200 outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={invoiceConfig.dueDate}
                  onChange={(e) => setInvoiceConfig({ ...invoiceConfig, dueDate: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg font-bold text-gray-800 dark:text-gray-200 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Paid Amount (₹)
                </label>
                <input
                  type="number"
                  value={invoiceConfig.paidAmount}
                  onChange={(e) => setInvoiceConfig({ ...invoiceConfig, paidAmount: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg font-mono font-bold text-gray-800 dark:text-gray-200 outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  TDS (₹)
                </label>
                <input
                  type="number"
                  value={invoiceConfig.tdsDeducted}
                  onChange={(e) => setInvoiceConfig({ ...invoiceConfig, tdsDeducted: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg font-mono font-bold text-gray-800 dark:text-gray-200 outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Status
                </label>
                <select
                  value={invoiceConfig.paymentStatus}
                  onChange={(e) => setInvoiceConfig({ ...invoiceConfig, paymentStatus: e.target.value })}
                  className="w-full px-2 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg font-bold text-gray-800 dark:text-gray-200 outline-none"
                >
                  <option value="Paid">Paid</option>
                  <option value="Partially Paid">Partially Paid</option>
                  <option value="Unpaid">Unpaid</option>
                </select>
              </div>
            </div>
          </div>

          {/* Line Items Table in Drawer */}
          <div className="bg-white dark:bg-[#1f1f1f] p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-2">
              <label className="font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-indigo-600" />
                <span>Invoice Line Items ({invoiceItems.length})</span>
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all"
              >
                <Plus className="h-3 w-3" /> Add Item
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {invoiceItems.map((item, idx) => (
                <div
                  key={item._id || idx}
                  className="p-2.5 bg-gray-50 dark:bg-[#252525] rounded-xl border border-gray-200 dark:border-white/10 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] text-gray-400 font-bold">#{idx + 1}</span>
                    <input
                      type="text"
                      value={item.docketNo}
                      onChange={(e) => handleItemChange(idx, "docketNo", e.target.value)}
                      placeholder="Docket / Description"
                      className="flex-1 px-2 py-1 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-white/15 rounded text-xs font-mono font-bold text-gray-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(idx)}
                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-all"
                      title="Remove item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 text-[11px]">
                    <div>
                      <label className="block text-[10px] text-gray-500 font-semibold">Origin</label>
                      <input
                        type="text"
                        value={item.origin}
                        onChange={(e) => handleItemChange(idx, "origin", e.target.value)}
                        className="w-full px-1.5 py-0.5 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-white/15 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 font-semibold">Destination</label>
                      <input
                        type="text"
                        value={item.destination}
                        onChange={(e) => handleItemChange(idx, "destination", e.target.value)}
                        className="w-full px-1.5 py-0.5 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-white/15 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 font-semibold">Weight (kg)</label>
                      <input
                        type="number"
                        value={item.weight}
                        onChange={(e) => handleItemChange(idx, "weight", e.target.value)}
                        className="w-full px-1.5 py-0.5 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-white/15 rounded text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 font-semibold">Amount (₹)</label>
                      <input
                        type="number"
                        value={item.amount}
                        onChange={(e) => handleItemChange(idx, "amount", e.target.value)}
                        className="w-full px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-300 dark:border-indigo-800/40 rounded text-xs font-mono font-black text-indigo-950 dark:text-indigo-200"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {invoiceItems.length === 0 && (
                <div className="text-center py-6 text-gray-400 italic bg-gray-50 dark:bg-[#252525] rounded-xl border border-dashed border-gray-300 dark:border-white/10">
                  No line items added yet. Click "+ Add Item" or import from Booking ID.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Live A4 Sheet Preview Canvas */}
        <div
          ref={previewContainerRef}
          className="flex-1 overflow-x-auto overflow-y-auto p-3 sm:p-6 bg-gray-200 dark:bg-[#0d0d0d] flex flex-col items-center min-w-0"
        >
          {/* Zoom & Fit Toolbar */}
          <div className="w-full max-w-[800px] mb-3 flex items-center justify-between no-print px-1">
            <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 font-medium">
              <FileText className="h-4 w-4 text-indigo-600" />
              <span>Live A4 Preview (Print & PDF Ready)</span>
            </div>
            <div className="flex items-center gap-1 bg-white dark:bg-[#1a1a1a] px-2.5 py-1 rounded-lg border border-gray-200 dark:border-white/10 text-xs shadow-sm">
              <span className="text-[10px] text-gray-400 font-bold uppercase mr-1">Zoom:</span>
              <button
                type="button"
                onClick={() => {
                  setIsAutoFit(false);
                  setPreviewScale(s => Math.max(0.35, Math.round((s - 0.1) * 10) / 10));
                }}
                className="px-1.5 py-0.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded font-bold text-gray-700 dark:text-gray-300"
                title="Zoom Out"
              >
                -
              </button>
              <span className="font-mono font-bold w-12 text-center text-gray-800 dark:text-gray-200">
                {Math.round(previewScale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsAutoFit(false);
                  setPreviewScale(s => Math.min(1.2, Math.round((s + 0.1) * 10) / 10));
                }}
                className="px-1.5 py-0.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded font-bold text-gray-700 dark:text-gray-300"
                title="Zoom In"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAutoFit(true);
                  if (previewContainerRef.current) {
                    const containerW = previewContainerRef.current.clientWidth;
                    const padding = containerW > 640 ? 48 : 24;
                    const calculated = Math.min(1.0, Math.max(0.35, Math.round(((containerW - padding) / 800) * 100) / 100));
                    setPreviewScale(calculated);
                  }
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ml-1 ${
                  isAutoFit
                    ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 font-black ring-1 ring-indigo-500'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10'
                }`}
                title="Fit sheet automatically to container width"
              >
                Fit
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAutoFit(false);
                  setPreviewScale(1);
                }}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                  previewScale === 1 && !isAutoFit
                    ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 font-black ring-1 ring-indigo-500'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10'
                }`}
                title="True 100% Scale"
              >
                100%
              </button>
            </div>
          </div>

          {/* Scaled Wrapper: occupies exact transformed dimensions in document flow */}
          <div
            className="transition-all duration-150 mx-auto min-w-0"
            style={{
              width: `${Math.round(800 * previewScale)}px`,
              minHeight: `${Math.round(1120 * previewScale)}px`,
            }}
          >
            <div
              id="invoice-printable"
              className="bg-white text-gray-900 shadow-2xl rounded-2xl w-[800px] p-6 sm:p-8 border border-gray-300 origin-top-left min-w-0"
              style={{
                minHeight: "1100px",
                transform: `scale(${previewScale})`,
                transformOrigin: "top left",
              }}
            >
            {/* Header with Company Logo */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-5 border-b-2 border-indigo-600">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5 min-w-0">
                <img
                  src="/logo.png"
                  alt="Engineers Parcel"
                  className="h-12 sm:h-14 w-auto max-w-[200px] object-contain shrink-0"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                <div className="border-t sm:border-t-0 sm:border-l border-gray-200 pt-2 sm:pt-0 sm:pl-3.5 min-w-0">
                  <h1 className="text-sm sm:text-base font-black text-gray-950 uppercase tracking-tight leading-snug break-words">
                    {activeCompany.name}
                  </h1>
                  <p className="text-xs font-bold text-indigo-600 tracking-wide mt-0.5">
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

              <div className="sm:text-right shrink-0 mt-2 sm:mt-0 whitespace-nowrap">
                <span className="inline-block px-3 py-1 bg-indigo-600 text-white font-black text-[11px] uppercase tracking-widest rounded-lg shadow-sm">
                  TAX INVOICE
                </span>
                <div className="mt-2 text-xs space-y-1">
                  <p className="text-gray-500">Invoice No: <span className="font-mono font-bold text-gray-900">{invoiceConfig.invoiceNumber}</span></p>
                  <p className="text-gray-500">Invoice Date: <span className="font-bold text-gray-900">{invoiceConfig.invoiceDate ? new Date(invoiceConfig.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : "-"}</span></p>
                  <p className="text-gray-500">Due Date: <span className="font-bold text-red-600">{invoiceConfig.dueDate ? new Date(invoiceConfig.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : "-"}</span></p>
                  <p className="text-gray-500">Reverse Charge: <span className="font-bold text-gray-900">{invoiceConfig.reverseCharge}</span></p>
                </div>
              </div>
            </div>

            {/* Billed To / Shipped To Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6 text-xs">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">
                  Billed To (Customer Details)
                </p>
                <h2 className="text-sm font-black text-gray-950">
                  {invoiceCustomer.name || "Valued Client"}
                </h2>
                {invoiceCustomer.company && (
                  <p className="text-xs font-bold text-gray-800">{invoiceCustomer.company}</p>
                )}
                <div className="mt-2 text-gray-600 space-y-0.5">
                  {invoiceCustomer.address && <p>{invoiceCustomer.address}</p>}
                  {(invoiceCustomer.city || invoiceCustomer.state || invoiceCustomer.pincode) && (
                    <p>{[invoiceCustomer.city, invoiceCustomer.state, invoiceCustomer.pincode].filter(Boolean).join(", ")}</p>
                  )}
                  {invoiceCustomer.phone && <p>Phone: <b className="text-gray-800">{invoiceCustomer.phone}</b></p>}
                  {invoiceCustomer.email && <p>Email: <b>{invoiceCustomer.email}</b></p>}
                  {invoiceCustomer.gstNumber && <p className="font-mono text-gray-900">GSTIN: <b>{invoiceCustomer.gstNumber}</b></p>}
                  {invoiceCustomer.partnerId && <p className="font-mono text-indigo-700">Partner Code: <b>{invoiceCustomer.partnerId}</b></p>}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">
                    Service & Tax Specifications
                  </p>
                  <div className="space-y-1.5 text-gray-700">
                    <p>SAC Code: <b className="font-mono text-gray-950">{invoiceConfig.sacCode}</b></p>
                    <p className="text-[11px] text-gray-500">{invoiceConfig.sacDescription}</p>
                    <p>Place of Supply: <b className="text-gray-900">{invoiceCustomer.placeOfSupply}</b></p>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-gray-200 flex justify-between items-center text-[11px]">
                  <span className="text-gray-600 font-medium">Consignments Billed:</span>
                  <span className="font-black text-gray-900">{invoiceItems.length} Docket(s) &bull; {totalWeight.toFixed(2)} kg</span>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="mb-6 overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-10">#</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Docket / Tracking No.</th>
                    <th className="py-2.5 px-3">Origin ➔ Destination</th>
                    <th className="py-2.5 px-3 text-center">Weight</th>
                    <th className="py-2.5 px-3 text-right">Taxable Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {invoiceItems.map((item, idx) => (
                    <tr key={item._id || idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                      <td className="py-2 px-3 text-center text-gray-400 font-mono">{idx + 1}</td>
                      <td className="py-2 px-3 text-gray-700">
                        {item.date ? new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : "-"}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-gray-900">
                        {item.docketNo}
                      </td>
                      <td className="py-2 px-3 text-gray-800">
                        {item.origin} <span className="text-indigo-600">➔</span> {item.destination}
                        {item.serviceType && <span className="ml-1 text-[10px] text-gray-400">({item.serviceType})</span>}
                      </td>
                      <td className="py-2 px-3 text-center text-gray-800 font-mono">
                        {Number(item.weight || 0).toFixed(2)} kg
                      </td>
                      <td className="py-2 px-3 text-right font-black text-gray-900 font-mono">
                        ₹{(parseFloat(item.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  {invoiceItems.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-gray-400 italic">
                        No docket items included in this invoice yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Calculations & Bank Transfer Details */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 my-6 text-xs">
              {/* Bank Details Box */}
              <div className="w-full sm:w-1/2 p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-wider text-indigo-700">
                  Bank Transfer Details (NEFT / RTGS / IMPS)
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

              {/* Calculations Table */}
              <div className="w-full sm:w-1/2 space-y-2">
                <div className="space-y-1.5 text-right">
                  <div className="flex justify-between text-gray-600">
                    <span>Taxable Value:</span>
                    <span className="font-bold text-gray-900">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>

                  {!isInterState ? (
                    <>
                      <div className="flex justify-between text-gray-600">
                        <span>CGST ({gstRate / 2}%):</span>
                        <span className="font-bold text-gray-900">₹{cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>SGST ({gstRate / 2}%):</span>
                        <span className="font-bold text-gray-900">₹{sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-gray-600">
                      <span>IGST ({gstRate}%):</span>
                      <span className="font-bold text-gray-900">₹{igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-sm font-black text-gray-950 p-2.5 bg-indigo-50 rounded-xl border border-indigo-200 mt-2">
                    <span>Grand Total:</span>
                    <span className="text-lg text-indigo-950">
                      ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {paidAmount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-bold pt-1">
                      <span>Less Paid Amount:</span>
                      <span>-₹{paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}

                  {tdsDeducted > 0 && (
                    <div className="flex justify-between text-blue-700 font-bold">
                      <span>Less TDS Deducted:</span>
                      <span>-₹{tdsDeducted.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-xs font-black text-gray-900 pt-2 border-t border-gray-200">
                    <span>Balance Amount Due:</span>
                    <span className={balanceDue > 0 ? "text-red-600 font-black" : "text-emerald-600 font-black"}>
                      ₹{balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200 text-left">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                    Amount in Words:
                  </span>
                  <span className="font-bold text-gray-800 italic">
                    {numberToWordsIndian(grandTotal)}
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
                <p className="text-[11px] text-gray-600 leading-relaxed whitespace-pre-line">
                  {invoiceConfig.terms || "1. Goods carried at owner's risk.\n2. Interest @ 18% p.a. will be charged after due date.\n3. Subject to Dhanbad jurisdiction only."}
                </p>
              </div>

              <div className="text-right flex flex-col justify-between items-end">
                <p className="text-[11px] font-bold text-gray-800">
                  For {activeCompany.name}
                </p>
                <div className="h-12 w-36 border border-dashed border-gray-300 rounded flex items-center justify-center my-2 text-[10px] text-gray-400 font-mono">
                  [ Authorized Seal ]
                </div>
                <p className="text-xs font-black text-gray-900 border-t border-gray-300 pt-1 w-40 text-center">
                  Authorized Signatory
                </p>
              </div>
            </div>

            {/* Bottom Note */}
            <div className="mt-8 pt-3 border-t border-gray-100 text-center text-[10px] text-gray-400">
              This is a computer-generated tax invoice issued by Engineers Parcel.
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
