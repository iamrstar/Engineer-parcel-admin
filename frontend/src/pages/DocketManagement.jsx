import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Upload, Plus, History, Package, CheckCircle, AlertCircle, Search, Trash2, FileText, ChevronRight, X, Edit2, ToggleLeft, ToggleRight, Info, RotateCcw, Tag } from "lucide-react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

const DocketManagement = () => {
  const [stats, setStats] = useState([]);
  const [usedDockets, setUsedDockets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState("");
  const [otherVendor, setOtherVendor] = useState("");
  const [fileData, setFileData] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMode, setUploadMode] = useState("file"); // "file" | "manual" | "sequence"
  const [manualIds, setManualIds] = useState([""]);
  const [sequenceData, setSequenceData] = useState({ prefix: "", start: "", end: "", suffix: "" });
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedVendorForDetails, setSelectedVendorForDetails] = useState(null);
  const [vendorDockets, setVendorDockets] = useState([]);
  const [detailsFilter, setDetailsFilter] = useState("all");
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showAllVendors, setShowAllVendors] = useState(false);
  const [editingDocket, setEditingDocket] = useState(null); // {id, value}
  const [expandedDocketId, setExpandedDocketId] = useState(null);
  const [orderListModal, setOrderListModal] = useState({ open: false, title: "", epId: [], usedBy: [] });
  const [offlineModal, setOfflineModal] = useState({
    open: false,
    docket: null,
    bookingId: "",
    customerName: "",
    reason: "Counter Booking",
    proof: "",
    notes: "",
    loading: false
  });
  const [offlineDetailsModal, setOfflineDetailsModal] = useState({
    open: false,
    docket: null
  });

  useEffect(() => {
    fetchStats();
    fetchUsedDockets();
    fetchVendors();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/dockets/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch inventory stats");
    }
  };

  const fetchUsedDockets = async () => {
    try {
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/dockets/used`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsedDockets(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch used dockets history");
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/partners`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVendors(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      
      // Flatten the array and filter out empty strings/headers
      const ids = data.flat()
        .filter(id => id && id.toString().trim() !== "")
        .filter(id => !["docket", "id", "tracking", "number", "awb", "docket id"].includes(id.toString().toLowerCase().trim()));
      
      setFileData(ids);
      toast.success(`${ids.length} IDs found in file`);
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    const data = [["Docket ID"], ["AWB123456789"], ["AWB987654321"]];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Docket_Upload_Template.xlsx");
  };

  const handleSubmitUpload = async () => {
    const idsToUpload = uploadMode === "file" ? fileData : manualIds.filter(id => id.trim() !== "");

    if (!selectedVendor || idsToUpload.length === 0) {
      toast.error(uploadMode === "file" ? "Please select a vendor and upload a file" : "Please select a vendor and enter at least one ID");
      return;
    }

    let finalVendorName = selectedVendor;
    if (selectedVendor === "Other") {
      finalVendorName = otherVendor;
    }

    setUploading(true);
    try {
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/dockets/upload`,
        { vendorName: finalVendorName, ids: idsToUpload },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const { added, skipped, message } = res.data;
      toast.success(message || "Dockets updated successfully!");
      setShowUploadModal(false);
      setFileData([]);
      setManualIds([""]);
      setSelectedVendor("");
      fetchStats();
    } catch (err) {
      console.error(err);
      toast.error("Failed to add dockets");
    } finally {
      setUploading(false);
    }
  };

  const addManualIdField = () => setManualIds([...manualIds, ""]);
  const updateManualId = (index, value) => {
    const newIds = [...manualIds];
    newIds[index] = value;
    setManualIds(newIds);
  };
  const removeManualId = (index) => {
    if (manualIds.length > 1) {
      setManualIds(manualIds.filter((_, i) => i !== index));
    }
  };

  const openVendorDetails = async (vendorName) => {
    setSelectedVendorForDetails(vendorName);
    setShowDetailsModal(true);
    fetchVendorDockets(vendorName, "all");
  };

  const fetchVendorDockets = async (vendorName, status) => {
    setDetailsLoading(true);
    setDetailsFilter(status);
    try {
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
      const url = `${import.meta.env.VITE_API_URL}/api/dockets/vendor/${encodeURIComponent(vendorName)}${status !== "all" ? `?status=${status}` : ""}`;
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVendorDockets(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch vendor dockets");
    } finally {
      setDetailsLoading(false);
    }
  };

  const deleteDocket = async (id) => {
    if (!window.confirm("Are you sure you want to delete this docket?")) return;
    try {
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/dockets/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Docket deleted");
      fetchVendorDockets(selectedVendorForDetails, detailsFilter);
      fetchStats();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete docket");
    }
  };

  const handleUpdateDocket = async (id, newValue) => {
    if (!newValue.trim()) return;
    try {
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
      await axios.put(`${import.meta.env.VITE_API_URL}/api/dockets/${id}`, {
        docketId: newValue.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Docket updated");
      setEditingDocket(null);
      fetchVendorDockets(selectedVendorForDetails, detailsFilter);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to update docket");
    }
  };

  const handleMarkUsedOffline = async (e) => {
    e.preventDefault();
    if (!offlineModal.bookingId.trim()) {
      toast.error("Please enter a Booking ID or Reference Number");
      return;
    }
    setOfflineModal(prev => ({ ...prev, loading: true }));
    try {
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
      const res = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/dockets/${offlineModal.docket._id}/mark-used-offline`,
        {
          bookingId: offlineModal.bookingId.trim(),
          customerName: offlineModal.customerName.trim(),
          reason: offlineModal.reason,
          proof: offlineModal.proof.trim(),
          notes: offlineModal.notes.trim()
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(res.data.message || `Docket ${offlineModal.docket.docketId} marked as used offline!`);
      setOfflineModal({ open: false, docket: null, bookingId: "", customerName: "", reason: "Counter Booking", proof: "", notes: "", loading: false });
      fetchVendorDockets(selectedVendorForDetails, detailsFilter);
      fetchStats();
      fetchUsedDockets();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to mark docket as used offline");
    } finally {
      setOfflineModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleRevertToAvailable = async (docket) => {
    if (!window.confirm(`Revert docket ${docket.docketId} back to Available inventory?`)) return;
    try {
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
      const res = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/dockets/${docket._id}/mark-available`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(res.data.message || `Docket ${docket.docketId} reverted to available!`);
      fetchVendorDockets(selectedVendorForDetails, detailsFilter);
      fetchStats();
      fetchUsedDockets();
      if (offlineDetailsModal.open) {
        setOfflineDetailsModal({ open: false, docket: null });
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to revert docket");
    }
  };

  return (
    <div className="space-y-8 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Docket Inventory Management</h1>
          <p className="text-gray-500 font-medium">Manage and monitor vendor tracking ID pools</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-orange-100 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Add New Dockets
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.length > 0 ? (
          (showAllVendors ? stats : stats.slice(0, 3)).map((vendor) => (
            <div 
              key={vendor._id} 
              onClick={() => openVendorDetails(vendor._id)}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Package className="w-24 h-24 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">{vendor._id}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 p-3 rounded-xl">
                  <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider mb-1">Available</p>
                  <p className="text-2xl font-black text-green-700">{vendor.available}</p>
                </div>
                <div className="bg-orange-50 p-3 rounded-xl">
                  <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider mb-1">Used</p>
                  <p className="text-2xl font-black text-orange-700">{vendor.used}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center text-sm">
                <span className="text-gray-400 font-medium">Total Inventory</span>
                <span className="text-gray-900 font-bold">{vendor.total}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-bold">No inventory found. Start by uploading dockets.</p>
          </div>
        )}
      </div>

      {stats.length > 3 && (
        <div className="flex justify-center mt-4">
          <button
            onClick={() => setShowAllVendors(!showAllVendors)}
            className="flex items-center gap-2 text-orange-600 font-bold hover:bg-orange-50 px-6 py-2 rounded-xl transition-all border border-orange-100 shadow-sm shadow-orange-50"
          >
            {showAllVendors ? "Show Less Vendors" : `Show All Vendors (${stats.length})`}
            <ChevronRight className={`w-4 h-4 transition-transform ${showAllVendors ? 'rotate-90' : ''}`} />
          </button>
        </div>
      )}

      {/* History Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-orange-600" />
            <h2 className="text-lg font-bold text-gray-900">Recently Used IDs</h2>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 text-[11px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                <th className="px-6 py-4">Docket ID</th>
                <th className="px-6 py-4">Vendor</th>
                <th className="px-6 py-4">Assigned By</th>
                <th className="px-6 py-4">Used For (EP ID)</th>
                <th className="px-6 py-4">Used Date</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {usedDockets.length > 0 ? (
                usedDockets.map((docket) => (
                  <tr key={docket._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-gray-900">{docket.docketId}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold uppercase">{docket.vendorName}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-bold text-gray-900">
                          {docket.metadata?.isOffline ? (docket.metadata.markedBy || docket.assignedBy?.name || 'Staff') : (docket.assignedBy?.name || 'Admin')}
                        </span>
                        <span className="text-[10px] font-bold uppercase text-gray-500">
                          {docket.metadata?.isOffline ? 'Offline Counter' : (docket.assignedByOffice ? docket.assignedByOffice.name : 'Main Office')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {docket.metadata?.isOffline ? (
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                                OFFLINE
                              </span>
                              <span className="text-sm font-mono font-bold text-gray-900">
                                {docket.metadata.bookingId || docket.epId?.[0] || 'Ref'}
                              </span>
                            </div>
                            <button
                              onClick={() => setOfflineDetailsModal({ open: true, docket })}
                              className="text-[11px] text-purple-700 font-semibold hover:underline text-left flex items-center gap-1"
                            >
                              <Info className="w-3 h-3" />
                              {docket.metadata.reason || 'Counter Booking'} {docket.metadata.customerName ? `(${docket.metadata.customerName})` : ''} • View Details
                            </button>
                          </div>
                        ) : Array.isArray(docket.epId) ? (
                          <button
                            onClick={() => setOrderListModal({ open: true, title: docket.docketId, epId: docket.epId, usedBy: docket.usedBy })}
                            className="text-sm font-bold text-orange-600 cursor-pointer border-b border-dashed border-orange-300 hover:text-orange-700 text-left self-start"
                          >
                            {docket.epId.length} Orders
                          </button>
                        ) : (
                          <>
                            <Link 
                              to={`/bookings/${docket.usedBy?._id || docket.usedBy}`} 
                              className="text-sm font-bold text-orange-600 hover:underline hover:text-orange-700"
                            >
                              {docket.epId}
                            </Link>
                            <span className="text-[10px] text-gray-400 font-medium">{docket.usedBy?.senderDetails?.name || 'N/A'}</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-medium">
                      {new Date(docket.usedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-100">
                        <CheckCircle className="w-3.5 h-3.5" />
                        USED
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-400 font-bold bg-gray-50/30">
                  <div className="flex flex-col items-center justify-center">
                    <History className="w-12 h-12 mb-2 opacity-10" />
                    No used dockets found yet.<br/>
                    <span className="text-[10px] uppercase font-black text-gray-300">IDs will appear here once assigned to bookings.</span>
                  </div>
                </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setShowUploadModal(false)}></div>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-gray-900">Add Dockets</h2>
                <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600">
                  <Trash2 className="w-6 h-6" />
                </button>
              </div>

              <div className="flex gap-2 p-1 bg-gray-100 rounded-xl mb-6">
                <button
                  onClick={() => setUploadMode("file")}
                  className={`flex-1 py-2 px-2 sm:px-4 rounded-lg font-bold text-xs transition-all ${uploadMode === "file" ? "bg-white shadow-sm text-orange-600" : "text-gray-500"}`}
                >
                  File Upload
                </button>
                <button
                  onClick={() => setUploadMode("manual")}
                  className={`flex-1 py-2 px-2 sm:px-4 rounded-lg font-bold text-xs transition-all ${uploadMode === "manual" ? "bg-white shadow-sm text-orange-600" : "text-gray-500"}`}
                >
                  Manual Entry
                </button>
                <button
                  onClick={() => setUploadMode("sequence")}
                  className={`flex-1 py-2 px-2 sm:px-4 rounded-lg font-bold text-xs transition-all ${uploadMode === "sequence" ? "bg-white shadow-sm text-orange-600" : "text-gray-500"}`}
                >
                  Auto Sequence
                </button>
              </div>

              {uploadMode === "file" && (
                <button 
                  onClick={downloadTemplate}
                  className="w-full mb-4 flex items-center justify-center gap-2 text-[10px] font-black text-orange-600 border border-orange-100 bg-orange-50/50 py-2 rounded-xl hover:bg-orange-100 transition-all"
                >
                  <FileText className="w-3 h-3" />
                  DOWNLOAD SAMPLE TEMPLATE
                </button>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Select Vendor</label>
                  <select
                    value={selectedVendor}
                    onChange={(e) => setSelectedVendor(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-gray-900 transition-all"
                  >
                    <option value="">Choose a vendor...</option>
                    <option value="BlueDart">BlueDart</option>
                    <option value="DTDC (Hirak)">DTDC (Hirak)</option>
                    <option value="DTDC (Sanjay)">DTDC (Sanjay)</option>
                    <option value="Delhivery">Delhivery</option>
                    <option value="Safe Express">Safe Express</option>
                    <option value="India Post">India Post</option>
                    <option value="I Carry">I Carry</option>
                    <option value="Other">Other</option>
                  </select>
                </div>



                {selectedVendor === "Other" && (
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Other Vendor Name</label>
                    <input
                      type="text"
                      value={otherVendor}
                      onChange={(e) => setOtherVendor(e.target.value)}
                      placeholder="Enter vendor name"
                      className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-sm transition-all"
                    />
                  </div>
                )}

                {uploadMode === "file" ? (
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Upload CSV/Excel</label>
                    <div className="relative group">
                      <input
                        type="file"
                        accept=".csv, .xlsx, .xls"
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="border-2 border-dashed border-gray-200 group-hover:border-orange-500 rounded-2xl p-8 text-center transition-all bg-gray-50/50 group-hover:bg-orange-50/30">
                        <Upload className="w-10 h-10 text-gray-300 group-hover:text-orange-500 mx-auto mb-3 transition-colors" />
                        <p className="text-sm font-bold text-gray-500 group-hover:text-orange-600">
                          {fileData.length > 0 ? `${fileData.length} IDs loaded` : "Click to select or drag & drop"}
                        </p>
                        <p className="text-[10px] text-gray-400 font-medium mt-1">Accepts .csv, .xlsx</p>
                      </div>
                    </div>
                  </div>
                ) : uploadMode === "sequence" ? (
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Auto Generate Sequence</label>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase">Prefix (Optional)</label>
                          <input type="text" value={sequenceData.prefix} onChange={e => setSequenceData({...sequenceData, prefix: e.target.value})} placeholder="e.g. AWB" className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-sm" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase">Suffix (Optional)</label>
                          <input type="text" value={sequenceData.suffix} onChange={e => setSequenceData({...sequenceData, suffix: e.target.value})} placeholder="e.g. IN" className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-sm" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase">Start Number</label>
                          <input type="number" value={sequenceData.start} onChange={e => setSequenceData({...sequenceData, start: e.target.value})} placeholder="e.g. 1" className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-sm" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase">End Number</label>
                          <input type="number" value={sequenceData.end} onChange={e => setSequenceData({...sequenceData, end: e.target.value})} placeholder="e.g. 50" className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-sm" />
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const start = parseInt(sequenceData.start);
                          const end = parseInt(sequenceData.end);
                          if (isNaN(start) || isNaN(end) || start > end || end - start > 500) {
                            return toast.error("Please enter a valid range (max 500)");
                          }
                          const newIds = [];
                          for (let i = start; i <= end; i++) {
                            const numStr = sequenceData.start.startsWith("0") ? String(i).padStart(sequenceData.start.length, "0") : i;
                            newIds.push(`${sequenceData.prefix}${numStr}${sequenceData.suffix}`);
                          }
                          setManualIds(newIds);
                          setUploadMode("manual");
                          toast.success(`Generated ${newIds.length} sequential IDs`);
                        }}
                        className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white p-3 rounded-xl font-bold transition-all"
                      >
                        Generate & Preview
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 flex justify-between">
                      <span>Manual Entry ({manualIds.filter(id => id.trim() !== "").length} items)</span>
                      {manualIds.length > 1 && (
                        <button onClick={() => setManualIds([""])} className="text-red-500 hover:underline">Clear All</button>
                      )}
                    </label>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                      {manualIds.map((id, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="text"
                            value={id}
                            onChange={(e) => updateManualId(index, e.target.value)}
                            placeholder="Enter Docket ID..."
                            className="flex-1 bg-gray-50 border border-gray-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-sm"
                          />
                          {manualIds.length > 1 && (
                            <button
                              onClick={() => removeManualId(index)}
                              className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={addManualIdField}
                      className="mt-3 flex items-center gap-2 text-orange-600 font-bold text-xs hover:bg-orange-50 p-2 rounded-lg transition-colors w-full justify-center border border-dashed border-orange-200"
                    >
                      <Plus className="w-4 h-4" />
                      Add Another ID
                    </button>
                  </div>
                )}

                <div className="pt-4">
                  <button
                    onClick={handleSubmitUpload}
                    disabled={uploading || !selectedVendor || (uploadMode === "file" ? fileData.length === 0 : manualIds.every(id => !id.trim()))}
                    className="w-full bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-black py-4 rounded-2xl shadow-xl shadow-orange-100 hover:bg-orange-700 transition-all flex items-center justify-center gap-2"
                  >
                    {uploading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Confirm Upload
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setShowDetailsModal(false)}></div>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in duration-200 h-[80vh] flex flex-col">
            <div className="p-6 sm:p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
              <div>
                <h2 className="text-2xl font-black text-gray-900">{selectedVendorForDetails}</h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Inventory Details</p>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 bg-white border-b border-gray-50 flex gap-2">
              {['all', 'available', 'used'].map((status) => (
                <button
                  key={status}
                  onClick={() => fetchVendorDockets(selectedVendorForDetails, status)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${detailsFilter === status ? 'bg-orange-600 text-white shadow-lg shadow-orange-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {detailsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
                </div>
              ) : vendorDockets.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {vendorDockets.map((docket) => {
                    const isOffline = docket.metadata?.isOffline;
                    return (
                      <div 
                        key={docket._id} 
                        className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                          docket.status === 'used' 
                            ? isOffline 
                              ? 'bg-purple-50/40 border-purple-200' 
                              : 'bg-orange-50/30 border-orange-100' 
                            : 'bg-green-50/30 border-green-100'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          {editingDocket?.id === docket._id ? (
                            <div className="flex gap-2 w-full">
                               <input 
                                 type="text" 
                                 value={editingDocket.value} 
                                 onChange={(e) => setEditingDocket({...editingDocket, value: e.target.value})}
                                 className="flex-1 bg-white border border-gray-200 px-2 py-1 rounded text-sm font-mono font-bold outline-none focus:ring-1 focus:ring-orange-500"
                                 autoFocus
                               />
                               <button 
                                 onClick={() => handleUpdateDocket(docket._id, editingDocket.value)}
                                 className="bg-orange-600 text-white px-2 py-1 rounded text-[10px] font-black"
                               >
                                 SAVE
                               </button>
                               <button 
                                 onClick={() => setEditingDocket(null)}
                                 className="bg-gray-100 text-gray-500 px-2 py-1 rounded text-[10px] font-black"
                               >
                                 X
                               </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex flex-col">
                                <span className="font-mono font-black text-gray-900 text-base">{docket.docketId}</span>
                                {isOffline && (
                                  <span className="text-[10px] font-bold text-purple-700 mt-0.5">
                                    Ref: {docket.metadata?.bookingId || (Array.isArray(docket.epId) ? docket.epId[0] : docket.epId)}
                                  </span>
                                )}
                              </div>
                              {docket.status !== 'used' && (
                                <div className="flex gap-1">
                                  <button 
                                    onClick={() => setEditingDocket({id: docket._id, value: docket.docketId})}
                                    className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all"
                                    title="Edit Docket ID"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => deleteDocket(docket._id)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                    title="Delete Docket"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        
                        <div className="flex justify-between items-end gap-2 pt-2 border-t border-gray-100/60">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full self-start ${
                                docket.status === 'used' 
                                  ? isOffline 
                                    ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                                    : 'bg-orange-100 text-orange-600' 
                                  : 'bg-green-100 text-green-600'
                              }`}>
                                {isOffline ? 'OFFLINE USED' : docket.status}
                              </span>
                            </div>
                            {docket.status === 'used' && (
                              <span className="text-[9px] font-bold text-gray-500 uppercase mt-0.5">
                                {isOffline 
                                  ? `Offline • ${docket.metadata?.markedBy?.name ? docket.metadata.markedBy.name.split(' ')[0] : 'Staff'}` 
                                  : `${docket.assignedByOffice ? docket.assignedByOffice.name : 'Main Office'} • ${docket.assignedBy?.name ? docket.assignedBy.name.split(' ')[0] : 'Admin'}`
                                }
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            {docket.status !== 'used' ? (
                              <button
                                onClick={() => setOfflineModal({
                                  open: true,
                                  docket,
                                  bookingId: "",
                                  customerName: "",
                                  reason: "Counter Booking",
                                  proof: "",
                                  notes: "",
                                  loading: false
                                })}
                                className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-all shadow-xs"
                                title="Toggle to Mark this docket as used offline"
                              >
                                <ToggleLeft className="w-3.5 h-3.5" />
                                <span>Mark Offline</span>
                              </button>
                            ) : isOffline ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setOfflineDetailsModal({ open: true, docket })}
                                  className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-purple-700 bg-white border border-purple-200 hover:bg-purple-50 rounded-lg transition-all shadow-xs"
                                  title="View offline booking proof and details"
                                >
                                  <Info className="w-3 h-3" />
                                  <span>Proof</span>
                                </button>
                                <button
                                  onClick={() => handleRevertToAvailable(docket)}
                                  className="flex items-center p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                  title="Revert back to available"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="relative flex justify-end pb-0.5">
                                {Array.isArray(docket.epId) ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOrderListModal({ open: true, title: docket.docketId, epId: docket.epId, usedBy: docket.usedBy });
                                    }}
                                    className="text-[10px] font-bold text-orange-600 truncate hover:text-orange-700 underline underline-offset-2 decoration-orange-300"
                                  >
                                    {docket.epId.length} Orders
                                  </button>
                                ) : (
                                  <span className="text-[10px] font-bold text-gray-400 truncate" title={docket.epId}>
                                    {docket.epId}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 font-bold">
                   <AlertCircle className="w-12 h-12 mb-2 opacity-20" />
                   No dockets found for this filter
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Order List Modal */}
      {orderListModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="text-lg font-black text-gray-900">Assigned Bookings</h3>
                <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">Docket: {orderListModal.title}</p>
              </div>
              <button onClick={() => setOrderListModal({ open: false, title: "", epId: [], usedBy: [] })} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                {orderListModal.epId.map((id, idx) => {
                  const bookingData = Array.isArray(orderListModal.usedBy) ? orderListModal.usedBy[idx] : null;
                  const bookingId = bookingData?._id || bookingData || id;
                  return (
                    <Link 
                      key={id}
                      to={`/bookings/${bookingId}`} 
                      className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-orange-200 hover:bg-orange-50 transition-all group"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900 group-hover:text-orange-700">{id}</span>
                        {bookingData?.senderDetails?.name && (
                          <span className="text-xs text-gray-500 font-medium">{bookingData.senderDetails.name}</span>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-orange-500" />
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mark Docket as Used Offline Modal */}
      {offlineModal.open && offlineModal.docket && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-purple-50 to-indigo-50/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-200">
                  <ToggleRight className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">Mark Docket as Used Offline</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-bold text-purple-700 font-mono bg-purple-100/70 px-2 py-0.5 rounded">
                      Docket: {offlineModal.docket.docketId}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400">
                      ({offlineModal.docket.vendor})
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setOfflineModal({ open: false, docket: null, bookingId: "", customerName: "", reason: "Counter Booking", proof: "", notes: "", loading: false })}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-white/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleMarkUsedOffline} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Booking ID / Reference Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EP-OFFLINE-8942 or Slip #1042"
                  value={offlineModal.bookingId}
                  onChange={(e) => setOfflineModal(prev => ({ ...prev, bookingId: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 text-sm font-semibold transition-all"
                  autoFocus
                />
                <p className="text-[11px] text-gray-400 mt-1 font-medium">
                  Enter the offline booking reference, manual bilty ID, or receipt number.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Customer / Sender Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe / ABC Corp"
                    value={offlineModal.customerName}
                    onChange={(e) => setOfflineModal(prev => ({ ...prev, customerName: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 text-sm font-medium transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Usage Channel / Reason
                  </label>
                  <select
                    value={offlineModal.reason}
                    onChange={(e) => setOfflineModal(prev => ({ ...prev, reason: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 text-sm font-medium transition-all bg-white"
                  >
                    <option value="Counter Booking">Counter Booking</option>
                    <option value="Offline Manual Bilty">Offline Manual Bilty</option>
                    <option value="Branch Office Booking">Branch Office Booking</option>
                    <option value="Cash on Delivery Offline">Cash on Delivery Offline</option>
                    <option value="Urgent Walk-in">Urgent Walk-in</option>
                    <option value="Damaged / Scrapped">Damaged / Scrapped</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Proof Reference / Document Details
                </label>
                <input
                  type="text"
                  placeholder="e.g. Physical slip receipt #1234, scanned file ref, or cloud link"
                  value={offlineModal.proof}
                  onChange={(e) => setOfflineModal(prev => ({ ...prev, proof: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 text-sm font-medium transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Additional Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Any additional notes or reasons for offline usage..."
                  value={offlineModal.notes}
                  onChange={(e) => setOfflineModal(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 text-sm font-medium transition-all resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setOfflineModal({ open: false, docket: null, bookingId: "", customerName: "", reason: "Counter Booking", proof: "", notes: "", loading: false })}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={offlineModal.loading || !offlineModal.bookingId.trim()}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-purple-200 flex items-center gap-2"
                >
                  {offlineModal.loading && (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  <span>Mark as Used Offline</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Offline Details Modal */}
      {offlineDetailsModal.open && offlineDetailsModal.docket && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-purple-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                    OFFLINE USAGE PROOF
                  </span>
                </div>
                <h3 className="text-xl font-black text-gray-900 font-mono mt-1">
                  {offlineDetailsModal.docket.docketId}
                </h3>
                <p className="text-xs font-semibold text-gray-400">
                  Vendor: {offlineDetailsModal.docket.vendor}
                </p>
              </div>
              <button 
                onClick={() => setOfflineDetailsModal({ open: false, docket: null })}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-white/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-gray-400 uppercase">Booking / Ref ID</span>
                  <span className="text-sm font-black text-purple-700 font-mono">
                    {offlineDetailsModal.docket.metadata?.bookingId || (Array.isArray(offlineDetailsModal.docket.epId) ? offlineDetailsModal.docket.epId.join(", ") : offlineDetailsModal.docket.epId)}
                  </span>
                </div>

                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-gray-400 uppercase">Customer</span>
                  <span className="text-xs font-bold text-gray-900">
                    {offlineDetailsModal.docket.metadata?.customerName || "—"}
                  </span>
                </div>

                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-gray-400 uppercase">Channel / Reason</span>
                  <span className="text-xs font-bold text-gray-700">
                    {offlineDetailsModal.docket.metadata?.reason || "Counter Booking"}
                  </span>
                </div>

                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-gray-400 uppercase">Proof Reference</span>
                  <span className="text-xs font-bold text-gray-900 break-all text-right max-w-[200px]">
                    {offlineDetailsModal.docket.metadata?.proof || "—"}
                  </span>
                </div>

                {offlineDetailsModal.docket.metadata?.notes && (
                  <div className="pt-2 border-t border-gray-200/60">
                    <span className="text-xs font-bold text-gray-400 uppercase block mb-1">Notes</span>
                    <p className="text-xs text-gray-600 font-medium bg-white p-2 rounded-xl border border-gray-100">
                      {offlineDetailsModal.docket.metadata.notes}
                    </p>
                  </div>
                )}

                <div className="pt-2 border-t border-gray-200/60 flex justify-between items-center text-[11px] text-gray-500">
                  <span>Marked By:</span>
                  <span className="font-bold text-gray-800">
                    {offlineDetailsModal.docket.metadata?.markedBy?.name || "Admin"}
                  </span>
                </div>

                <div className="flex justify-between items-center text-[11px] text-gray-500">
                  <span>Date & Time:</span>
                  <span className="font-bold text-gray-800">
                    {offlineDetailsModal.docket.metadata?.markedAt 
                      ? new Date(offlineDetailsModal.docket.metadata.markedAt).toLocaleString()
                      : offlineDetailsModal.docket.usedAt 
                        ? new Date(offlineDetailsModal.docket.usedAt).toLocaleString() 
                        : "—"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const d = offlineDetailsModal.docket;
                    setOfflineDetailsModal({ open: false, docket: null });
                    handleRevertToAvailable(d);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-all"
                  title="Revert back to available inventory"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Revert to Available</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOfflineDetailsModal({ open: false, docket: null })}
                  className="px-5 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-black transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocketManagement;

