import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, useAuth } from "./contexts/AuthContext"
import { ThemeProvider } from "./contexts/ThemeContext"
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
import Partners from "./pages/Partners"
import Tasks from "./pages/Tasks.jsx"
import Analytics from "./pages/Analytics"
import DocketManagement from "./pages/DocketManagement"
import TrackingTasks from "./pages/TrackingTasks"
import Queries from "./pages/Queries"
import Attendance from "./pages/Attendance"
import AttendanceReport from "./pages/AttendanceReport"
import AccessControl from "./pages/AccessControl"
import Offices from "./pages/Offices"
import Leads from "./pages/Leads"

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
    <ThemeProvider>
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
            path="/partners"
            element={
              <ProtectedRoute>
                <Layout>
                  <Partners />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tasks"
            element={
              <ProtectedRoute>
                <Layout>
                  <Tasks />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tracking-tasks"
            element={
              <ProtectedRoute>
                <Layout>
                  <TrackingTasks />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance"
            element={
              <ProtectedRoute>
                <Layout>
                  <Attendance />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance-report"
            element={
              <ProtectedRoute>
                <Layout>
                  <AttendanceReport />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <Layout>
                  <Analytics />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/docket-management"
            element={
              <ProtectedRoute>
                <Layout>
                  <DocketManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/offices"
            element={
              <ProtectedRoute>
                <Layout>
                  <Offices />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/access-control"
            element={
              <ProtectedRoute>
                <Layout>
                  <AccessControl />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/queries"
            element={
              <ProtectedRoute>
                <Layout>
                  <Queries />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/leads"
            element={
              <ProtectedRoute>
                <Layout>
                  <Leads />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
    </ThemeProvider>
  )
}

export default App
