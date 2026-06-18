import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

export default function Leads() {
  const { user } = useAuth();
  const [pendingLeads, setPendingLeads] = useState([]);
  const [myLeads, setMyLeads] = useState([]);
  const [report, setReport] = useState({
    totalOnlineLeads: 0,
    convertedLeads: 0,
    notConvertedLeads: 0,
    acceptedLeads: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeads();
    fetchReport();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchLeads = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/leads`, getAuthHeaders());
      if (res.data.success) {
        setPendingLeads(res.data.pendingLeads);
        setMyLeads(res.data.myLeads);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  };

  const fetchReport = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/leads/report`, getAuthHeaders());
      if (res.data.success) {
        setReport(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAccept = async (id) => {
    try {
      const res = await axios.put(`${import.meta.env.VITE_API_URL}/api/leads/${id}/accept`, {}, getAuthHeaders());
      if (res.data.success) {
        toast.success('Lead accepted!');
        fetchLeads();
        fetchReport();
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to accept lead');
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
      console.error(err);
      toast.error('Failed to decline lead');
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
      console.error(err);
      toast.error('Failed to update status');
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
      console.error(err);
      toast.error('Failed to update temperature');
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Lead Management</h1>
        <p className="text-gray-500 mt-2">Manage and track your online leads.</p>
      </div>

      {/* Summary Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center items-center">
          <p className="text-gray-500 text-sm font-semibold uppercase tracking-wider">Total Online Leads</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">{report.totalOnlineLeads}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center items-center">
          <p className="text-gray-500 text-sm font-semibold uppercase tracking-wider">Accepted</p>
          <p className="text-3xl font-bold text-yellow-600 mt-2">{report.acceptedLeads}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center items-center">
          <p className="text-gray-500 text-sm font-semibold uppercase tracking-wider">Converted</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{report.convertedLeads}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center items-center">
          <p className="text-gray-500 text-sm font-semibold uppercase tracking-wider">Not Converted</p>
          <p className="text-3xl font-bold text-red-600 mt-2">{report.notConvertedLeads}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pending Leads */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
            <h2 className="text-lg font-bold text-blue-900 flex items-center">
              <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full mr-2">
                {pendingLeads.length}
              </span>
              Pending Leads Available
            </h2>
          </div>
          <div className="p-6">
            {pendingLeads.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No pending leads available at the moment.</p>
            ) : (
              <div className="space-y-4">
                {pendingLeads.map(lead => (
                  <div key={lead._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{lead.name}</h3>
                        <p className="text-gray-600 font-medium">{lead.phone}</p>
                        {lead.source && <p className="text-xs text-gray-400 mt-1">Source: {lead.source}</p>}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAccept(lead._id)}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleDecline(lead._id)}
                          className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* My Leads */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-emerald-50 px-6 py-4 border-b border-emerald-100">
            <h2 className="text-lg font-bold text-emerald-900 flex items-center">
              <span className="bg-emerald-600 text-white text-xs px-2 py-1 rounded-full mr-2">
                {myLeads.length}
              </span>
              My Assigned Leads
            </h2>
          </div>
          <div className="p-6">
            {myLeads.length === 0 ? (
              <p className="text-gray-500 text-center py-8">You haven't accepted any leads yet.</p>
            ) : (
              <div className="space-y-4">
                {myLeads.map(lead => (
                  <div key={lead._id} className="border border-gray-200 rounded-lg p-4 hover:border-emerald-200 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{lead.name}</h3>
                        <p className="text-gray-600 font-medium">{lead.phone}</p>
                        {lead.source && <p className="text-xs text-gray-400 mt-1">Source: {lead.source}</p>}
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-full ${
                          lead.status === 'Converted' ? 'bg-green-100 text-green-800' :
                          lead.status === 'Not Converted' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {lead.status}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                        <select
                          value={lead.status}
                          onChange={(e) => handleUpdateStatus(lead._id, e.target.value)}
                          className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                        >
                          <option value="Accepted">Pending Call</option>
                          <option value="Converted">Converted (Won)</option>
                          <option value="Not Converted">Not Converted (Lost)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Temperature</label>
                        <select
                          value={lead.temperature}
                          onChange={(e) => handleUpdateTemperature(lead._id, e.target.value)}
                          className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                        >
                          <option value="None">Not Set</option>
                          <option value="Hot">🔥 Hot Lead</option>
                          <option value="Warm">☀️ Warm Lead</option>
                          <option value="Cold">❄️ Cold Lead</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
