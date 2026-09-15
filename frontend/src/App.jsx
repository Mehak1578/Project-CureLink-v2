import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import UploadReport from './pages/UploadReport'
import MyReports from './pages/MyReports'
import AnalyzeReport from './pages/AnalyzeReport'
import Chat from './pages/Chat'
import Payments from './pages/Payments'
import DoctorsList from './pages/DoctorsList'
import DoctorProfile from './pages/DoctorProfile'
import Dashboard from './pages/Dashboard'
import Appointments from './pages/Appointments'
import BookAppointment from './pages/BookAppointment'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import DoctorPortal from './pages/DoctorPortal'
import AdminPortal from './pages/AdminPortal'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import { ToastProvider } from './context/ToastContext'

export default function App(){
  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <main>
          <Routes>
            <Route path="/login" element={<Login/>} />
            <Route path="/register" element={<Register/>} />
            <Route path="/doctors" element={<DoctorsList/>} />
            <Route path="/doctors/:id" element={<DoctorProfile/>} />
            
            {/* Patient Routes */}
            <Route path="/book-appointment" element={<ProtectedRoute allowedRoles={['patient']}><BookAppointment/></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['patient']}><Dashboard/></ProtectedRoute>} />
            <Route path="/patient/dashboard" element={<ProtectedRoute allowedRoles={['patient']}><Dashboard/></ProtectedRoute>} />
            <Route path="/appointments" element={<ProtectedRoute allowedRoles={['patient']}><Appointments/></ProtectedRoute>} />
            <Route path="/upload-report" element={<ProtectedRoute allowedRoles={['patient']}><UploadReport/></ProtectedRoute>} />
            <Route path="/my-reports" element={<ProtectedRoute allowedRoles={['patient']}><MyReports/></ProtectedRoute>} />
            <Route path="/analyze/:id" element={<ProtectedRoute allowedRoles={['patient']}><AnalyzeReport/></ProtectedRoute>} />
            <Route path="/payments" element={<ProtectedRoute allowedRoles={['patient']}><Payments/></ProtectedRoute>} />

            {/* Doctor Routes */}
            <Route path="/doctor/dashboard" element={<ProtectedRoute allowedRoles={['doctor']}><DoctorPortal/></ProtectedRoute>} />
            <Route path="/doctor/appointments" element={<ProtectedRoute allowedRoles={['doctor']}><DoctorPortal/></ProtectedRoute>} />
            <Route path="/doctor/patients" element={<ProtectedRoute allowedRoles={['doctor']}><DoctorPortal/></ProtectedRoute>} />
            <Route path="/doctor/profile" element={<ProtectedRoute allowedRoles={['doctor']}><DoctorPortal/></ProtectedRoute>} />
            <Route path="/doctor/availability" element={<ProtectedRoute allowedRoles={['doctor']}><DoctorPortal/></ProtectedRoute>} />

            {/* Admin Routes */}
            <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminPortal/></ProtectedRoute>} />
            <Route path="/admin/:section" element={<ProtectedRoute allowedRoles={['admin']}><AdminPortal/></ProtectedRoute>} />

            {/* Shared Authenticated Routes */}
            <Route path="/profile" element={<ProtectedRoute allowedRoles={['patient', 'doctor', 'admin']}><Profile/></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute allowedRoles={['patient', 'doctor', 'admin']}><Settings/></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute allowedRoles={['patient', 'doctor']}><Chat/></ProtectedRoute>} />

            {/* Public Root Route */}
            <Route path="/" element={<Dashboard/>} />
          </Routes>
        </main>
      </div>
    </ToastProvider>
  )
}
