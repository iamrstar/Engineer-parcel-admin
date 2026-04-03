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
    }
    setLoading(false)
  }, [])

  const login = async (identifier, password) => {
    try {
      // Check if it's a numeric phone number (for new User model) or alphanumeric (for Admin model)
      const isPhone = /^\d+$/.test(identifier)
      const loginEndpoint = isPhone ? "/api/users/login" : "/api/auth/login"
      const payload = isPhone ? { phone: identifier, password } : { username: identifier, password }

      const response = await axios.post(`${API_BASE_URL}${loginEndpoint}`, payload)

      const { token, admin, user: userData } = response.data
      const finalUser = userData || admin // handle both response formats

      localStorage.setItem("token", token)
      localStorage.setItem("adminToken", token) // for backward compatibility
      localStorage.setItem("userData", JSON.stringify(finalUser))

      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`

      setIsAuthenticated(true)
      setUser(finalUser)

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

  const value = {
    isAuthenticated,
    user,
    admin: user, // for backward compatibility where admin.username was used
    login,
    logout,
    loading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
