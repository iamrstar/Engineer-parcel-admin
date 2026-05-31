import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  ClipboardList, 
  Users, 
  CheckCircle,
  PlusCircle,
  Loader2,
  Clock,
  Search
} from 'lucide-react';
import IncentiveTasksTab from '../components/IncentiveTasksTab';

const TrackingTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [unassignedBookings, setUnassignedBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('my_tasks'); // my_tasks, admin_assign, performance, admin_tasks
  const [taskFilter, setTaskFilter] = useState('today'); // today, missed, upcoming, all
  
  // Admin Assign State
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedBookings, setSelectedBookings] = useState([]);
  const [bookingStatusFilter, setBookingStatusFilter] = useState('in-transit');
  const [bookingSearch, setBookingSearch] = useState('');
  const [taskType, setTaskType] = useState('tracking');
  const [taskTitle, setTaskTitle] = useState('Update Tracking Status');
  const [taskDescription, setTaskDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [cronExpression, setCronExpression] = useState('');
  
  const [creating, setCreating] = useState(false);
  const [performanceStats, setPerformanceStats] = useState([]);
  const [performanceTimeframe, setPerformanceTimeframe] = useState('today');

  // Completion Modal State
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [taskToComplete, setTaskToComplete] = useState(null);
  const [completionNote, setCompletionNote] = useState('');
  const [completionImage, setCompletionImage] = useState(null);

  // Comments State
  const [activeCommentTask, setActiveCommentTask] = useState(null);
  const [newComment, setNewComment] = useState('');

  // Determine role
  const { user } = useAuth();
  const isAdmin = user && (!user.role || user.role === 'admin');
  const token = localStorage.getItem("adminToken") || localStorage.getItem("token");

  useEffect(() => {
    if (isAdmin) {
      setActiveTab('admin_assign');
      fetchUsers();
      fetchUnassignedBookings();
    }
    fetchTasks();
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin && activeTab === 'performance') {
      fetchPerformance();
    }
  }, [activeTab, isAdmin, performanceTimeframe]);

  const [unacceptedIncentivesCount, setUnacceptedIncentivesCount] = useState(0);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/tasks`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      let fetchedTasks = res.data;

      if (!isAdmin) {
        try {
          const resInc = await axios.get(`${import.meta.env.VITE_API_URL}/api/incentives`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const acceptedIncentives = resInc.data.filter(t => {
            const myId = (user._id || user.id).toString();
            const hasAccepted = t.acceptedBy.some(u => {
              const uId = (u._id || u).toString();
              return uId === myId;
            });
            const hasCompleted = t.completions.some(c => {
              const cUserId = (c.userId?._id || c.userId).toString();
              return cUserId === myId;
            });
            return hasAccepted && !hasCompleted;
          });
          
          const mappedIncentives = acceptedIncentives.map(inc => ({
            ...inc,
            is_incentive: true,
            status: inc.status,
            dueDate: inc.deadline,
            assignedTo: user,
            priority: 'high',
          }));
          fetchedTasks = [...fetchedTasks, ...mappedIncentives];
        } catch (e) {
          // Ignore
        }
      }

      setTasks(fetchedTasks);

      try {
        const resIncentives = await axios.get(`${import.meta.env.VITE_API_URL}/api/incentives/unaccepted-count`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUnacceptedIncentivesCount(resIncentives.data.count || 0);
      } catch (e) {
        // Ignore
      }
    } catch (error) {
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data);
    } catch (error) {
      toast.error("Failed to load users");
    }
  };

  const fetchUnassignedBookings = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/tasks/unassigned-bookings?status=${bookingStatusFilter}&search=${bookingSearch}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnassignedBookings(res.data);
    } catch (error) {
      toast.error("Failed to load unassigned bookings");
    }
  };

  useEffect(() => {
    if (isAdmin && activeTab === 'admin_assign') {
      const delayDebounceFn = setTimeout(() => {
        fetchUnassignedBookings();
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [bookingStatusFilter, bookingSearch]);

  const fetchPerformance = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/tasks/performance?timeframe=${performanceTimeframe}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPerformanceStats(res.data);
    } catch (error) {
      toast.error("Failed to load performance stats");
    }
  };

  const handleCreateTask = async () => {
    if (!selectedUser || !taskTitle) {
      return toast.error("Please select a user and provide a task title.");
    }
    if (taskType === 'tracking' && selectedBookings.length === 0) {
      return toast.error("Please select at least one booking for a tracking task.");
    }
    try {
      setCreating(true);
      await axios.post(`${import.meta.env.VITE_API_URL}/api/tasks`, {
        title: taskTitle,
        description: taskDescription,
        type: taskType,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        isRecurring,
        cronExpression: isRecurring ? cronExpression : undefined,
        assignedTo: selectedUser,
        bookings: taskType === 'tracking' ? selectedBookings : []
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Task assigned successfully!");
      setSelectedBookings([]);
      setSelectedUser('');
      setTaskTitle('Update Tracking Status');
      setTaskDescription('');
      setPriority('medium');
      setDueDate('');
      setIsRecurring(false);
      setCronExpression('');
      fetchUnassignedBookings();
      fetchTasks();
      setActiveTab('admin_tasks');
    } catch (error) {
      toast.error("Failed to assign task");
    } finally {
      setCreating(false);
    }
  };

  const updateTaskStatus = async (taskId, status) => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/api/tasks/${taskId}/status`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Task updated");
      fetchTasks();
    } catch (error) {
      toast.error("Failed to update task");
    }
  };

  const submitCompletion = async () => {
    if (!completionNote && !completionImage) {
      return toast.error("Please provide a note or upload an image as proof.");
    }
    
    try {
      const formData = new FormData();
      formData.append("completionNote", completionNote);
      if (completionImage) {
        if (taskToComplete.is_incentive) {
          formData.append("proofImage", completionImage);
        } else {
          formData.append("completionImage", completionImage);
        }
      }

      if (taskToComplete.is_incentive) {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/incentives/${taskToComplete._id}/submit-proof`, formData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
      } else {
        await axios.put(`${import.meta.env.VITE_API_URL}/api/tasks/${taskToComplete._id}/complete`, formData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
      }
      
      toast.success("Task completed successfully!");
      setCompletionModalOpen(false);
      setTaskToComplete(null);
      setCompletionNote('');
      setCompletionImage(null);
      fetchTasks();
    } catch (error) {
      toast.error("Failed to complete task");
    }
  };

  const handleAddComment = async (taskId) => {
    if (!newComment.trim()) return;
    try {
      const taskObj = tasks.find(t => t._id === taskId);
      
      if (taskObj?.is_incentive) {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/incentives/${taskId}/comments`, { message: newComment }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/tasks/${taskId}/comments`, { message: newComment }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setNewComment('');
      fetchTasks();
    } catch (error) {
      toast.error("Failed to add comment");
    }
  };

  const reassignTask = async (taskId, newUserId) => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/api/tasks/${taskId}/reassign`, { assignedTo: newUserId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Task reassigned!");
      fetchTasks();
    } catch (error) {
      toast.error("Failed to reassign task");
    }
  };

  const toggleBookingSelection = (id) => {
    if (selectedBookings.includes(id)) {
      setSelectedBookings(selectedBookings.filter(bId => bId !== id));
    } else {
      setSelectedBookings([...selectedBookings, id]);
    }
  };

  const selectPages = (count) => {
    const toSelect = unassignedBookings.slice(0, count).map(b => b._id);
    setSelectedBookings(toSelect);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
            <ClipboardList className="h-8 w-8 text-primary-600 dark:text-primary-500" />
            Staff Tasks
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage and assign tasks for the staff.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex p-1 bg-gray-100 dark:bg-white/5 rounded-xl w-fit">
          {isAdmin && (
            <>
              <button
                onClick={() => setActiveTab('admin_assign')}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
                  activeTab === 'admin_assign' ? 'bg-white dark:bg-[#1A1A1A] text-primary-600 dark:text-primary-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                Assign Tasks
              </button>
              <button
                onClick={() => setActiveTab('admin_tasks')}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
                  activeTab === 'admin_tasks' ? 'bg-white dark:bg-[#1A1A1A] text-primary-600 dark:text-primary-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                All Tasks
              </button>
              <button
                onClick={() => setActiveTab('performance')}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
                  activeTab === 'performance' ? 'bg-white dark:bg-[#1A1A1A] text-primary-600 dark:text-primary-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                Performance
              </button>
              <button
                onClick={() => setActiveTab('incentives')}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
                  activeTab === 'incentives' ? 'bg-white dark:bg-[#1A1A1A] text-primary-600 dark:text-primary-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                Incentives
              </button>
            </>
          )}
          {!isAdmin && (
            <>
              <button
                onClick={() => setActiveTab('my_tasks')}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
                  activeTab === 'my_tasks' ? 'bg-white dark:bg-[#1A1A1A] text-primary-600 dark:text-primary-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                My Tasks
              </button>
              <button
                onClick={() => setActiveTab('incentives_accepted')}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
                  activeTab === 'incentives_accepted' ? 'bg-white dark:bg-[#1A1A1A] text-primary-600 dark:text-primary-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                Accepted Incentives
              </button>
              <button
                onClick={() => setActiveTab('incentives')}
                className={`relative px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 flex items-center gap-2 ${
                  activeTab === 'incentives' ? 'bg-white dark:bg-[#1A1A1A] text-primary-600 dark:text-primary-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                Incentives
                {unacceptedIncentivesCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">
                    {unacceptedIncentivesCount}
                  </span>
                )}
              </button>
            </>
          )}
        </div>

        {/* Task Filters (Only show on tasks lists) */}
        {(activeTab === 'my_tasks' || activeTab === 'admin_tasks') && (
          <div className="flex gap-2">
            {['today', 'upcoming', 'missed', 'all'].map(filter => (
              <button
                key={filter}
                onClick={() => setTaskFilter(filter)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors uppercase tracking-wider ${
                  taskFilter === filter 
                    ? (filter === 'missed' ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400' : 'bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-400') 
                    : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && activeTab !== 'admin_assign' ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 text-primary-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* ASSIGN TASKS TAB (ADMIN) */}
          {activeTab === 'admin_assign' && isAdmin && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white dark:bg-[#111111] rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 p-6 transition-colors">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold dark:text-white">Unassigned Bookings</h2>
                  <span className="bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 px-3 py-1 rounded-full text-xs font-bold">
                    {unassignedBookings.length} Available
                  </span>
                </div>

                <div className="flex gap-2 mb-4">
                  <select 
                    value={bookingStatusFilter} 
                    onChange={e => setBookingStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-gray-50 dark:bg-[#1A1A1A] dark:text-white border-none rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="in-transit">In-Transit</option>
                    <option value="out-for-delivery">Out for Delivery</option>
                    <option value="delivered">Delivered</option>
                    <option value="issue">Issue</option>
                  </select>
                  
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Search Booking ID..."
                      value={bookingSearch}
                      onChange={e => setBookingSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-[#1A1A1A] dark:text-white border-none rounded-lg text-sm focus:ring-2 focus:ring-primary-500 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                  <button onClick={() => selectPages(10)} className="px-3 py-1 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 dark:text-white text-xs font-bold rounded-lg whitespace-nowrap">Select 10</button>
                  <button onClick={() => selectPages(20)} className="px-3 py-1 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 dark:text-white text-xs font-bold rounded-lg whitespace-nowrap">Select 20</button>
                  <button onClick={() => selectPages(50)} className="px-3 py-1 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 dark:text-white text-xs font-bold rounded-lg whitespace-nowrap">Select 50</button>
                  <button onClick={() => selectPages(unassignedBookings.length)} className="px-3 py-1 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 dark:text-white text-xs font-bold rounded-lg whitespace-nowrap">Select All</button>
                  <button onClick={() => setSelectedBookings([])} className="px-3 py-1 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 text-xs font-bold rounded-lg whitespace-nowrap ml-auto">Clear</button>
                </div>

                <div className="max-h-[500px] overflow-y-auto border dark:border-white/10 rounded-xl divide-y dark:divide-white/5">
                  {unassignedBookings.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">No unassigned bookings found.</div>
                  ) : (
                    unassignedBookings.map(b => (
                      <div key={b._id} className="p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer" onClick={() => toggleBookingSelection(b._id)}>
                        <div className="flex items-center gap-3">
                          <input type="checkbox" checked={selectedBookings.includes(b._id)} readOnly className="h-4 w-4 rounded border-gray-300 dark:border-white/10 bg-white dark:bg-transparent text-primary-600 focus:ring-primary-500" />
                          <div>
                            <p className="font-bold text-sm dark:text-white">{b.bookingId} {b.trackingId ? `(${b.trackingId})` : ''}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{b.senderDetails?.name} &rarr; {b.receiverDetails?.name}</p>
                          </div>
                        </div>
                        <span className="text-xs font-bold bg-gray-100 dark:bg-white/10 px-2 py-1 rounded text-gray-600 dark:text-gray-300 uppercase">{b.status}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-[#111111] rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 p-6 h-fit sticky top-6 transition-colors">
                <h2 className="text-xl font-bold mb-4 dark:text-white">Assign Task</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Task Type</label>
                    <select 
                      value={taskType}
                      onChange={(e) => {
                        setTaskType(e.target.value);
                        setTaskTitle(e.target.value === 'tracking' ? 'Update Tracking Status' : '');
                      }}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#1A1A1A] border-none rounded-xl focus:ring-2 focus:ring-primary-500 text-sm font-bold dark:text-white"
                    >
                      <option value="tracking">Tracking Status Updates</option>
                      <option value="general">General Task</option>
                    </select>
                  </div>

                  {taskType === 'tracking' && (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Selected Bookings</label>
                      <div className="bg-gray-50 dark:bg-[#1A1A1A] px-4 py-3 rounded-xl font-bold text-primary-700 dark:text-primary-400 border border-primary-100 dark:border-primary-500/30">
                        {selectedBookings.length} Bookings
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Task Title</label>
                    <input 
                      type="text" 
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      placeholder="Enter task title"
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#1A1A1A] border-none rounded-xl focus:ring-2 focus:ring-primary-500 text-sm dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>

                  {taskType === 'general' && (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Description</label>
                      <textarea 
                        value={taskDescription}
                        onChange={(e) => setTaskDescription(e.target.value)}
                        placeholder="Detailed task instructions..."
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#1A1A1A] border-none rounded-xl focus:ring-2 focus:ring-primary-500 text-sm h-24 resize-none dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Priority</label>
                      <select 
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#1A1A1A] border-none rounded-xl focus:ring-2 focus:ring-primary-500 text-sm dark:text-white"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Due Date (Optional)</label>
                      <input 
                        type="datetime-local" 
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#1A1A1A] border-none rounded-xl focus:ring-2 focus:ring-primary-500 text-sm dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        checked={isRecurring} 
                        onChange={(e) => setIsRecurring(e.target.checked)} 
                        className="rounded text-primary-600 focus:ring-primary-500" 
                      />
                      Make this a Recurring Task
                    </label>
                    {isRecurring && (
                      <select 
                        value={cronExpression}
                        onChange={(e) => setCronExpression(e.target.value)}
                        className="w-full mt-2 px-4 py-2.5 bg-gray-50 dark:bg-[#1A1A1A] border-none rounded-xl focus:ring-2 focus:ring-primary-500 text-sm dark:text-white"
                      >
                        <option value="">Select frequency...</option>
                        <option value="0 10 * * *">Every Day at 10:00 AM</option>
                        <option value="0 14 * * *">Every Day at 2:00 PM</option>
                        <option value="0 10 * * 1">Every Monday at 10:00 AM</option>
                        <option value="0 10 1 * *">1st of Every Month at 10:00 AM</option>
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Assign To</label>
                    <select 
                      value={selectedUser}
                      onChange={(e) => setSelectedUser(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#1A1A1A] border-none rounded-xl focus:ring-2 focus:ring-primary-500 text-sm dark:text-white"
                    >
                      <option value="">Select a staff member...</option>
                      {users
                        .filter(u => u.role === 'staff')
                        .map(u => (
                          <option key={u._id} value={u._id}>{u.name} (@{u.username})</option>
                      ))}
                    </select>
                  </div>

                  {selectedUser && (() => {
                    const activeUserTasks = tasks.filter(t => t.assignedTo?._id === selectedUser && t.status !== 'completed');
                    return (
                      <div className="mt-4 p-3 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-xl">
                        <p className="text-xs font-bold text-blue-800 dark:text-blue-400 mb-2 flex items-center justify-between">
                          <span>Currently Active Tasks: {activeUserTasks.length}</span>
                        </p>
                        {activeUserTasks.length > 0 ? (
                          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                            {activeUserTasks.map(t => (
                              <div key={t._id} className="bg-white dark:bg-[#111111] p-3 rounded-lg text-xs border border-gray-100 dark:border-white/5 shadow-sm">
                                <div className="flex justify-between items-start mb-1">
                                  <span className="font-bold text-gray-800 dark:text-gray-200">{t.title}</span>
                                  <span className="text-[9px] uppercase tracking-wider font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-1.5 py-0.5 rounded">{t.status}</span>
                                </div>
                                <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-2">
                                  {t.type === 'tracking' ? `Batch Size: ${t.bookings?.length} Bookings` : t.description}
                                </div>
                                
                                <div className="border-t dark:border-white/10 pt-2 mt-2">
                                  <button 
                                    onClick={(e) => { e.preventDefault(); setActiveCommentTask(activeCommentTask === t._id ? null : t._id); }}
                                    className="text-[10px] font-bold text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
                                  >
                                    {t.comments?.length || 0} Comments
                                  </button>
                                  {activeCommentTask === t._id && (
                                    <div className="mt-2 space-y-2">
                                      <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                                        {t.comments?.map((c, i) => (
                                          <div key={i} className={`text-[10px] p-1.5 rounded ${c.userModel === 'Admin' ? 'bg-primary-50 dark:bg-primary-500/10' : 'bg-gray-50 dark:bg-[#1A1A1A]'}`}>
                                            <span className="font-bold dark:text-gray-200">{c.name}:</span> <span className="text-gray-700 dark:text-gray-300">{c.message}</span>
                                          </div>
                                        ))}
                                      </div>
                                      <div className="flex gap-1">
                                        <input 
                                          type="text" 
                                          value={newComment} 
                                          onChange={(e) => setNewComment(e.target.value)}
                                          placeholder="Add comment..."
                                          className="flex-1 text-[10px] px-2 py-1 bg-gray-50 dark:bg-[#111111] dark:text-white border border-gray-200 dark:border-white/10 rounded focus:outline-none focus:border-primary-500"
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleAddComment(t._id);
                                          }}
                                        />
                                        <button onClick={(e) => { e.preventDefault(); handleAddComment(t._id); }} className="px-2 py-1 bg-primary-600 text-white text-[10px] font-bold rounded hover:bg-primary-700">Send</button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500 dark:text-gray-400">This user has no pending tasks.</p>
                        )}
                      </div>
                    );
                  })()}

                  <button 
                    disabled={creating || !selectedUser || !taskTitle || (taskType === 'tracking' && selectedBookings.length === 0)}
                    onClick={handleCreateTask}
                    className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-primary-200 transition-all flex items-center justify-center gap-2 mt-4"
                  >
                    {creating ? <Loader2 className="h-5 w-5 animate-spin" /> : <PlusCircle className="h-5 w-5" />}
                    Create & Assign Task
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TASKS LIST (ADMIN ALL TASKS, MY TASKS, OR INCENTIVES ACCEPTED) */}
          {(activeTab === 'admin_tasks' || activeTab === 'my_tasks' || activeTab === 'incentives_accepted') && (() => {
            
            // Filter tasks based on taskFilter
            const filteredTasks = tasks.filter(task => {
              if (activeTab === 'incentives_accepted') {
                return task.is_incentive;
              }
              if (activeTab === 'my_tasks' && task.is_incentive) return false;

              if (taskFilter === 'all') return true;
              
              const now = new Date();
              const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const tomorrowStart = new Date(todayStart);
              tomorrowStart.setDate(tomorrowStart.getDate() + 1);
              
              const hasDueDate = !!task.dueDate;
              const due = hasDueDate ? new Date(task.dueDate) : null;
              const isCompleted = task.status === 'completed';

              if (taskFilter === 'today') {
                if (isCompleted) {
                  // Only show tasks completed today in 'today' tab
                  const completedDate = new Date(task.completedAt || task.updatedAt);
                  return completedDate >= todayStart && completedDate < tomorrowStart;
                }
                // If it has no due date, it's considered "today" (do it ASAP)
                if (!hasDueDate) return true;
                // If due date is today or it's overdue, show it in today's tasks so they don't lose it
                return due < tomorrowStart;
              }
              
              if (taskFilter === 'missed') {
                return !isCompleted && hasDueDate && due < now;
              }
              
              if (taskFilter === 'upcoming') {
                return !isCompleted && hasDueDate && due >= tomorrowStart;
              }

              return true;
            });

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTasks.length === 0 ? (
                  <div className="col-span-full py-20 bg-white dark:bg-[#111111] rounded-3xl shadow-sm border border-gray-100 dark:border-white/10 flex flex-col items-center justify-center text-center px-10 transition-colors">
                    <ClipboardList className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Tasks Found</h2>
                    <p className="text-gray-500 dark:text-gray-400">There are no tasks matching the '{taskFilter}' filter.</p>
                  </div>
                ) : (
                  filteredTasks.map(task => (
                  <div key={task._id} className={`bg-white dark:bg-[#1A1A1A] rounded-xl shadow-sm border p-5 transition-colors ${task.status === 'completed' ? 'border-green-200 dark:border-green-500/20 bg-green-50/20 dark:bg-green-500/5' : 'border-gray-100 dark:border-white/5'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg dark:text-white">{task.title}</h3>
                          {task.priority === 'high' && <span className="bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase">High</span>}
                          {task.priority === 'medium' && <span className="bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Med</span>}
                          {task.priority === 'low' && <span className="bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Low</span>}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-1">
                          <Users className="h-3 w-3" /> Assigned to: <span className="font-semibold dark:text-gray-200">{task.assignedTo?.name}</span>
                        </p>
                        {task.dueDate && (
                          <p className={`text-[10px] font-semibold flex items-center gap-1 ${new Date(task.dueDate) < new Date() && task.status !== 'completed' ? 'text-red-500' : 'text-gray-400'}`}>
                            <Clock className="h-3 w-3" /> Due: {new Date(task.dueDate).toLocaleString()}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          task.status === 'completed' ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400' :
                          task.status === 'in-progress' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400' :
                          'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400'
                        }`}>
                          {task.status}
                        </span>
                        
                        {isAdmin && task.status !== 'completed' && (
                          <select 
                            className="text-[10px] bg-gray-50 dark:bg-[#111111] dark:text-white border-gray-200 dark:border-white/10 rounded px-1 py-0.5"
                            onChange={(e) => {
                              if(e.target.value) reassignTask(task._id, e.target.value);
                            }}
                            value=""
                          >
                            <option value="">Reassign...</option>
                            {users
                              .filter(u => u.role === 'staff')
                              .map(u => (
                                <option key={u._id} value={u._id}>{u.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-[#111111] rounded-lg p-3 mb-4 transition-colors">
                      {task.type === 'tracking' ? (
                        <p className="text-sm font-semibold mb-1 dark:text-white">Batch Size: {task.bookings?.length} Bookings</p>
                      ) : (
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{task.description}</p>
                      )}
                      {task.is_incentive && (
                        <div className="flex justify-between items-center bg-white dark:bg-[#1A1A1A] p-2 rounded-lg mb-2 shadow-sm border border-gray-100 dark:border-white/5">
                          <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Reward</p>
                            <p className="font-bold text-purple-600 dark:text-purple-400 text-sm">
                              {task.incentiveType === 'percentage' ? `${task.incentiveValue}%` : `₹ ${task.incentiveValue}`}
                            </p>
                          </div>
                        </div>
                      )}
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">Created: {new Date(task.createdAt).toLocaleString()}</p>
                    </div>

                    {!isAdmin && task.status !== 'completed' && (
                      <div className="flex gap-2">
                        {task.status === 'pending' && !task.is_incentive && (
                          <button onClick={() => updateTaskStatus(task._id, 'in-progress')} className="flex-1 py-2 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 font-bold text-sm rounded-lg transition-colors">Start Task</button>
                        )}
                        {(task.status === 'in-progress' || task.is_incentive) && (
                          <button 
                            onClick={() => {
                              setTaskToComplete(task);
                              setCompletionModalOpen(true);
                            }} 
                            className="flex-1 py-2 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-500/20 font-bold text-sm rounded-lg transition-colors flex items-center justify-center gap-1"
                          >
                            <CheckCircle className="h-4 w-4" /> Complete Task
                          </button>
                        )}
                      </div>
                    )}

                    {!isAdmin && task.type === 'tracking' && (
                      <div className="mt-4 pt-4 border-t text-xs">
                        <p className="font-bold text-gray-500 mb-2">Assigned Bookings IDs:</p>
                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                          {task.bookings?.map(b => (
                            <span key={b._id} className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{b.bookingId}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Completion Info Display */}
                    {task.status === 'completed' && (task.completionNote || task.completionImage) && (
                      <div className="mt-4 pt-4 border-t dark:border-white/10 bg-green-50/50 dark:bg-green-500/5 p-3 rounded-lg border border-green-100 dark:border-green-500/20">
                        <p className="text-xs font-bold text-green-800 dark:text-green-400 mb-1">Proof of Completion:</p>
                        {task.completionNote && <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{task.completionNote}</p>}
                        {task.completionImage && (
                          <a href={`${import.meta.env.VITE_API_URL}${task.completionImage}`} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                            View Attached Image
                          </a>
                        )}
                      </div>
                    )}

                    {/* Comments Section Toggle */}
                    <div className="mt-4 pt-4 border-t dark:border-white/10">
                      <button 
                        onClick={() => setActiveCommentTask(activeCommentTask === task._id ? null : task._id)}
                        className="text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
                      >
                        {task.comments?.length || 0} Comments
                      </button>

                      {activeCommentTask === task._id && (
                        <div className="mt-3 space-y-3">
                          <div className="max-h-32 overflow-y-auto space-y-2 pr-2">
                            {task.comments?.map((c, i) => (
                              <div key={i} className={`text-xs p-2 rounded-lg ${c.userModel === 'Admin' ? 'bg-primary-50 dark:bg-primary-500/10 ml-4' : 'bg-gray-100 dark:bg-white/5 mr-4'}`}>
                                <p className="font-bold text-gray-700 dark:text-gray-300 mb-0.5">{c.name} <span className="text-[9px] font-normal text-gray-400 dark:text-gray-500">{new Date(c.createdAt).toLocaleTimeString()}</span></p>
                                <p className="text-gray-800 dark:text-gray-200">{c.message}</p>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              value={newComment} 
                              onChange={(e) => setNewComment(e.target.value)}
                              placeholder="Add a comment..."
                              className="flex-1 text-xs px-3 py-1.5 bg-gray-50 dark:bg-[#111111] dark:text-white border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:border-primary-500"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddComment(task._id);
                              }}
                            />
                            <button onClick={() => handleAddComment(task._id)} className="px-3 py-1.5 bg-primary-600 text-white text-xs font-bold rounded-lg hover:bg-primary-700">Send</button>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                ))
              )}
            </div>
          )
          })()}

          {/* PERFORMANCE TAB (ADMIN) */}
          {activeTab === 'performance' && isAdmin && (
            <div className="bg-white dark:bg-[#111111] rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 overflow-hidden transition-colors">
              <div className="p-6 border-b border-gray-100 dark:border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold dark:text-white">Staff Performance Report</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {performanceTimeframe === 'today' ? "Tasks completed since midnight" : 
                     performanceTimeframe === 'monthly' ? "Tasks completed this month" : 
                     "All tasks completed historically"}
                  </p>
                </div>
                
                <div className="flex bg-gray-100 dark:bg-[#1A1A1A] p-1 rounded-lg">
                  <button 
                    onClick={() => setPerformanceTimeframe('today')}
                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${performanceTimeframe === 'today' ? 'bg-white dark:bg-[#2A2A2A] text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                  >
                    Today
                  </button>
                  <button 
                    onClick={() => setPerformanceTimeframe('monthly')}
                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${performanceTimeframe === 'monthly' ? 'bg-white dark:bg-[#2A2A2A] text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                  >
                    This Month
                  </button>
                  <button 
                    onClick={() => setPerformanceTimeframe('all')}
                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${performanceTimeframe === 'all' ? 'bg-white dark:bg-[#2A2A2A] text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                  >
                    All Time
                  </button>
                </div>
              </div>
              {performanceStats.length === 0 ? (
                <div className="p-10 text-center text-gray-500 dark:text-gray-400">
                  {performanceTimeframe === 'today' ? "No tasks completed today yet." :
                   performanceTimeframe === 'monthly' ? "No tasks completed this month yet." :
                   "No tasks completed yet."}
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-100 dark:divide-white/10">
                  <thead className="bg-gray-50/50 dark:bg-white/5">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">User</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Tasks Completed</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Bookings Processed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                    {performanceStats.map(stat => (
                      <tr key={stat._id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-semibold text-gray-900 dark:text-white">{stat.user.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">@{stat.user.username}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="bg-green-100 dark:bg-green-500/20 text-green-800 dark:text-green-400 px-3 py-1 rounded-full font-bold text-sm">
                            {stat.tasksCompleted}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium dark:text-gray-200">
                          {stat.bookingsProcessed}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* INCENTIVE TASKS TAB */}
          {activeTab === 'incentives' && (
             <IncentiveTasksTab isAdmin={isAdmin} />
          )}
        </>
      )}

      {/* Completion Modal */}
      {completionModalOpen && taskToComplete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl w-full max-w-md p-6 border border-transparent dark:border-white/10 shadow-2xl">
            <h2 className="text-xl font-bold mb-4 dark:text-white">Complete Task</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Please provide a note or upload an image as proof of completion for "{taskToComplete.title}".</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">Completion Note</label>
                <textarea 
                  value={completionNote}
                  onChange={(e) => setCompletionNote(e.target.value)}
                  placeholder="What did you do? (e.g. Called vendor, updated sheets)"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#111111] border-none rounded-xl focus:ring-2 focus:ring-primary-500 text-sm h-24 resize-none dark:text-white placeholder-gray-400 dark:placeholder-gray-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">Upload Proof (Image/Screenshot)</label>
                <input 
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCompletionImage(e.target.files[0])}
                  className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-primary-50 dark:file:bg-primary-500/10 file:text-primary-700 dark:file:text-primary-400 hover:file:bg-primary-100 cursor-pointer"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => {
                    setCompletionModalOpen(false);
                    setTaskToComplete(null);
                    setCompletionNote('');
                    setCompletionImage(null);
                  }} 
                  className="flex-1 py-2.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={submitCompletion}
                  className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-200 transition-colors"
                >
                  Submit Completion
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackingTasks;
