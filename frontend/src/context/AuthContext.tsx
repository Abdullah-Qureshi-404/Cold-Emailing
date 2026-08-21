import React, { createContext, useContext } from 'react'

interface AuthContextType {
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: true,
})

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthContext.Provider value={{ isAuthenticated: true }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
