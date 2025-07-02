"use client"

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
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("adminToken")
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`
      setIsAuthenticated(true)
      // You could verify token here
    }
    setLoading(false)
  }, [])

  const login = async (username, password) => {
    try {
const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
  username,
  password,
})
      const { token, admin } = response.data

      localStorage.setItem("adminToken", token)
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`

      setIsAuthenticated(true)
      setAdmin(admin)

      return { success: true }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Login failed",
      }
    }
  }

  const logout = () => {
    localStorage.removeItem("adminToken")
    delete axios.defaults.headers.common["Authorization"]
    setIsAuthenticated(false)
    setAdmin(null)
  }

  const value = {
    isAuthenticated,
    admin,
    login,
    logout,
    loading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
