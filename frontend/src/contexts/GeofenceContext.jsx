import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";

// Default Authorized Multi-Office Locations
const DEFAULT_LOCATIONS = [
  {
    id: "office_1",
    name: "Engineers Parcel Head Office (IIT ISM Dhanbad)",
    placeId: "ChIJO9LYJiignysRoxbn5RCefB4",
    address: "4th Floor, I2H Building, IIT (ISM) Dhanbad, Jharkhand 826004, India",
    latitude: 23.814343,
    longitude: 86.441198,
    radiusMeters: 500,
    isActive: true,
    isHeadOffice: true,
  },
  {
    id: "office_2",
    name: "Engineers Parcel Second Office",
    placeId: "ChIJO6nl04679jkR9J18NwQUqVo",
    address: "Engineers Parcel Second Branch Premises",
    latitude: 23.812500,
    longitude: 86.440000,
    radiusMeters: 500,
    isActive: true,
    isHeadOffice: false,
  },
];

const DEFAULT_GEOFENCE_CONFIG = {
  globalMode: "offices_only", // "offices_only" | "pan_india" | "global"
  enforceGeofence: true,
  authorizedLocations: DEFAULT_LOCATIONS,
};

// Haversine formula to calculate distance in meters between two GPS coordinates
export function calculateDistanceInMeters(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 999999;
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

const defaultGeofenceState = {
  geofenceConfig: DEFAULT_GEOFENCE_CONFIG,
  officeConfig: DEFAULT_LOCATIONS[0],
  currentCoords: null,
  distanceMeters: null,
  isInsideGeofence: false,
  status: "checking",
  verifiedLocationName: "",
  nearestOffice: DEFAULT_LOCATIONS[0],
  errorMessage: "",
  recheckLocation: () => {},
  fetchGeofenceConfig: async () => DEFAULT_GEOFENCE_CONFIG,
  isAdmin: false,
  userAccessMode: "offices_only",
};

const GeofenceContext = createContext(defaultGeofenceState);

export const useGeofence = () => {
  const context = useContext(GeofenceContext);
  return context || defaultGeofenceState;
};

export const GeofenceProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  const checkIsAdmin = (u) => {
    // Only genuine Admins are exempt from workplace geofencing
    if (u?.role === "admin" || u?.role === "office_admin" || (u?.permissions && u.permissions.includes("ALL"))) return true;
    try {
      const saved = JSON.parse(localStorage.getItem("userData") || "{}");
      if (saved?.role === "admin" || saved?.role === "office_admin" || (saved?.permissions && saved.permissions.includes("ALL"))) return true;
    } catch (e) {}
    return false;
  };

  const isAdmin = checkIsAdmin(user);
  
  const [currentUserMode, setCurrentUserMode] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("userData") || "{}");
      return saved?.locationAccessMode || user?.locationAccessMode || "offices_only";
    } catch (e) {
      return "offices_only";
    }
  });

  const userAccessMode = currentUserMode || user?.locationAccessMode || "offices_only";

  const [geofenceConfig, setGeofenceConfig] = useState(DEFAULT_GEOFENCE_CONFIG);
  const [currentCoords, setCurrentCoords] = useState(null);
  const [distanceMeters, setDistanceMeters] = useState(null);
  const [isInsideGeofence, setIsInsideGeofence] = useState(() => checkIsAdmin(user));
  const [status, setStatus] = useState(() => (checkIsAdmin(user) ? "admin_exempt" : "checking")); // 'checking' | 'allowed' | 'denied_permission' | 'out_of_bounds' | 'error' | 'admin_exempt' | 'pan_india_allowed' | 'global_allowed'
  const [verifiedLocationName, setVerifiedLocationName] = useState(() => (checkIsAdmin(user) ? "Admin Access (Worldwide Anywhere)" : ""));
  const [nearestOffice, setNearestOffice] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const watchIdRef = useRef(null);

  // Sync user profile from backend to pick up real-time changes to locationAccessMode made by admin
  const syncUserProfile = useCallback(async () => {
    const token = localStorage.getItem("token") || localStorage.getItem("adminToken");
    if (!token) return;
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.locationAccessMode) {
        setCurrentUserMode(res.data.locationAccessMode);
        try {
          const saved = JSON.parse(localStorage.getItem("userData") || "{}");
          saved.locationAccessMode = res.data.locationAccessMode;
          localStorage.setItem("userData", JSON.stringify(saved));
        } catch (e) {}
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Fetch official multi-office geofence configuration from backend
  const fetchGeofenceConfig = useCallback(async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/offices/geofence-config`);
      if (res.data) {
        setGeofenceConfig(res.data);
        return res.data;
      }
    } catch (err) {
      console.warn("Could not fetch remote geofence config, using fallback", err);
    }
    return DEFAULT_GEOFENCE_CONFIG;
  }, []);

  // Evaluate GPS coordinates against multi-office list and user permission modes
  const evaluatePosition = useCallback(
    (position, config = geofenceConfig) => {
      const { latitude, longitude, accuracy } = position.coords;
      setCurrentCoords({ latitude, longitude, accuracy });

      // 1. Master Admin exemption or Enforcement Gate disabled
      if (isAdmin || config.enforceGeofence === false) {
        setStatus("admin_exempt");
        setIsInsideGeofence(true);
        setDistanceMeters(0);
        setVerifiedLocationName(config.enforceGeofence === false ? "Enforcement Bypassed" : "Admin Access (Anywhere)");
        return;
      }

      // 2. Global Access Mode (User setting or System globalMode)
      if (userAccessMode === "global" || config.globalMode === "global") {
        setStatus("global_allowed");
        setIsInsideGeofence(true);
        setDistanceMeters(0);
        setVerifiedLocationName("Global Remote Access");
        return;
      }

      // 3. Pan-India Access Mode (User setting or System globalMode)
      if (userAccessMode === "pan_india" || config.globalMode === "pan_india") {
        const isInsideIndia = !latitude || (latitude >= 6.5 && latitude <= 37.5 && longitude >= 68.0 && longitude <= 97.5);
        if (isInsideIndia) {
          setStatus("pan_india_allowed");
          setIsInsideGeofence(true);
          setDistanceMeters(0);
          setVerifiedLocationName("Pan-India Access (Anywhere in India)");
          return;
        } else {
          setStatus("out_of_bounds");
          setIsInsideGeofence(false);
          setErrorMessage("You are outside India. Your account is configured for Pan-India access only.");
          return;
        }
      }

      // 4. Multi-Office Geofence Check (Office 1, Office 2, etc.)
      const locations = (config.authorizedLocations || DEFAULT_LOCATIONS).filter((loc) => loc.isActive);

      if (locations.length === 0) {
        setStatus("allowed");
        setIsInsideGeofence(true);
        setVerifiedLocationName("No Geofence Active");
        return;
      }

      let insideAnyOffice = false;
      let minDistance = 999999999;
      let closestLoc = locations[0];

      for (const loc of locations) {
        const dist = calculateDistanceInMeters(latitude, longitude, loc.latitude, loc.longitude);
        if (dist < minDistance) {
          minDistance = dist;
          closestLoc = loc;
        }

        if (dist <= (loc.radiusMeters || 500)) {
          insideAnyOffice = true;
          setDistanceMeters(dist);
          setIsInsideGeofence(true);
          setStatus("allowed");
          setVerifiedLocationName(loc.name);
          setNearestOffice(loc);
          setErrorMessage("");
          break;
        }
      }

      if (!insideAnyOffice) {
        setIsInsideGeofence(false);
        setStatus("out_of_bounds");
        setDistanceMeters(minDistance);
        setNearestOffice(closestLoc);
        setErrorMessage(
          `You are ${minDistance > 1000 ? `${(minDistance / 1000).toFixed(1)} km` : `${minDistance} meters`} away from the nearest authorized office (${closestLoc?.name}).`
        );
      }
    },
    [isAdmin, userAccessMode, geofenceConfig]
  );

  const handlePositionError = useCallback(
    (error) => {
      // If admin, enforcement is bypassed, or user has remote permissions, don't block them on GPS error
      if (isAdmin || geofenceConfig.enforceGeofence === false || userAccessMode === "global" || geofenceConfig.globalMode === "global") {
        setStatus("admin_exempt");
        setIsInsideGeofence(true);
        setDistanceMeters(0);
        return;
      }

      if (userAccessMode === "pan_india" || geofenceConfig.globalMode === "pan_india") {
        setStatus("pan_india_allowed");
        setIsInsideGeofence(true);
        setDistanceMeters(0);
        return;
      }

      console.warn("Geolocation error:", error);
      if (error.code === error.PERMISSION_DENIED) {
        setStatus("denied_permission");
        setErrorMessage("Location permission was denied. Please allow location access to verify physical presence at an authorized office.");
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        setStatus("error");
        setErrorMessage("Location unavailable. Please verify GPS or Location Services on your device.");
      } else if (error.code === error.TIMEOUT) {
        setStatus("error");
        setErrorMessage("Location request timed out. Please click retry.");
      } else {
        setStatus("error");
        setErrorMessage(error.message || "Unable to determine your location.");
      }
      setIsInsideGeofence(false);
    },
    [isAdmin, userAccessMode, geofenceConfig]
  );

  // Trigger high-accuracy location check
  const recheckLocation = useCallback(() => {
    if (!isAuthenticated) return;

    if (isAdmin || geofenceConfig.enforceGeofence === false || userAccessMode === "global" || geofenceConfig.globalMode === "global") {
      setStatus("admin_exempt");
      setIsInsideGeofence(true);
      setDistanceMeters(0);
      setVerifiedLocationName(geofenceConfig.enforceGeofence === false ? "Enforcement Bypassed" : "Global Remote Access");
      return;
    }

    if (userAccessMode === "pan_india" || geofenceConfig.globalMode === "pan_india") {
      setStatus("pan_india_allowed");
      setIsInsideGeofence(true);
      setDistanceMeters(0);
      setVerifiedLocationName("Pan-India Access");
      return;
    }

    if (!navigator.geolocation) {
      setStatus("error");
      setErrorMessage("Geolocation is not supported by your browser.");
      setIsInsideGeofence(false);
      return;
    }

    setStatus("checking");

    fetchGeofenceConfig().then((activeConfig) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => evaluatePosition(pos, activeConfig),
        handlePositionError,
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }, [isAuthenticated, isAdmin, userAccessMode, geofenceConfig, fetchGeofenceConfig, evaluatePosition, handlePositionError]);

  // Listen for window focus and poll periodically so that policy changes made by Admin take effect in real time
  useEffect(() => {
    if (!isAuthenticated) return;

    fetchGeofenceConfig();
    syncUserProfile();

    const interval = setInterval(() => {
      fetchGeofenceConfig();
      syncUserProfile();
    }, 4000);

    const onFocus = () => {
      fetchGeofenceConfig();
      syncUserProfile();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [isAuthenticated, fetchGeofenceConfig, syncUserProfile]);

  // Set up continuous location tracking when authenticated or when policy changes
  useEffect(() => {
    if (!isAuthenticated) {
      setStatus("checking");
      return;
    }

    if (isAdmin || geofenceConfig.enforceGeofence === false || userAccessMode === "global" || geofenceConfig.globalMode === "global") {
      setStatus("admin_exempt");
      setIsInsideGeofence(true);
      setDistanceMeters(0);
      setVerifiedLocationName(isAdmin ? "Admin (Global Access)" : geofenceConfig.enforceGeofence === false ? "Enforcement Bypassed" : "Global Remote Access");
      return;
    }

    if (userAccessMode === "pan_india" || geofenceConfig.globalMode === "pan_india") {
      setStatus("pan_india_allowed");
      setIsInsideGeofence(true);
      setDistanceMeters(0);
      setVerifiedLocationName("Pan-India Access");
      return;
    }

    // Staff with offices_only when Enforcement Gate is active: must re-evaluate location!
    setStatus("checking");
    recheckLocation();

    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => evaluatePosition(pos, geofenceConfig),
        (err) => console.log("Watch position error:", err.message),
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 30000,
        }
      );
    }

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [isAuthenticated, isAdmin, userAccessMode, geofenceConfig.enforceGeofence, geofenceConfig.globalMode]);

  return (
    <GeofenceContext.Provider
      value={{
        geofenceConfig,
        officeConfig: nearestOffice || (geofenceConfig?.authorizedLocations?.[0]) || DEFAULT_LOCATIONS[0],
        currentCoords,
        distanceMeters,
        isInsideGeofence,
        status,
        verifiedLocationName,
        nearestOffice,
        errorMessage,
        recheckLocation,
        fetchGeofenceConfig,
        isAdmin,
        userAccessMode,
      }}
    >
      {children}
    </GeofenceContext.Provider>
  );
};
