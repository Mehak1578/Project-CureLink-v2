import React, { createContext, useState, useEffect } from 'react'
import axios from '../api'

export const AuthContext = createContext()

export function AuthProvider({ children }){
  const [user, setUser] = useState(() => {
    try{ return JSON.parse(localStorage.getItem('user')) }catch(e){ return null }
  })
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token')
      if (token) {
        try {
          const res = await axios.get('/api/auth/profile')
          setUser(res.data)
        } catch (err) {
          console.error('Session verification failed:', err)
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          setUser(null)
        }
      } else {
        setUser(null)
      }
      setAuthLoading(false)
    }
    checkAuth()
  }, [])

  useEffect(()=>{
    if(user) localStorage.setItem('user', JSON.stringify(user));
    else {
      localStorage.removeItem('user')
    }
  }, [user])

  return (
    <AuthContext.Provider value={{ user, setUser, authLoading }}>
      {children}
    </AuthContext.Provider>
  )
}
