import React, { useState, useContext, useEffect } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import axios from '../api'
import { AuthContext } from '../context/AuthContext'

export default function BookAppointment() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useContext(AuthContext)
  
  const [selectedDoctor, setSelectedDoctor] = useState(location.state?.doctor || null)
  const [doctors, setDoctors] = useState([])
  const [formData, setFormData] = useState({
    doctorId: location.state?.doctor?._id || '',
    date: '',
    time: '',
    reason: ''
  })
  const [loading, setLoading] = useState(false)
  const [availableTimes, setAvailableTimes] = useState(['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'])
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Fetch doctors if none selected
    if (!selectedDoctor) {
      const loadDoctors = async () => {
        try {
          const res = await axios.get('/api/doctors')
          setDoctors(res.data)
        } catch (err) {
          console.error(err)
        }
      }
      loadDoctors()
    }
  }, [selectedDoctor])

  useEffect(() => {
    if (!user) {
      navigate('/login')
    }
  }, [user, navigate])

  useEffect(() => {
    if (!formData.doctorId || !formData.date) return
    const loadAvailableTimes = async () => {
      try {
        const res = await axios.get('/api/appointments/available', {
          params: { doctorId: formData.doctorId, date: formData.date }
        })
        setAvailableTimes(res.data.slots)
        setFormData(prev => prev.time && res.data.slots.includes(prev.time) ? prev : { ...prev, time: '' })
      } catch (err) {
        console.error(err)
      }
    }
    loadAvailableTimes()
  }, [formData.doctorId, formData.date])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    // Validation
    if (!formData.doctorId || !formData.date || !formData.time) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)

    try {
      // Format date to ISO string
      const formattedDate = new Date(`${formData.date}T${formData.time}:00`).toISOString()
      
      const appointmentData = {
        doctor: selectedDoctor?._id || selectedDoctor?.id || formData.doctorId,
        date: formattedDate,
        time: formData.time,
        reason: formData.reason || 'General consultation'
      }

      await axios.post('/api/appointments', appointmentData)
      setSuccess(true)
      
      // Redirect to appointments after 2 seconds
      setTimeout(() => {
        navigate('/appointments')
      }, 2000)
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to book appointment')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Update selected doctor when doctor changes
    if (name === 'doctorId') {
      const doctor = doctors.find(d => d._id === value)
      setSelectedDoctor(doctor)
    }
  }

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0]

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-cyan-50 py-12">
        <div className="container-max max-w-2xl">
          <div className="card text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 bg-emerald-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Appointment Booked!</h2>
            <p className="text-lg text-slate-600 mb-8">
              Your appointment has been successfully scheduled. You will be redirected shortly.
            </p>
            <Link 
              to="/appointments"
              className="inline-block px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-lg transition-colors"
            >
              View My Appointments
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-cyan-50 py-12">
      <div className="container-max max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Book an Appointment</h1>
          <p className="text-lg text-slate-600">Schedule your consultation with our healthcare professionals</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Form */}
          <div className="md:col-span-2">
            <form onSubmit={handleSubmit} className="card">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Appointment Details</h2>

              {/* Doctor Selection */}
              <div className="mb-6">
                <label htmlFor="doctorId" className="block text-sm font-medium text-slate-700 mb-2">
                  Select Doctor <span className="text-red-500">*</span>
                </label>
                <select
                  id="doctorId"
                  name="doctorId"
                  value={formData.doctorId}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none transition-all"
                >
                  <option value="">Choose a doctor...</option>
                  {selectedDoctor && !doctors.length && (
                    <option value={selectedDoctor._id}>
                      Dr. {(selectedDoctor.user?.name || 'Doctor').replace(/^(Dr\.\s*)+/i, '')} - {selectedDoctor.specialization}
                    </option>
                  )}
                  {doctors.map(doctor => (
                    <option key={doctor._id} value={doctor._id}>
                      Dr. {(doctor.user?.name || 'Doctor').replace(/^(Dr\.\s*)+/i, '')} - {doctor.specialization}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div className="mb-6">
                <label htmlFor="date" className="block text-sm font-medium text-slate-700 mb-2">
                  Appointment Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  min={today}
                  required
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none transition-all"
                />
              </div>

              {/* Time */}
              <div className="mb-6">
                <label htmlFor="time" className="block text-sm font-medium text-slate-700 mb-2">
                  Preferred Time <span className="text-red-500">*</span>
                </label>
                <select
                  id="time"
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none transition-all"
                >
                  <option value="">Select a time...</option>
                  {availableTimes.map(time => (
                    <option key={time} value={time}>{time === '12:00' ? '12:00 PM' : `${time.slice(0, 2) > 12 ? String(Number(time.slice(0, 2)) - 12).padStart(2, '0') : time.slice(0, 2)}:${time.slice(3)} ${Number(time.slice(0, 2)) >= 12 ? 'PM' : 'AM'}`}</option>
                  ))}
                </select>
              </div>

              {/* Reason */}
              <div className="mb-6">
                <label htmlFor="reason" className="block text-sm font-medium text-slate-700 mb-2">
                  Reason for Visit
                </label>
                <textarea
                  id="reason"
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  rows="4"
                  placeholder="Briefly describe your symptoms or reason for consultation..."
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none transition-all resize-none"
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Booking...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Book Appointment
                    </>
                  )}
                </button>
                <Link
                  to="/doctors"
                  className="px-6 py-3 bg-white hover:bg-slate-50 text-slate-600 font-semibold rounded-lg border-2 border-slate-300 transition-colors"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </div>

          {/* Sidebar - Doctor Info */}
          {selectedDoctor && (
            <div className="md:col-span-1">
              <div className="card sticky top-24">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Selected Doctor</h3>
                <div className="text-center mb-4">
                  <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-gradient-to-br from-sky-400 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold">
                    {selectedDoctor.user?.name?.charAt(0)?.toUpperCase() || 'D'}
                  </div>
                  <h4 className="font-bold text-slate-900 mb-1">
                    Dr. {(selectedDoctor.user?.name || 'Doctor').replace(/^(Dr\.\s*)+/i, '')}
                  </h4>
                  <p className="text-sm text-sky-600 font-medium">{selectedDoctor.specialization}</p>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {selectedDoctor.experience || 0} years experience
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    ₹{selectedDoctor.fees || '—'} consultation
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
