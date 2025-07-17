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

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" />
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
                <Layout>
                  <Dashboard />
                </Layout>
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
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
