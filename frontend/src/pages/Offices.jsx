import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Building, Plus, X, Users, MapPin, Key, Trash2, Loader2, Mail, MailX, Send } from "lucide-react";
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
    "Partner Management", "Docket Management", "User Management",
    "Manage Queries", "Tasks", "Staff Tasks", "Attendance", "Attendance Report",
    "Sales Report", "Web Analytics"
  ];

  useEffect(() => {
    fetchOffices();
  }, []);

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
