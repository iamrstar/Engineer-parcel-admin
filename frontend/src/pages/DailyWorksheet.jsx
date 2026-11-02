import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import {
  FileSpreadsheet,
  Download,
  Save,
  Plus,
  Trash2,
  Settings,
  Zap,
  Calendar,
  CheckCircle2,
  Clock,
  User,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Check,
  RotateCcw,
  Sparkles,
  Info,
  X,
  Layers,
  ArrowUpDown,
  Copy,
  Users
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL;

const STATUS_OPTIONS = [
  { value: "Present", label: "Present", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "Leave", label: "Leave", color: "bg-rose-50 text-rose-700 border-rose-200" },
  { value: "Half Day", label: "Half Day", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "Weekly Off", label: "Weekly Off", color: "bg-slate-100 text-slate-600 border-slate-200" },
  { value: "Holiday", label: "Holiday", color: "bg-purple-50 text-purple-700 border-purple-200" },
];

// Presets for quick template creation
const PRESET_TEMPLATES = {
  accounts: {
    title: "DAILY WORK LOG",
    designation: "Accounts & Billing Executive",
    instructions: "YELLOW cells = you fill. Fill ONCE at day end (before leaving). Numbers only - 0 if nothing happened. Leave a day completely blank only if you were on leave.",
    fields: [
      { key: "totalOrders", label: "Total orders", type: "number", placeholder: "0", summaryType: "sum", order: 1 },
      { key: "quotationsPrepared", label: "Quotations / Invoice prepared", type: "number", placeholder: "0", summaryType: "sum", order: 2 },
      { key: "invoicesSent", label: "Invoices send", type: "number", placeholder: "0", summaryType: "sum", order: 3 },
      { key: "invoiceValue", label: "Invoice value (Rs)", type: "number", placeholder: "0", summaryType: "sum", order: 4 },
      { key: "receivingInvoice", label: "Receiving Invoice", type: "number", placeholder: "0", summaryType: "sum", order: 5 },
      { key: "paymentsReceived", label: "Payments received (Rs)", type: "number", placeholder: "0", summaryType: "sum", order: 6 },
      { key: "paymentFollowup", label: "Payment follow-up calls", type: "number", placeholder: "0", summaryType: "sum", order: 7 },
      { key: "pendingDues", label: "Pending dues at day end (Rs)", type: "number", placeholder: "0", summaryType: "none", order: 8 },
      { key: "pettyCash", label: "Petty cash closing balance (Rs)", type: "number", placeholder: "0", summaryType: "none", order: 9 },
      { key: "biggestProblem", label: "Biggest problem today (1 line)", type: "text", placeholder: "e.g. Customer not picking call at Hirapur", summaryType: "none", order: 10 }
    ]
  },
  operations: {
    title: "DAILY WORK LOG",
    designation: "Operations & Customer Relations Executive",
    instructions: "YELLOW cells = you fill. Fill ONCE at day end (before leaving). Numbers only - 0 if nothing happened. Leave a day completely blank only if you were on leave.",
    fields: [
      { key: "newLeads", label: "New leads received", type: "number", placeholder: "0", summaryType: "sum", order: 1 },
      { key: "leadsCalled", label: "Leads called within 30 min", type: "number", placeholder: "0", summaryType: "sum", order: 2 },
      { key: "leadsPassedSabir", label: "Leads passed to Sabir (B2B)", type: "number", placeholder: "0", summaryType: "sum", order: 3 },
      { key: "ordersClosed", label: "Small orders closed by me", type: "number", placeholder: "0", summaryType: "sum", order: 4 },
      { key: "ordersTracked", label: "Orders tracked & updated in dashboard", type: "number", placeholder: "0", summaryType: "sum", order: 5 },
      { key: "satisfactionCalls", label: "Satisfaction calls done", type: "number", placeholder: "0", summaryType: "sum", order: 6 },
      { key: "quoteFollowup", label: "Quote follow-up calls", type: "number", placeholder: "0", summaryType: "sum", order: 7 },
      { key: "shiftingNotes", label: "Shifting / Field Work (Hours / Notes)", type: "text", placeholder: "e.g. Warehouse shifting 11am-3pm", summaryType: "none", order: 8 },
      { key: "biggestProblem", label: "Biggest problem today (1 line)", type: "text", placeholder: "e.g. Customer not picking call at Hirapur", summaryType: "none", order: 9 }
    ]
  },
  general: {
    title: "DAILY WORK LOG",
    designation: "Executive",
    instructions: "YELLOW cells = you fill. Fill ONCE at day end (before leaving). Numbers only - 0 if nothing happened.",
    fields: [
      { key: "tasksCompleted", label: "Tasks Completed", type: "number", placeholder: "0", summaryType: "sum", order: 1 },
      { key: "ordersHandled", label: "Orders Handled", type: "number", placeholder: "0", summaryType: "sum", order: 2 },
      { key: "callsMade", label: "Calls / Queries Handled", type: "number", placeholder: "0", summaryType: "sum", order: 3 },
      { key: "workSummary", label: "Work Summary / Notes", type: "text", placeholder: "Brief description of tasks", summaryType: "none", order: 4 },
      { key: "issuesFaced", label: "Issues / Challenges", type: "text", placeholder: "Any blockers", summaryType: "none", order: 5 }
    ]
  }
};

export default function DailyWorksheet() {
  const { user } = useAuth();
  const isAdmin = user && (!user.role || user.role.toLowerCase() === "admin" || user.role.toLowerCase() === "main_admin");

  // Current Month calculation: default "YYYY-MM"
  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [staffList, setStaffList] = useState([]);
  const [allTemplates, setAllTemplates] = useState([]);

  const [worksheet, setWorksheet] = useState(null);
  const [template, setTemplate] = useState(null);
  const [targetUser, setTargetUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Editable local entries
  const [entries, setEntries] = useState([]);

  // Modals
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isQuickFillModalOpen, setIsQuickFillModalOpen] = useState(false);

  // Template editor state (for admin)
  const [templateForm, setTemplateForm] = useState({
    title: "DAILY WORK LOG",
    designation: "Operations & Customer Relations Executive",
    companyName: "Engineers Parcel",
    instructions: "YELLOW cells = you fill. Fill ONCE at day end (before leaving). Numbers only - 0 if nothing happened. Leave a day completely blank only if you were on leave.",
    assignedUserIds: [],
    fields: [],
  });

  // Quick fill form state
  const [quickFillData, setQuickFillData] = useState({
    date: new Date().toISOString().split("T")[0],
    status: "Present",
    values: {},
  });

  // Fetch Staff list for Admin dropdown
  useEffect(() => {
    if (isAdmin) {
      axios
        .get(`${API_BASE}/api/worksheets/staff-list`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
        .then((res) => {
          if (res.data?.success && res.data.staff?.length > 0) {
            setStaffList(res.data.staff);
            // Default to Sushank or Aman if available
            if (!selectedStaffId) {
              const amanOrSushank = res.data.staff.find((s) => s.username?.toLowerCase().includes("sushank") || s.username?.toLowerCase().includes("aman"));
              setSelectedStaffId(amanOrSushank ? amanOrSushank._id : res.data.staff[0]._id);
            }
          }
        })
        .catch((err) => console.error("Error fetching staff list:", err));
    }
  }, [isAdmin]);

  // Fetch all templates (Admin)
  const fetchTemplates = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/worksheets/templates`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (res.data?.success) {
        setAllTemplates(res.data.templates || []);
      }
    } catch (err) {
      console.error("Error fetching templates:", err);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchTemplates();
    }
  }, [isAdmin]);

  // Fetch Monthly Worksheet
  const fetchWorksheet = async () => {
    try {
      setLoading(true);
      const params = { month: selectedMonth };
      if (selectedStaffId && isAdmin) {
        params.userId = selectedStaffId;
      }

      const res = await axios.get(`${API_BASE}/api/worksheets/monthly`, {
        params,
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      if (res.data?.success) {
        setWorksheet(res.data.worksheet);
        setTemplate(res.data.template);
        setTargetUser(res.data.targetUser);
        setEntries(res.data.worksheet.entries || []);
        setHasUnsavedChanges(false);

        // Pre-populate quick fill with today's values if present
        const todayDayNum = new Date().getDate();
        const todayEntry = res.data.worksheet.entries.find((e) => e.dayNumber === todayDayNum);
        if (todayEntry) {
          setQuickFillData({
            date: new Date().toISOString().split("T")[0],
            status: todayEntry.status || "Present",
            values: todayEntry.values || {},
          });
        }
      }
    } catch (err) {
      console.error("Error fetching monthly worksheet:", err);
      toast.error(err.response?.data?.message || "Failed to load worksheet");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorksheet();
  }, [selectedMonth, selectedStaffId]);

  // Handle cell value changes inline
  const handleCellChange = (dayNumber, fieldKey, value) => {
    setEntries((prev) =>
      prev.map((entry) => {
        if (entry.dayNumber === dayNumber) {
          const updatedValues = { ...(entry.values || {}), [fieldKey]: value };
          const hasValues = Object.values(updatedValues).some((v) => v !== "" && v !== null && v !== undefined);
          return {
            ...entry,
            values: updatedValues,
            isFilled: hasValues || (!!entry.status && entry.status !== "Weekly Off"),
          };
        }
        return entry;
      })
    );
    setHasUnsavedChanges(true);
  };

  // Handle status change inline
  const handleStatusChange = (dayNumber, newStatus) => {
    setEntries((prev) =>
      prev.map((entry) => {
        if (entry.dayNumber === dayNumber) {
          const hasValues = entry.values && Object.values(entry.values).some((v) => v !== "" && v !== null && v !== undefined);
          return {
            ...entry,
            status: newStatus,
            isFilled: hasValues || (!!newStatus && newStatus !== "Weekly Off"),
          };
        }
        return entry;
      })
    );
    setHasUnsavedChanges(true);
  };

  // Batch Save changes to backend
  const handleSaveAll = async () => {
    if (!worksheet?._id) return;
    try {
      setSaving(true);
      const res = await axios.put(
        `${API_BASE}/api/worksheets/batch`,
        {
          worksheetId: worksheet._id,
          entries: entries,
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );

      if (res.data?.success) {
        setWorksheet(res.data.worksheet);
        setEntries(res.data.worksheet.entries || []);
        setHasUnsavedChanges(false);
        toast.success("Worksheet saved successfully! 💾");
      }
    } catch (err) {
      console.error("Error saving worksheet:", err);
      toast.error("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Keyboard shortcut Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (hasUnsavedChanges) {
          handleSaveAll();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasUnsavedChanges, entries, worksheet]);

  // Quick fill submission
  const handleQuickFillSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await axios.post(
        `${API_BASE}/api/worksheets/quick-fill`,
        {
          userId: selectedStaffId || user?._id,
          date: quickFillData.date,
          status: quickFillData.status,
          values: quickFillData.values,
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );

      if (res.data?.success) {
        toast.success("Today's work log saved! 🎉");
        setIsQuickFillModalOpen(false);
        fetchWorksheet();
      }
    } catch (err) {
      console.error("Error in quick fill:", err);
      toast.error("Failed to submit work log");
    } finally {
      setSaving(false);
    }
  };

  // Open Template Editor modal with specific template or current template
  const handleOpenTemplateModal = (tpl) => {
    const activeTpl = tpl || template;
    if (activeTpl) {
      setTemplateForm({
        _id: activeTpl._id,
        title: activeTpl.title || "DAILY WORK LOG",
        designation: activeTpl.designation || "Operations & Customer Relations Executive",
        companyName: activeTpl.companyName || "Engineers Parcel",
        instructions: activeTpl.instructions || "",
        assignedUserIds: activeTpl.assignedUserIds ? activeTpl.assignedUserIds.map((u) => (typeof u === "object" ? u._id : u)) : [],
        fields: activeTpl.fields ? JSON.parse(JSON.stringify(activeTpl.fields)) : [],
      });
    } else {
      // New blank template
      setTemplateForm({
        title: "DAILY WORK LOG",
        designation: "Executive",
        companyName: "Engineers Parcel",
        instructions: "YELLOW cells = you fill. Fill ONCE at day end (before leaving). Numbers only - 0 if nothing happened.",
        assignedUserIds: selectedStaffId ? [selectedStaffId] : [],
        fields: JSON.parse(JSON.stringify(PRESET_TEMPLATES.general.fields)),
      });
    }
    setIsTemplateModalOpen(true);
  };

  // Apply a Preset in Template Editor
  const handleApplyPreset = (presetKey) => {
    const preset = PRESET_TEMPLATES[presetKey];
    if (preset) {
      setTemplateForm((prev) => ({
        ...prev,
        title: preset.title,
        designation: preset.designation,
        instructions: preset.instructions,
        fields: JSON.parse(JSON.stringify(preset.fields)),
      }));
      toast.success(`Applied "${preset.designation}" preset! ✨`);
    }
  };

  // Template update submission (Admin only)
  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      let res;
      if (templateForm._id) {
        res = await axios.put(
          `${API_BASE}/api/worksheets/templates/${templateForm._id}`,
          templateForm,
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
      } else {
        res = await axios.post(
          `${API_BASE}/api/worksheets/templates`,
          templateForm,
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
      }

      if (res.data?.success) {
        toast.success("Template & custom fields saved! ✨");
        setIsTemplateModalOpen(false);
        fetchTemplates();
        fetchWorksheet();
      }
    } catch (err) {
      console.error("Error updating template:", err);
      toast.error(err.response?.data?.message || "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  // Delete a template (Admin only)
  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm("Are you sure you want to delete this sheet template?")) return;
    try {
      const res = await axios.delete(`${API_BASE}/api/worksheets/templates/${templateId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (res.data?.success) {
        toast.success("Template removed");
        fetchTemplates();
        fetchWorksheet();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Cannot delete template");
    }
  };

  // Add field to template
  const handleAddField = () => {
    const newField = {
      key: `field_${Date.now()}`,
      label: "New Metric",
      type: "number",
      placeholder: "0",
      summaryType: "sum",
      order: templateForm.fields.length + 1,
    };
    setTemplateForm({
      ...templateForm,
      fields: [...templateForm.fields, newField],
    });
  };

  // Remove field from template
  const handleRemoveField = (index) => {
    const updated = [...templateForm.fields];
    updated.splice(index, 1);
    setTemplateForm({ ...templateForm, fields: updated });
  };

  // Field change in template editor
  const handleFieldPropertyChange = (index, prop, value) => {
    const updated = [...templateForm.fields];
    updated[index][prop] = value;
    if (prop === "label" && !updated[index].customKeySet) {
      // Auto-generate key from label
      updated[index].key = value
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]/g, "")
        .substring(0, 20) || `f_${index}`;
    }
    setTemplateForm({ ...templateForm, fields: updated });
  };

  // Excel Export
  const handleExportExcel = async () => {
    try {
      toast.loading("Generating Excel spreadsheet...", { id: "export-toast" });
      const token = localStorage.getItem("token");
      const url = `${API_BASE}/api/worksheets/export-excel?worksheetId=${worksheet?._id || ""}&userId=${selectedStaffId || ""}&month=${selectedMonth}`;
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to export Excel");

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      const safeName = (targetUser?.name || worksheet?.staffName || user?.name || "Staff").replace(/[^a-zA-Z0-9]/g, "_");
      a.download = `EP_Daily_Sheet_${safeName}_${selectedMonth}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success("Excel sheet downloaded! 📊", { id: "export-toast" });
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Failed to export Excel file", { id: "export-toast" });
    }
  };

  // Live totals calculation from entries
  const computedTotals = useMemo(() => {
    const totals = {
      daysPresent: 0,
      daysLeave: 0,
      daysHalfDay: 0,
      daysWeeklyOff: 0,
      filledCount: 0,
      fieldSums: {},
    };

    const activeFields = template?.fields || [];
    activeFields.forEach((f) => {
      totals.fieldSums[f.key] = 0;
    });

    entries.forEach((entry) => {
      if (entry.status === "Present") totals.daysPresent++;
      else if (entry.status === "Leave") totals.daysLeave++;
      else if (entry.status === "Half Day") totals.daysHalfDay++;
      else if (entry.status === "Weekly Off") totals.daysWeeklyOff++;

      if (entry.isFilled) totals.filledCount++;

      if (entry.values) {
        activeFields.forEach((f) => {
          if (f.summaryType === "sum" || f.summaryType === "average") {
            const num = parseFloat(entry.values[f.key]);
            if (!isNaN(num)) {
              totals.fieldSums[f.key] = (totals.fieldSums[f.key] || 0) + num;
            }
          }
        });
      }
    });

    // Averages
    activeFields.forEach((f) => {
      if (f.summaryType === "average" && totals.daysPresent > 0) {
        totals.fieldSums[f.key] = parseFloat((totals.fieldSums[f.key] / totals.daysPresent).toFixed(1));
      }
    });

    return totals;
  }, [entries, template]);

  // Quick Month Navigation Tabs (Google Sheet style: Oct, Nov, Dec, etc.)
  const monthTabs = useMemo(() => {
    const list = [];
    const base = new Date();
    // Include Oct 2026, Nov 2026, etc.
    for (let i = -2; i <= 1; i++) {
      const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthShort = d.toLocaleString("default", { month: "short" }).toUpperCase();
      const label = `Daily Log (${monthShort})`;
      list.push({ key, label, full: d.toLocaleString("default", { month: "long", year: "numeric" }) });
    }
    return list;
  }, []);

  const activeFields = template?.fields || [];
  const currentStaffDisplayName = targetUser?.name || worksheet?.staffName || user?.name || "Staff";

  return (
    <div className="space-y-6 pb-20 max-w-[1750px] mx-auto px-2 sm:px-4">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Navy Blue Signature Title Banner matching Google Sheet */}
        <div className="bg-[#0D233A] text-white px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 rounded-xl border border-blue-400/30">
              <FileSpreadsheet className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg md:text-xl font-black tracking-wide text-white uppercase">
                  {template?.title || "DAILY WORK LOG"} - {currentStaffDisplayName.toUpperCase()}
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 font-semibold border border-blue-400/30">
                  {template?.designation || "Executive"}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-700/60 text-slate-300 font-medium">
                  {template?.companyName || "Engineers Parcel"}
                </span>
              </div>
              <p className="text-xs text-blue-200/80 mt-1 flex items-center gap-2">
                <span>Month start date: <strong className="text-yellow-300">{worksheet?.monthStartDate || `01-${selectedMonth}`}</strong></span>
                <span>•</span>
                <span className="truncate max-w-xl hidden sm:inline">{template?.instructions || "YELLOW cells = you fill. Fill ONCE at day end before leaving."}</span>
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsQuickFillModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow transition-all active:scale-95"
            >
              <Zap className="w-4 h-4" />
              <span>Fill Today's Work</span>
            </button>

            {hasUnsavedChanges && (
              <button
                onClick={handleSaveAll}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow transition-all animate-pulse active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? "Saving..." : "Save Changes"}</span>
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => handleOpenTemplateModal(template)}
                className="inline-flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs rounded-xl border border-slate-700 transition-all"
              >
                <Settings className="w-4 h-4 text-slate-300" />
                <span className="hidden sm:inline">Manage Staff Sheets</span>
              </button>
            )}

            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm hover:shadow transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {/* Toolbar: Staff Switcher (Admin) + Month Tabs + Stats */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Staff Selector (Admin only) */}
            {isAdmin ? (
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-blue-300 shadow-xs ring-1 ring-blue-100">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-blue-900">Select Staff:</span>
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="text-xs font-extrabold text-slate-900 bg-transparent border-none outline-none focus:ring-0 cursor-pointer pr-4"
                >
                  {staffList.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name || s.username} ({s.username})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                <User className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800">{currentStaffDisplayName}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                  {template?.designation || "Staff"}
                </span>
              </div>
            )}

            {/* Month Tabs (Google Sheet style) */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-300 shadow-xs">
              <Calendar className="w-4 h-4 text-slate-400 ml-2 mr-1" />
              {monthTabs.map((tab) => {
                const isActive = selectedMonth === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setSelectedMonth(tab.key)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      isActive
                        ? "bg-[#0D233A] text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md border border-slate-200 ml-1 outline-none"
              />
            </div>

            {hasUnsavedChanges ? (
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                Unsaved edits (Press Ctrl+S to save)
              </span>
            ) : (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> All saved
              </span>
            )}
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-center shadow-xs">
              <div className="text-[10px] uppercase font-bold text-slate-400">Days Present</div>
              <div className="text-sm font-black text-emerald-600">{computedTotals.daysPresent} <span className="text-[10px] text-slate-400 font-normal">/ {entries.length}</span></div>
            </div>
            <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-center shadow-xs">
              <div className="text-[10px] uppercase font-bold text-slate-400">Leaves</div>
              <div className="text-sm font-black text-rose-600">{computedTotals.daysLeave}</div>
            </div>
            <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-center shadow-xs">
              <div className="text-[10px] uppercase font-bold text-slate-400">Days Filled</div>
              <div className="text-sm font-black text-blue-600">{computedTotals.filledCount}</div>
            </div>
            <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-center shadow-xs">
              <div className="text-[10px] uppercase font-bold text-slate-400">Completion</div>
              <div className="text-sm font-black text-indigo-600">
                {entries.length > 0 ? Math.round((computedTotals.filledCount / entries.length) * 100) : 0}%
              </div>
            </div>
          </div>
        </div>

        {/* Legend Notice matching screenshot */}
        <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-2 flex items-center justify-between text-xs text-yellow-900">
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 bg-[#FFF9C4] border border-amber-300 rounded shadow-xs" />
            <span className="font-semibold">YELLOW cells = you fill.</span>
            <span className="text-yellow-800">Fill ONCE at day end (before leaving). Numbers only — 0 if nothing happened. Leave a day completely blank only if you were on leave.</span>
          </div>
          <div className="hidden md:flex items-center gap-3 text-[11px] font-medium text-slate-600">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Present
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Leave
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Half Day
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-400" /> Weekly Off
            </span>
          </div>
        </div>

        {/* Spreadsheet Table View */}
        {loading ? (
          <div className="p-16 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600">Loading {currentStaffDisplayName}'s worksheet data...</p>
          </div>
        ) : (
          <div className="overflow-x-auto relative max-h-[750px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs select-none">
              {/* Header Row (Navy Blue, matching screenshot) */}
              <thead className="sticky top-0 z-20 bg-[#102A45] text-white">
                <tr>
                  <th className="py-3 px-3 text-center font-bold tracking-wider border border-slate-700 w-24 sticky left-0 z-30 bg-[#102A45]">
                    Date
                  </th>
                  <th className="py-3 px-2 text-center font-bold tracking-wider border border-slate-700 w-16">
                    Day
                  </th>
                  <th className="py-3 px-3 text-center font-bold tracking-wider border border-slate-700 w-32">
                    Status
                  </th>
                  {activeFields.map((field) => (
                    <th
                      key={field.key}
                      className="py-3 px-3 text-center font-bold tracking-wider border border-slate-700 min-w-[130px] max-w-[240px]"
                      title={field.label}
                    >
                      <div className="flex flex-col items-center">
                        <span className="line-clamp-2 leading-tight">{field.label}</span>
                        {field.summaryType !== "none" && (
                          <span className="text-[9px] font-normal text-blue-300 uppercase mt-0.5">
                            ({field.summaryType})
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="py-3 px-3 text-center font-bold tracking-wider border border-slate-700 w-20">
                    Filled?
                  </th>
                </tr>
              </thead>

              <tbody>
                {/* EXAMPLE ROW (Matching the screenshot example) */}
                <tr className="bg-slate-100 text-slate-500 italic text-[11px] border-b border-slate-300">
                  <td className="py-1.5 px-3 text-center font-medium sticky left-0 bg-slate-100 border-r border-slate-300">
                    EXAMPLE -&gt;
                  </td>
                  <td className="py-1.5 px-2 text-center border-r border-slate-300">Tue</td>
                  <td className="py-1.5 px-3 text-center font-semibold text-emerald-700 border-r border-slate-300">Present</td>
                  {activeFields.map((field) => (
                    <td key={field.key} className="py-1.5 px-3 text-center border-r border-slate-300">
                      {field.type === "number" ? "14" : (field.label.includes("problem") ? "Customer not picking call at Hirapur" : "Warehouse shifting")}
                    </td>
                  ))}
                  <td className="py-1.5 px-3 text-center text-emerald-600 font-semibold">Yes</td>
                </tr>

                {/* DAILY ENTRIES */}
                {entries.map((entry) => {
                  const isSunday = entry.dayOfWeek === "Sun";
                  const isToday =
                    selectedMonth === currentMonthStr &&
                    entry.dayNumber === today.getDate();

                  // Row background styling
                  let rowBg = "bg-white hover:bg-slate-50/70";
                  if (isToday) rowBg = "bg-blue-50/50 hover:bg-blue-50/80";
                  else if (isSunday) rowBg = "bg-slate-50/80";

                  return (
                    <tr
                      key={entry.dayNumber}
                      className={`transition-colors border-b border-slate-200 ${rowBg} ${
                        isToday ? "ring-2 ring-blue-500/30 font-medium" : ""
                      }`}
                    >
                      {/* Date Column (Sticky Left) */}
                      <td className={`py-2 px-3 text-center font-bold text-slate-800 border-r border-slate-200 sticky left-0 z-10 ${
                        isToday ? "bg-blue-100/90 text-blue-900" : (isSunday ? "bg-slate-100 text-slate-500" : "bg-white")
                      }`}>
                        <div className="flex items-center justify-center gap-1.5">
                          {isToday && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />}
                          <span>{entry.displayDate || entry.date}</span>
                        </div>
                      </td>

                      {/* Day Column */}
                      <td className={`py-2 px-2 text-center font-semibold border-r border-slate-200 ${
                        isSunday ? "text-rose-500 bg-rose-50/30" : "text-slate-600"
                      }`}>
                        {entry.dayOfWeek}
                      </td>

                      {/* Status Dropdown Cell */}
                      <td className="py-1.5 px-2 text-center border-r border-slate-200">
                        <select
                          value={entry.status || ""}
                          onChange={(e) => handleStatusChange(entry.dayNumber, e.target.value)}
                          className={`w-full py-1 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                            STATUS_OPTIONS.find((s) => s.value === entry.status)?.color ||
                            "bg-white border-slate-200 text-slate-500"
                          }`}
                        >
                          <option value="">— Select —</option>
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Custom Editable Yellow Cells matching Google Sheet */}
                      {activeFields.map((field) => {
                        const cellVal = entry.values?.[field.key] ?? "";
                        const isLeaveDay = entry.status === "Leave" || entry.status === "Weekly Off";

                        return (
                          <td
                            key={field.key}
                            className={`py-1 px-1.5 border-r border-slate-200 transition-colors ${
                              isLeaveDay
                                ? "bg-slate-100/60"
                                : "bg-[#FFFDE7] hover:bg-[#FFF9C4] focus-within:bg-[#FFF59D] focus-within:ring-2 focus-within:ring-amber-400"
                            }`}
                          >
                            {field.type === "textarea" ? (
                              <textarea
                                value={cellVal}
                                placeholder={field.placeholder || "—"}
                                onChange={(e) => handleCellChange(entry.dayNumber, field.key, e.target.value)}
                                rows={1}
                                disabled={isLeaveDay}
                                className="w-full bg-transparent border-none text-xs text-slate-800 placeholder:text-slate-300 focus:outline-none resize-none px-1.5 py-1"
                              />
                            ) : field.type === "number" ? (
                              <input
                                type="number"
                                value={cellVal}
                                placeholder={field.placeholder || "0"}
                                onChange={(e) => handleCellChange(entry.dayNumber, field.key, e.target.value)}
                                disabled={isLeaveDay}
                                className="w-full bg-transparent border-none text-center font-bold text-xs text-slate-900 placeholder:text-slate-300 focus:outline-none px-1.5 py-1"
                              />
                            ) : (
                              <input
                                type="text"
                                value={cellVal}
                                placeholder={field.placeholder || "—"}
                                onChange={(e) => handleCellChange(entry.dayNumber, field.key, e.target.value)}
                                disabled={isLeaveDay}
                                className="w-full bg-transparent border-none text-xs text-slate-800 placeholder:text-slate-300 focus:outline-none px-1.5 py-1"
                              />
                            )}
                          </td>
                        );
                      })}

                      {/* Filled? Status indicator */}
                      <td className="py-2 px-3 text-center border-slate-200">
                        {entry.isFilled ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                            <Check className="w-3 h-3" /> Yes
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* STICKY TOTALS FOOTER ROW */}
              <tfoot className="sticky bottom-0 z-20 bg-slate-200 text-slate-900 shadow-md border-t-2 border-slate-400">
                <tr className="font-bold text-xs">
                  <td className="py-3 px-3 text-center sticky left-0 z-30 bg-slate-200 border-r border-slate-300 uppercase tracking-wide">
                    TOTALS
                  </td>
                  <td className="py-3 px-2 text-center border-r border-slate-300 text-slate-500">
                    —
                  </td>
                  <td className="py-3 px-3 text-center border-r border-slate-300 text-emerald-800 font-extrabold">
                    Present: {computedTotals.daysPresent}
                  </td>
                  {activeFields.map((field) => (
                    <td key={field.key} className="py-3 px-3 text-center border-r border-slate-300 font-black text-slate-900">
                      {field.summaryType === "sum" || field.summaryType === "average" ? (
                        <span>{computedTotals.fieldSums[field.key] ?? 0}</span>
                      ) : (
                        <span className="text-slate-400 font-normal">—</span>
                      )}
                    </td>
                  ))}
                  <td className="py-3 px-3 text-center text-blue-900 font-extrabold">
                    {computedTotals.filledCount} / {entries.length}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Footer toolbar with quick save */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Info className="w-4 h-4 text-blue-500 shrink-0" />
            <span>
              Tip: Press <strong>Ctrl + S</strong> (or <strong>Cmd + S</strong>) anytime to instantly save your edits.
            </span>
          </div>
          <div className="flex items-center gap-3">
            {hasUnsavedChanges && (
              <button
                onClick={handleSaveAll}
                disabled={saving}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? "Saving Changes..." : "Save Worksheet Changes"}</span>
              </button>
            )}
            <button
              onClick={handleExportExcel}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Download .xlsx</span>
            </button>
          </div>
        </div>
      </div>

      {/* QUICK FILL MODAL ("Fill Today's Work") */}
      {isQuickFillModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="bg-[#0D233A] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-xl border border-amber-400/30">
                  <Zap className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Fill Work Log</h3>
                  <p className="text-xs text-blue-200">
                    Quickly submit work metrics for {currentStaffDisplayName} ({template?.designation || "Staff"})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsQuickFillModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleQuickFillSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={quickFillData.date}
                    onChange={(e) => setQuickFillData({ ...quickFillData, date: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-white rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={quickFillData.status}
                    onChange={(e) => setQuickFillData({ ...quickFillData, status: e.target.value })}
                    className="w-full text-xs font-bold px-3 py-2 bg-white rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Field Inputs */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Work Metrics ({activeFields.length} Custom Fields)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {activeFields.map((field) => (
                    <div
                      key={field.key}
                      className={field.type === "textarea" ? "sm:col-span-2" : ""}
                    >
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {field.label}
                      </label>
                      {field.type === "textarea" ? (
                        <textarea
                          rows={2}
                          placeholder={field.placeholder || "Enter notes..."}
                          value={quickFillData.values?.[field.key] || ""}
                          onChange={(e) =>
                            setQuickFillData({
                              ...quickFillData,
                              values: { ...quickFillData.values, [field.key]: e.target.value },
                            })
                          }
                          className="w-full text-xs px-3 py-2 bg-[#FFFDE7] rounded-xl border border-amber-200 focus:ring-2 focus:ring-amber-400 outline-none"
                        />
                      ) : field.type === "number" ? (
                        <input
                          type="number"
                          placeholder={field.placeholder || "0"}
                          value={quickFillData.values?.[field.key] || ""}
                          onChange={(e) =>
                            setQuickFillData({
                              ...quickFillData,
                              values: { ...quickFillData.values, [field.key]: e.target.value },
                            })
                          }
                          className="w-full text-xs font-bold px-3 py-2 bg-[#FFFDE7] rounded-xl border border-amber-200 focus:ring-2 focus:ring-amber-400 outline-none"
                        />
                      ) : (
                        <input
                          type="text"
                          placeholder={field.placeholder || "Enter details..."}
                          value={quickFillData.values?.[field.key] || ""}
                          onChange={(e) =>
                            setQuickFillData({
                              ...quickFillData,
                              values: { ...quickFillData.values, [field.key]: e.target.value },
                            })
                          }
                          className="w-full text-xs px-3 py-2 bg-[#FFFDE7] rounded-xl border border-amber-200 focus:ring-2 focus:ring-amber-400 outline-none"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsQuickFillModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? "Saving..." : "Submit Daily Log"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOMIZE TEMPLATE & FIELDS MODAL (ADMIN ONLY) */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="bg-[#0D233A] text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-xl border border-blue-400/30">
                  <Settings className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Manage Staff Sheet Templates</h3>
                  <p className="text-xs text-blue-200">
                    Create or customize custom columns and assign them to specific staff members
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Template Selector / Switcher */}
            <div className="bg-slate-100 px-6 py-3 border-b border-slate-200 flex items-center justify-between gap-3 overflow-x-auto shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Templates:</span>
                {allTemplates.map((tpl) => {
                  const isSelected = templateForm._id === tpl._id;
                  const assignedNames = tpl.assignedUserIds?.map((u) => u.name || u.username).join(", ");
                  return (
                    <button
                      key={tpl._id}
                      type="button"
                      onClick={() => handleOpenTemplateModal(tpl)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-300 hover:border-slate-400"
                      }`}
                    >
                      <span>{tpl.designation || tpl.title}</span>
                      {assignedNames && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${isSelected ? "bg-blue-800 text-blue-100" : "bg-slate-100 text-slate-500"}`}>
                          {assignedNames}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => handleOpenTemplateModal(null)}
                className="px-3 py-1 bg-white hover:bg-slate-50 text-blue-600 font-bold text-xs rounded-xl border border-blue-200 flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Sheet Template</span>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveTemplate} className="p-6 space-y-6 overflow-y-auto grow">
              {/* Quick Presets Bar */}
              <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-blue-900">Apply Quick Preset:</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleApplyPreset("accounts")}
                    className="px-3 py-1 bg-white hover:bg-blue-600 hover:text-white text-blue-700 font-bold text-xs rounded-lg border border-blue-200 transition-colors shadow-2xs"
                  >
                    📑 Accounts & Billing (Aman)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset("operations")}
                    className="px-3 py-1 bg-white hover:bg-blue-600 hover:text-white text-blue-700 font-bold text-xs rounded-lg border border-blue-200 transition-colors shadow-2xs"
                  >
                    📦 Operations & Leads (Sushank)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset("general")}
                    className="px-3 py-1 bg-white hover:bg-blue-600 hover:text-white text-blue-700 font-bold text-xs rounded-lg border border-blue-200 transition-colors shadow-2xs"
                  >
                    📋 General Staff
                  </button>
                </div>
              </div>

              {/* Template Branding & Staff Assignment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sheet Title</label>
                  <input
                    type="text"
                    required
                    value={templateForm.title}
                    onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-white rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Staff Designation</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Accounts & Billing Executive"
                    value={templateForm.designation}
                    onChange={(e) => setTemplateForm({ ...templateForm, designation: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-white rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assign to Staff Member</label>
                  <select
                    value={templateForm.assignedUserIds?.[0] || ""}
                    onChange={(e) =>
                      setTemplateForm({
                        ...templateForm,
                        assignedUserIds: e.target.value ? [e.target.value] : [],
                      })
                    }
                    className="w-full text-xs font-bold px-3 py-2 bg-white rounded-xl border border-blue-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">— Unassigned (All Default Staff) —</option>
                    {staffList.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name || s.username} ({s.username})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Instructions Banner</label>
                  <input
                    type="text"
                    value={templateForm.instructions}
                    onChange={(e) => setTemplateForm({ ...templateForm, instructions: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-white rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Fields List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Worksheet Columns & Metrics ({templateForm.fields.length})
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Configure custom columns that staff will fill daily.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddField}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Column</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {templateForm.fields.map((field, idx) => (
                    <div
                      key={field.key || idx}
                      className="p-3.5 bg-white rounded-2xl border border-slate-200 hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 font-black text-[11px] flex items-center justify-center">
                          {idx + 1}
                        </span>
                      </div>

                      {/* Label Input */}
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Column Name</label>
                        <input
                          type="text"
                          required
                          value={field.label}
                          onChange={(e) => handleFieldPropertyChange(idx, "label", e.target.value)}
                          placeholder="Column Label"
                          className="w-full text-xs font-bold text-slate-800 px-2.5 py-1.5 bg-slate-50 rounded-lg border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>

                      {/* Field Type */}
                      <div className="w-32">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Type</label>
                        <select
                          value={field.type}
                          onChange={(e) => handleFieldPropertyChange(idx, "type", e.target.value)}
                          className="w-full text-xs font-semibold px-2 py-1.5 bg-slate-50 rounded-lg border border-slate-200 focus:bg-white outline-none"
                        >
                          <option value="number">Number</option>
                          <option value="text">Text (1 Line)</option>
                          <option value="textarea">Textarea</option>
                        </select>
                      </div>

                      {/* Summary Type */}
                      <div className="w-28">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Summary</label>
                        <select
                          value={field.summaryType}
                          onChange={(e) => handleFieldPropertyChange(idx, "summaryType", e.target.value)}
                          className="w-full text-xs font-semibold px-2 py-1.5 bg-slate-50 rounded-lg border border-slate-200 focus:bg-white outline-none"
                        >
                          <option value="sum">Sum</option>
                          <option value="average">Average</option>
                          <option value="none">None</option>
                        </select>
                      </div>

                      {/* Delete Field */}
                      <button
                        type="button"
                        onClick={() => handleRemoveField(idx)}
                        className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors mt-4 sm:mt-0"
                        title="Remove Column"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
                <div>
                  {templateForm._id && !templateForm.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(templateForm._id)}
                      className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Template</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsTemplateModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 active:scale-95"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? "Saving Template..." : "Save Template & Apply"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
