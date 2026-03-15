"use client"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, useAuth } from "./contexts/AuthContext"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Bookings from "./pages/Bookings"
import BookingDetail from "./pages/BookingDetail"
import Pincodes from "./pages/Pincodes"
import Coupons from "./pages/Coupons"
import Layout from "./components/Layout"
import ManualBooking from "./pages/manual-booking"
import EDocket from "./pages/EDocket"
import SalesReport from "./pages/SalesReport"
import UserManagement from "./pages/UserManagement"
import RiderDashboard from "./pages/RiderDashboard"

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" />
}

function HomeRedirect() {
  const { user } = useAuth()
  if (user?.role === "rider") {
    return <Navigate to="/rider-dashboard" />
  }
  return (
    <Layout>
      <Dashboard />
    </Layout>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomeRedirect />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bookings"
            element={
              <ProtectedRoute>
                <Layout>
                  <Bookings />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/manual-booking"
            element={
              <ProtectedRoute>
                <Layout>
                  <ManualBooking />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/bookings/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <BookingDetail />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/pincodes"
            element={
              <ProtectedRoute>
                <Layout>
                  <Pincodes />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/coupons"
            element={
              <ProtectedRoute>
                <Layout>
                  <Coupons />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/e-docket"
            element={
              <ProtectedRoute>
                <Layout>
                  <EDocket />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales-report"
            element={
              <ProtectedRoute>
                <Layout>
                  <SalesReport />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-management"
            element={
              <ProtectedRoute>
                <Layout>
                  <UserManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/rider-dashboard"
            element={
              <ProtectedRoute>
                <RiderDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
