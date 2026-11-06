import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import {
  Megaphone,
  Mail,
  MessageSquare,
  Sparkles,
  Send,
  Users,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Eye,
  RefreshCw,
  Gift,
  Check,
  ChevronRight,
  ChevronLeft,
  Calendar,
  X,
  Play,
  ArrowRight,
  ShieldCheck,
  Clock,
  Smartphone,
  Laptop,
  Image as ImageIcon,
  UploadCloud,
  Trash2,
  Download
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL;

export default function Communication() {
  const { user } = useAuth();

  // Navigation / Tabs
  const [activeTab, setActiveTab] = useState("compose"); // compose | audience | history
  const [selectedChannel, setSelectedChannel] = useState("both"); // both | whatsapp | email

  // Templates & Active Message
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("diwali");
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [whatsappText, setWhatsappText] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [previewDevice, setPreviewDevice] = useState("desktop"); // desktop | mobile

  // Image Upload / Attachment State
  const [uploadedImage, setUploadedImage] = useState(null); // { file, previewUrl, serverUrl, fullUrl, filename, size }
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [includeImageInWhatsApp, setIncludeImageInWhatsApp] = useState(true);
  const fileInputRef = useRef(null);

  // Contacts & Audience
  const [contacts, setContacts] = useState([]);
  const [stats, setStats] = useState({ total: 0, withEmail: 0, withPhone: 0 });
  const [audienceFilter, setAudienceFilter] = useState("all"); // all | senders | receivers | partners | leads
  const [contactSearch, setContactSearch] = useState("");
  const [selectedContactIds, setSelectedContactIds] = useState(new Set());
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Modals & Progress
  const [isTestEmailModalOpen, setIsTestEmailModalOpen] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState(user?.email || "info.engineersparcel@gmail.com");
  const [sendingTest, setSendingTest] = useState(false);

  // Bulk Email State
  const [isEmailConfirmOpen, setIsEmailConfirmOpen] = useState(false);
  const [sendingBulkEmail, setSendingBulkEmail] = useState(false);
  const [emailProgress, setEmailProgress] = useState(null); // { sent: 0, total: 0 }

  // WhatsApp Runner Modal
  const [isWhatsAppRunnerOpen, setIsWhatsAppRunnerOpen] = useState(false);
  const [runnerIndex, setRunnerIndex] = useState(0);

  // Campaign History
  const [campaigns, setCampaigns] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Load Templates on Mount
  useEffect(() => {
    fetchTemplates();
    fetchContacts();
    fetchCampaigns();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/communication/templates`);
      if (res.data.success && res.data.templates?.length > 0) {
        setTemplates(res.data.templates);
        applyTemplate(res.data.templates[0]);
      }
    } catch (err) {
      console.error("Error loading templates:", err);
    }
  };

  const fetchContacts = async () => {
    setLoadingContacts(true);
    try {
      const res = await axios.get(`${API_BASE}/api/communication/contacts`, {
        params: { audience: audienceFilter, search: contactSearch, limit: 1000 },
      });
      if (res.data.success) {
        setContacts(res.data.contacts || []);
        setStats(res.data.stats || { total: 0, withEmail: 0, withPhone: 0 });
        const ids = new Set((res.data.contacts || []).map((c) => c.id));
        setSelectedContactIds(ids);
      }
    } catch (err) {
      console.error("Error fetching contacts:", err);
      toast.error("Failed to load customer directory");
    } finally {
      setLoadingContacts(false);
    }
  };

  const fetchCampaigns = async () => {
    setLoadingHistory(true);
    try {
      const res = await axios.get(`${API_BASE}/api/communication/campaigns`);
      if (res.data.success) {
        setCampaigns(res.data.campaigns || []);
      }
    } catch (err) {
      console.error("Error fetching campaign history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Switch template
  const applyTemplate = (tpl) => {
    setSelectedTemplateId(tpl.id);
    setSubject(tpl.subject);
    setBodyText(tpl.defaultBody);
    setWhatsappText(tpl.whatsappText);
  };

  const activeTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId) || templates[0] || {};
  }, [templates, selectedTemplateId]);

  // Core function to process and upload image file
  const uploadImageFile = async (file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (PNG, JPG, WebP, GIF)");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image file size must be under 10MB");
      return;
    }

    const localPreview = URL.createObjectURL(file);
    const initialObj = {
      file,
      previewUrl: localPreview,
      serverUrl: "",
      fullUrl: "",
      filename: file.name || `greeting-${Date.now()}.png`,
      size: (file.size / 1024).toFixed(1) + " KB",
    };
    setUploadedImage(initialObj);

    // Upload to backend
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("banner", file);

      const res = await axios.post(`${API_BASE}/api/communication/upload-banner`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        setUploadedImage((prev) => ({
          ...prev,
          serverUrl: res.data.imageUrl,
          fullUrl: res.data.fullUrl,
          filename: res.data.filename,
        }));
        toast.success("Greeting image attached successfully! 🖼️");
      }
    } catch (err) {
      console.error("Upload banner error:", err);
      toast.error(err.response?.data?.message || "Failed to upload image to server");
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle Image File Selection from input
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) uploadImageFile(file);
  };

  // Clipboard Paste listener (Ctrl+V / Cmd+V)
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            uploadImageFile(file);
            toast.success("Pasted image attached! 📋");
            break;
          }
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  const handleCopyImageToClipboard = async () => {
    if (!uploadedImage?.previewUrl) return;
    try {
      const res = await fetch(uploadedImage.previewUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      toast.success("Image copied! Paste directly into WhatsApp chat (Ctrl+V). 📋");
    } catch (err) {
      // Fallback: download the file
      const a = document.createElement("a");
      a.href = uploadedImage.previewUrl;
      a.download = uploadedImage.filename || "greeting.png";
      a.click();
      toast.success("Image downloaded ready to attach in WhatsApp! 📥");
    }
  };

  const handleRemoveImage = () => {
    setUploadedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast.success("Image attachment removed");
  };

  // Selected contact objects
  const selectedContactsList = useMemo(() => {
    return contacts.filter((c) => selectedContactIds.has(c.id));
  }, [contacts, selectedContactIds]);

  const selectedWithEmail = useMemo(() => {
    return selectedContactsList.filter((c) => c.email && c.email.includes("@"));
  }, [selectedContactsList]);

  const selectedWithPhone = useMemo(() => {
    return selectedContactsList.filter((c) => c.phone);
  }, [selectedContactsList]);

  // Toggle single contact
  const toggleContact = (id) => {
    const next = new Set(selectedContactIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedContactIds(next);
  };

  // Toggle all visible
  const toggleSelectAll = () => {
    if (selectedContactIds.size === contacts.length) {
      setSelectedContactIds(new Set());
    } else {
      setSelectedContactIds(new Set(contacts.map((c) => c.id)));
    }
  };

  // Generate personalized WhatsApp link (with image link if selected)
  const getWhatsAppLink = (contact) => {
    const phone = contact?.phone || "";
    const cleanPhone = phone.replace(/\D/g, "");
    const formatted = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    let personalizedText = whatsappText.replace(/\{\{name\}\}/g, contact?.name || "Valued Customer");

    if (uploadedImage?.fullUrl && includeImageInWhatsApp) {
      personalizedText += `\n\n🖼️ *Greeting Poster / Card:* ${uploadedImage.fullUrl}`;
    }

    return `https://wa.me/${formatted}?text=${encodeURIComponent(personalizedText)}`;
  };

  // Send single WhatsApp message directly
  const handleDirectWhatsApp = async (contact) => {
    if (!contact.phone) {
      toast.error("Contact has no phone number");
      return;
    }
    const link = getWhatsAppLink(contact);
    window.open(link, "_blank");

    // Log the send
    try {
      await axios.post(`${API_BASE}/api/communication/log-whatsapp-send`, {
        recipient: { name: contact.name, phone: contact.phone, email: contact.email },
        festivalType: activeTemplate.festivalType || "custom",
        messageText: whatsappText,
      });
      toast.success(`Opened WhatsApp for ${contact.name}`);
    } catch (e) {
      // Non-blocking log error
    }
  };

  // Send single Test Email
  const handleSendTestEmail = async () => {
    if (!testEmailAddress || !testEmailAddress.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    setSendingTest(true);
    try {
      const res = await axios.post(`${API_BASE}/api/communication/send-test-email`, {
        testEmail: testEmailAddress,
        subject,
        bodyText,
        festivalType: activeTemplate.festivalType,
        couponCode,
        imageUrl: uploadedImage?.serverUrl || uploadedImage?.fullUrl || "",
      });
      if (res.data.success) {
        toast.success(res.data.message || "Test email sent!");
        setIsTestEmailModalOpen(false);
      }
    } catch (err) {
      console.error("Test email error:", err);
      toast.error(err.response?.data?.message || "Failed to send test email");
    } finally {
      setSendingTest(false);
    }
  };

  // Send Bulk Email
  const handleSendBulkEmail = async () => {
    if (selectedWithEmail.length === 0) {
      toast.error("None of the selected contacts have an email address!");
      return;
    }
    setSendingBulkEmail(true);
    setEmailProgress({ sent: 0, total: selectedWithEmail.length });

    try {
      const res = await axios.post(`${API_BASE}/api/communication/send-bulk-email`, {
        recipients: selectedWithEmail.map((c) => ({
          name: c.name,
          email: c.email,
          phone: c.phone,
        })),
        subject,
        bodyText,
        campaignTitle: `${activeTemplate.name || "Festive"} Email Broadcast`,
        festivalType: activeTemplate.festivalType,
        couponCode,
        imageUrl: uploadedImage?.serverUrl || uploadedImage?.fullUrl || "",
      });

      if (res.data.success) {
        toast.success(`🎉 Broadcast Complete! ${res.data.sentCount} emails sent.`);
        setIsEmailConfirmOpen(false);
        fetchCampaigns();
      }
    } catch (err) {
      console.error("Bulk email error:", err);
      toast.error(err.response?.data?.message || "Failed to execute broadcast");
    } finally {
      setSendingBulkEmail(false);
      setEmailProgress(null);
    }
  };

  // Copy WhatsApp Text to Clipboard
  const handleCopyWhatsApp = () => {
    let text = whatsappText.replace(/\{\{name\}\}/g, "Customer");
    if (uploadedImage?.fullUrl && includeImageInWhatsApp) {
      text += `\n\n🖼️ Greeting Poster / Card: ${uploadedImage.fullUrl}`;
    }
    navigator.clipboard.writeText(text);
    toast.success("WhatsApp message copied to clipboard!");
  };

  // Current contact for WhatsApp sequential runner
  const currentRunnerContact = selectedWithPhone[runnerIndex] || null;

  const handleRunnerSend = async () => {
    if (!currentRunnerContact) return;
    handleDirectWhatsApp(currentRunnerContact);
    if (runnerIndex < selectedWithPhone.length - 1) {
      setRunnerIndex((prev) => prev + 1);
    } else {
      toast.success("All selected WhatsApp contacts completed!");
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-[1700px] mx-auto px-2 sm:px-4">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-[#0D233A] via-[#1A365D] to-[#2B6CB0] text-white p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="p-3.5 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-md shadow-inner">
              <Megaphone className="w-8 h-8 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-wide text-white">
                  Customer Communication & Festive Broadcasts
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-900 font-extrabold uppercase">
                  Multi-Channel
                </span>
              </div>
              <p className="text-xs sm:text-sm text-blue-100/90 mt-1 max-w-2xl leading-relaxed">
                Send festive greetings, poster images, seasonal offers, and announcements directly to all your customers via <strong>WhatsApp</strong> and <strong>Email</strong>.
              </p>
            </div>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="bg-white/10 backdrop-blur-md border border-white/15 px-4 py-2 rounded-xl text-center min-w-[100px]">
              <div className="text-[10px] uppercase font-bold text-blue-200">Total Customers</div>
              <div className="text-lg font-black text-white">{stats.total.toLocaleString()}</div>
            </div>
            <div className="bg-emerald-500/20 backdrop-blur-md border border-emerald-400/30 px-4 py-2 rounded-xl text-center min-w-[100px]">
              <div className="text-[10px] uppercase font-bold text-emerald-200">WhatsApp Reach</div>
              <div className="text-lg font-black text-emerald-300">{stats.withPhone.toLocaleString()}</div>
            </div>
            <div className="bg-blue-500/20 backdrop-blur-md border border-blue-400/30 px-4 py-2 rounded-xl text-center min-w-[100px]">
              <div className="text-[10px] uppercase font-bold text-blue-200">Email Reach</div>
              <div className="text-lg font-black text-blue-300">{stats.withEmail.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Navigation Bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl">
            <button
              onClick={() => setActiveTab("compose")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === "compose"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Compose & Broadcast</span>
            </button>
            <button
              onClick={() => setActiveTab("audience")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === "audience"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users className="w-3.5 h-3.5 text-blue-500" />
              <span>Audience Directory ({selectedContactIds.size} Selected)</span>
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === "history"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-purple-500" />
              <span>Broadcast History ({campaigns.length})</span>
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsTestEmailModalOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl border border-slate-300 transition-all shadow-xs"
            >
              <Mail className="w-3.5 h-3.5 text-blue-600" />
              <span>Send Test Email</span>
            </button>
            <button
              onClick={() => {
                setRunnerIndex(0);
                setIsWhatsAppRunnerOpen(true);
              }}
              disabled={selectedWithPhone.length === 0}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Launch WhatsApp Queue ({selectedWithPhone.length})</span>
            </button>
            <button
              onClick={() => setIsEmailConfirmOpen(true)}
              disabled={selectedWithEmail.length === 0}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Email Broadcast ({selectedWithEmail.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: COMPOSE & BROADCAST */}
      {activeTab === "compose" && (
        <div className="space-y-6">
          {/* Festive Template Carousel */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Select Festive Theme & Greeting Template
                </h2>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Click to instantly load greetings</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {templates.map((tpl) => {
                const isSelected = selectedTemplateId === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    onClick={() => applyTemplate(tpl)}
                    className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between min-h-[90px] ${
                      isSelected
                        ? "border-blue-600 ring-2 ring-blue-500/30 bg-blue-50/50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70"
                    }`}
                  >
                    <div className="text-2xl mb-1">{tpl.headerIcon}</div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 leading-tight truncate">{tpl.name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 truncate uppercase font-semibold">
                        {tpl.festivalType.replace("_", " ")}
                      </div>
                    </div>
                    {isSelected && (
                      <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-600" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dual Panel: Composer on Left, Live Previews on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT: Composer Controls (5 cols) */}
            <div className="lg:col-span-5 bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-5">
              {/* Channel Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Target Channels</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedChannel("both")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      selectedChannel === "both"
                        ? "bg-[#0D233A] text-white border-[#0D233A] shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span>Omnichannel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedChannel("whatsapp")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      selectedChannel === "whatsapp"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedChannel("email")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      selectedChannel === "email"
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email</span>
                  </button>
                </div>
              </div>

              {/* ⭐ ATTACH / UPLOAD IMAGE SECTION */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-indigo-600" />
                    <span>Attach Greeting Image / Festive Poster</span>
                  </label>
                  {uploadedImage && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove Image</span>
                    </button>
                  )}
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                />

                {!uploadedImage ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) uploadImageFile(file);
                    }}
                    className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all group ${
                      isDragging
                        ? "border-indigo-500 bg-indigo-50/60 scale-[1.01]"
                        : "border-slate-300 hover:border-indigo-400 bg-white hover:bg-indigo-50/30"
                    }`}
                  >
                    <UploadCloud className="w-9 h-9 text-indigo-500 group-hover:scale-110 mx-auto mb-2 transition-transform" />
                    <div className="text-xs font-bold text-slate-800 group-hover:text-indigo-900">
                      Click to upload greeting poster, or drag & drop here
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-center gap-2">
                      <span>PNG, JPG, WebP, GIF up to 10MB</span>
                      <span>•</span>
                      <span className="text-indigo-600 font-semibold">Or paste image with Ctrl+V</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                      <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0 flex items-center justify-center shadow-xs">
                        <img
                          src={uploadedImage.previewUrl}
                          alt="Uploaded Banner"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="overflow-hidden grow">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {uploadedImage.filename}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-1">
                          <span className="font-mono">{uploadedImage.size}</span>
                          <span>•</span>
                          {uploadingImage ? (
                            <span className="text-amber-600 font-bold flex items-center gap-1">
                              <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Uploading to server...
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Attached to Email & WhatsApp
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs font-bold px-3 py-1.5 text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-300"
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                          title="Remove image"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* WhatsApp link inclusion toggle */}
                    <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200 hover:border-slate-300">
                      <input
                        type="checkbox"
                        checked={includeImageInWhatsApp}
                        onChange={(e) => setIncludeImageInWhatsApp(e.target.checked)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                      />
                      <span className="font-medium text-[11px] text-slate-800">
                        Include viewable image link in WhatsApp message text (<span className="text-emerald-700 font-mono font-bold">🖼️ Greeting Poster: https://...</span>)
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {/* Email Subject Line */}
              {(selectedChannel === "both" || selectedChannel === "email") && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-blue-600" />
                      Email Subject Line
                    </label>
                    <span className="text-[10px] text-slate-400">Includes emojis & branding</span>
                  </div>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter catchy email subject..."
                    className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              )}

              {/* Coupon Code / Promo */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Gift className="w-3.5 h-3.5 text-purple-600" />
                    Optional Festive Promo / Coupon Code
                  </label>
                  <span className="text-[10px] text-slate-400">Displayed in coupon box</span>
                </div>
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="e.g. FESTIVE10 or leave blank"
                  className="w-full text-xs font-bold tracking-widest px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              {/* WhatsApp Message Editor */}
              {(selectedChannel === "both" || selectedChannel === "whatsapp") && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        <span>WhatsApp Message Text</span>
                      </div>
                      {uploadedImage ? (
                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-md flex items-center gap-1">
                          <ImageIcon className="w-2.5 h-2.5" /> +Image Attached
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold underline flex items-center gap-0.5"
                        >
                          +Attach Greeting Image
                        </button>
                      )}
                    </label>
                    <button
                      type="button"
                      onClick={handleCopyWhatsApp}
                      className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </button>
                  </div>
                  <textarea
                    rows={8}
                    value={whatsappText}
                    onChange={(e) => setWhatsappText(e.target.value)}
                    className="w-full text-xs font-mono px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none resize-y leading-relaxed"
                    placeholder="WhatsApp message with *bold*, emojis, and {{name}} placeholder..."
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Tip: Use <code className="text-slate-600 font-bold">{"{{name}}"}</code> to automatically insert customer name.
                  </p>
                </div>
              )}

              {/* Email Body Editor */}
              {(selectedChannel === "both" || selectedChannel === "email") && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-blue-600" />
                        <span>Email Body Greetings Text</span>
                      </div>
                      {uploadedImage ? (
                        <span className="text-[10px] text-blue-700 font-bold bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded-md flex items-center gap-1">
                          <ImageIcon className="w-2.5 h-2.5" /> +Poster Embedded
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold underline flex items-center gap-0.5"
                        >
                          +Attach Greeting Image
                        </button>
                      )}
                    </label>
                    <span className="text-[10px] text-slate-400">Renders inside rich card</span>
                  </div>
                  <textarea
                    rows={6}
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none resize-y leading-relaxed"
                    placeholder="Email paragraph text..."
                  />
                </div>
              )}

              {/* Recipient Summary Box */}
              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200/80 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-blue-900">Current Target Audience</div>
                  <div className="text-[11px] text-blue-700 mt-0.5">
                    <strong>{selectedContactsList.length}</strong> selected (
                    {selectedWithPhone.length} WhatsApp, {selectedWithEmail.length} Email)
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("audience")}
                  className="px-2.5 py-1 bg-white hover:bg-blue-100 text-blue-800 font-bold text-[11px] rounded-lg border border-blue-300 transition-colors"
                >
                  Manage
                </button>
              </div>
            </div>

            {/* RIGHT: Live Interactive Previews (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Device & Channel Preview Selector Bar */}
              <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Live Customer Preview</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setPreviewDevice("desktop")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                      previewDevice === "desktop"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Laptop className="w-3.5 h-3.5" />
                    <span>Desktop Email</span>
                  </button>
                  <button
                    onClick={() => setPreviewDevice("mobile")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                      previewDevice === "mobile"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>WhatsApp Chat</span>
                  </button>
                </div>
              </div>

              {/* PREVIEW CONTAINER */}
              {previewDevice === "desktop" ? (
                /* Rich Email Card Preview */
                <div className="bg-slate-200/80 p-4 sm:p-8 rounded-2xl shadow-inner flex justify-center">
                  <div className="w-full max-w-[580px] bg-white rounded-2xl shadow-lg border border-slate-300 overflow-hidden text-left">
                    {/* Official Company Logo Top Header */}
                    <div className="bg-white py-5 px-8 border-b border-slate-100 flex items-center justify-center">
                      <img
                        src="/company-logo.jpg"
                        alt="Engineers Parcel"
                        className="h-12 sm:h-14 w-auto object-contain"
                        onError={(e) => {
                          e.target.src = "/logo.png";
                        }}
                      />
                    </div>

                    {/* Email Card Body */}
                    <div className="p-6 sm:p-8 space-y-4 text-slate-700 text-xs sm:text-sm leading-relaxed">
                      <p className="font-bold text-slate-900 text-sm sm:text-base">
                        Dear {selectedContactsList[0]?.name || "Rahul Sharma"},
                      </p>

                      {/* ⭐ Uploaded Poster Image Preview in Email */}
                      {uploadedImage?.previewUrl && (
                        <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm max-h-[320px] flex items-center justify-center bg-slate-50 my-2">
                          <img
                            src={uploadedImage.previewUrl}
                            alt="Festive Greeting Poster"
                            className="w-full h-auto object-cover max-h-[320px]"
                          />
                        </div>
                      )}

                      <div className="space-y-3 whitespace-pre-line text-slate-600">
                        {bodyText || activeTemplate.defaultBody}
                      </div>

                      {/* Promo Coupon Preview */}
                      {couponCode && (
                        <div className="bg-slate-50 border-2 border-dashed border-amber-400 rounded-xl p-4 text-center my-4">
                          <div className="text-[10px] uppercase font-extrabold tracking-widest text-slate-500">
                            Exclusive Festive Gift
                          </div>
                          <div className="my-1.5">
                            <span className="inline-block font-mono text-base font-black bg-white border border-slate-200 text-slate-900 px-4 py-1.5 rounded-lg tracking-widest shadow-2xs">
                              {couponCode}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Use this code on your next shipment for special festive discounts!
                          </p>
                        </div>
                      )}

                      {/* Call to Action Button */}
                      <div className="text-center pt-2">
                        <span className="inline-block bg-[#0D233A] text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-sm">
                          Apply 🎁 FESTIVE10 at final checkout to Get Exclusive Discount
                        </span>
                      </div>

                      {/* Sign-off */}
                      <div className="border-t border-slate-200 pt-4 mt-6">
                        <p className="font-bold text-slate-900 text-xs">Warm regards,</p>
                        <p className="text-xs text-slate-600 font-medium mt-0.5">
                          <strong>Team Engineers Parcel</strong>
                          <br />
                          <span className="text-[11px] text-slate-400">IIT (ISM) Dhanbad - 826004, Jharkhand</span>
                        </p>
                      </div>
                    </div>

                    {/* Email Footer */}
                    <div className="bg-slate-900 p-4 text-center text-[10px] text-slate-400 border-t border-slate-800">
                      <p className="text-slate-300 font-semibold mb-1">📞 Need Assistance? Contact Support:</p>
                      <p className="text-slate-400 mb-1">
                        Phone / WhatsApp: <span className="text-sky-400">+91 9708815717</span> / <span className="text-sky-400">+91 9525801506</span>
                      </p>
                      <p className="text-slate-500">
                        © {new Date().getFullYear()} SRQ Engineers Parcel and Haul Pvt. Ltd. All rights reserved.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* WhatsApp Chat Mockup Preview */
                <div className="bg-[#EFEAE2] p-4 sm:p-8 rounded-2xl shadow-inner flex justify-center">
                  <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-xl border border-slate-300 overflow-hidden flex flex-col">
                    {/* WhatsApp Top Bar */}
                    <div className="bg-[#075E54] text-white px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center font-bold text-xs text-white">
                          EP
                        </div>
                        <div>
                          <div className="text-xs font-bold">Engineers Parcel Official</div>
                          <div className="text-[10px] text-emerald-200">Verified Business Account</div>
                        </div>
                      </div>
                      <ShieldCheck className="w-4 h-4 text-emerald-300" />
                    </div>

                    {/* Chat Bubble Area */}
                    <div className="p-4 bg-[#EFEAE2] min-h-[380px] flex flex-col justify-end">
                      <div className="bg-[#DCF8C6] rounded-2xl rounded-tr-none p-3 shadow-xs max-w-[95%] self-end text-slate-800 text-xs leading-relaxed whitespace-pre-line relative">
                        {/* ⭐ WhatsApp Image in Chat Bubble */}
                        {uploadedImage?.previewUrl && (
                          <div className="rounded-xl overflow-hidden border border-emerald-300/50 mb-2 max-h-[220px]">
                            <img
                              src={uploadedImage.previewUrl}
                              alt="WhatsApp Poster"
                              className="w-full h-auto object-cover max-h-[220px]"
                            />
                          </div>
                        )}
                        {whatsappText.replace(/\{\{name\}\}/g, selectedContactsList[0]?.name || "Rahul Sharma")}
                        {uploadedImage?.fullUrl && includeImageInWhatsApp && (
                          <span className="block mt-2 text-[11px] text-emerald-800 font-semibold break-all">
                            🖼️ Greeting Poster: {uploadedImage.fullUrl}
                          </span>
                        )}
                        <div className="text-[9px] text-emerald-800 font-bold text-right mt-1.5 flex items-center justify-end gap-1">
                          <span>11:42 AM</span>
                          <span className="text-blue-600 font-black">✓✓</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-slate-500 truncate">
                        Target: {selectedContactsList[0]?.name || "Customer"}
                      </span>
                      <button
                        type="button"
                        onClick={() => selectedContactsList[0] && handleDirectWhatsApp(selectedContactsList[0])}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 transition-all shrink-0"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Open WhatsApp</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIENCE DIRECTORY */}
      {activeTab === "audience" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Filter & Search Bar */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { key: "all", label: "All Customers" },
                { key: "senders", label: "Booking Senders" },
                { key: "receivers", label: "Booking Receivers" },
                { key: "partners", label: "Corporate Partners" },
                { key: "leads", label: "Leads" },
              ].map((chip) => (
                <button
                  key={chip.key}
                  onClick={() => {
                    setAudienceFilter(chip.key);
                    fetchContacts();
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    audienceFilter === chip.key
                      ? "bg-[#0D233A] text-white shadow-2xs"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search name, phone, city..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchContacts()}
                  className="pl-8 pr-3 py-1.5 text-xs bg-white rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none w-52 sm:w-64"
                />
              </div>

              <button
                onClick={fetchContacts}
                className="p-2 bg-white hover:bg-slate-100 rounded-xl border border-slate-300 text-slate-600 shadow-2xs"
                title="Refresh contacts"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingContacts ? "animate-spin" : ""}`} />
              </button>

              <button
                onClick={toggleSelectAll}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 shadow-2xs"
              >
                {selectedContactIds.size === contacts.length ? "Deselect All" : "Select All"}
              </button>
            </div>
          </div>

          {/* Contacts Table */}
          {loadingContacts ? (
            <div className="p-16 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-3 border-blue-600 border-t-transparent mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-500">Loading customer directory...</p>
            </div>
          ) : contacts.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No contacts found matching your search.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-100 text-slate-700 border-b border-slate-200 z-10 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedContactIds.size === contacts.length && contacts.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="py-2.5 px-3">Customer Name</th>
                    <th className="py-2.5 px-3">Phone / WhatsApp</th>
                    <th className="py-2.5 px-3">Email Address</th>
                    <th className="py-2.5 px-3">City / Source</th>
                    <th className="py-2.5 px-3 text-center">Orders</th>
                    <th className="py-2.5 px-4 text-right">Quick Outreach</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {contacts.map((contact) => {
                    const isSelected = selectedContactIds.has(contact.id);
                    return (
                      <tr
                        key={contact.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isSelected ? "bg-blue-50/30" : ""
                        }`}
                      >
                        <td className="py-2 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleContact(contact.id)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <span>{contact.name}</span>
                            {contact.source && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 font-normal">
                                {contact.source}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-slate-700 font-mono font-medium">
                          {contact.phone ? (
                            <span className="inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              {contact.phone}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-600">
                          {contact.email ? (
                            <span className="inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              {contact.email}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-500">
                          {contact.city || "—"}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-slate-700">
                          {contact.bookingsCount || 0}
                        </td>
                        <td className="py-2 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {contact.phone && (
                              <button
                                onClick={() => handleDirectWhatsApp(contact)}
                                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 transition-colors"
                                title="Open WhatsApp chat"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {contact.email && (
                              <button
                                onClick={() => {
                                  setTestEmailAddress(contact.email);
                                  setIsTestEmailModalOpen(true);
                                }}
                                className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 transition-colors"
                                title="Send test email to customer"
                              >
                                <Mail className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: BROADCAST HISTORY */}
      {activeTab === "history" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black uppercase text-slate-900 tracking-wide">
                Campaign & Outreach History
              </h2>
              <p className="text-xs text-slate-500">Log of all festive broadcasts sent to customers</p>
            </div>
            <button
              onClick={fetchCampaigns}
              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600"
            >
              <RefreshCw className={`w-4 h-4 ${loadingHistory ? "animate-spin" : ""}`} />
            </button>
          </div>

          {campaigns.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No broadcasts sent yet. Use the Compose tab to blast your first festive greeting!
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {campaigns.map((camp) => (
                <div key={camp._id} className="p-4 hover:bg-slate-50 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-200 text-blue-700">
                      {camp.channel === "whatsapp" ? (
                        <MessageSquare className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Mail className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{camp.title}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{new Date(camp.createdAt).toLocaleString()}</span>
                        <span>•</span>
                        <span>By {camp.createdByName || "Admin"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <div className="text-xs font-black text-slate-900">
                        {camp.channel === "whatsapp"
                          ? `${camp.whatsappSent || 0} WhatsApps`
                          : `${camp.emailsSent || 0} Emails Sent`}
                      </div>
                      {camp.emailsFailed > 0 && (
                        <div className="text-[10px] text-rose-500 font-semibold">
                          {camp.emailsFailed} Failed
                        </div>
                      )}
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        camp.status === "completed"
                          ? "bg-emerald-100 text-emerald-700"
                          : camp.status === "in_progress"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {camp.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── MODAL 1: SEND TEST EMAIL ─── */}
      {isTestEmailModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-black text-slate-900">Send Test Email Preview</h3>
              </div>
              <button
                onClick={() => setIsTestEmailModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Deliver a live preview of this greeting (including any attached poster image) to your inbox to inspect styling before broadcasting.
            </p>

            {uploadedImage?.previewUrl && (
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                <img
                  src={uploadedImage.previewUrl}
                  alt="Poster"
                  className="w-10 h-10 object-cover rounded-lg border border-slate-200"
                />
                <div className="overflow-hidden">
                  <div className="text-xs font-bold text-slate-800 truncate">{uploadedImage.filename}</div>
                  <div className="text-[10px] text-emerald-600 font-semibold">Image will be attached to email</div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Send Preview To:</label>
              <input
                type="email"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                placeholder="your.email@gmail.com"
                className="w-full text-xs px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-300 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsTestEmailModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={sendingTest}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2"
              >
                {sendingTest ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Test Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: BULK EMAIL CONFIRMATION ─── */}
      {isEmailConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-black text-slate-900">Confirm Bulk Email Broadcast</h3>
              </div>
              <button
                onClick={() => !sendingBulkEmail && setIsEmailConfirmOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="font-bold">⚠️ Review Broadcast Details:</div>
              <div>• Recipients: <strong>{selectedWithEmail.length} Customers</strong> with verified emails</div>
              <div>• Festival Theme: <strong>{activeTemplate.name}</strong></div>
              <div>• Subject: <em>{subject}</em></div>
              {uploadedImage && (
                <div>• Image Attached: <strong>{uploadedImage.filename}</strong> (embedded in email)</div>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Emails will be sent individually from your configured SMTP sender with personalized customer greetings and image attachments.
            </p>

            {sendingBulkEmail && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Sending emails in progress...</span>
                  <span>{emailProgress ? `${emailProgress.sent} / ${emailProgress.total}` : "Sending..."}</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full w-full animate-pulse" />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3">
              <button
                type="button"
                disabled={sendingBulkEmail}
                onClick={() => setIsEmailConfirmOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={sendingBulkEmail}
                onClick={handleSendBulkEmail}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2"
              >
                {sendingBulkEmail ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Broadcasting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Confirm & Launch ({selectedWithEmail.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: WHATSAPP SEQUENTIAL OUTREACH RUNNER ─── */}
      {isWhatsAppRunnerOpen && currentRunnerContact && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-sm font-black text-slate-900">WhatsApp Outreach Queue</h3>
                  <p className="text-[11px] text-slate-400">
                    Recipient {runnerIndex + 1} of {selectedWithPhone.length}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsWhatsAppRunnerOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Progress Bar */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1">
                <span>Progress</span>
                <span>{Math.round(((runnerIndex + 1) / selectedWithPhone.length) * 100)}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${((runnerIndex + 1) / selectedWithPhone.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Current Recipient Card */}
            <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 flex items-center justify-between">
              <div>
                <div className="text-sm font-extrabold text-slate-900">{currentRunnerContact.name}</div>
                <div className="text-xs font-mono font-bold text-emerald-700 mt-0.5">
                  📞 +91 {currentRunnerContact.phone}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {currentRunnerContact.city ? `${currentRunnerContact.city} • ` : ""}
                  {currentRunnerContact.bookingsCount || 0} previous shipments
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800 font-bold">
                  Ready to send
                </span>
              </div>
            </div>

            {/* ⭐ Attached Image Quick Actions for WhatsApp */}
            {uploadedImage?.previewUrl && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <img
                    src={uploadedImage.previewUrl}
                    alt="Poster"
                    className="w-12 h-12 object-cover rounded-lg border border-slate-300 shrink-0"
                  />
                  <div className="overflow-hidden">
                    <div className="text-xs font-bold text-slate-800 truncate">{uploadedImage.filename}</div>
                    <div className="text-[10px] text-emerald-600 font-semibold">Greeting image ready</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyImageToClipboard}
                    className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 flex items-center gap-1 shadow-2xs transition-all active:scale-95"
                    title="Copy image so you can paste (Ctrl+V) directly into WhatsApp"
                  >
                    <Copy className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Copy Image</span>
                  </button>
                  <a
                    href={uploadedImage.previewUrl}
                    download={uploadedImage.filename || "festive-greeting.png"}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 flex items-center gap-1 shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Download</span>
                  </a>
                </div>
              </div>
            )}

            {/* Message Preview */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Message Preview:</label>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-700 max-h-32 overflow-y-auto whitespace-pre-line leading-relaxed">
                {whatsappText.replace(/\{\{name\}\}/g, currentRunnerContact.name)}
                {uploadedImage?.fullUrl && includeImageInWhatsApp && (
                  <span className="block mt-2 text-[11px] text-emerald-700 font-bold">
                    🖼️ Greeting Poster: {uploadedImage.fullUrl}
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => runnerIndex > 0 && setRunnerIndex((p) => p - 1)}
                disabled={runnerIndex === 0}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-30 rounded-xl flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (runnerIndex < selectedWithPhone.length - 1) setRunnerIndex((p) => p + 1);
                    else setIsWhatsAppRunnerOpen(false);
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={handleRunnerSend}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Send WhatsApp & Next</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
