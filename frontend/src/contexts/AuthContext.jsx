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
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const API_BASE_URL = import.meta.env.VITE_API_URL

  useEffect(() => {
    const token = localStorage.getItem("adminToken") || localStorage.getItem("token")
    const savedUser = localStorage.getItem("userData")

    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`
      setIsAuthenticated(true)
      if (savedUser) {
        setUser(JSON.parse(savedUser))
      }
      // Silently mark attendance
      axios.post(`${API_BASE_URL}/api/attendance/mark`).catch(e => console.log("Attendance not marked", e))
    }
    setLoading(false)
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
      localStorage.setItem("adminToken", token) // for backward compatibility
      localStorage.setItem("userData", JSON.stringify(finalUser))

      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`

      setIsAuthenticated(true)
      setUser(finalUser)

      // Silently mark attendance
      axios.post(`${API_BASE_URL}/api/attendance/mark`).catch(e => console.log("Attendance not marked", e))

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
