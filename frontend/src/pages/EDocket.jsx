import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import { CheckCircle, ArrowLeft, Download, UploadCloud, FileDown } from "lucide-react";

export default function EDocket() {
    const { token } = useAuth();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterDate, setFilterDate] = useState(() => {
        const d = new Date();
        return d.toISOString().split('T')[0];
    });
    const [selectedBooking, setSelectedBooking] = useState(null);

    // Pricing State
    const [pricing, setPricing] = useState({
        basePrice: 0,
        packagingCharge: 0,
        tax: 0,
        totalAmount: 0,
    });

    // Auto-calculate Pricing
    useEffect(() => {
        const base = Number(pricing.basePrice) || 0;
        const packaging = Number(pricing.packagingCharge) || 0;
        const gst = (base + packaging) * 0.18;
        const total = base + packaging + gst;

        setPricing((prev) => ({
            ...prev,
            tax: Math.round(gst * 100) / 100,
            totalAmount: Math.round(total * 100) / 100,
        }));
    }, [pricing.basePrice, pricing.packagingCharge]);

    const [editForm, setEditForm] = useState({});
    const [verifySuccess, setVerifySuccess] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);

    const fetchBookings = async () => {
        setLoading(true);
        try {
            const currentToken = token || localStorage.getItem("adminToken") || localStorage.getItem("token");
            const res = await axios.get(
                `${import.meta.env.VITE_API_URL}/api/intake?date=${filterDate}`,
                { headers: { Authorization: `Bearer ${currentToken}` } }
            );
            setBookings(res.data);
        } catch (e) {
            console.error(e);
            toast.error("Failed to fetch intake bookings");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const currentToken = token || localStorage.getItem("adminToken") || localStorage.getItem("token");
        if (currentToken) fetchBookings();
    }, [token, filterDate]);

    const handleVerify = async () => {
        if (!selectedBooking) return;
        setIsVerifying(true);
        try {
            const currentToken = token || localStorage.getItem("adminToken") || localStorage.getItem("token");
            await axios.post(
                `${import.meta.env.VITE_API_URL}/api/intake/verify`,
                {
                    bookingId: selectedBooking.bookingId,
                    pricing,
                    ...editForm,
                },
                { headers: { Authorization: `Bearer ${currentToken}` } }
            );
            setVerifySuccess(true);
            toast.success("Booking verified! Email & SMS sent.");
        } catch (error) {
            toast.error("Failed to verify booking");
        } finally {
            setIsVerifying(false);
        }
    };

    const handleSeed = async () => {
        const bookingsToSeed = bookings.filter((b) => b.adminVerified && !b.seededToMainDashboard);
        if (bookingsToSeed.length === 0) {
            toast.error("No verified bookings to seed for this date.");
            return;
        }
        if (!window.confirm(`Seed ${bookingsToSeed.length} verified bookings for ${filterDate}?`)) return;

        try {
            const currentToken = token || localStorage.getItem("adminToken") || localStorage.getItem("token");
            const res = await axios.post(
                `${import.meta.env.VITE_API_URL}/api/intake/seed?date=${filterDate}`,
                {},
                { headers: { Authorization: `Bearer ${currentToken}` } }
            );
            toast.success(`Seeded ${res.data.count} bookings to main dashboard.`);
            fetchBookings();
        } catch (error) {
            toast.error("Seeding failed");
        }
    };

    const handleDownloadExcel = async () => {
        try {
            const currentToken = token || localStorage.getItem("adminToken") || localStorage.getItem("token");
            const res = await axios.get(
                `${import.meta.env.VITE_API_URL}/api/intake/excel?date=${filterDate}`,
                {
                    headers: { Authorization: `Bearer ${currentToken}` },
                    responseType: 'blob'
                }
            );
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement("a");
            a.href = url;
            a.download = `intake-bookings-${filterDate}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error(error);
            toast.error("Download Failed");
        }
    };

    const handleDownloadReceipt = async (trackingId) => {
        try {
            const currentToken = token || localStorage.getItem("adminToken") || localStorage.getItem("token");
            const res = await axios.get(
                `${import.meta.env.VITE_API_URL}/api/intake/receipt?id=${trackingId}`,
                {
                    headers: { Authorization: `Bearer ${currentToken}` },
                    responseType: 'blob'
                }
            );
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const a = document.createElement("a");
            a.href = url;
            a.download = `Receipt_${trackingId}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            toast.success("Receipt Downloaded");
        } catch (error) {
            console.error(error);
            toast.error("Receipt Download Failed");
        }
    };

    // Pincode lookups
    useEffect(() => {
        const timer = setTimeout(() => {
            if (editForm.senderDetails?.pincode && String(editForm.senderDetails.pincode).length === 6) {
                handlePincodeLookup(editForm.senderDetails.pincode, "sender");
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [editForm.senderDetails?.pincode]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (editForm.receiverDetails?.pincode && String(editForm.receiverDetails.pincode).length === 6) {
                handlePincodeLookup(editForm.receiverDetails.pincode, "receiver");
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [editForm.receiverDetails?.pincode]);

    const handlePincodeLookup = async (pincode, type) => {
        if (!pincode || String(pincode).length < 6) return;
        try {
            const currentToken = token || localStorage.getItem("adminToken") || localStorage.getItem("token");
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/pincodes?code=${pincode}`, {
                headers: { Authorization: `Bearer ${currentToken}` }
            });
            const data = res.data;
            if (data.available) {
                toast.success(data.message);
                const section = type === "sender" ? "senderDetails" : "receiverDetails";
                setEditForm((prev) => ({
                    ...prev,
                    [section]: {
                        ...prev[section],
                        city: data.city,
                        state: data.state,
                    },
                }));
            } else {
                toast.error(data.message || "Service not available");
            }
        } catch (error) {
            console.error(error);
        }
    };

    const getShipmentCategory = () => {
        const sender = editForm.senderDetails;
        const receiver = editForm.receiverDetails;
        if (!sender?.city || !receiver?.city) return "Unknown";

        if (receiver.city.toLowerCase().includes("port blair")) return "J&K / Port Blair";
        if (receiver.state?.toLowerCase().includes("jammu")) return "J&K / Port Blair";

        const regionalStates = ["bihar", "west bengal"];
        if (regionalStates.includes(receiver.state?.toLowerCase())) return "Regional (BR/WB)";

        if (sender.state === receiver.state) {
            if (sender.city === receiver.city) return "Intra-city";
            return "Inter-city";
        }
        return "Inter-state";
    };

    const calculateSuggestedPrice = () => {
        const dims = editForm.packageDetails?.dimensions || { length: 0, width: 0, height: 0 };
        const volWeight = (Number(dims.length) * Number(dims.width) * Number(dims.height)) / 2700;
        return Math.round(volWeight * 100) / 100;
    };

    useEffect(() => {
        if (selectedBooking && editForm.packageDetails) {
            const suggested = calculateSuggestedPrice();
            if (suggested > 0) {
                setPricing((prev) => ({ ...prev, basePrice: suggested }));
            }
        }
    }, [
        editForm.packageDetails?.weight,
        editForm.packageDetails?.dimensions,
        editForm.receiverDetails?.city,
        editForm.receiverDetails?.state,
        editForm.serviceType,
        editForm.premiumItemType,
    ]);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">E-Docket / Intake</h1>
                    <p className="text-sm text-gray-500">Verify packages submitted by agents and map them to the main system.</p>
                </div>

                {!selectedBooking && (
                    <div className="flex space-x-3">
                        <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                        />
                        <button
                            onClick={handleDownloadExcel}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        >
                            <Download className="w-4 h-4 mr-2" /> Excel
                        </button>
                        <button
                            onClick={handleSeed}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                            <UploadCloud className="w-4 h-4 mr-2" /> Seed to Main
                        </button>
                    </div>
                )}
            </div>

            {!selectedBooking ? (
                <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-200">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">EP ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sender</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receiver</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verified</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seeded</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {bookings.map((booking) => (
                                    <tr key={booking._id} className="hover:bg-primary-50/50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary-600 font-mono">{booking.trackingId}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{booking.agentUsername || "System"}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{booking.senderDetails?.name}</div>
                                            <div className="text-xs text-gray-500">{booking.senderDetails?.city}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{booking.receiverDetails?.name}</div>
                                            <div className="text-xs text-gray-500">{booking.receiverDetails?.city}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">{booking.status}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            {booking.adminVerified ? (
                                                <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Yes</span>
                                            ) : (
                                                <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-500">No</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            {booking.seededToMainDashboard ? (
                                                <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">Yes</span>
                                            ) : "-"}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        setVerifySuccess(false);
                                                        setSelectedBooking(booking);
                                                        setPricing({
                                                            basePrice: booking.pricing?.basePrice || 0,
                                                            packagingCharge: booking.pricing?.packagingCharge || 0,
                                                            tax: booking.pricing?.tax || 0,
                                                            totalAmount: booking.pricing?.totalAmount || 0,
                                                        });
                                                        setEditForm({
                                                            senderDetails: booking.senderDetails,
                                                            receiverDetails: booking.receiverDetails,
                                                            packageDetails: booking.packageDetails,
                                                            serviceType: booking.serviceType,
                                                            premiumItemType: booking.premiumItemType || "",
                                                            trackingId: booking.trackingId,
                                                        });
                                                    }}
                                                    className="text-primary-600 hover:text-primary-900 font-medium px-3 py-1.5 rounded-lg border border-primary-100 hover:bg-primary-50 transition-colors"
                                                >
                                                    Verify/Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDownloadReceipt(booking.trackingId)}
                                                    title="Download E-Receipt"
                                                    className="w-8 h-8 text-blue-600 hover:text-blue-900 rounded-md hover:bg-blue-50 transition-colors flex items-center justify-center border border-transparent"
                                                >
                                                    <FileDown className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {bookings.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan="8" className="px-6 py-12 text-center text-gray-500 text-sm">No intake bookings found for this date.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setSelectedBooking(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <ArrowLeft className="w-5 h-5 text-gray-600" />
                            </button>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    Verify Booking
                                    <span className="font-mono text-primary-600 bg-primary-50 px-2 rounded-md border border-primary-100 text-base py-0.5">{selectedBooking.trackingId}</span>
                                </h2>
                            </div>
                        </div>
                    </div>

                    {verifySuccess ? (
                        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-xl border border-gray-100 shadow-sm text-center space-y-4">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-10 h-10 text-green-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900">Booking Verified & Locked!</h3>
                            <p className="text-gray-500 max-w-md">The agent's submission has been checked, pricing updated, and the customer has been emailed a payment request link.</p>
                            <button onClick={() => { setVerifySuccess(false); setSelectedBooking(null); fetchBookings(); }} className="mt-6 px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors">
                                Back to List
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
                            {/* Sender Card */}
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                                <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-3">Sender Details</h3>
                                <div className="space-y-4">
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Name</label><input value={editForm.senderDetails?.name || ''} onChange={(e) => setEditForm({ ...editForm, senderDetails: { ...editForm.senderDetails, name: e.target.value } })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500" /></div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input value={editForm.senderDetails?.phone || ''} onChange={(e) => setEditForm({ ...editForm, senderDetails: { ...editForm.senderDetails, phone: e.target.value } })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500" /></div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input value={editForm.senderDetails?.email || ''} onChange={(e) => setEditForm({ ...editForm, senderDetails: { ...editForm.senderDetails, email: e.target.value } })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500" /></div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                                            <input value={editForm.senderDetails?.pincode || ''} onChange={(e) => setEditForm({ ...editForm, senderDetails: { ...editForm.senderDetails, pincode: e.target.value } })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                            <input readOnly value={editForm.senderDetails?.city || ''} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg shadow-sm bg-gray-50 text-gray-500" />
                                        </div>
                                    </div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Full Address</label><input value={editForm.senderDetails?.address1 || ''} onChange={(e) => setEditForm({ ...editForm, senderDetails: { ...editForm.senderDetails, address1: e.target.value } })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500" /></div>
                                </div>
                            </div>

                            {/* Receiver Card */}
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                                <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-3">Receiver Details</h3>
                                <div className="space-y-4">
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Name</label><input value={editForm.receiverDetails?.name || ''} onChange={(e) => setEditForm({ ...editForm, receiverDetails: { ...editForm.receiverDetails, name: e.target.value } })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500" /></div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input value={editForm.receiverDetails?.phone || ''} onChange={(e) => setEditForm({ ...editForm, receiverDetails: { ...editForm.receiverDetails, phone: e.target.value } })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500" /></div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input value={editForm.receiverDetails?.email || ''} onChange={(e) => setEditForm({ ...editForm, receiverDetails: { ...editForm.receiverDetails, email: e.target.value } })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500" /></div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                                            <input value={editForm.receiverDetails?.pincode || ''} onChange={(e) => setEditForm({ ...editForm, receiverDetails: { ...editForm.receiverDetails, pincode: e.target.value } })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                            <input readOnly value={editForm.receiverDetails?.city || ''} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg shadow-sm bg-gray-50 text-gray-500" />
                                        </div>
                                    </div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Full Address</label><input value={editForm.receiverDetails?.address1 || ''} onChange={(e) => setEditForm({ ...editForm, receiverDetails: { ...editForm.receiverDetails, address1: e.target.value } })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500" /></div>
                                </div>
                            </div>

                            {/* Package Card */}
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                                <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-3">Package Logistics</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                                        <select value={editForm.serviceType || ''} onChange={(e) => setEditForm({ ...editForm, serviceType: e.target.value })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500">
                                            <option value="Express">Express</option>
                                            <option value="Premium">Premium</option>
                                            <option value="Surface">Surface</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Weight ({editForm.packageDetails?.weightUnit || 'g'})</label>
                                        <input type="number" step="0.1" value={editForm.packageDetails?.weight || ''} onChange={(e) => setEditForm({ ...editForm, packageDetails: { ...editForm.packageDetails, weight: e.target.value } })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500" />
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Dimensions (L x W x H cm)</label>
                                    <div className="flex gap-2">
                                        <input type="number" placeholder="L" value={editForm.packageDetails?.dimensions?.length || ''} onChange={(e) => setEditForm({ ...editForm, packageDetails: { ...editForm.packageDetails, dimensions: { ...editForm.packageDetails.dimensions, length: e.target.value } } })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                                        <input type="number" placeholder="W" value={editForm.packageDetails?.dimensions?.width || ''} onChange={(e) => setEditForm({ ...editForm, packageDetails: { ...editForm.packageDetails, dimensions: { ...editForm.packageDetails.dimensions, width: e.target.value } } })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                                        <input type="number" placeholder="H" value={editForm.packageDetails?.dimensions?.height || ''} onChange={(e) => setEditForm({ ...editForm, packageDetails: { ...editForm.packageDetails, dimensions: { ...editForm.packageDetails.dimensions, height: e.target.value } } })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                                    </div>
                                </div>
                                <div className="mt-4 p-3 bg-primary-50 rounded-lg border border-primary-100 flex justify-between items-center text-sm">
                                    <span className="font-semibold text-primary-800">Shipment Category</span>
                                    <span className="bg-primary-600 text-white px-2 py-0.5 rounded text-xs">{getShipmentCategory()}</span>
                                </div>
                            </div>

                            {/* Pricing Card */}
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between space-y-4">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-3">Pricing & Verification</h3>
                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Base Price ₹</label>
                                            <input type="number" value={pricing.basePrice} onChange={(e) => setPricing({ ...pricing, basePrice: e.target.value })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 font-mono text-lg text-primary-700" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Packaging Extra ₹</label>
                                            <input type="number" value={pricing.packagingCharge} onChange={(e) => setPricing({ ...pricing, packagingCharge: e.target.value })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 font-mono text-lg" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">18% GST ₹</label>
                                            <input type="number" readOnly value={pricing.tax} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg shadow-sm bg-gray-50 font-mono text-gray-500" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Total Payable</label>
                                            <div className="text-2xl font-black text-green-600">₹{pricing.totalAmount}</div>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleVerify}
                                    disabled={isVerifying}
                                    className={`w-full py-4 mt-8 text-white font-bold rounded-xl shadow-lg transition-colors text-lg flex items-center justify-center gap-2
                                        ${isVerifying ? 'bg-primary-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'}
                                    `}
                                >
                                    {isVerifying ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Processing...
                                        </>
                                    ) : (
                                        "Verify & Send Payment Link"
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
