import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { 
  Users, 
  Plus, 
  Calendar, 
  Clock, 
  User as UserIcon, 
  Phone, 
  Mail, 
  Tag, 
  Flame, 
  Sun, 
  Snowflake, 
  RotateCw, 
  X, 
  CheckCircle2, 
  XCircle, 
  Search,
  Sparkles,
  ShieldCheck,
  FileText,
  UserCheck,
  ArrowRightLeft
} from 'lucide-react';
import { socket } from '../utils/socket';

export default function Leads() {
  const { user } = useAuth();
  const [pendingLeads, setPendingLeads] = useState([]);
  const [myLeads, setMyLeads] = useState([]);
  const [allLeads, setAllLeads] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [report, setReport] = useState({
    totalOnlineLeads: 0,
    totalAdminLeads: 0,
    totalLeads: 0,
    convertedLeads: 0,
    notConvertedLeads: 0,
    acceptedLeads: 0
  });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAdminState, setIsAdminState] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // default to 'all' so admins & staff can see who accepted which lead
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'Accepted', 'Converted', 'Not Converted'
  const [staffFilter, setStaffFilter] = useState('all'); // 'all' or staff name
  const [sourceFilter, setSourceFilter] = useState('all'); // 'all', 'Website', 'Admin Leads'
  const [searchTerm, setSearchTerm] = useState('');

  // Check if current user is admin
  const isAdmin = useMemo(() => {
    if (isAdminState) return true;
    if (!user) return false;
    const role = (user.role || '').toLowerCase();
    return !user.role || role === 'admin' || role === 'office_admin' || role === 'main_admin';
  }, [user, isAdminState]);

  // Add Lead Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newLead, setNewLead] = useState({
    name: '',
    phone: '',
    email: '',
    source: 'Admin Leads',
    temperature: 'None',
    assignedTo: '', // Staff ID or '' for unassigned
    notes: ''
  });

  // Reassign Modal State (Admin only)
  const [reassignModal, setReassignModal] = useState({
    open: false,
    lead: null,
    selectedStaffId: ''
  });
  const [isReassigning, setIsReassigning] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const fetchLeads = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/leads`, getAuthHeaders());
      if (res.data.success) {
        setPendingLeads(res.data.pendingLeads || []);
        setMyLeads(res.data.myLeads || []);
        setAllLeads(res.data.allLeads || []);
        const incomingStaff = res.data.staffList || res.data.staff;
        if (incomingStaff && incomingStaff.length > 0) {
          setStaffList(incomingStaff);
        }
        if (res.data.isAdmin !== undefined) {
          setIsAdminState(res.data.isAdmin);
        }
      }
    } catch (err) {
      console.error('Error fetching leads:', err);
      toast.error('Failed to fetch leads');
    } finally {
      setLoading(false);
      if (showRefreshIndicator) setIsRefreshing(false);
    }
  };

  const fetchStaffList = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/leads/staff-list`, getAuthHeaders());
      const list = res.data.staff || res.data.staffList;
      if (list && list.length > 0) {
        setStaffList(list);
        return;
      }
    } catch (err) {
      console.warn('Could not fetch from /api/leads/staff-list, trying fallback:', err);
    }

    try {
      const res2 = await axios.get(`${import.meta.env.VITE_API_URL}/api/users`, getAuthHeaders());
      if (Array.isArray(res2.data) && res2.data.length > 0) {
        setStaffList(res2.data.filter(u => u.isActive));
      }
    } catch (err2) {
      console.error('Error fetching staff list fallback:', err2);
    }
  };

  const fetchReport = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/leads/report`, getAuthHeaders());
      if (res.data.success) {
        setReport(res.data);
      }
    } catch (err) {
      console.error('Error fetching lead report:', err);
    }
  };

  useEffect(() => {
    fetchLeads();
    fetchReport();
    fetchStaffList();

    // Socket real-time updates
    const handleNewLead = () => {
      fetchLeads();
      fetchReport();
    };

    const handleLeadAccepted = () => {
      fetchLeads();
      fetchReport();
    };

    socket.on('new_lead', handleNewLead);
    socket.on('lead_accepted', handleLeadAccepted);

    return () => {
      socket.off('new_lead', handleNewLead);
      socket.off('lead_accepted', handleLeadAccepted);
    };
  }, []);

  const handleAccept = async (id) => {
    try {
      const res = await axios.put(`${import.meta.env.VITE_API_URL}/api/leads/${id}/accept`, {}, getAuthHeaders());
      if (res.data.success) {
        toast.success('Lead accepted successfully!');
        fetchLeads();
        fetchReport();
      }
    } catch (err) {
      console.error('Error accepting lead:', err);
      toast.error(err.response?.data?.message || 'Failed to accept lead');
    }
  };

  const handleDecline = async (id) => {
    try {
      const res = await axios.put(`${import.meta.env.VITE_API_URL}/api/leads/${id}/decline`, {}, getAuthHeaders());
      if (res.data.success) {
        toast.success('Lead declined');
        fetchLeads();
      }
    } catch (err) {
      console.error('Error declining lead:', err);
      toast.error(err.response?.data?.message || 'Failed to decline lead');
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      const res = await axios.put(`${import.meta.env.VITE_API_URL}/api/leads/${id}/status`, { status }, getAuthHeaders());
      if (res.data.success) {
        toast.success('Status updated');
        fetchLeads();
        fetchReport();
      }
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleUpdateTemperature = async (id, temperature) => {
    try {
      const res = await axios.put(`${import.meta.env.VITE_API_URL}/api/leads/${id}/status`, { temperature }, getAuthHeaders());
      if (res.data.success) {
        toast.success('Temperature updated');
        fetchLeads();
      }
    } catch (err) {
      console.error('Error updating temperature:', err);
      toast.error(err.response?.data?.message || 'Failed to update temperature');
    }
  };

  const handleCreateLead = async (e) => {
    e.preventDefault();
    if (!newLead.name.trim() || !newLead.phone.trim()) {
      toast.error('Please enter customer name and phone number');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: newLead.name.trim(),
        phone: newLead.phone.trim(),
        source: 'Admin Leads'
      };

      // Include admin fields only if admin
      if (isAdmin) {
        payload.email = newLead.email ? newLead.email.trim() : '';
        payload.temperature = newLead.temperature || 'None';
        payload.assignedTo = newLead.assignedTo || '';
        payload.notes = newLead.notes || '';
      }

      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/leads`,
        payload,
        getAuthHeaders()
      );

      if (res.data.success) {
        const successMessage = !isAdmin 
          ? 'Lead created and auto-assigned to you!' 
          : 'Lead created successfully with source "Admin Leads"!';
        toast.success(successMessage);
        setIsAddModalOpen(false);
        setNewLead({
          name: '',
          phone: '',
          email: '',
          source: 'Admin Leads',
          temperature: 'None',
          assignedTo: '',
          notes: ''
        });
        fetchLeads();
        fetchReport();
      }
    } catch (err) {
      console.error('Error creating lead:', err);
      toast.error(err.response?.data?.message || 'Failed to create lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openReassignModal = (lead) => {
    const currentId = lead.assignedTo?._id || lead.assignedTo || '';
    setReassignModal({
      open: true,
      lead,
      selectedStaffId: currentId
    });
  };

  const handleReassignSubmit = async (e) => {
    e.preventDefault();
    if (!reassignModal.selectedStaffId) {
      toast.error('Please select a staff member to reassign this lead');
      return;
    }

    setIsReassigning(true);
    try {
      const res = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/leads/${reassignModal.lead._id}/assign`,
        { userId: reassignModal.selectedStaffId },
        getAuthHeaders()
      );

      if (res.data.success) {
        toast.success(res.data.message || 'Lead reassigned successfully');
        setReassignModal({ open: false, lead: null, selectedStaffId: '' });
        fetchLeads();
        fetchReport();
      }
    } catch (err) {
      console.error('Error reassigning lead:', err);
      toast.error(err.response?.data?.message || 'Failed to reassign lead');
    } finally {
      setIsReassigning(false);
    }
  };

  // Filter pending leads
  const filteredPendingLeads = useMemo(() => {
    if (!searchTerm.trim()) return pendingLeads;
    const term = searchTerm.toLowerCase();
    return pendingLeads.filter(l => 
      l.name?.toLowerCase().includes(term) || 
      l.phone?.includes(term) ||
      l.email?.toLowerCase().includes(term) ||
      l.source?.toLowerCase().includes(term)
    );
  }, [pendingLeads, searchTerm]);

  // Group accepted leads by staff member for quick filtering & transparency
  const staffBreakdown = useMemo(() => {
    const counts = {};
    allLeads.forEach(l => {
      const name = l.acceptedByName || l.assignedTo?.name || l.assignedTo?.username || 'Staff Member';
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [allLeads]);

  // Filter accepted/team leads
  const displayedActiveLeads = useMemo(() => {
    let list = activeTab === 'my' ? myLeads : allLeads;

    // Status filter (Accepted, Converted, Not Converted)
    if (statusFilter !== 'all') {
      list = list.filter(l => l.status === statusFilter);
    }

    // Source filter
    if (sourceFilter !== 'all') {
      if (sourceFilter === 'Website') {
        list = list.filter(l => l.source !== 'Admin Leads');
      } else {
        list = list.filter(l => l.source === sourceFilter);
      }
    }

    // Staff filter (by acceptedByName or assignedTo.name or assignedTo.username)
    if (staffFilter !== 'all') {
      list = list.filter(l => {
        const name = l.acceptedByName || l.assignedTo?.name || l.assignedTo?.username;
        return name === staffFilter;
      });
    }

    // Search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(l => 
        l.name?.toLowerCase().includes(term) || 
        l.phone?.includes(term) ||
        l.email?.toLowerCase().includes(term) ||
        l.acceptedByName?.toLowerCase().includes(term) ||
        l.assignedTo?.name?.toLowerCase().includes(term) ||
        l.assignedTo?.username?.toLowerCase().includes(term) ||
        l.source?.toLowerCase().includes(term) ||
        l.status?.toLowerCase().includes(term)
      );
    }

    return list;
  }, [activeTab, allLeads, myLeads, statusFilter, sourceFilter, staffFilter, searchTerm]);

  const getSourceBadge = (source) => {
    // Hide 'Admin Leads' tag on the staff side
    if (!isAdmin && source === 'Admin Leads') return null;

    const isSourceAdmin = source === 'Admin Leads';
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
        isSourceAdmin 
          ? 'bg-purple-100 text-purple-800 border border-purple-200' 
          : 'bg-blue-50 text-blue-700 border border-blue-200'
      }`}>
        <Tag className="w-3 h-3" />
        {source || 'Website'}
      </span>
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center font-bold shadow-sm">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Lead Management</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                {isAdmin 
                  ? 'Track inquiries, auto-assign leads, reassign staff, and monitor conversions.' 
                  : 'Add customer inquiries and follow up on your assigned leads.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchLeads(true)}
            disabled={isRefreshing}
            className="p-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl transition-all shadow-sm flex items-center gap-2 text-sm font-medium"
            title="Refresh Leads"
          >
            <RotateCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-indigo-100 transition-all active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* Summary Report Cards - Interactive Filters */}
      <div className={`grid grid-cols-2 md:grid-cols-3 ${isAdmin ? 'lg:grid-cols-6' : 'lg:grid-cols-5'} gap-4 mb-8`}>
        <div 
          onClick={() => {
            setStatusFilter('all');
            setSourceFilter('all');
            setStaffFilter('all');
          }}
          className={`cursor-pointer p-4 rounded-xl shadow-xs border transition-all text-center ${
            statusFilter === 'all' && sourceFilter === 'all' && staffFilter === 'all'
              ? 'bg-gray-900 text-white border-gray-900 ring-2 ring-gray-900/20 shadow-sm'
              : 'bg-white hover:border-gray-300 border-gray-200'
          }`}
          title="Click to view all leads"
        >
          <p className={`text-xs font-bold uppercase tracking-wider ${statusFilter === 'all' && sourceFilter === 'all' && staffFilter === 'all' ? 'text-gray-300' : 'text-gray-500'}`}>
            Total Leads
          </p>
          <p className={`text-2xl font-black mt-1 ${statusFilter === 'all' && sourceFilter === 'all' && staffFilter === 'all' ? 'text-white' : 'text-gray-900'}`}>
            {report.totalLeads ?? (report.totalOnlineLeads + (report.totalAdminLeads || 0))}
          </p>
        </div>

        <div 
          onClick={() => {
            setSourceFilter(sourceFilter === 'Website' ? 'all' : 'Website');
          }}
          className={`cursor-pointer p-4 rounded-xl shadow-xs border transition-all text-center ${
            sourceFilter === 'Website'
              ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
              : 'bg-white hover:border-blue-200 border-gray-200'
          }`}
          title="Click to filter Website leads"
        >
          <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Website Leads</p>
          <p className="text-2xl font-black text-blue-600 mt-1">{report.totalOnlineLeads}</p>
        </div>

        {isAdmin && (
          <div 
            onClick={() => {
              setSourceFilter(sourceFilter === 'Admin Leads' ? 'all' : 'Admin Leads');
            }}
            className={`cursor-pointer p-4 rounded-xl shadow-xs border transition-all text-center ${
              sourceFilter === 'Admin Leads'
                ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-500/20 shadow-sm'
                : 'bg-white hover:border-purple-200 border-gray-200'
            }`}
            title="Click to filter Admin leads"
          >
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Admin Leads</p>
            <p className="text-2xl font-black text-purple-600 mt-1">{report.totalAdminLeads || 0}</p>
          </div>
        )}

        <div 
          onClick={() => {
            setStatusFilter(statusFilter === 'Accepted' ? 'all' : 'Accepted');
            setActiveTab('all');
          }}
          className={`cursor-pointer p-4 rounded-xl shadow-xs border transition-all text-center ${
            statusFilter === 'Accepted'
              ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20 shadow-sm'
              : 'bg-white hover:border-amber-200 border-gray-200'
          }`}
          title="Click to see all Accepted leads and who accepted them"
        >
          <div className="flex items-center justify-center gap-1">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Accepted</p>
            {statusFilter === 'Accepted' && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>}
          </div>
          <p className="text-2xl font-black text-amber-600 mt-1">{report.acceptedLeads}</p>
          <p className="text-[10px] text-amber-600/80 font-medium mt-0.5">Click to view</p>
        </div>

        <div 
          onClick={() => {
            setStatusFilter(statusFilter === 'Converted' ? 'all' : 'Converted');
            setActiveTab('all');
          }}
          className={`cursor-pointer p-4 rounded-xl shadow-xs border transition-all text-center ${
            statusFilter === 'Converted'
              ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
              : 'bg-white hover:border-emerald-200 border-gray-200'
          }`}
          title="Click to see Converted leads"
        >
          <div className="flex items-center justify-center gap-1">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Converted</p>
            {statusFilter === 'Converted' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>}
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-1">{report.convertedLeads}</p>
          <p className="text-[10px] text-emerald-600/80 font-medium mt-0.5">Click to view</p>
        </div>

        <div 
          onClick={() => {
            setStatusFilter(statusFilter === 'Not Converted' ? 'all' : 'Not Converted');
            setActiveTab('all');
          }}
          className={`cursor-pointer p-4 rounded-xl shadow-xs border transition-all text-center ${
            statusFilter === 'Not Converted'
              ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-500/20 shadow-sm'
              : 'bg-white hover:border-rose-200 border-gray-200'
          }`}
          title="Click to see Not Converted leads"
        >
          <div className="flex items-center justify-center gap-1">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Not Converted</p>
            {statusFilter === 'Not Converted' && <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse"></span>}
          </div>
          <p className="text-2xl font-black text-rose-600 mt-1">{report.notConvertedLeads}</p>
          <p className="text-[10px] text-rose-600/80 font-medium mt-0.5">Click to view</p>
        </div>
      </div>

      {/* Search Input Bar & Staff Acceptance Quick Chips */}
      <div className="mb-6 space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by customer name, phone, staff or source..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Who Accepted What Quick Chips */}
        {staffBreakdown.length > 0 && (
          <div className="p-3.5 bg-white rounded-2xl border border-emerald-100/80 shadow-2xs flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider mr-1 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              Accepted By Staff:
            </span>
            <button
              onClick={() => { setStaffFilter('all'); setActiveTab('all'); }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                staffFilter === 'all'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Team ({allLeads.length})
            </button>
            {staffBreakdown.map(({ name, count }) => (
              <button
                key={name}
                onClick={() => {
                  setStaffFilter(staffFilter === name ? 'all' : name);
                  setActiveTab('all');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  staffFilter === name
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
                }`}
                title={`Filter leads accepted by ${name}`}
              >
                <span>{name}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  staffFilter === name ? 'bg-emerald-800 text-white' : 'bg-emerald-200 text-emerald-900'
                }`}>
                  {count}
                </span>
              </button>
            ))}

            {(staffFilter !== 'all' || statusFilter !== 'all' || sourceFilter !== 'all' || searchTerm) && (
              <button
                onClick={() => {
                  setStaffFilter('all');
                  setStatusFilter('all');
                  setSourceFilter('all');
                  setSearchTerm('');
                }}
                className="ml-auto text-xs font-semibold text-rose-600 hover:underline flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                Reset filters
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pending Leads Column */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="bg-blue-50/80 px-6 py-4 border-b border-blue-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-blue-950 flex items-center gap-2">
              <span className="bg-blue-600 text-white text-xs px-2.5 py-0.5 rounded-full font-extrabold">
                {filteredPendingLeads.length}
              </span>
              Pending Leads Available
            </h2>
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Ready to Accept</span>
          </div>

          <div className="p-6 flex-1 overflow-y-auto max-h-[750px]">
            {loading ? (
              <div className="text-center py-12 text-gray-400">Loading pending leads...</div>
            ) : filteredPendingLeads.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 font-medium">No pending leads available.</p>
                <p className="text-gray-400 text-xs mt-1">New inquiries from the website or manual admin entry will appear here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPendingLeads.map(lead => (
                  <div 
                    key={lead._id} 
                    className="border border-gray-200 hover:border-blue-300 rounded-xl p-4 bg-white hover:shadow-md transition-all flex flex-col gap-3"
                  >
                    {/* Top Row: Name, Phone, Source Badge */}
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                          {lead.name}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-600 font-medium">
                          <a href={`tel:${lead.phone}`} className="flex items-center gap-1 hover:text-blue-600">
                            <Phone className="h-3.5 w-3.5 text-gray-400" />
                            {lead.phone}
                          </a>
                          {lead.email && (
                            <a href={`mailto:${lead.email}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600">
                              <Mail className="h-3 w-3 text-gray-400" />
                              {lead.email}
                            </a>
                          )}
                        </div>
                      </div>
                      <div>
                        {getSourceBadge(lead.source)}
                      </div>
                    </div>

                    {/* Date & Time Section */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-1.5 font-medium text-gray-700">
                        <Calendar className="h-3.5 w-3.5 text-blue-500" />
                        <span>Date:</span>
                        <span className="font-semibold text-gray-900">{formatDateTime(lead.createdAt)}</span>
                      </div>
                      {lead.createdByName && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 ml-auto">
                          <UserIcon className="h-3 w-3 text-gray-400" />
                          <span>Added by: <span className="font-medium text-gray-700">{lead.createdByName}</span></span>
                        </div>
                      )}
                    </div>

                    {/* Notes / Details if available */}
                    {(lead.notes || lead.details?.message || lead.details?.requirement) && (
                      <div className="text-xs text-gray-600 bg-blue-50/40 p-2.5 rounded-lg border border-blue-100/50">
                        <span className="font-semibold text-blue-900">Notes: </span>
                        {lead.notes || lead.details?.message || lead.details?.requirement}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => handleDecline(lead._id)}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Decline
                      </button>
                      <button
                        onClick={() => handleAccept(lead._id)}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm shadow-emerald-100 transition-all active:scale-95 flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Accept Lead
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Accepted Leads Column (With Tabs for My Leads vs All Team Leads) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="bg-emerald-50/80 px-6 py-4 border-b border-emerald-100 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* View Switcher Tabs: All Team Leads vs My Leads */}
              <div className="flex items-center bg-white p-1 rounded-xl border border-emerald-200 shadow-xs">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'all' 
                      ? 'bg-emerald-600 text-white shadow-sm' 
                      : 'text-gray-600 hover:text-emerald-700'
                  }`}
                >
                  <span>All Team Leads</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'all' ? 'bg-emerald-800 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {allLeads.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('my')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'my' 
                      ? 'bg-emerald-600 text-white shadow-sm' 
                      : 'text-gray-600 hover:text-emerald-700'
                  }`}
                >
                  <span>My Leads</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'my' ? 'bg-emerald-800 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {myLeads.length}
                  </span>
                </button>
              </div>

              {/* Status Filter Dropdown */}
              <div className="flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-white border border-emerald-200 text-emerald-950 font-semibold rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                >
                  <option value="all">All Statuses ({activeTab === 'my' ? myLeads.length : allLeads.length})</option>
                  <option value="Accepted">Accepted / Follow-up ({report.acceptedLeads})</option>
                  <option value="Converted">✅ Converted ({report.convertedLeads})</option>
                  <option value="Not Converted">❌ Not Converted ({report.notConvertedLeads})</option>
                </select>
              </div>
            </div>

            {/* Active Filters Bar / Staff Dropdown */}
            {activeTab === 'all' && staffBreakdown.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-emerald-100 text-xs">
                <span className="font-bold text-emerald-900 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Filter by Staff:
                </span>
                <select
                  value={staffFilter}
                  onChange={(e) => setStaffFilter(e.target.value)}
                  className="bg-white border border-emerald-200 text-gray-800 font-medium rounded-lg px-2.5 py-1 text-xs focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                >
                  <option value="all">All Staff Members ({allLeads.length})</option>
                  {staffBreakdown.map(({ name, count }) => (
                    <option key={name} value={name}>
                      {name} ({count} leads)
                    </option>
                  ))}
                </select>

                {(statusFilter !== 'all' || staffFilter !== 'all' || sourceFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setStatusFilter('all');
                      setStaffFilter('all');
                      setSourceFilter('all');
                    }}
                    className="ml-auto text-emerald-700 hover:text-emerald-900 font-semibold underline text-[11px]"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="p-6 flex-1 overflow-y-auto max-h-[750px]">
            {loading ? (
              <div className="text-center py-12 text-gray-400">Loading accepted leads...</div>
            ) : displayedActiveLeads.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 font-medium">
                  {activeTab === 'my' ? "You haven't accepted any leads yet." : "No leads found matching current filters."}
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  {activeTab === 'my' 
                    ? "Click 'All Team Leads' above to view team follow-ups, or accept pending leads from the left." 
                    : "Try resetting your search or status filters."}
                </p>
                {activeTab === 'my' && allLeads.length > 0 && (
                  <button
                    onClick={() => setActiveTab('all')}
                    className="mt-3 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                  >
                    View All Team Leads ({allLeads.length})
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {displayedActiveLeads.map(lead => {
                  const acceptedUser = lead.acceptedByName || lead.assignedTo?.name || lead.assignedTo?.username || 'Staff Member';
                  const acceptedRole = lead.assignedTo?.role || lead.acceptedBy?.role || '';
                  return (
                    <div 
                      key={lead._id} 
                      className="border border-gray-200 hover:border-emerald-300 rounded-xl p-4 bg-white hover:shadow-md transition-all flex flex-col gap-3"
                    >
                      {/* Top Row: Name, Status Badge, Source Badge */}
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                            {lead.name}
                          </h3>
                          <div className="flex items-center gap-3 mt-1 text-sm text-gray-600 font-medium">
                            <a href={`tel:${lead.phone}`} className="flex items-center gap-1 hover:text-emerald-600">
                              <Phone className="h-3.5 w-3.5 text-gray-400" />
                              {lead.phone}
                            </a>
                            {lead.email && (
                              <a href={`mailto:${lead.email}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-emerald-600">
                                <Mail className="h-3 w-3 text-gray-400" />
                                {lead.email}
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1.5">
                          <span className={`inline-flex px-2.5 py-0.5 text-xs font-extrabold rounded-full ${
                            lead.status === 'Converted' ? 'bg-green-100 text-green-800 border border-green-200' :
                            lead.status === 'Not Converted' ? 'bg-red-100 text-red-800 border border-red-200' :
                            'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}>
                            {lead.status === 'Accepted' ? 'In Follow-up' : lead.status}
                          </span>
                          {getSourceBadge(lead.source)}
                        </div>
                      </div>

                      {/* Prominent Banner: Who Accepted the Lead + Timestamps + Admin Reassign */}
                      <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200/70 flex flex-col gap-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                              {acceptedUser.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">
                                  Accepted By:
                                </span>
                                <span className="text-sm font-black text-gray-900">
                                  {acceptedUser}
                                </span>
                                {acceptedRole && (
                                  <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full uppercase bg-emerald-200 text-emerald-900">
                                    {acceptedRole}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-0.5">
                                <Clock className="h-3 w-3 text-emerald-600" />
                                <span>Accepted on: <strong className="text-gray-800 font-semibold">{formatDateTime(lead.acceptedAt || lead.updatedAt || lead.createdAt)}</strong></span>
                              </div>
                            </div>
                          </div>

                          {/* Admin Change / Reassign Button */}
                          {isAdmin && (
                            <button
                              onClick={() => openReassignModal(lead)}
                              className="ml-auto px-2.5 py-1 bg-white hover:bg-emerald-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 transition-colors flex items-center gap-1 shadow-2xs"
                              title="Change assigned staff member"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                              <span>Reassign</span>
                            </button>
                          )}
                        </div>

                        {/* Received / Created timestamp */}
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 pt-1.5 border-t border-emerald-200/50">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          <span>Inquiry Received: <strong className="text-gray-700 font-semibold">{formatDateTime(lead.createdAt)}</strong></span>
                          {lead.createdByName && (
                            <span className="text-gray-400 ml-auto">Added by: {lead.createdByName}</span>
                          )}
                        </div>
                      </div>

                      {/* Notes / Details if present */}
                      {(lead.notes || lead.details?.message) && (
                        <div className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                          <span className="font-semibold text-gray-700">Notes: </span>
                          {lead.notes || lead.details?.message}
                        </div>
                      )}

                      {/* Status and Temperature Controls */}
                      <div className="grid grid-cols-2 gap-3 mt-1 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Status</label>
                          <select
                            value={lead.status}
                            onChange={(e) => handleUpdateStatus(lead._id, e.target.value)}
                            className="w-full text-xs font-medium bg-white border border-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          >
                            <option value="Accepted">Pending Call / Follow-up</option>
                            <option value="Converted">✅ Converted (Won)</option>
                            <option value="Not Converted">❌ Not Converted (Lost)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Temperature</label>
                          <select
                            value={lead.temperature || 'None'}
                            onChange={(e) => handleUpdateTemperature(lead._id, e.target.value)}
                            className="w-full text-xs font-medium bg-white border border-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          >
                            <option value="None">Not Set</option>
                            <option value="Hot">🔥 Hot Lead</option>
                            <option value="Warm">☀️ Warm Lead</option>
                            <option value="Cold">❄️ Cold Lead</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Lead Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 relative">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center font-bold">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Add New Lead</h3>
                <p className="text-xs text-gray-500">
                  {isAdmin 
                    ? 'Record a new lead inquiry manually from the admin desk.' 
                    : 'Enter customer inquiry details. It will be auto-assigned to you.'}
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-4">
              {/* Source Notice - Only shown on Admin side */}
              {isAdmin && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-purple-600" />
                    <span className="text-xs font-bold text-purple-900">Lead Source</span>
                  </div>
                  <span className="px-2.5 py-0.5 bg-purple-200 text-purple-900 rounded-full text-xs font-extrabold tracking-wide">
                    Admin Leads
                  </span>
                </div>
              )}

              {/* Staff Auto-Assign Banner */}
              {!isAdmin && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2.5 text-xs text-emerald-900">
                  <UserCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Auto-Assignment:</strong> This lead will be automatically assigned to you for immediate follow-up.
                  </span>
                </div>
              )}

              {/* Name & Phone (Always shown for both Staff and Admin) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Customer Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Patel"
                      value={newLead.name}
                      onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9876543210"
                      value={newLead.phone}
                      onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Admin-Only Additional Fields */}
              {isAdmin && (
                <>
                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Email Address <span className="text-xs text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="email"
                        placeholder="customer@example.com"
                        value={newLead.email}
                        onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Assigned To & Temperature */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Assigned To (Staff)</label>
                      <select
                        value={newLead.assignedTo}
                        onChange={(e) => setNewLead({ ...newLead, assignedTo: e.target.value })}
                        className="w-full p-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium"
                      >
                        <option value="">Unassigned (Pending Pool)</option>
                        {staffList.map((st) => (
                          <option key={st._id} value={st._id}>
                            {st.name || st.username} {st.role ? `(${st.role})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Temperature</label>
                      <select
                        value={newLead.temperature}
                        onChange={(e) => setNewLead({ ...newLead, temperature: e.target.value })}
                        className="w-full p-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="None">None</option>
                        <option value="Hot">🔥 Hot Lead</option>
                        <option value="Warm">☀️ Warm Lead</option>
                        <option value="Cold">❄️ Cold Lead</option>
                      </select>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Notes / Requirement Details</label>
                    <textarea
                      rows="3"
                      placeholder="Details about customer package, destination, weight, or special requirements..."
                      value={newLead.notes}
                      onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                      className="w-full p-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </>
              )}

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-100 transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting ? 'Saving...' : !isAdmin ? 'Save & Assign to Me' : 'Save Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Reassign Modal */}
      {reassignModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative">
            <button
              onClick={() => setReassignModal({ open: false, lead: null, selectedStaffId: '' })}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center font-bold">
                <ArrowRightLeft className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Change Assigned Staff</h3>
                <p className="text-xs text-gray-500">Reassign this customer lead to another team member.</p>
              </div>
            </div>

            {reassignModal.lead && (
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 mb-4 text-xs space-y-1">
                <div>
                  <span className="text-gray-500 font-medium">Customer: </span>
                  <span className="font-bold text-gray-900">{reassignModal.lead.name}</span>
                  <span className="text-gray-400 ml-1">({reassignModal.lead.phone})</span>
                </div>
                <div>
                  <span className="text-gray-500 font-medium">Currently Handled By: </span>
                  <span className="font-bold text-indigo-700">
                    {reassignModal.lead.acceptedByName || reassignModal.lead.assignedTo?.name || 'Staff Member'}
                  </span>
                </div>
              </div>
            )}

            <form onSubmit={handleReassignSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Select New Staff Member <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={reassignModal.selectedStaffId}
                  onChange={(e) => setReassignModal({ ...reassignModal, selectedStaffId: e.target.value })}
                  className="w-full p-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium"
                >
                  <option value="">-- Choose Staff Member --</option>
                  {staffList.map(s => (
                    <option key={s._id} value={s._id}>
                      {s.name || s.username} {s.role ? `(${s.role})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setReassignModal({ open: false, lead: null, selectedStaffId: '' })}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReassigning}
                  className="px-5 py-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-100 transition-all disabled:opacity-50"
                >
                  {isReassigning ? 'Updating...' : 'Confirm Reassign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
