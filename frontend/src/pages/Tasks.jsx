import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  Package, 
  Truck, 
  Clock, 
  User, 
  MapPin, 
  Calendar,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const Tasks = () => {
    const [filter, setFilter] = useState('tomorrow'); // 'tomorrow', 'today', 'last7days', 'custom'
    const [customDate, setCustomDate] = useState('');
    const [tasks, setTasks] = useState({ boxPickups: [], boxDeliveries: [] });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('deliveries');
    const navigate = useNavigate();

    // Calculate the display date string
    let dateString = "";
    if (filter === 'tomorrow') {
        const d = new Date(); d.setDate(d.getDate() + 1);
        dateString = d.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } else if (filter === 'today') {
        const d = new Date();
        dateString = d.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } else if (filter === 'last7days') {
        const start = new Date(); start.setDate(start.getDate() - 7);
        const end = new Date();
        dateString = `${start.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else if (filter === 'custom' && customDate) {
        const d = new Date(customDate);
        dateString = d.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } else {
        dateString = "Select a date";
    }

    const [loadingTaskId, setLoadingTaskId] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ show: false, id: null, type: null });

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
            
            let url = `${import.meta.env.VITE_API_URL}/api/bookings/tasks/tomorrow`;
            if (filter === 'last7days') {
                url += `?range=last7days`;
            } else if (filter === 'today') {
                const todayStr = new Date().toISOString().split('T')[0];
                url += `?date=${todayStr}`;
            } else if (filter === 'custom' && customDate) {
                url += `?date=${customDate}`;
            }

            const res = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTasks(res.data);
        } catch (error) {
            console.error("Error fetching tomorrow's tasks:", error);
            toast.error("Failed to load tasks");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Trigger fetch only if filter is custom and we have a date, or if it isn't custom
        if (filter !== 'custom' || (filter === 'custom' && customDate)) {
            fetchTasks();
        }
    }, [filter, customDate]);

    const triggerCompleteTask = (e, id, type) => {
        e.stopPropagation();
        setConfirmModal({ show: true, id, type });
    };

    const handleCompleteTask = async () => {
        const { id, type } = confirmModal;
        setConfirmModal({ show: false, id: null, type: null });
        
        try {
            setLoadingTaskId(id);
            const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
            await axios.put(`${import.meta.env.VITE_API_URL}/api/bookings/${id}/tasks/complete`, 
                { type }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            toast.success(`${type === 'pickup' ? 'Pickup' : 'Delivery'} marked as completed`);
            
            // Re-fetch to update counts and list
            fetchTasks();
        } catch (error) {
            console.error("Error completing task:", error);
            toast.error("Failed to update task");
        } finally {
            setLoadingTaskId(null);
        }
    };

    const TaskCard = ({ booking, type }) => {
        const isCompleted = type === 'pickup' 
            ? ['picked', 'in-transit', 'out-for-delivery', 'delivered'].includes(booking.status)
            : booking.isBoxDelivered === true;

        return (
            <div 
                onClick={() => navigate(`/bookings/${booking._id}`)}
                className={`bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-all cursor-pointer group animate-in fade-in slide-in-from-bottom-2 duration-300 relative overflow-hidden ${
                    isCompleted ? 'border-green-500 ring-1 ring-green-500 bg-green-50/30' : 'border-gray-100'
                }`}
            >
                {/* Completion Overlay during loading */}
                {loadingTaskId === booking._id && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 text-primary-500 animate-spin" />
                    </div>
                )}

                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                            isCompleted ? 'bg-green-100 text-green-600' : 
                            (type === 'pickup' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600')
                        }`}>
                            {type === 'pickup' ? <Package className="h-5 w-5" /> : <Truck className="h-5 w-5" />}
                        </div>
                        <div>
                            <h3 className={`font-bold transition-colors uppercase tracking-tight ${
                                isCompleted ? 'text-green-700' : 'text-gray-900 group-hover:text-primary-600'
                            }`}>
                                {booking.bookingId}
                            </h3>
                            <p className="text-xs text-gray-500 font-medium">
                                {booking.serviceType.toUpperCase()}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                        disabled={isCompleted}
                        onClick={(e) => triggerCompleteTask(e, booking._id, type)}
                        title={isCompleted ? "Task Completed" : "Mark as Completed"}
                        className={`p-1.5 rounded-full border transition-all ${
                            isCompleted 
                            ? 'bg-green-100 text-green-600 border-green-200' 
                            : 'hover:bg-green-50 text-gray-300 hover:text-green-600 border-transparent hover:border-green-100'
                        }`}
                    >
                        <CheckCircle className="h-6 w-6" />
                    </button>
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${
                            isCompleted ? 'bg-green-100 border-green-200 text-green-700' : 'bg-gray-50 border-gray-100 text-gray-700'
                        }`}>
                            <Clock className={`h-3.5 w-3.5 ${isCompleted ? 'text-green-500' : 'text-gray-400'}`} />
                            <span className="text-xs font-bold">
                                {type === 'pickup' ? booking.pickupSlot : booking.boxDeliverySlot || 'Anytime'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                        <div className="flex items-start gap-2">
                            <User className={`h-4 w-4 mt-0.5 ${isCompleted ? 'text-green-400' : 'text-gray-400'}`} />
                            <div>
                                <p className={`text-[10px] uppercase font-bold tracking-wider ${isCompleted ? 'text-green-500' : 'text-gray-400'}`}>Sender</p>
                                <p className={`text-sm font-semibold ${isCompleted ? 'text-green-900' : 'text-gray-900'}`}>{booking.senderDetails?.name}</p>
                                <p className={`text-xs ${isCompleted ? 'text-green-600/70' : 'text-gray-500'}`}>{booking.senderDetails?.phone}</p>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-start gap-2">
                            <MapPin className={`h-4 w-4 mt-0.5 ${isCompleted ? 'text-green-400' : 'text-gray-400'}`} />
                            <div>
                                <p className={`text-[10px] uppercase font-bold tracking-wider ${isCompleted ? 'text-green-500' : 'text-gray-400'}`}>Hostel</p>
                                <p className={`text-sm font-semibold leading-tight ${isCompleted ? 'text-green-900' : 'text-gray-900'}`}>
                                    {type === 'pickup' 
                                        ? `${booking.senderDetails?.address}${booking.senderDetails?.landmark ? ', ' + booking.senderDetails.landmark : ''}`
                                        : `${booking.receiverDetails?.address}${booking.receiverDetails?.landmark ? ', ' + booking.receiverDetails.landmark : ''}`
                                    }
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={`flex items-center justify-between pt-4 border-t ${isCompleted ? 'border-green-100' : 'border-gray-50'}`}>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                        booking.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                        booking.status === 'confirmed' ? 'bg-green-50 text-green-700 border-green-100' :
                        booking.status === 'picked' ? 'bg-green-100 text-green-800 border-green-200' :
                        'bg-blue-50 text-blue-700 border-blue-100'
                    }`}>
                        {booking.status}
                    </span>
                    <div className={`${isCompleted ? 'text-green-700' : 'text-primary-600'} flex items-center text-xs font-bold gap-1 group-hover:translate-x-1 transition-transform`}>
                        View Details <ChevronRight className="h-3.5 w-3.5" />
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh]">
                <Loader2 className="h-10 w-10 text-primary-500 animate-spin mb-4" />
                <p className="text-gray-500 font-medium animate-pulse">Loading tomorrow's schedule...</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-5 w-5 text-primary-500" />
                        <span className="text-sm font-bold text-primary-600 uppercase tracking-widest">
                            {filter === 'last7days' ? 'Last 7 Days' : filter === 'today' ? "Today's Schedule" : filter === 'custom' ? "Custom Schedule" : "Tomorrow's Schedule"}
                        </span>
                    </div>
                    <h1 className="text-3xl font-black text-gray-900">{dateString}</h1>
                </div>
                
                <div className="flex flex-col gap-3">
                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                        <button 
                            onClick={() => setFilter('tomorrow')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${filter === 'tomorrow' ? 'bg-primary-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-200'}`}
                        >
                            Tomorrow
                        </button>
                        <button 
                            onClick={() => setFilter('today')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${filter === 'today' ? 'bg-primary-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-200'}`}
                        >
                            Today
                        </button>
                        <button 
                            onClick={() => setFilter('last7days')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${filter === 'last7days' ? 'bg-primary-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-200'}`}
                        >
                            Last 7 Days
                        </button>
                        <div className="relative flex items-center">
                            <input 
                                type="date"
                                className={`pl-8 pr-3 py-1.5 rounded-lg text-sm font-bold border-none outline-none focus:ring-2 focus:ring-primary-500 transition-all ${filter === 'custom' ? 'bg-primary-100 text-primary-800' : 'bg-transparent text-gray-500 hover:bg-gray-200'}`}
                                value={customDate}
                                onChange={(e) => {
                                    setCustomDate(e.target.value);
                                    setFilter('custom');
                                }}
                            />
                            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div className="flex p-1 bg-gray-100 rounded-xl w-fit">
                    <button
                        onClick={() => setActiveTab('deliveries')}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 flex items-center gap-2 ${
                            activeTab === 'deliveries' 
                            ? 'bg-white text-primary-600 shadow-sm' 
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <Truck className="h-4 w-4" />
                        Box Deliveries
                        {tasks.boxDeliveries.length > 0 && (
                            <span className="ml-1 bg-primary-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">
                                {tasks.boxDeliveries.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('pickups')}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 flex items-center gap-2 ${
                            activeTab === 'pickups' 
                            ? 'bg-white text-orange-600 shadow-sm' 
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <Package className="h-4 w-4" />
                        Box Pickups
                        {tasks.boxPickups.length > 0 && (
                            <span className="ml-1 bg-orange-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">
                                {tasks.boxPickups.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {activeTab === 'deliveries' ? (
                    tasks.boxDeliveries.length > 0 ? (
                        tasks.boxDeliveries.map(item => <TaskCard key={item._id} booking={item} type="delivery" />)
                    ) : (
                        <div className="col-span-full py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center px-10">
                            <div className="bg-gray-100 p-6 rounded-full mb-4">
                                <Truck className="h-12 w-12 text-gray-300" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">No Box Deliveries Found</h2>
                            <p className="text-gray-500 max-w-xs">There are no material/box delivery tasks for this date range.</p>
                        </div>
                    )
                ) : (
                    tasks.boxPickups.length > 0 ? (
                        tasks.boxPickups.map(item => <TaskCard key={item._id} booking={item} type="pickup" />)
                    ) : (
                        <div className="col-span-full py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center px-10">
                            <div className="bg-gray-100 p-6 rounded-full mb-4">
                                <Package className="h-12 w-12 text-gray-300" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">No Box Pickups Found</h2>
                            <p className="text-gray-500 max-w-xs">There are no box pickup tasks scheduled for this date range.</p>
                        </div>
                    )
                )}
            </div>

            <div className="mt-12 bg-primary-50 rounded-2xl p-6 border border-primary-100 flex items-start gap-4">
                <AlertCircle className="h-6 w-6 text-primary-600 shrink-0 mt-0.5" />
                <div>
                    <h4 className="font-bold text-primary-900 mb-1">Planning Ahead</h4>
                    <p className="text-sm text-primary-700 leading-relaxed">
                        These tasks are automatically fetched based on the <strong>Pickup Date</strong> and <strong>Box Delivery Date</strong> set during booking. 
                        Preparing for these tasks one day early ensures smoother field operations for your riders.
                    </p>
                </div>
            </div>

            {/* Confirmation Modal */}
            {confirmModal.show && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    <div 
                        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => setConfirmModal({ show: false, id: null, type: null })}
                    />
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm relative z-10 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Complete Task?</h3>
                            <p className="text-gray-500 text-sm mb-6">
                                Are you sure you want to mark this <strong>{confirmModal.type}</strong> as completed? This will update the tracking history.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setConfirmModal({ show: false, id: null, type: null })}
                                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCompleteTask}
                                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-200 transition-all active:scale-95"
                                >
                                    Yes, Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Tasks;
