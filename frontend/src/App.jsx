"use client";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Toaster } from "react-hot-toast"; // ✅ Import Toaster
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Bookings from "./pages/Bookings";
import BookingDetail from "./pages/BookingDetail";
import Pincodes from "./pages/Pincodes";
import Coupons from "./pages/Coupons";
import SalesReport from "./pages/SalesReport";
import Layout from "./components/Layout";
import ManualBooking from "./pages/manual-booking";
import EDocket from "./pages/EDocket";

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        {/* ✅ Toast container (visible globally) */}
        <Toaster position="top-right" reverseOrder={false} />

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
            path="/sales-report"
            element={
              <ProtectedRoute>
                <Layout>
                  <SalesReport />
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
