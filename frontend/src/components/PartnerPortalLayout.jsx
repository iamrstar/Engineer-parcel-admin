import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Package, Home, LogOut, Menu, X, User } from 'lucide-react';

const PartnerPortalLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("partnerToken");
    localStorage.removeItem("partnerData");
    navigate("/partner-portal/login");
  };

  const menuItems = [
    { name: "Dashboard", path: "/partner-portal/dashboard", icon: Home },
    { name: "My Orders", path: "/partner-portal/orders", icon: Package },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A0A] flex text-gray-900 dark:text-gray-100 font-sans">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white dark:bg-[#111111] border-r border-gray-200 dark:border-white/5 transform transition-transform duration-300 flex flex-col ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="p-6 flex justify-between items-center border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-orange-500/30">
              EP
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">Partner Portal</h1>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 font-semibold"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <Icon className={`h-5 w-5 transition-transform group-hover:scale-110 ${isActive ? "text-orange-600 dark:text-orange-400" : "text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-white/5">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all font-medium"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white dark:bg-[#111111]/80 backdrop-blur-xl border-b border-gray-200 dark:border-white/5 sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex-1"></div>
            <div className="flex items-center gap-4">
              <div className="h-9 w-9 rounded-full bg-gray-100 dark:bg-[#1A1A1A] border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-500 dark:text-gray-400">
                <User className="h-5 w-5" />
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default PartnerPortalLayout;
