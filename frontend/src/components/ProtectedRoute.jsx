import React, { useContext } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, authLoading } = useContext(AuthContext)
  const location = useLocation()

  if (authLoading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
        <span>Verifying account session...</span>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!user.role) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-xl border border-red-200 text-center max-w-md shadow-md">
          <h2 className="text-lg font-bold text-red-600 mb-2">Unauthorized Account</h2>
          <p className="text-sm text-slate-600 mb-4">Your account does not have a valid role assigned. Please sign in again.</p>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem('token')
              localStorage.removeItem('user')
              window.location.href = '/login'
            }}
            className="btn btn-primary btn-sm"
          >
            Sign In Again
          </button>
        </div>
      </div>
    )
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />
    if (user.role === 'doctor') return <Navigate to="/doctor/dashboard" replace />
    if (user.role === 'patient') return <Navigate to="/patient/dashboard" replace />
    return <Navigate to="/login" replace />
  }

  return children
}
