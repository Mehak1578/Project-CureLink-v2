import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useParams, Link, useNavigate } from 'react-router-dom'

export default function DoctorProfile(){
  const { id } = useParams()
  const navigate = useNavigate()
  const [doctor, setDoctor] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    const load = async ()=>{
      try {
        const res = await axios.get(import.meta.env.VITE_API_URL + '/api/doctors/' + id)
        setDoctor(res.data)
      } catch(err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if(loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-cyan-50 py-12">
        <div className="container-max">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-slate-600">Loading doctor profile...</p>
          </div>
        </div>
      </div>
    )
  }

  if(!doctor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-cyan-50 py-12">
        <div className="container-max">
          <div className="card text-center py-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Doctor Not Found</h2>
            <p className="text-slate-600 mb-6">The doctor you're looking for doesn't exist.</p>
            <Link to="/doctors" className="inline-block px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-lg transition-colors">
              Browse All Doctors
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-cyan-50 py-12">
      <div className="container-max max-w-4xl">
        {/* Back Button */}
        <Link to="/doctors" className="inline-flex items-center gap-2 text-slate-600 hover:text-sky-600 mb-6 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Doctors
        </Link>

        {/* Doctor Profile Card */}
        <div className="card">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row gap-6 mb-8 pb-8 border-b border-slate-200">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-sky-400 to-cyan-500 flex items-center justify-center text-white text-5xl font-bold flex-shrink-0">
              {doctor.user?.name?.charAt(0)?.toUpperCase() || 'D'}
            </div>
            
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
                Dr. {(doctor.user?.name || 'Doctor').replace(/^(Dr\.\s*)+/i, '')}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-sky-100 text-sky-700">
                  {doctor.specialization}
                </span>
                {doctor.verified && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-700">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Verified
                  </span>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-slate-700">
                  <svg className="w-5 h-5 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span><strong>{doctor.experience || 0}</strong> years of experience</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-2xl font-bold text-emerald-600">₹{doctor.fees || '—'}</span>
                  <span className="text-slate-600">per consultation</span>
                </div>
              </div>
            </div>
          </div>

          {/* About Section */}
          {doctor.bio && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">About</h2>
              <p className="text-slate-700 leading-relaxed">{doctor.bio}</p>
            </div>
          )}

          {/* Contact Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Contact Information</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Email</div>
                  <div className="text-slate-900 font-medium">{doctor.user?.email || 'Not provided'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Phone</div>
                  <div className="text-slate-900 font-medium">{doctor.phone || 'Not provided'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={() => navigate('/book-appointment', { state: { doctor } })}
              className="flex-1 px-6 py-4 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Book Appointment
            </button>
            <Link 
              to="/chat"
              className="flex-1 px-6 py-4 bg-white hover:bg-slate-50 text-sky-600 font-semibold rounded-lg border-2 border-sky-500 shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Send Message
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
