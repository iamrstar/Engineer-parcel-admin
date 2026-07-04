import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, MapPin, Calendar, Clock, CheckCircle2, AlertCircle, X, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

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
  return colors[status] || "bg-gray-100 text-gray-800 border-gray-200"
};

const PartnerPortalOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('month'); 
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  // Tracking Modal State
  const [selectedTrackingId, setSelectedTrackingId] = useState(null);
  const [trackingData, setTrackingData] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  useEffect(() => {
    if (timeframe === 'custom') {
      if (!customStartDate || !customEndDate) return;
    }
    fetchOrders();
  }, [timeframe, customStartDate, customEndDate]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("partnerToken");
      let url = `${import.meta.env.VITE_API_URL}/api/v1/partners/portal/orders?timeframe=${timeframe}`;
      if (timeframe === 'custom') {
        url += `&startDate=${customStartDate}&endDate=${customEndDate}`;
      }
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(res.data);
    } catch (error) {
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  const handleTrackOrder = async (trackingId) => {
    setSelectedTrackingId(trackingId);
    setTrackingLoading(true);
    setTrackingData(null);
    try {
      const token = localStorage.getItem("partnerToken");
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/v1/partners/portal/orders/${trackingId}/track`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTrackingData(res.data);
    } catch (error) {
      toast.error("Failed to fetch tracking details");
    } finally {
      setTrackingLoading(false);
    }
  };

  const exportToCSV = () => {
    if (orders.length === 0) return toast.error("No orders to export");
    const dataToExport = orders.map(o => ({
      "Tracking ID": o.bookingId,
      "Date": new Date(o.createdAt).toLocaleDateString(),
      "Receiver Name": o.receiverDetails?.name || '',
      "Receiver City": o.receiverDetails?.city || '',
      "Receiver State": o.receiverDetails?.state || '',
      "Status": o.status || 'Pending',
      "Weight": `${o.packageDetails?.chargeableWeight || o.packageDetails?.weight || 0} ${o.packageDetails?.chargeableWeightUnit || o.packageDetails?.weightUnit || 'kg'}`
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");
    XLSX.writeFile(workbook, "Partner_Orders_Export.xlsx");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            My Orders
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">View and track all your bookings.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center">
          <div className="flex flex-col gap-2 items-end">
            <div className="flex items-center gap-2 bg-white dark:bg-[#111111] p-1.5 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="bg-transparent text-sm font-semibold text-gray-700 dark:text-gray-300 outline-none px-2 py-1 cursor-pointer"
              >
                <option value="month">Current Month</option>
                <option value="prevMonth">Previous Month</option>
                <option value="last3Months">Last 3 Months</option>
                <option value="lifetime">Lifetime</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
            
            {timeframe === 'custom' && (
              <div className="flex items-center gap-2 animate-in fade-in">
                <input 
                  type="date" 
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111111] text-gray-700 dark:text-gray-300 outline-none focus:ring-1 focus:ring-orange-500"
                />
                <span className="text-gray-400 text-xs">to</span>
                <input 
                  type="date" 
                  value={customEndDate}
                  min={customStartDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111111] text-gray-700 dark:text-gray-300 outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
            )}
          </div>
          
          <button
            onClick={exportToCSV}
            disabled={orders.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#111111] text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold shadow-sm h-[42px]"
          >
            <Download className="h-4 w-4" />
            Export to Excel
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            <Package className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-lg">No orders found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-white/5">
              <thead className="bg-gray-50 dark:bg-[#111111]/50 text-left">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tracking ID</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Receiver</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Weight</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {orders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50 dark:hover:bg-[#111111]/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button 
                        onClick={() => handleTrackOrder(order.bookingId)}
                        className="text-sm font-bold text-orange-600 dark:text-orange-400 hover:underline text-left"
                      >
                        {order.bookingId}
                      </button>
                      <div className="text-xs text-gray-500 mt-0.5">{order.serviceType}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-900 dark:text-gray-200">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {new Date(order.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-200">{order.receiverDetails?.name}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" /> {order.receiverDetails?.city}, {order.receiverDetails?.state}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusColor(order.status)}`}>
                        {order.status?.replace(/-/g, ' ').toUpperCase() || 'PENDING'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-gray-200 font-medium">
                        {order.packageDetails?.chargeableWeight || order.packageDetails?.weight || 0} 
                        {order.packageDetails?.chargeableWeightUnit || order.packageDetails?.weightUnit || 'kg'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => handleTrackOrder(order.bookingId)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-500/20 rounded-lg transition-colors font-semibold shadow-sm"
                      >
                        Track Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tracking Modal */}
      {selectedTrackingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedTrackingId(null)}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Track Order</h3>
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-mono bg-gray-100 dark:bg-white/5 inline-block px-3 py-1 rounded-lg">
              {selectedTrackingId}
            </div>

            {trackingLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
              </div>
            ) : trackingData ? (
              <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-orange-50 dark:bg-orange-500/10 rounded-2xl border border-orange-100 dark:border-orange-500/20">
                  <div className={`p-3 rounded-xl ${getStatusColor(trackingData.currentStatus.toLowerCase().replace(/ /g, '-'))}`}>
                    <Package className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-xs text-orange-600 dark:text-orange-400 font-semibold uppercase tracking-wider mb-1">Current Status</div>
                    <div className="font-bold text-gray-900 dark:text-white text-lg">{trackingData.currentStatus}</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Tracking History
                  </h4>
                  {trackingData.history && trackingData.history.length > 0 ? (
                    <div className="relative border-l-2 border-gray-200 dark:border-white/10 ml-3 space-y-6 pb-4">
                      {trackingData.history.slice().sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)).map((event, idx) => (
                        <div key={idx} className="relative pl-6">
                          <div className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white dark:border-[#1A1A1A] ${idx === trackingData.history.length - 1 ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">{event.status}</div>
                          {event.location && <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{event.location}</div>}
                          {event.remark && <div className="text-xs text-gray-500 mt-1 italic">{event.remark}</div>}
                          <div className="text-xs text-gray-400 mt-1">{new Date(event.timestamp).toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-white/5 rounded-2xl">
                      No tracking events recorded yet.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-red-500">Could not load tracking information.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerPortalOrders;
