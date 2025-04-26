import React, { createContext, useState, useEffect, useContext } from 'react'
import axios from 'axios'

const BASE_URL = `${process.env.REACT_APP_API_URL}/api/auth`

export const UserContext = createContext({
  user: null,
  loading: true,
  signup:   async () => {},
  login:    async () => {},
  logout:   async () => {}
})

export const UserProvider = ({ children }) => {
  const [user, setUser]       = useState(() => {
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  })
  const [loading, setLoading] = useState(true)

  // Add auth header to all requests
  useEffect(() => {
    const id = axios.interceptors.request.use(cfg => {
      const t = localStorage.getItem('access_token')
      if (t) cfg.headers.Authorization = `Bearer ${t}`
      return cfg
    })
    return () => axios.interceptors.request.eject(id)
  }, [])

  // Handle token refresh
  useEffect(() => {
    const id = axios.interceptors.response.use(
      r => r,
      async err => {
        const orig = err.config
        const status = err.response?.status
        const isRefreshCall = orig.url === `${BASE_URL}/refresh/`

        if (status === 401 && isRefreshCall) {
          // This is a refresh call, so it doesnt log out
          await doLogout()
          return Promise.reject(err)
        }
        // If the error is 401 and not a refresh call, refresh the token
        if (status === 401 && !orig._retry) {
          orig._retry = true
          const rTok = localStorage.getItem('refresh_token')
          if (rTok) {
            try {
              const { data } = await axios.post(
                `${BASE_URL}/refresh/`,
                { refresh: rTok }
              )
              // Save new tokens to local storage
              localStorage.setItem('access_token', data.access)
              orig.headers.Authorization = `Bearer ${data.access}`
              return axios(orig)
            } catch {
              await doLogout()
            }
          }
        }

        return Promise.reject(err)
      }
    )
    return () => axios.interceptors.response.eject(id)
  }, [])

  // Check if user is logged in
  // and verify token on app load
  useEffect(() => {
    const verify = async () => {
      const t = localStorage.getItem('access_token')
      if (!t) {
        setLoading(false)
        return
      }
      try {
        const { data } = await axios.get(`${BASE_URL}/test-token/`)
        setUser({ ...data.user, token: t })
      } catch {
        await doLogout()
      } finally {
        setLoading(false)
      }
    }
    verify()
  }, [])

  // Save user to local storage
  useEffect(() => {
    if (user)  localStorage.setItem('user', JSON.stringify(user))
    else       localStorage.removeItem('user')
  }, [user])

  const signup = async creds => {
    const { data } = await axios.post(`${BASE_URL}/signup/`, creds)
    localStorage.setItem('access_token', data.access)
    localStorage.setItem('refresh_token', data.refresh)
    setUser({ ...data.user, token: data.access })
    return data
  }
  // Login function
  const login = async creds => {
    const { data } = await axios.post(`${BASE_URL}/login/`, creds)
    localStorage.setItem('access_token', data.access)
    localStorage.setItem('refresh_token', data.refresh)
    const { data: v } = await axios.get(`${BASE_URL}/test-token/`)
    setUser({ ...v.user, token: data.access })
    return data
  }
  // Logout function
  const doLogout = async () => {
    const rTok = localStorage.getItem('refresh_token')
    try {
      if (rTok) {
        await axios.post(`${BASE_URL}/logout/`, { refresh: rTok })
      }
    } catch (e) {
      // Ignore 401 errors on logout 
      console.warn('Logout error ignored:', e.response?.status)
    } finally {
      localStorage.removeItem('access_token') 
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      setUser(null)
    }
  }

  return (
    <UserContext.Provider value={{
      user, // User object
      loading, // Loading state
      signup, // Signup function
      login, // Login function
      logout: doLogout // Logout function
    }}>
      {!loading && children}
    </UserContext.Provider>
  )
}

export const useUser = () => {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used within UserProvider')
  return ctx
}