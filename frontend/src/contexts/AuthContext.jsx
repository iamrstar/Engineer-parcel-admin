import { createContext, useContext, useState, useEffect } from "react"
import axios from "axios"

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const initialToken = localStorage.getItem("adminToken") || localStorage.getItem("token");
  if (initialToken) {
    axios.defaults.headers.common["Authorization"] = `Bearer ${initialToken}`;
  }

  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(initialToken));
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("userData");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL;

  const markAttendanceWithLocation = () => {
    // Admins have unrestricted access: they can work, log in, and log out from anywhere worldwide.
    // They are completely exempt from staff geolocation checks and attendance punches.
    const savedUser = localStorage.getItem("userData");
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed.role === "admin" || parsed.role === "office_admin" || (parsed.permissions && parsed.permissions.includes("ALL"))) {
          return;
        }
      } catch (e) { }
    }
    if (localStorage.getItem("adminToken")) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          axios
            .post(`${API_BASE_URL}/api/attendance/mark`, {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            })
            .catch((e) => console.log("Attendance mark error", e));
        },
        () => {
          axios
            .post(`${API_BASE_URL}/api/attendance/mark`)
            .catch((e) => console.log("Attendance not marked", e));
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
      );
    } else {
      axios
        .post(`${API_BASE_URL}/api/attendance/mark`)
        .catch((e) => console.log("Attendance not marked", e));
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
    const savedUser = localStorage.getItem("userData");

    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      setIsAuthenticated(true);
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          setUser(parsed);
          // Purge leftover adminToken if currently logged in as staff/rider
          if (parsed.role !== "admin" && parsed.role !== "office_admin") {
            localStorage.removeItem("adminToken");
          }
        } catch (e) { }
      }
      // Silently mark attendance with location verification ONLY for non-admins (staff/riders)
      markAttendanceWithLocation();
    }
    setLoading(false);

    // Handle token expiry cleanly across the app
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (
          error.response?.status === 401 &&
          !error.config?.url?.includes("/api/auth/login") &&
          !error.config?.url?.includes("/api/users/login") &&
          !error.config?.url?.includes("/api/attendance/mark")
        ) {
          if (localStorage.getItem("token") || localStorage.getItem("adminToken")) {
            localStorage.removeItem("adminToken")
            localStorage.removeItem("token")
            localStorage.removeItem("userData")
            delete axios.defaults.headers.common["Authorization"]
            setIsAuthenticated(false)
            setUser(null)
          }
        }
        return Promise.reject(error)
      }
    )

    return () => axios.interceptors.response.eject(interceptor)
  }, [])

  const login = async (identifier, password) => {
    try {
      // Check if it's a numeric phone number (for new User model)
      const isPhone = /^\d+$/.test(identifier)
      let response;

      if (isPhone) {
        // Must be a user
        response = await axios.post(`${API_BASE_URL}/api/users/login`, { phone: identifier, password })
      } else {
        // Alphanumeric: Could be Admin or User (Staff)
        try {
          // Try Admin first
          response = await axios.post(`${API_BASE_URL}/api/auth/login`, { username: identifier, password })
        } catch (error) {
          // If Admin fails, try User
          if (error.response?.status === 400 || error.response?.status === 401 || error.response?.status === 404) {
            response = await axios.post(`${API_BASE_URL}/api/users/login`, { username: identifier, password })
          } else {
            throw error; // Unexpected server error
          }
        }
      }

      const { token, admin, user: userData } = response.data
      const finalUser = userData || admin // handle both response formats

      localStorage.setItem("token", token)
      if (finalUser?.role === "admin" || finalUser?.role === "office_admin") {
        localStorage.setItem("adminToken", token)
      } else {
        localStorage.removeItem("adminToken") // Never store adminToken for staff/riders
      }
      localStorage.setItem("userData", JSON.stringify(finalUser))

      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`

      setIsAuthenticated(true)
      setUser(finalUser)

      // Silently mark attendance with location verification ONLY for non-admins
      if (finalUser?.role !== "admin" && finalUser?.role !== "office_admin") {
        markAttendanceWithLocation()
      }

      return { success: true, user: finalUser }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Login failed",
      }
    }
  }

  const logout = () => {
    localStorage.removeItem("adminToken")
    localStorage.removeItem("token")
    localStorage.removeItem("userData")
    delete axios.defaults.headers.common["Authorization"]
    setIsAuthenticated(false)
    setUser(null)
  }

  const impersonate = async (userId) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/users/impersonate`, { userId })
      const { token, user: userData } = response.data

      // We just overwrite the current token. The admin can log back in later.
      localStorage.setItem("token", token)
      localStorage.setItem("adminToken", token)
      localStorage.setItem("userData", JSON.stringify(userData))

      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`

      setIsAuthenticated(true)
      setUser(userData)

      return { success: true }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to switch office",
      }
    }
  }

  const value = {
    isAuthenticated,
    user,
    admin: user, // for backward compatibility where admin.username was used
    login,
    logout,
    impersonate,
    loading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
