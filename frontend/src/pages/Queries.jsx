"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { MessageCircle, CheckCircle, XCircle, Search, Clock, Check, X } from "lucide-react"
import toast from "react-hot-toast"
import { useAuth } from "../contexts/AuthContext"

const Queries = () => {
  const [queries, setQueries] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all") // all, Pending, Approved, Rejected, Resolved
  const [search, setSearch] = useState("")
  const { user } = useAuth()
  const isAdmin = user && (!user.role || user.role === 'admin')

  useEffect(() => {
    fetchQueries()
  }, [])

  const fetchQueries = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("adminToken");
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/queries`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setQueries(response.data)
    } catch (error) {
      console.error("Error fetching queries:", error)
      toast.error("Failed to fetch queries")
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (id, newStatus, currentReply = "") => {
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("adminToken");
      let adminReply = currentReply;

      // Ask for a reason if rejecting or replying
      if (newStatus === "Rejected" || newStatus === "Resolved") {
        const reply = window.prompt(`Please provide a reason or reply for marking this as ${newStatus}:`);
        if (reply === null) return; // User cancelled
        adminReply = reply;
      }

      await axios.put(`${import.meta.env.VITE_API_URL}/api/queries/${id}`, { status: newStatus, adminReply }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      toast.success(`Query marked as ${newStatus}`)
      fetchQueries() // refresh
    } catch (error) {
      console.error("Error updating query:", error)
      toast.error("Failed to update query")
    }
  }

  const filteredQueries = queries.filter(q => {
    const matchesFilter = filter === "all" ? true : q.status === filter;
    const matchesSearch = search === "" ? true : (
      q.subject.toLowerCase().includes(search.toLowerCase()) ||
      q.type.toLowerCase().includes(search.toLowerCase()) ||
      (q.user?.name && q.user.name.toLowerCase().includes(search.toLowerCase()))
    );
    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "Pending": return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "Approved": return "bg-green-100 text-green-800 border-green-200"
      case "Rejected": return "bg-red-100 text-red-800 border-red-200"
      case "Resolved": return "bg-blue-100 text-blue-800 border-blue-200"
      default: return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
          <MessageCircle className="h-8 w-8 text-indigo-600" />
          {isAdmin ? "Manage Queries & Leaves" : "My Queries"}
        </h1>
        <p className="mt-2 text-gray-500 font-medium">
          {isAdmin ? "Review and respond to staff leave applications and issues." : "Track your submitted queries and leave applications."}
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search by subject, type, or name..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-medium text-gray-700 transition-all cursor-pointer"
        >
          <option value="all">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Resolved">Resolved</option>
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-indigo-600"></div>
        </div>
      ) : filteredQueries.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
             <MessageCircle className="h-10 w-10 text-indigo-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No queries found</h3>
          <p className="text-gray-500">There are no queries matching your current filters.</p>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 xl:grid-cols-2">
          {filteredQueries.map((query) => (
            <div key={query._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col hover:shadow-md transition-shadow">
              
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                      {query.type}
                    </span>
                    <span className={`text-xs font-bold px-2 py-1 rounded-md border ${getStatusColor(query.status)}`}>
                      {query.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-gray-900 mt-2">{query.subject}</h3>
                </div>
                <div className="text-right text-xs font-medium text-gray-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(query.createdAt).toLocaleDateString()}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl mb-4 text-sm text-gray-700 whitespace-pre-wrap flex-1 border border-gray-100">
                {query.description}
              </div>

              {query.adminReply && (
                <div className="bg-indigo-50/50 p-4 rounded-xl mb-4 text-sm border border-indigo-100">
                  <strong className="text-indigo-900 block mb-1">Admin Reply:</strong>
                  <span className="text-indigo-800">{query.adminReply}</span>
                </div>
              )}

              <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center font-bold text-gray-600">
                    {query.user?.name ? query.user.name.charAt(0) : 'U'}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 leading-none">{query.user?.name || 'Unknown User'}</p>
                    <p className="text-xs text-gray-500 capitalize">{query.user?.role || 'Staff'}</p>
                  </div>
                </div>

                {/* Admin Actions */}
                {isAdmin && query.status === 'Pending' && (
                  <div className="flex gap-2">
                    {query.type === "Leave Application" ? (
                      <>
                        <button 
                          onClick={() => handleStatusUpdate(query._id, "Approved")}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 font-bold text-sm rounded-lg transition-colors border border-green-200"
                        >
                          <Check className="h-4 w-4" /> Approve
                        </button>
                        <button 
                          onClick={() => handleStatusUpdate(query._id, "Rejected")}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 font-bold text-sm rounded-lg transition-colors border border-red-200"
                        >
                          <X className="h-4 w-4" /> Reject
                        </button>
                      </>
                    ) : (
                      <button 
                        onClick={() => handleStatusUpdate(query._id, "Resolved")}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-sm rounded-lg transition-colors border border-blue-200"
                      >
                        <CheckCircle className="h-4 w-4" /> Mark Resolved
                      </button>
                    )}
                  </div>
                )}
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Queries
