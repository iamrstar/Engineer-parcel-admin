import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  Calculator,
  Truck,
  Package,
  Search,
  Plus,
  Trash2,
  Printer,
  Download,
  Send,
  Copy,
  RotateCcw,
  Hash,
  FileCheck,
  Eye,
  Columns
} from "lucide-react";
import {
  COMPANY_PROFILES,
  SHIFTING_PRESETS,
  PRESET_MOVE_BUNDLES,
  numberToWordsIndian
} from "../utils/billingConstants";

export default function QuotationBuilder() {
  const [searchParams] = useSearchParams();

  const [lookupBookingId, setLookupBookingId] = useState(searchParams.get("bookingId") || "");
  const [isLookingUpBooking, setIsLookingUpBooking] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [presetFilter, setPresetFilter] = useState("All");
  const [presetSearch, setPresetSearch] = useState("");
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

  // Customer & Route Details
  const [customer, setCustomer] = useState({
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
    moveScope: searchParams.get("bundle") ? `${searchParams.get("bundle")} Shifting` : "2 BHK Shifting"
  });

  // Quotation Line Items
  const [items, setItems] = useState(() => {
    const initialBundleKey = searchParams.get("bundle") || "2BHK";
    const bundle = PRESET_MOVE_BUNDLES[initialBundleKey] || PRESET_MOVE_BUNDLES["2BHK"];
    return bundle.map((item, idx) => ({
      id: String(Date.now() + idx),
      name: item.name,
      category: item.category,
      qty: item.qty,
      unit: item.unit,
      rate: item.rate,
      amount: item.qty * item.rate
    }));
  });

  // Quotation Configuration
  const [config, setConfig] = useState(() => {
    const today = new Date();
    const curYear = today.getFullYear();
    const fy = today.getMonth() >= 2
      ? `${String(curYear).slice(2)}-${String(curYear + 1).slice(2)}`
      : `${String(curYear - 1).slice(2)}-${String(curYear).slice(2)}`;
    const randomSeq = String(Math.floor(1000 + Math.random() * 9000));
    return {
      quotationNumber: `QUO/${fy}/EP-${randomSeq}`,
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
    };
  });

  // Auto-import if bookingId passed in URL
  useEffect(() => {
    const bId = searchParams.get("bookingId");
    if (bId) {
      handleImportBooking(bId);
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
      const customerPhone = sender.phone || booking.phone || "";
      const customerEmail = sender.email || booking.email || "";
      const originCity = sender.city || booking.origin || "Origin";
      const originAddress = sender.address || booking.pickupAddress || "";
      const destCity = receiver.city || booking.destination || "Destination";
      const destAddress = receiver.address || booking.deliveryAddress || "";

      setCustomer(prev => ({
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
        setItems(importedItems);
      } else {
        const desc = booking.packageDetails?.description || booking.itemDescription || `${booking.serviceType || "Cargo Shipment"} (${bookingWeight} kg)`;
        setItems([
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
        setConfig(prev => ({
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
      setIsLookingUpBooking(false);
    }
  };

  const handleApplyMoveBundle = (bundleKey) => {
    const bundle = PRESET_MOVE_BUNDLES[bundleKey];
    if (!bundle) return;
    const newItems = bundle.map((item, idx) => ({
      id: String(Date.now() + idx),
      name: item.name,
      category: item.category,
      qty: item.qty,
      unit: item.unit,
      rate: item.rate,
      amount: item.qty * item.rate
    }));
    setItems(newItems);

    let scopeLabel = "Custom Move";
    let serviceLabel = config.serviceType;
    if (bundleKey === "1BHK") { scopeLabel = "1 BHK Shifting"; serviceLabel = "House Shifting (Packers & Movers)"; }
    else if (bundleKey === "2BHK") { scopeLabel = "2 BHK Shifting"; serviceLabel = "House Shifting (Packers & Movers)"; }
    else if (bundleKey === "3BHK") { scopeLabel = "3 BHK Shifting"; serviceLabel = "House Shifting (Packers & Movers)"; }
    else if (bundleKey === "SINGLE_ITEM") { scopeLabel = "Single Consignment"; serviceLabel = "Parcel / Courier Shipment"; }
    else if (bundleKey === "VEHICLE") { scopeLabel = "Vehicle Relocation"; serviceLabel = "Vehicle Transportation"; }

    setCustomer(prev => ({ ...prev, moveScope: scopeLabel }));
    setConfig(prev => ({ ...prev, serviceType: serviceLabel }));
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
    setItems(prev => [...prev, newItem]);
    toast.success(`Added "${preset.name}" to quotation`);
  };

  const handleItemChange = (index, field, value) => {
    setItems(prev => {
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

  const handleAddItem = () => {
    setItems(prev => [
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

  const handleDeleteItem = (index) => {
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById("quotation-printable");
    if (!element) {
      toast.error("Quotation printable view not found");
      return;
    }
    try {
      setIsGeneratingPdf(true);
      toast.loading("Generating High-Resolution Quotation PDF...", { id: "quote-pdf" });

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

      const cleanNum = (config.quotationNumber || "QUO").replace(/[\/\\?%*:|"<>]/g, "-");
      const custName = (customer.name || "Customer").replace(/[\/\\?%*:|"<>]/g, "_");
      const filename = `Quotation_${custName}_${cleanNum}.pdf`;
      pdf.save(filename);
      toast.success("Quotation PDF downloaded successfully!", { id: "quote-pdf" });
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("Error creating PDF, launching print view...", { id: "quote-pdf" });
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSendWhatsApp = (quoteGrandTotal, itemsSubtotal, packingCharge, loadingCharge, unloadingCharge, discountAmount, gstAmount) => {
    const customerPhone = (customer.phone || "").replace(/\D/g, "");
    const formattedPhone = customerPhone.length === 10 ? `91${customerPhone}` : customerPhone;
    const company = COMPANY_PROFILES[config.companyKey] || COMPANY_PROFILES.SRQ;

    const message = `*PRICE ESTIMATE / QUOTATION: ${config.quotationNumber}*
*Customer:* ${customer.name || "Valued Client"}
*Service Type:* ${config.serviceType} (${customer.moveScope || ""})
*Route:* ${customer.originCity || "Origin"} ➔ ${customer.destinationCity || "Destination"}
*Quotation Date:* ${config.quoteDate}
*Estimated Moving Date:* ${config.moveDate}
*Total Items / Articles:* ${items.length}

*Estimated Pricing Breakdown:*
• Articles / Consignment Freight: Rs. ${itemsSubtotal.toLocaleString('en-IN')}
${packingCharge > 0 ? `• Packing & Material: Rs. ${packingCharge.toLocaleString('en-IN')}\n` : ""}${loadingCharge > 0 ? `• Loading Labor: Rs. ${loadingCharge.toLocaleString('en-IN')}\n` : ""}${unloadingCharge > 0 ? `• Unloading Labor: Rs. ${unloadingCharge.toLocaleString('en-IN')}\n` : ""}${discountAmount > 0 ? `• Special Discount: -Rs. ${discountAmount.toLocaleString('en-IN')}\n` : ""}${gstAmount > 0 ? `• GST (${config.gstRate}%): Rs. ${gstAmount.toLocaleString('en-IN')}\n` : ""}*Total Estimated Cost:* Rs. ${quoteGrandTotal.toLocaleString('en-IN')} (${numberToWordsIndian(quoteGrandTotal)})

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

  const handleCopySummary = (quoteGrandTotal) => {
    const company = COMPANY_PROFILES[config.companyKey] || COMPANY_PROFILES.SRQ;
    const text = `PRICE ESTIMATE / QUOTATION: ${config.quotationNumber}
Customer: ${customer.name || "Valued Client"}
Service: ${config.serviceType} (${customer.moveScope || ""})
Route: ${customer.originCity || "Origin"} to ${customer.destinationCity || "Destination"}
Estimated Total: Rs. ${quoteGrandTotal.toLocaleString('en-IN')} (${numberToWordsIndian(quoteGrandTotal)})

Bank Details:
Company: ${company.name}
Bank: ${company.bank}
A/c No: ${company.accountNo}
IFSC: ${company.ifsc}
UPI: ${company.upi}

Quote Valid Till: ${config.validUntil}`;

    navigator.clipboard.writeText(text);
    toast.success("Quotation summary copied to clipboard!");
  };

  const handleReset = () => {
    handleApplyMoveBundle("2BHK");
    setLookupBookingId("");
    toast.success("Reset to 2 BHK standard shifting quote");
  };

  // Calculations
  const activeCompany = COMPANY_PROFILES[config.companyKey] || COMPANY_PROFILES.SRQ;
  const itemsSubtotal = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const packingCharge = parseFloat(config.packingCharge) || 0;
  const loadingCharge = parseFloat(config.loadingCharge) || 0;
  const unloadingCharge = parseFloat(config.unloadingCharge) || 0;
  const otherCharges = parseFloat(config.otherCharges) || 0;
  const insuranceGoodsVal = parseFloat(config.insuranceGoodsValue) || 0;
  const insuranceRate = parseFloat(config.insurancePercent) || 0;
  const insuranceCharge = (insuranceGoodsVal > 0 && insuranceRate > 0) ? Math.round((insuranceGoodsVal * (insuranceRate / 100)) * 100) / 100 : 0;
  const discountAmount = parseFloat(config.discountAmount) || 0;

  const netTaxable = Math.max(0, itemsSubtotal + packingCharge + loadingCharge + unloadingCharge + otherCharges + insuranceCharge - discountAmount);
  const gstAmount = config.gstRate > 0 ? Math.round((netTaxable * (parseFloat(config.gstRate) / 100)) * 100) / 100 : 0;
  const quoteGrandTotal = Math.round((netTaxable + gstAmount) * 100) / 100;
  const totalArticlesCount = items.reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);

  const filteredPresets = SHIFTING_PRESETS.filter(p => {
    const matchCat = presetFilter === "All" || p.category === presetFilter;
    const matchSearch = !presetSearch.trim() || p.name.toLowerCase().includes(presetSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#121212]">
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
          <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-600 dark:text-amber-400">
            <Calculator className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
              <span>Quotation Builder</span>
              <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-2.5 py-0.5 rounded-full font-bold">
                {customer.moveScope || "Custom Estimate"}
              </span>
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Create relocation & cargo estimates with 1-click bundles, item catalog, and live A4 preview
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
                  ? "bg-white dark:bg-[#252525] text-amber-600 dark:text-amber-400 shadow-sm"
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
            title="Print quotation or save as PDF"
          >
            <Printer className="h-4 w-4" />
            <span>Print / PDF</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isGeneratingPdf || items.length === 0}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
            title="Download high-resolution PDF"
          >
            <Download className="h-4 w-4" />
            <span>{isGeneratingPdf ? "Generating..." : "Download PDF"}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSendWhatsApp(quoteGrandTotal, itemsSubtotal, packingCharge, loadingCharge, unloadingCharge, discountAmount, gstAmount)}
            disabled={items.length === 0}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
            title="Send quotation breakdown to customer via WhatsApp"
          >
            <Send className="h-4 w-4" />
            <span>Send WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={() => handleCopySummary(quoteGrandTotal)}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            title="Copy quotation summary to clipboard"
          >
            <Copy className="h-4 w-4" />
            <span className="hidden sm:inline">Copy Text</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            title="Reset quotation"
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
                  value={lookupBookingId}
                  onChange={(e) => setLookupBookingId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleImportBooking()}
                  placeholder="e.g. EP5334 or Tracking ID..."
                  className="w-full pl-8 pr-2.5 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg text-xs font-mono text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-amber-500 uppercase"
                />
              </div>
              <button
                type="button"
                onClick={() => handleImportBooking()}
                disabled={isLookingUpBooking}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                title="Import customer and shipment data from existing booking"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{isLookingUpBooking ? "Loading..." : "Import"}</span>
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
                Single Item
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
                  value={presetSearch}
                  onChange={(e) => setPresetSearch(e.target.value)}
                  placeholder="Search shifting items..."
                  className="w-full pl-8 pr-2.5 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg text-xs text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <select
                value={presetFilter}
                onChange={(e) => setPresetFilter(e.target.value)}
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
            <span className="font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider text-[11px] block border-b border-gray-100 dark:border-white/5 pb-2">
              Customer & Route Details
            </span>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-gray-600 dark:text-gray-400 font-semibold mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={customer.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
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
                  value={customer.phone}
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
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
                  value={customer.email}
                  onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
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
                  value={customer.moveScope}
                  onChange={(e) => setCustomer({ ...customer, moveScope: e.target.value })}
                  placeholder="e.g. 2 BHK, Single Item, Villa"
                  className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg font-bold text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Origin Details */}
            <div className="p-2.5 bg-gray-50 dark:bg-[#282828] rounded-xl border border-gray-200 dark:border-white/10 space-y-2">
              <span className="font-bold text-gray-700 dark:text-gray-300 text-[11px] uppercase tracking-wider block">Pickup / Origin</span>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={customer.originCity}
                  onChange={(e) => setCustomer({ ...customer, originCity: e.target.value })}
                  placeholder="City"
                  className="w-full px-2 py-1 bg-white dark:bg-[#1f1f1f] border border-gray-300 dark:border-white/15 rounded text-xs font-bold"
                />
                <input
                  type="text"
                  value={customer.originFloor}
                  onChange={(e) => setCustomer({ ...customer, originFloor: e.target.value })}
                  placeholder="Floor"
                  className="w-full px-2 py-1 bg-white dark:bg-[#1f1f1f] border border-gray-300 dark:border-white/15 rounded text-xs"
                />
                <select
                  value={customer.originLift}
                  onChange={(e) => setCustomer({ ...customer, originLift: e.target.value })}
                  className="w-full px-2 py-1 bg-white dark:bg-[#1f1f1f] border border-gray-300 dark:border-white/15 rounded text-xs"
                >
                  <option value="Yes">Lift: Yes</option>
                  <option value="No">Lift: No</option>
                </select>
              </div>
              <input
                type="text"
                value={customer.originAddress}
                onChange={(e) => setCustomer({ ...customer, originAddress: e.target.value })}
                placeholder="Complete pickup street address..."
                className="w-full px-2 py-1 bg-white dark:bg-[#1f1f1f] border border-gray-300 dark:border-white/15 rounded text-xs text-gray-800 dark:text-gray-200"
              />
            </div>

            {/* Destination Details */}
            <div className="p-2.5 bg-gray-50 dark:bg-[#282828] rounded-xl border border-gray-200 dark:border-white/10 space-y-2">
              <span className="font-bold text-gray-700 dark:text-gray-300 text-[11px] uppercase tracking-wider block">Delivery / Destination</span>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={customer.destinationCity}
                  onChange={(e) => setCustomer({ ...customer, destinationCity: e.target.value })}
                  placeholder="City"
                  className="w-full px-2 py-1 bg-white dark:bg-[#1f1f1f] border border-gray-300 dark:border-white/15 rounded text-xs font-bold"
                />
                <input
                  type="text"
                  value={customer.destinationFloor}
                  onChange={(e) => setCustomer({ ...customer, destinationFloor: e.target.value })}
                  placeholder="Floor"
                  className="w-full px-2 py-1 bg-white dark:bg-[#1f1f1f] border border-gray-300 dark:border-white/15 rounded text-xs"
                />
                <select
                  value={customer.destinationLift}
                  onChange={(e) => setCustomer({ ...customer, destinationLift: e.target.value })}
                  className="w-full px-2 py-1 bg-white dark:bg-[#1f1f1f] border border-gray-300 dark:border-white/15 rounded text-xs"
                >
                  <option value="Yes">Lift: Yes</option>
                  <option value="No">Lift: No</option>
                </select>
              </div>
              <input
                type="text"
                value={customer.destinationAddress}
                onChange={(e) => setCustomer({ ...customer, destinationAddress: e.target.value })}
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
                value={config.companyKey}
                onChange={(e) => setConfig({ ...config, companyKey: e.target.value })}
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
                  value={config.quotationNumber}
                  onChange={(e) => setConfig({ ...config, quotationNumber: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg font-mono font-bold text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Service Type
                </label>
                <select
                  value={config.serviceType}
                  onChange={(e) => setConfig({ ...config, serviceType: e.target.value })}
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
                  value={config.quoteDate}
                  onChange={(e) => setConfig({ ...config, quoteDate: e.target.value })}
                  className="w-full px-2 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg font-bold text-gray-800 dark:text-gray-200 outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Move Date
                </label>
                <input
                  type="date"
                  value={config.moveDate}
                  onChange={(e) => setConfig({ ...config, moveDate: e.target.value })}
                  className="w-full px-2 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg font-bold text-gray-800 dark:text-gray-200 outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Valid Until
                </label>
                <input
                  type="date"
                  value={config.validUntil}
                  onChange={(e) => setConfig({ ...config, validUntil: e.target.value })}
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
                <span>Inventory Items ({items.length})</span>
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all"
              >
                <Plus className="h-3 w-3" /> Add Item
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {items.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-2.5 bg-gray-50 dark:bg-[#252525] rounded-xl border border-gray-200 dark:border-white/10 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] text-gray-400 font-bold">#{idx + 1}</span>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleItemChange(idx, "name", e.target.value)}
                      placeholder="Item description..."
                      className="flex-1 px-2 py-1 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-white/15 rounded text-xs font-bold text-gray-900 dark:text-white"
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
                      <label className="block text-[10px] text-gray-500 font-semibold">Category</label>
                      <input
                        type="text"
                        value={item.category}
                        onChange={(e) => handleItemChange(idx, "category", e.target.value)}
                        className="w-full px-1.5 py-0.5 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-white/15 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 font-semibold">Qty</label>
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => handleItemChange(idx, "qty", e.target.value)}
                        className="w-full px-1.5 py-0.5 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-white/15 rounded text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 font-semibold">Rate (₹)</label>
                      <input
                        type="number"
                        value={item.rate}
                        onChange={(e) => handleItemChange(idx, "rate", e.target.value)}
                        className="w-full px-1.5 py-0.5 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-white/15 rounded text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 font-semibold">Amount (₹)</label>
                      <input
                        type="number"
                        value={item.amount}
                        onChange={(e) => handleItemChange(idx, "amount", e.target.value)}
                        className="w-full px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800/40 rounded text-xs font-mono font-black text-amber-950 dark:text-amber-200"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {items.length === 0 && (
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
                  value={config.packingCharge}
                  onChange={(e) => setConfig({ ...config, packingCharge: e.target.value })}
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
                  value={config.loadingCharge}
                  onChange={(e) => setConfig({ ...config, loadingCharge: e.target.value })}
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
                  value={config.unloadingCharge}
                  onChange={(e) => setConfig({ ...config, unloadingCharge: e.target.value })}
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
                  value={config.otherCharges}
                  onChange={(e) => setConfig({ ...config, otherCharges: e.target.value })}
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
                    value={config.insuranceGoodsValue}
                    onChange={(e) => setConfig({ ...config, insuranceGoodsValue: e.target.value })}
                    placeholder="e.g. 100000"
                    className="w-full px-2 py-1 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-white/15 rounded text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block mb-0.5">Insurance Rate (%)</span>
                  <input
                    type="number"
                    step="0.5"
                    value={config.insurancePercent}
                    onChange={(e) => setConfig({ ...config, insurancePercent: e.target.value })}
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
                  value={config.discountAmount}
                  onChange={(e) => setConfig({ ...config, discountAmount: e.target.value })}
                  placeholder="0"
                  className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg font-mono font-bold text-emerald-700 dark:text-emerald-400 outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-600 dark:text-gray-400 mb-1">
                  GST Rate
                </label>
                <select
                  value={config.gstRate}
                  onChange={(e) => setConfig({ ...config, gstRate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/10 rounded-lg font-bold text-gray-800 dark:text-gray-200 outline-none"
                >
                  <option value={18}>18% (Comprehensive Relocation)</option>
                  <option value={5}>5% (GTA Transport Service)</option>
                  <option value={0}>0% (Tax Exempt / Nil)</option>
                </select>
              </div>
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
              <FileCheck className="h-4 w-4 text-amber-600" />
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
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-black ring-1 ring-amber-500'
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
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-black ring-1 ring-amber-500'
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
              id="quotation-printable"
              className="bg-white text-gray-900 shadow-2xl rounded-2xl w-[800px] p-6 sm:p-8 border border-gray-300 origin-top-left min-w-0"
              style={{
                minHeight: "1100px",
                transform: `scale(${previewScale})`,
                transformOrigin: "top left",
              }}
            >
            {/* Header with Company Logo */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-5 border-b-2 border-amber-600">
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

              <div className="sm:text-right shrink-0 mt-2 sm:mt-0 whitespace-nowrap">
                <span className="inline-block px-3 py-1 bg-amber-600 text-white font-black text-[11px] uppercase tracking-widest rounded-lg shadow-sm">
                  PRICE QUOTATION / ESTIMATE
                </span>
                <div className="mt-2 text-xs space-y-1">
                  <p className="text-gray-500">Quote No: <span className="font-mono font-bold text-gray-900">{config.quotationNumber}</span></p>
                  <p className="text-gray-500">Date: <span className="font-bold text-gray-900">{config.quoteDate ? new Date(config.quoteDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : "-"}</span></p>
                  <p className="text-gray-500">Est. Moving Date: <span className="font-bold text-amber-700">{config.moveDate ? new Date(config.moveDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : "-"}</span></p>
                  <p className="text-gray-500">Valid Till: <span className="font-bold text-red-600">{config.validUntil ? new Date(config.validUntil).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : "-"}</span></p>
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
                  {customer.name || "Valued Client"}
                </h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                    {config.serviceType}
                  </span>
                  <span className="text-[11px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
                    {customer.moveScope}
                  </span>
                </div>
                <div className="mt-2.5 text-gray-600 space-y-1">
                  {customer.phone && <p>Phone / WhatsApp: <b className="text-gray-900">{customer.phone}</b></p>}
                  {customer.email && <p>Email: <b>{customer.email}</b></p>}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">
                    Relocation Route & Specifications
                  </p>
                  <div className="bg-white p-2.5 rounded-lg border border-gray-200 space-y-1 mb-2">
                    <div className="flex items-center justify-between font-bold text-gray-900">
                      <span>{customer.originCity || "Origin"}</span>
                      <span className="text-amber-600">➔</span>
                      <span>{customer.destinationCity || "Destination"}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-gray-500">
                      <span>Floor: {customer.originFloor} (Lift: {customer.originLift})</span>
                      <span>Floor: {customer.destinationFloor} (Lift: {customer.destinationLift})</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-gray-600 space-y-0.5">
                    {customer.originAddress && <p className="truncate">From: {customer.originAddress}</p>}
                    {customer.destinationAddress && <p className="truncate">To: {customer.destinationAddress}</p>}
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between items-center text-[11px]">
                  <span className="text-gray-600 font-medium">Articles Count:</span>
                  <span className="font-black text-gray-900">{items.length} items ({totalArticlesCount} total articles)</span>
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
                  {items.map((item, idx) => (
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
                  {items.length === 0 && (
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
                      <span>Transit Risk Insurance Cover ({config.insurancePercent}%):</span>
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
                      <span>GST ({config.gstRate}%):</span>
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
                  {config.terms || "1. 50% advance upon packing commencement, balance 50% upon safe door delivery. 2. Quotation valid for 15 days from issue date. 3. Subject to Dhanbad jurisdiction."}
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

            {/* Bottom Disclaimer */}
            <div className="mt-8 pt-3 border-t border-gray-100 text-center text-[10px] text-gray-400">
              This is an official price quotation generated by Engineers Parcel. To confirm booking, reply with approval or call +91 9708815717.
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
