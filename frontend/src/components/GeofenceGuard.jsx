import React from "react";
import { useGeofence } from "../contexts/GeofenceContext";
import { useAuth } from "../contexts/AuthContext";
import {
  MapPin,
  ShieldAlert,
  RefreshCw,
  LogOut,
  Navigation,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Lock
} from "lucide-react";

export default function GeofenceGuard({ children }) {
  const {
    status,
    isInsideGeofence,
    distanceMeters,
    geofenceConfig,
    verifiedLocationName,
    nearestOffice,
    errorMessage,
    recheckLocation,
    currentCoords,
    isAdmin,
    userAccessMode,
  } = useGeofence();
  const { logout, user } = useAuth();

  const activeLocations = (geofenceConfig?.authorizedLocations || []).filter(l => l.isActive);
  const primaryOffice = nearestOffice || activeLocations[0] || {
    name: "Engineers Parcel Head Office (IIT ISM Dhanbad)",
    address: "4th Floor, I2H Building, IIT (ISM) Dhanbad, Jharkhand 826004, India",
    placeId: "ChIJO9LYJiignysRoxbn5RCefB4",
    radiusMeters: 500,
  };

  // Genuine Admin: Full worldwide unrestricted access.
  const isUserAdmin =
    user?.role === "admin" ||
    user?.role === "office_admin" ||
    (user?.permissions && user.permissions.includes("ALL")) ||
    (() => {
      try {
        const u = JSON.parse(localStorage.getItem("userData") || "{}");
        return u.role === "admin" || u.role === "office_admin" || (u.permissions && u.permissions.includes("ALL"));
      } catch (e) {
        return false;
      }
    })();

  // Resolve user location permission mode from context, auth state, or local storage
  const activeAccessMode = userAccessMode || user?.locationAccessMode || (() => {
    try {
      const u = JSON.parse(localStorage.getItem("userData") || "{}");
      return u.locationAccessMode || "offices_only";
    } catch (e) {
      return "offices_only";
    }
  })();

  // 1. Admin is always allowed anywhere worldwide
  if (isUserAdmin) {
    return <>{children}</>;
  }

  // 2. If Enforcement Gate is DISABLED by Admin, all staff can log in normally from anywhere
  if (geofenceConfig?.enforceGeofence === false) {
    return <>{children}</>;
  }

  // 3. If System is in Global Access or Pan-India mode, staff is allowed
  if (geofenceConfig?.globalMode === "global" || geofenceConfig?.globalMode === "pan_india") {
    return <>{children}</>;
  }

  // 4. If this specific staff member has Pan-India or Global Remote permission in User Management
  if (activeAccessMode === "global" || activeAccessMode === "pan_india") {
    return <>{children}</>;
  }

  // 5. Staff with "offices_only" under active Enforcement Gate:
  // Must be physically verified inside an authorized office branch perimeter
  if (isInsideGeofence || status === "allowed" || status === "admin_exempt" || status === "pan_india_allowed" || status === "global_allowed") {
    return <>{children}</>;
  }

    // 1. Initial Checking / GPS Acquisition
    if (status === "checking") {
      return (
        <div className="fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-300">
            <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping"></div>
              <div className="relative w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Navigation className="w-8 h-8 animate-pulse" />
              </div>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">
              Verifying Office Location
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              Connecting to GPS to verify physical presence at authorized Engineers Parcel office premises...
            </p>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700/60 text-[11px] text-slate-600 dark:text-slate-300 flex items-center justify-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="truncate">{primaryOffice.name}</span>
            </div>
          </div>
        </div>
      );
    }

    // 2. Permission Denied by Browser
    if (status === "denied_permission") {
      return (
        <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl border border-rose-200 dark:border-rose-900/40 animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 mx-auto mb-5 flex items-center justify-center border border-amber-200">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
              Location Permission Required
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              Engineers Parcel policy requires staff members to work strictly from registered office premises. Your browser blocked location access, preventing verification.
            </p>

            {/* Workplace Details Card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-left mb-6 space-y-2">
              <div className="flex items-start gap-2.5">
                <Building2 className="w-4 h-4 text-primary-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    {primaryOffice.name}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {primaryOffice.address}
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700 font-mono">
                Place ID: <strong>{primaryOffice.placeId}</strong>
              </div>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800/50 text-[11px] text-blue-800 dark:text-blue-300 mb-6 text-left">
              <strong>How to enable:</strong> Click the padlock / settings icon next to your browser&apos;s address bar, set <strong>Location</strong> to <em>Allow</em>, and click <strong>Verify Location</strong>.
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={logout}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
              <button
                onClick={recheckLocation}
                className="flex-1 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
              >
                <RefreshCw className="w-4 h-4" />
                Verify Location
              </button>
            </div>
          </div>
        </div>
      );
    }

    // 3. Out of Bounds (Staff is physically outside authorized office geofence)
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl border border-rose-200 dark:border-rose-900/50 animate-in fade-in zoom-in duration-300">

          {/* Visual Header */}
          <div className="relative w-20 h-20 mx-auto mb-5 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping"></div>
            <div className="relative w-16 h-16 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-600/30">
              <ShieldAlert className="w-8 h-8" />
            </div>
          </div>

          <span className="inline-block px-3 py-1 bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-[10px] font-black uppercase tracking-wider rounded-full border border-rose-200 dark:border-rose-800 mb-3">
            Geofence Restriction Active
          </span>

          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
            Work Location Restricted
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
            Staff operations are restricted. You are authorized to access and perform work <strong>strictly within authorized registered office premises</strong>.
          </p>

          {/* List of Authorized Offices */}
          <div className="space-y-2.5 mb-6 text-left">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Authorized Office Locations ({activeLocations.length}):
            </span>
            {activeLocations.map((loc) => (
              <div key={loc.id || loc.placeId} className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                    <Building2 className="w-3.5 h-3.5 text-primary-600 shrink-0" />
                    <span>{loc.name}</span>
                  </div>
                  <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 shrink-0">
                    Radius: &le; {loc.radiusMeters || 500}m
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {loc.address}
                </p>
                <div className="text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                  <span>Place ID: {loc.placeId}</span>
                  {loc.isHeadOffice && <span className="text-primary-600 font-bold">Head Office</span>}
                </div>
              </div>
            ))}

            {/* Distance Indicator */}
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800/60 flex items-center justify-between text-xs">
              <span className="text-rose-700 dark:text-rose-300 font-semibold">Distance to Nearest Office:</span>
              <span className="font-black text-rose-700 dark:text-rose-300 font-mono text-sm">
                {distanceMeters != null
                  ? distanceMeters > 1000
                    ? `${(distanceMeters / 1000).toFixed(1)} km away`
                    : `${distanceMeters} meters away`
                  : "Calculating..."}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-6 italic">
            Please travel to one of the authorized office locations or ensure your device&apos;s GPS has high accuracy enabled, then click Re-check Location.
          </p>

          {/* Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={logout}
              className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
            <button
              onClick={recheckLocation}
              className="flex-1 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
            >
              <RefreshCw className="w-4 h-4" />
              Re-check Location
            </button>
          </div>

        </div>
      </div>
    );
  }
