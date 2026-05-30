"use client"

import { useState } from "react"
import { Navigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { useTheme } from "../contexts/ThemeContext"
import toast from "react-hot-toast"
import { Package, Eye, EyeOff, Moon, Sun } from "lucide-react"

const Login = () => {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login, isAuthenticated } = useAuth()
  const { isDarkMode, toggleDarkMode } = useTheme()

  if (isAuthenticated) {
    return <Navigate to="/" />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const result = await login(username, password)

    if (result.success) {
      toast.success("Login successful!")
    } else {
      toast.error(result.message)
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-[#0A0A0A] p-4 transition-colors duration-300">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={toggleDarkMode}
          className="relative p-3 text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-500 bg-white/50 dark:bg-black/50 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-full transition-all duration-300 shadow-lg hover:shadow-orange-500/20"
        >
          {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </div>

      {/* Dynamic Ambient Background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-orange-600/20 dark:bg-orange-600/30 blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-blob"></div>
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[60%] rounded-full bg-orange-500/10 dark:bg-orange-500/20 blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[50%] rounded-full bg-amber-600/10 dark:bg-amber-600/20 blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 bg-white/80 dark:bg-black/40 backdrop-blur-3xl rounded-[2rem] shadow-[0_8px_40px_rgb(0,0,0,0.1)] dark:shadow-[0_8px_40px_rgb(0,0,0,0.4)] border border-gray-200 dark:border-white/10 w-full max-w-[440px] p-8 md:p-10 overflow-hidden transform transition-all">
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500"></div>

        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-orange-50 dark:bg-orange-500/10 rounded-2xl mb-5 shadow-inner border border-orange-100 dark:border-orange-500/20">
            <Package className="h-10 w-10 text-orange-600 dark:text-orange-500" strokeWidth={2} />
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">EngineersParcel</h1>
          <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-2">Log in to Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="group">
            <label htmlFor="username" className="block text-xs font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wider mb-2 ml-1">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 dark:focus:bg-white/10 transition-all duration-300 text-gray-900 dark:text-white font-medium shadow-sm outline-none placeholder-gray-400 dark:placeholder-gray-600"
              placeholder="Enter your username or phone"
              required
            />
          </div>

          <div className="group">
            <label htmlFor="password" className="block text-xs font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wider mb-2 ml-1 flex justify-between">
              <span>Password</span>
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 dark:focus:bg-white/10 transition-all duration-300 text-gray-900 dark:text-white font-medium shadow-sm outline-none pr-12 placeholder-gray-400 dark:placeholder-gray-600"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-orange-500 transition-colors p-1"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full relative group overflow-hidden bg-gradient-to-r from-orange-600 to-orange-500 text-white py-4 px-4 rounded-xl shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_30px_rgba(249,115,22,0.5)] transition-all duration-300 font-bold tracking-wide disabled:opacity-70 disabled:cursor-not-allowed mt-2 transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {/* Button Hover Glow */}
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-orange-500 to-amber-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0"></div>
            <span className="relative z-10 flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Authenticating...
                </>
              ) : "Secure Sign In"}
            </span>
          </button>
        </form>

       
      </div>
    </div>
  )
}

export default Login
