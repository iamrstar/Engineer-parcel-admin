import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Shield, Save, Users, UserCheck } from "lucide-react";

const ALL_FEATURES = [
  "Dashboard", "Booking", "E-Docket", "Sales Report", "Web Analytics", 
  "Pincodes", "Coupons", "Create Order", "Tasks", "Staff Tasks", 
  "Attendance", "Attendance Report", "User Management", "Partner Management", 
  "Docket Management", "Manage Queries"
];

const AccessControl = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState("ALL_STAFF");
  const [permissions, setPermissions] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/access-control/users`);
      setUsers(res.data);
      setLoading(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load users");
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedUser === "ALL_STAFF") {
      // Just showing default/empty state or maybe common permissions
      setPermissions([]);
    } else {
      const user = users.find(u => u._id === selectedUser);
      if (user) {
        setPermissions(user.permissions || []);
      }
    }
  }, [selectedUser, users]);

  const handleTogglePermission = (feature) => {
    setPermissions(prev => 
      prev.includes(feature) ? prev.filter(f => f !== feature) : [...prev, feature]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (selectedUser === "ALL_STAFF") {
        // Bulk update
        const staffIds = users.filter(u => u.role === 'staff').map(u => u._id);
        await axios.put(`${import.meta.env.VITE_API_URL}/api/access-control/bulk-update`, {
          userIds: staffIds,
          permissions
        });
        toast.success("Updated permissions for all staff");
      } else {
        await axios.put(`${import.meta.env.VITE_API_URL}/api/access-control/users/${selectedUser}`, {
          permissions
        });
        toast.success("Permissions updated successfully");
      }
      fetchUsers();
    } catch (error) {
      toast.error("Failed to save permissions");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-8 h-8 text-primary-600" />
        <h1 className="text-2xl font-black text-gray-900">Access Control</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Select Scope</h2>
          <div className="space-y-2">
            <button
              onClick={() => setSelectedUser("ALL_STAFF")}
              className={`w-full flex items-center gap-2 p-3 rounded-xl text-sm font-bold transition-all ${
                selectedUser === "ALL_STAFF" ? "bg-primary-50 text-primary-700 border border-primary-200" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Users className="w-4 h-4" />
              All Staff (Bulk Apply)
            </button>
            <div className="pt-4 pb-2 text-xs font-black text-gray-400 uppercase tracking-widest">Specific Users</div>
            {users.map(user => (
              <button
                key={user._id}
                onClick={() => setSelectedUser(user._id)}
                className={`w-full flex flex-col p-3 rounded-xl transition-all ${
                  selectedUser === user._id ? "bg-primary-50 text-primary-700 border border-primary-200" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}
              >
                <span className="text-sm font-bold truncate">{user.name}</span>
                <span className="text-[10px] font-medium uppercase truncate opacity-70">{user.role} | {user.username}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="md:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-black text-gray-900">
                {selectedUser === "ALL_STAFF" ? "Configure Baseline Access for All Staff" : "Configure Access for User"}
              </h2>
              <p className="text-sm text-gray-500 font-medium">Select the features this user/group should see in their sidebar.</p>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 shadow-lg shadow-primary-200 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Configuration"}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ALL_FEATURES.map(feature => (
              <label
                key={feature}
                className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  permissions.includes(feature) ? "border-primary-500 bg-primary-50/50" : "border-gray-100 bg-gray-50 hover:border-gray-200"
                }`}
              >
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    checked={permissions.includes(feature)}
                    onChange={() => handleTogglePermission(feature)}
                    className="w-5 h-5 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <span className={`font-bold ${permissions.includes(feature) ? "text-primary-900" : "text-gray-700"}`}>
                    {feature}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessControl;
