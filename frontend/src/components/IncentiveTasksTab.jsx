import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, PlusCircle, CheckCircle, Upload, Gift, IndianRupee, Percent, Clock, User, Trash2 } from 'lucide-react';

const IncentiveTasksTab = ({ isAdmin }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  
  // Create state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [incentiveType, setIncentiveType] = useState('fixed');
  const [incentiveValue, setIncentiveValue] = useState('');
  const [taskType, setTaskType] = useState('group');
  const [deadline, setDeadline] = useState('');

  // Proof state
  const [proofImage, setProofImage] = useState(null);
  const [selectedTaskToProof, setSelectedTaskToProof] = useState(null);
  
  // Admin approval state
  const [adminNote, setAdminNote] = useState('');

  // Comments state
  const [activeCommentTask, setActiveCommentTask] = useState(null);
  const [newComment, setNewComment] = useState('');

  const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
  const { user } = useAuth();

  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/incentives`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks(res.data);
    } catch (error) {
      toast.error("Failed to load incentive tasks");
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (taskId) => {
    if (!newComment.trim()) return;
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/incentives/${taskId}/comments`, { message: newComment }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNewComment('');
      setActiveCommentTask(null);
      fetchTasks();
    } catch (error) {
      toast.error("Failed to add comment");
    }
  };

  const handleCreateTask = async () => {
    if (!title || !description || !incentiveValue || !deadline) {
      return toast.error("Please fill all required fields");
    }
    
    try {
      setCreating(true);
      await axios.post(`${import.meta.env.VITE_API_URL}/api/incentives`, {
        title, description, incentiveType, incentiveValue, taskType, deadline
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Incentive task created successfully!");
      setTitle('');
      setDescription('');
      setIncentiveValue('');
      setDeadline('');
      fetchTasks();
    } catch (error) {
      toast.error("Failed to create task");
    } finally {
      setCreating(false);
    }
  };

  const handleAcceptTask = async (taskId) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/incentives/${taskId}/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Task accepted!");
      fetchTasks();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to accept task");
    }
  };

  const handleUploadProof = async () => {
    if (!proofImage) return toast.error("Please select an image");
    try {
      const formData = new FormData();
      formData.append("proofImage", proofImage);
      
      await axios.post(`${import.meta.env.VITE_API_URL}/api/incentives/${selectedTaskToProof}/submit-proof`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });
      toast.success("Proof uploaded successfully!");
      setSelectedTaskToProof(null);
      setProofImage(null);
      fetchTasks();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to upload proof");
    }
  };

  const handleApproveProof = async (taskId, completionId, status) => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/api/incentives/${taskId}/approve/${completionId}`, {
        status, adminNote
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Proof ${status}`);
      setAdminNote('');
      fetchTasks();
    } catch (error) {
      toast.error("Failed to update proof status");
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this incentive task?")) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/incentives/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Task deleted successfully");
      fetchTasks();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete task");
    }
  };

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 text-primary-500 animate-spin" /></div>;
  }

  const filteredTasks = tasks.filter(task => {
    const isExpired = new Date() > new Date(task.deadline);
    
    if (!isAdmin) {
      const myId = (user._id || user.id).toString();
      const hasAccepted = task.acceptedBy.some(u => (u._id || u).toString() === myId);
      const userCompletion = task.completions.find(c => (c.userId?._id || c.userId).toString() === myId);
      
      // If staff has accepted but hasn't submitted proof yet, it's in My Tasks. Hide from Incentives.
      if (hasAccepted && !userCompletion) {
        return false;
      }
      
      // If it's an individual task and someone else accepted it, hide it.
      if (task.taskType === 'individual' && task.acceptedBy.length > 0 && !hasAccepted) {
        return false;
      }
    }

    if (filter === 'all') return true;
    if (filter === 'active') return task.status === 'active' && !isExpired;
    if (filter === 'completed') return task.status === 'completed';
    if (filter === 'expired') return task.status === 'expired' || (isExpired && task.status !== 'completed');
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {isAdmin && (
        <div className="bg-white dark:bg-[#111111] rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 p-6 transition-colors">
          <h2 className="text-xl font-bold mb-4 dark:text-white flex items-center gap-2">
            <Gift className="h-5 w-5 text-purple-500" /> Create Incentive Task
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Title</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-2 bg-gray-50 dark:bg-[#1A1A1A] border-none rounded-lg focus:ring-2 focus:ring-purple-500 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Deadline</label>
              <input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full px-4 py-2 bg-gray-50 dark:bg-[#1A1A1A] border-none rounded-lg focus:ring-2 focus:ring-purple-500 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Task Type</label>
              <select value={taskType} onChange={e => setTaskType(e.target.value)} className="w-full px-4 py-2 bg-gray-50 dark:bg-[#1A1A1A] border-none rounded-lg focus:ring-2 focus:ring-purple-500 dark:text-white">
                <option value="group">Group (Anyone can do)</option>
                <option value="individual">Individual (First come, first serve)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Incentive Type</label>
              <select value={incentiveType} onChange={e => setIncentiveType(e.target.value)} className="w-full px-4 py-2 bg-gray-50 dark:bg-[#1A1A1A] border-none rounded-lg focus:ring-2 focus:ring-purple-500 dark:text-white">
                <option value="fixed">Fixed Amount (₹)</option>
                <option value="percentage">Percentage (%) of Total Booking</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Value</label>
              <input type="number" value={incentiveValue} onChange={e => setIncentiveValue(e.target.value)} placeholder={incentiveType === 'fixed' ? 'e.g. 500' : 'e.g. 10'} className="w-full px-4 py-2 bg-gray-50 dark:bg-[#1A1A1A] border-none rounded-lg focus:ring-2 focus:ring-purple-500 dark:text-white" />
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full px-4 py-2 bg-gray-50 dark:bg-[#1A1A1A] border-none rounded-lg focus:ring-2 focus:ring-purple-500 dark:text-white h-20 resize-none" />
            </div>
          </div>
          <button 
            onClick={handleCreateTask} disabled={creating}
            className="mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-200 dark:shadow-none transition-all disabled:opacity-50"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />} Create Incentive Task
          </button>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {['all', 'active', 'completed', 'expired'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors uppercase tracking-wider ${
              filter === f 
                ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400' 
                : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTasks.length === 0 ? (
          <div className="col-span-full py-10 text-center text-gray-500 dark:text-gray-400">No incentive tasks found for this filter.</div>
        ) : (
          filteredTasks.map(task => {
            const isExpired = new Date() > new Date(task.deadline);
            const userCompletion = !isAdmin ? task.completions.find(c => c.userId?._id?.toString() === user._id?.toString() || c.userId === user._id) : null;
            const hasAccepted = !isAdmin ? task.acceptedBy.some(u => u._id?.toString() === user._id?.toString() || u === user._id) : false;
            const isUnaccepted = task.acceptedBy.length === 0;
            const highlightClass = !isAdmin && isUnaccepted && task.status === 'active' && !isExpired 
              ? 'ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-[#111] animate-pulse shadow-lg shadow-purple-500/30' 
              : '';
            
            return (
              <div key={task._id} className={`bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 p-5 flex flex-col transition-colors ${highlightClass}`}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                    {task.title}
                    {!isAdmin && isUnaccepted && task.status === 'active' && !isExpired && (
                      <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black animate-bounce">NEW</span>
                    )}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      task.status === 'completed' ? 'bg-green-100 text-green-700' :
                      task.status === 'expired' || isExpired ? 'bg-gray-100 text-gray-500' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {isExpired && task.status !== 'completed' ? 'Expired' : task.status}
                    </span>
                    {isAdmin && task.acceptedBy.length === 0 && (
                      <button 
                        onClick={() => handleDeleteTask(task._id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Delete Task"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 flex-1">{task.description}</p>
                
                <div className="grid grid-cols-2 gap-2 mb-4 bg-gray-50 dark:bg-[#111111] p-3 rounded-lg">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Reward</p>
                    <p className="text-sm font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                      {task.incentiveType === 'fixed' ? <IndianRupee className="h-3 w-3" /> : <Percent className="h-3 w-3" />}
                      {task.incentiveValue} {task.incentiveType === 'percentage' && '%'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Deadline</p>
                    <p className={`text-sm font-bold flex items-center gap-1 ${isExpired ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
                      <Clock className="h-3 w-3" /> {new Date(task.deadline).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {!isAdmin && (
                  <div className="mt-auto">
                    {userCompletion || task.status === 'completed' ? (
                      <div className={`p-2 rounded text-center text-xs font-bold ${
                        (userCompletion?.status === 'approved' || task.status === 'completed') ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/30' :
                        userCompletion?.status === 'rejected' ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400' :
                        'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400'
                      }`}>
                        {(userCompletion?.status === 'approved' || task.status === 'completed')
                          ? '🎉 Incentive will be credited soon!' 
                          : `Proof Status: ${userCompletion?.status?.toUpperCase()}`}
                      </div>
                    ) : (
                      <>
                        {!hasAccepted && task.status === 'active' && !isExpired && (
                          <button onClick={() => handleAcceptTask(task._id)} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded-lg text-sm transition-colors">
                            Accept Challenge
                          </button>
                        )}
                        {hasAccepted && task.status === 'active' && !isExpired && (
                          <div className="w-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold py-2 rounded-lg text-sm text-center border border-purple-200 dark:border-purple-500/20">
                            Accepted! (Complete in My Tasks)
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {isAdmin && (
                  <div className="mt-4 pt-4 border-t dark:border-white/10">
                    <p className="text-[10px] font-bold text-gray-500 mb-2 uppercase flex items-center gap-1"><User className="h-3 w-3" /> Accepted By ({task.acceptedBy.length})</p>
                    <div className="flex flex-wrap gap-1 mb-4">
                      {task.acceptedBy.map(u => (
                        <span key={u._id} className="bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded text-[10px]">{u.name}</span>
                      ))}
                    </div>
                    
                    <p className="text-[10px] font-bold text-gray-500 mb-2 uppercase">Completions ({task.completions.length})</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {task.completions.map(c => (
                        <div key={c._id} className="bg-gray-50 dark:bg-[#111111] p-2 rounded border border-gray-100 dark:border-white/5 text-xs">
                          <div className="flex justify-between font-bold dark:text-gray-200 mb-1">
                            <span>{c.userId?.name}</span>
                            <span className={c.status === 'approved' ? 'text-green-500' : c.status === 'rejected' ? 'text-red-500' : 'text-yellow-500'}>{c.status}</span>
                          </div>
                          <a href={`${import.meta.env.VITE_API_URL}${c.proofImage}`} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline mb-2 block">View Proof</a>
                          {c.status === 'pending_approval' && (
                            <div className="flex gap-1 mt-2">
                              <button onClick={() => handleApproveProof(task._id, c._id, 'approved')} className="flex-1 bg-green-500 text-white py-1 rounded font-bold text-[10px]">Approve</button>
                              <button onClick={() => handleApproveProof(task._id, c._id, 'rejected')} className="flex-1 bg-red-500 text-white py-1 rounded font-bold text-[10px]">Reject</button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Comments Section */}
                <div className="mt-4 pt-4 border-t dark:border-white/10">
                  <button 
                    onClick={(e) => { e.preventDefault(); setActiveCommentTask(activeCommentTask === task._id ? null : task._id); }}
                    className="text-[10px] font-bold text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
                  >
                    {task.comments?.length || 0} Comments
                  </button>
                  {activeCommentTask === task._id && (
                    <div className="mt-3">
                      <div className="space-y-2 mb-3 max-h-32 overflow-y-auto pr-1">
                        {task.comments?.map((c, i) => (
                          <div key={i} className={`text-xs p-2 rounded-lg ${c.userModel === 'Admin' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-900 dark:text-purple-100' : 'bg-gray-50 dark:bg-white/5 text-gray-800 dark:text-gray-200'}`}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold">{c.name} {c.userModel === 'Admin' && <span className="bg-purple-500 text-white px-1 text-[8px] rounded ml-1">ADMIN</span>}</span>
                              <span className="text-[8px] opacity-70">{new Date(c.createdAt).toLocaleTimeString()}</span>
                            </div>
                            <p>{c.message}</p>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Add comment..."
                          className="flex-1 text-xs px-2 py-1.5 rounded-lg border dark:border-white/10 dark:bg-[#1A1A1A] dark:text-white"
                          onKeyPress={(e) => e.key === 'Enter' && handleAddComment(task._id)}
                        />
                        <button onClick={() => handleAddComment(task._id)} className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-purple-700">Send</button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default IncentiveTasksTab;
