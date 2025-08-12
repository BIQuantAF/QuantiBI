import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Implement actual authentication state management
    // For now, just set loading to false
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    // TODO: Implement actual login logic
    console.log('Login:', { email, password });
    setCurrentUser({ email, id: '1' });
  };

  const signup = async (email, password) => {
    // TODO: Implement actual signup logic
    console.log('Signup:', { email, password });
    setCurrentUser({ email, id: '1' });
  };

  const logout = async () => {
    // TODO: Implement actual logout logic
    setCurrentUser(null);
  };

  const resetPassword = async (email) => {
    // TODO: Implement actual password reset logic
    console.log('Password reset:', { email });
  };

  const value = {
    currentUser,
    login,
    signup,
    logout,
    resetPassword,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
