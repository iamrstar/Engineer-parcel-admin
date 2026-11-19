import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Building, Plus, X, Users, MapPin, Key, Trash2, Loader2, Mail, MailX, Send, Shield, Save, CheckCircle2, Globe, Navigation, AlertTriangle, Check, Power, Sliders, ToggleLeft, ToggleRight } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const Offices = () => {
  const [offices, setOffices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [switchingTo, setSwitchingTo] = useState(null); // Track which office is being switched to
  const { login, impersonate } = useAuth(); // For switching

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    address: "",
    contactNumber: "",
    username: "",
    password: "",
    bookingPrefix: "EP",
    bookingIdStart: 4600,
    permissions: ["Dashboard", "Booking", "E-Docket", "Create Order"]
  });

  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedOffice, setSelectedOffice] = useState(null);
  const [editingPermissions, setEditingPermissions] = useState([]);

  const availableFeatures = [
    "Dashboard", "Booking", "E-Docket", "Pincodes", "Coupons", "Create Order",
    "Corporate Partners", "Partner Management", "Courier Dockets", "Docket Management", "User Management",
    "Manage Queries", "Tasks", "Staff Tasks", "Attendance", "Attendance Report",
    "Sales Report", "Web Analytics"
  ];

  const [geofenceConfig, setGeofenceConfig] = useState({
    globalMode: "offices_only",
    enforceGeofence: true,
    authorizedLocations: [
      {
        id: "office_1",
        name: "Engineers Parcel Head Office (IIT ISM Dhanbad)",
        placeId: "ChIJO9LYJiignysRoxbn5RCefB4",
        address: "4th Floor, I2H Building, IIT (ISM) Dhanbad, Jharkhand 826004, India",
        latitude: 23.814343,
        longitude: 86.441198,
        radiusMeters: 1500,
        isActive: true,
        isHeadOffice: true,
      },
      {
        id: "office_2",
        name: "Engineers Parcel Second Office",
        placeId: "ChIJO6nl04679jkR9J18NwQUqVo",
        address: "Engineers Parcel Second Branch Premises",
        latitude: 23.812500,
        longitude: 86.440000,
        radiusMeters: 1000,
        isActive: true,
        isHeadOffice: false,
      },
    ]
  });
  const [savingGeofence, setSavingGeofence] = useState(false);
  const [showAddLocationModal, setShowAddLocationModal] = useState(false);
  const [newLocationForm, setNewLocationForm] = useState({
    name: "",
    placeId: "",
    address: "",
    latitude: 23.814343,
    longitude: 86.441198,
    radiusMeters: 500,
    isActive: true,
  });

  useEffect(() => {
    fetchOffices();
    fetchGeofenceConfig();
  }, []);

  const fetchGeofenceConfig = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/offices/geofence-config`);
      if (res.data) {
        setGeofenceConfig({
          globalMode: res.data.globalMode || "offices_only",
          enforceGeofence: res.data.enforceGeofence !== false,
          authorizedLocations: res.data.authorizedLocations || [],
        });
      }
    } catch (e) {
      console.error("Failed to load geofence config", e);
    }
  };

  const handleSaveGeofence = async () => {
    setSavingGeofence(true);
    try {
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
      await axios.put(`${import.meta.env.VITE_API_URL}/api/offices/geofence-config`, geofenceConfig, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Workplace Geofence Policy saved successfully!");
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to update geofence");
    } finally {
      setSavingGeofence(false);
    }
  };

  // Immediate save on quick policy changes (Mode change or Enforcement Gate toggle)
  const updateGeofencePolicy = async (partialConfig) => {
    const updated = { ...geofenceConfig, ...partialConfig };
    setGeofenceConfig(updated);
    try {
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
      await axios.put(`${import.meta.env.VITE_API_URL}/api/offices/geofence-config`, updated, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Geofence Policy updated & active instantly!");
    } catch (e) {
      toast.error("Failed to update geofence policy");
    }
  };

  // Toggle active state for Office 1 or Office 2 with immediate feedback
  const handleToggleLocation = async (locId) => {
    try {
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
      const res = await axios.put(`${import.meta.env.VITE_API_URL}/api/offices/geofence-config/location/${locId}/toggle`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(res.data.message || "Office access updated");
      fetchGeofenceConfig();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to toggle office access");
    }
  };

  // Add new authorized office location
  const handleAddLocationSubmit = async (e) => {
    e.preventDefault();
    if (!newLocationForm.name || !newLocationForm.placeId) {
      return toast.error("Please provide both Office Name and Place ID");
    }
    try {
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/offices/geofence-config/location`, newLocationForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(res.data.message || "New authorized office added!");
      setShowAddLocationModal(false);
      setNewLocationForm({
        name: "",
        placeId: "",
        address: "",
        latitude: 23.814343,
        longitude: 86.441198,
        radiusMeters: 500,
        isActive: true,
      });
      fetchGeofenceConfig();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to add office");
    }
  };

  // Delete an authorized location (cannot delete head office)
  const handleDeleteLocation = async (locId) => {
    if (!window.confirm("Are you sure you want to remove this office location from authorized premises?")) return;
    try {
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/offices/geofence-config/location/${locId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Office location removed");
      fetchGeofenceConfig();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to remove office");
    }
  };

  const fetchOffices = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/offices`);
      setOffices(res.data);
      setLoading(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load offices");
      setLoading(false);
    }
  };

  const handleCreateOffice = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/offices`, formData);
      toast.success("Office created successfully!");
      setShowModal(false);
      setFormData({ name: "", code: "", address: "", contactNumber: "", username: "", password: "", bookingPrefix: "EP", bookingIdStart: 4600 });
      fetchOffices();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create office");
    }
  };

  const handleDeleteOffice = async (officeId) => {
    if (!window.confirm("Are you sure you want to delete this office? This will also delete its admin user.")) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/offices/${officeId}`);
      toast.success("Office deleted successfully!");
      fetchOffices();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete office");
    }
  };

  const handleToggleMailService = async (officeId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      await axios.put(`${import.meta.env.VITE_API_URL}/api/offices/${officeId}/mail-service`, {
        enableMailService: newStatus
      });
      toast.success(`Booking email receipts ${newStatus ? 'enabled' : 'disabled'} successfully!`);
      fetchOffices();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to toggle booking email service");
    }
  };

  const handleToggleDeliveryEmail = async (officeId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      await axios.put(`${import.meta.env.VITE_API_URL}/api/offices/${officeId}/delivery-email`, {
        enableDeliveryEmail: newStatus
      });
      toast.success(`Delivery emails ${newStatus ? 'enabled' : 'disabled'} successfully!`);
      fetchOffices();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to toggle delivery email service");
    }
  };

  // Switch to office by logging in as the office admin
  const handleSwitchToOffice = async (office) => {
    if (!office.adminUser?._id) return toast.error("No valid admin user for this office");
    
    setSwitchingTo(office._id);
    
    // Simulate a slight delay for a nice loader animation
    setTimeout(async () => {
      const res = await impersonate(office.adminUser._id);
      if (res.success) {
        toast.success(`Switched to ${office.name}!`);
        // Force reload to completely refresh the state and routes to the office dashboard
        window.location.href = "/"; 
      } else {
        toast.error(res.message);
        setSwitchingTo(null);
      }
    }, 1200);
  };

  const openPermissionsModal = (office) => {
    setSelectedOffice(office);
    // Extract permissions from admin user or use empty array
    // Since we didn't always fetch adminUser.permissions, we might need to fallback to default
    const existingPermissions = office.adminUser?.permissions;
    if (existingPermissions && existingPermissions.length > 0) {
      setEditingPermissions(existingPermissions);
    } else {
      setEditingPermissions(["Dashboard", "Booking", "E-Docket", "Create Order"]);
    }
    setShowPermissionsModal(true);
  };

  const handleUpdatePermissions = async () => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/api/offices/${selectedOffice._id}/permissions`, {
        permissions: editingPermissions
      });
      toast.success("Office permissions updated!");
      setShowPermissionsModal(false);
      fetchOffices();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update permissions");
    }
  };

  const togglePermission = (feature, isCreating = false) => {
    if (isCreating) {
      if (formData.permissions.includes(feature)) {
        setFormData({ ...formData, permissions: formData.permissions.filter(f => f !== feature) });
      } else {
        setFormData({ ...formData, permissions: [...formData.permissions, feature] });
      }
    } else {
      if (editingPermissions.includes(feature)) {
        setEditingPermissions(editingPermissions.filter(f => f !== feature));
      } else {
        setEditingPermissions([...editingPermissions, feature]);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-xl">
            <Building className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Office Management</h1>
            <p className="text-sm font-medium text-gray-500">Manage multiple office locations and their admin credentials</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-100 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Create New Office
        </button>
      </div>

      {/* ─── STAFF WORKPLACE GEOFENCING & MULTI-OFFICE CONTROL CENTER ─── */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
        
        {/* Top Header & Save Button */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-slate-100 gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900">
                  Staff Workplace Geofence & Location Access Control
                </h2>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  geofenceConfig.enforceGeofence
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}>
                  {geofenceConfig.enforceGeofence ? "Geofence Enforced" : "Geofence Disabled"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage physical office branches (IIT ISM Dhanbad & 2nd Office) and configure Pan-India or Global remote access policies.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowAddLocationModal(true)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Branch Office</span>
            </button>
            <button
              type="button"
              onClick={handleSaveGeofence}
              disabled={savingGeofence}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>{savingGeofence ? "Saving..." : "Save Policy"}</span>
            </button>
          </div>
        </div>

        {/* Global Access Policy Selector & Master Enforcement Toggle */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Default System Work Location Policy
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => updateGeofencePolicy({ globalMode: "offices_only" })}
                className={`p-3 rounded-xl border text-left transition-all ${
                  geofenceConfig.globalMode === "offices_only"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <Building className="w-4 h-4" />
                  <span>Offices Only</span>
                </div>
                <p className={`text-[10px] mt-1 ${geofenceConfig.globalMode === "offices_only" ? "text-emerald-100" : "text-slate-400"}`}>
                  Strict physical presence at authorized office branches.
                </p>
              </button>

              <button
                type="button"
                onClick={() => updateGeofencePolicy({ globalMode: "pan_india" })}
                className={`p-3 rounded-xl border text-left transition-all ${
                  geofenceConfig.globalMode === "pan_india"
                    ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <Globe className="w-4 h-4" />
                  <span>Pan-India Remote</span>
                </div>
                <p className={`text-[10px] mt-1 ${geofenceConfig.globalMode === "pan_india" ? "text-amber-100" : "text-slate-400"}`}>
                  Staff can login and work from anywhere across India.
                </p>
              </button>

              <button
                type="button"
                onClick={() => updateGeofencePolicy({ globalMode: "global" })}
                className={`p-3 rounded-xl border text-left transition-all ${
                  geofenceConfig.globalMode === "global"
                    ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <Globe className="w-4 h-4" />
                  <span>Global Access</span>
                </div>
                <p className={`text-[10px] mt-1 ${geofenceConfig.globalMode === "global" ? "text-purple-100" : "text-slate-400"}`}>
                  Unrestricted global access for all staff worldwide.
                </p>
              </button>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Enforcement Gate
              </span>
              <p className="text-xs text-slate-600">
                When enabled, unauthorized staff outside allowed premises are blocked with a full-screen geofence restriction.
              </p>
            </div>
            <label className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer mt-3">
              <span className="text-xs font-bold text-slate-800">
                {geofenceConfig.enforceGeofence ? "Enforcement Active" : "Enforcement Bypassed"}
              </span>
              <input
                type="checkbox"
                checked={geofenceConfig.enforceGeofence}
                onChange={(e) => updateGeofencePolicy({ enforceGeofence: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Authorized Office Locations List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Building className="w-4 h-4 text-emerald-600" />
              <span>Authorized Office Premises (Multi-Branch Geofencing)</span>
            </h3>
            <span className="text-xs text-slate-400">
              {geofenceConfig.authorizedLocations?.filter(l => l.isActive).length || 0} active out of {geofenceConfig.authorizedLocations?.length || 0} locations
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(geofenceConfig.authorizedLocations || []).map((loc, idx) => (
              <div
                key={loc.id || loc._id || idx}
                className={`p-5 rounded-2xl border transition-all ${
                  loc.isActive
                    ? "bg-white border-slate-200 shadow-xs hover:border-emerald-300"
                    : "bg-slate-50/70 border-slate-200/60 opacity-75"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-2.5">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                      loc.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-slate-100 text-slate-400"
                    }`}>
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{loc.name}</h4>
                        {loc.isHeadOffice && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-200">
                            Head Office
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                        {loc.address}
                      </p>
                    </div>
                  </div>

                  {/* One-Click Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => handleToggleLocation(loc.id || loc._id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                      loc.isActive
                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                        : "bg-slate-200 hover:bg-slate-300 text-slate-600"
                    }`}
                    title={loc.isActive ? "Click to disable office access for staff" : "Click to grant office access for staff"}
                  >
                    <Power className={`w-3.5 h-3.5 ${loc.isActive ? "text-emerald-600" : "text-slate-400"}`} />
                    <span>{loc.isActive ? "Active (Allowed)" : "Disabled (Blocked)"}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Google Place ID
                    </span>
                    <span className="font-mono text-[11px] font-bold text-slate-800 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200/80 inline-block mt-0.5 truncate max-w-full">
                      {loc.placeId}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Allowed Boundary Radius
                    </span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <input
                        type="number"
                        min="50"
                        max="5000"
                        step="50"
                        value={loc.radiusMeters || 500}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 500;
                          const updated = geofenceConfig.authorizedLocations.map((l) =>
                            (l.id === loc.id || l._id === loc._id) ? { ...l, radiusMeters: val } : l
                          );
                          setGeofenceConfig({ ...geofenceConfig, authorizedLocations: updated });
                        }}
                        className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 outline-none"
                      />
                      <span className="text-slate-500 text-xs font-medium">meters</span>
                    </div>
                  </div>

                  <div className="col-span-2 flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400 font-mono">
                      GPS: {Number(loc.latitude).toFixed(6)}, {Number(loc.longitude).toFixed(6)}
                    </span>
                    {!loc.isHeadOffice && (
                      <button
                        type="button"
                        onClick={() => handleDeleteLocation(loc.id || loc._id)}
                        className="text-rose-500 hover:text-rose-700 text-xs font-bold flex items-center gap-1 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Location</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 font-bold">Loading offices...</div>
      ) : offices.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
          <Building className="w-16 h-16 text-gray-300 mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-bold text-gray-600 mb-2">No Offices Found</h3>
          <p className="text-gray-400 font-medium mb-6">Create your first office to start managing multiple locations.</p>
          <button onClick={() => setShowModal(true)} className="text-blue-600 font-bold hover:underline">Click here to add one</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {offices.map(office => (
            <div key={office._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6 border-b border-gray-50 flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-black text-gray-900">{office.name}</h3>
                  <div className="flex gap-2 mt-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-600 uppercase">
                      Code: {office.code}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black bg-green-50 text-green-600 uppercase">
                      Prefix: {office.bookingPrefix || "EP"}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-50 text-purple-600 uppercase">
                      Starts: {office.bookingIdStart || 4601}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => handleDeleteOffice(office._id)} 
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete Office"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4 bg-gray-50/50">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div className="text-sm text-gray-600 font-medium">{office.address || 'No address provided'}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-gray-400" />
                  <div className="text-sm text-gray-600 font-medium font-mono">{office.adminUser?.username || 'No Admin Assigned'}</div>
                </div>

                <div className="flex flex-col gap-2 p-3 bg-white rounded-xl border border-gray-100 shadow-sm mt-2">
                  {/* Booking Receipts Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {office.enableMailService !== false ? (
                        <Mail className="w-4 h-4 text-green-500" />
                      ) : (
                        <MailX className="w-4 h-4 text-red-500" />
                      )}
                      <span className="text-xs font-bold text-gray-700">Booking Receipts</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={office.enableMailService !== false}
                        onChange={() => handleToggleMailService(office._id, office.enableMailService !== false)}
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                    </label>
                  </div>

                  {/* Delivery Emails Toggle */}
                  <div className="flex items-center justify-between border-t border-gray-100 pt-2 mt-1">
                    <div className="flex items-center gap-2">
                      {office.enableDeliveryEmail !== false ? (
                        <Send className="w-4 h-4 text-blue-500" />
                      ) : (
                        <MailX className="w-4 h-4 text-red-500" />
                      )}
                      <span className="text-xs font-bold text-gray-700">Delivery Emails</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={office.enableDeliveryEmail !== false}
                        onChange={() => handleToggleDeliveryEmail(office._id, office.enableDeliveryEmail !== false)}
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                    </label>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-4 border-t border-gray-100">
                  <button 
                    onClick={() => openPermissionsModal(office)}
                    className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    Edit Feature Access
                  </button>
                  <button 
                    onClick={() => handleSwitchToOffice(office)}
                    disabled={switchingTo === office._id}
                    className="w-full py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {switchingTo === office._id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Switching...
                      </>
                    ) : (
                      <>
                        <Key className="w-4 h-4" /> Switch to this Office
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Authorized Office Branch Modal */}
      {showAddLocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setShowAddLocationModal(false)}></div>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-gray-900">Add Authorized Office Branch</h2>
                  <p className="text-xs text-gray-500">Staff will be permitted to work from this premises</p>
                </div>
              </div>
              <button onClick={() => setShowAddLocationModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddLocationSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Branch Name *
                </label>
                <input
                  type="text"
                  required
                  value={newLocationForm.name}
                  onChange={(e) => setNewLocationForm({ ...newLocationForm, name: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g. Engineers Parcel Second Office"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Google Place ID *
                </label>
                <input
                  type="text"
                  required
                  value={newLocationForm.placeId}
                  onChange={(e) => setNewLocationForm({ ...newLocationForm, placeId: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl font-mono font-bold text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="ChIJO6nl04679jkR9J18NwQUqVo"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Office Address
                </label>
                <textarea
                  rows="2"
                  value={newLocationForm.address}
                  onChange={(e) => setNewLocationForm({ ...newLocationForm, address: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  placeholder="Office address details..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={newLocationForm.latitude}
                    onChange={(e) => setNewLocationForm({ ...newLocationForm, latitude: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl font-mono text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="23.812500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={newLocationForm.longitude}
                    onChange={(e) => setNewLocationForm({ ...newLocationForm, longitude: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl font-mono text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="86.440000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Allowed Boundary Radius (Meters)
                </label>
                <input
                  type="number"
                  min="50"
                  max="5000"
                  step="50"
                  value={newLocationForm.radiusMeters}
                  onChange={(e) => setNewLocationForm({ ...newLocationForm, radiusMeters: Number(e.target.value) || 500 })}
                  className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="500"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddLocationModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-200 transition-all"
                >
                  Save Branch Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fullscreen Overlay Loader when Switching */}
      {switchingTo && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gray-900/80 backdrop-blur-sm animate-in fade-in duration-300">
          <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-6" />
          <h2 className="text-3xl font-black text-white tracking-wide animate-pulse">Switching Office...</h2>
          <p className="text-gray-300 font-medium mt-2">Authenticating securely and loading dashboard</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-black text-gray-900">Create New Office</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            
            <form onSubmit={handleCreateOffice} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Office Name</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" placeholder="e.g. South Branch" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Office Code</label>
                  <input type="text" required value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" placeholder="e.g. SB-01" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Booking Prefix</label>
                  <input type="text" required value={formData.bookingPrefix} onChange={e => setFormData({...formData, bookingPrefix: e.target.value})} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" placeholder="e.g. EP" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Start Sequence</label>
                  <input type="number" required value={formData.bookingIdStart} onChange={e => setFormData({...formData, bookingIdStart: Number(e.target.value)})} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" placeholder="e.g. 4600" />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Full Address</label>
                <textarea rows="2" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm resize-none"></textarea>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Office Admin Credentials</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Admin Username</label>
                    <input type="text" required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full bg-blue-50 border border-blue-100 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold text-sm text-blue-900" placeholder="office_admin_1" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Password</label>
                    <input type="text" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-blue-50 border border-blue-100 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold text-sm text-blue-900" placeholder="Secret123" />
                  </div>
                </div>
                <p className="text-[10px] font-medium text-gray-500 mt-2">These credentials will be used by the office manager to log in and add their own staff.</p>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Initial Feature Access</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {availableFeatures.map(feature => (
                    <label key={feature} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={formData.permissions.includes(feature)}
                        onChange={() => togglePermission(feature, true)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs font-bold text-gray-700">{feature}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button type="submit" className="w-full py-4 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all">
                Save & Create Office
              </button>
            </form>
          </div>
        </div>
      )}

      {showPermissionsModal && selectedOffice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setShowPermissionsModal(false)}></div>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h2 className="text-xl font-black text-gray-900">Edit Feature Access</h2>
                <p className="text-xs font-bold text-gray-500 mt-1">For {selectedOffice.name}</p>
              </div>
              <button onClick={() => setShowPermissionsModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {availableFeatures.map(feature => (
                  <label key={feature} className={`flex items-center gap-2 cursor-pointer p-3 rounded-xl border-2 transition-all ${editingPermissions.includes(feature) ? 'border-blue-500 bg-blue-50/50' : 'border-gray-100 hover:border-gray-300'}`}>
                    <input 
                      type="checkbox" 
                      checked={editingPermissions.includes(feature)}
                      onChange={() => togglePermission(feature, false)}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className="text-sm font-bold text-gray-800">{feature}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
              <button 
                onClick={() => setShowPermissionsModal(false)}
                className="px-6 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleUpdatePermissions}
                className="px-6 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Offices;
