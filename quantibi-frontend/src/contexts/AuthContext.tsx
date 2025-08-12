import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import { User } from '../types';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔍 AuthProvider: Setting up auth state listener');
    console.log('🔍 Firebase auth object:', auth);
    
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      console.log('🔍 Auth state changed:', firebaseUser ? `User: ${firebaseUser.email}` : 'No user');
      
      if (firebaseUser) {
        const user: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          emailVerified: firebaseUser.emailVerified,
        };
        console.log('✅ Setting current user:', user);
        setCurrentUser(user);
      } else {
        console.log('❌ Clearing current user');
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    console.log('🔍 AuthContext.login called with:', { email, password: password ? '***' : 'empty' });
    
    try {
      console.log('🔍 Calling Firebase signInWithEmailAndPassword...');
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ Firebase login successful:', result.user.email);
    } catch (error) {
      console.error('❌ Firebase login error:', error);
      throw error;
    }
  };

  const signup = async (email: string, password: string): Promise<void> => {
    console.log('🔍 AuthContext.signup called with:', { email, password: password ? '***' : 'empty' });
    
    try {
      console.log('🔍 Calling Firebase createUserWithEmailAndPassword...');
      const result = await createUserWithEmailAndPassword(auth, email, password);
      console.log('✅ Firebase signup successful:', result.user.email);
    } catch (error) {
      console.error('❌ Firebase signup error:', error);
      throw error;
    }
  };

  const loginWithGoogle = async (): Promise<void> => {
    console.log('🔍 AuthContext.loginWithGoogle called');
    
    try {
      console.log('🔍 Calling Firebase signInWithPopup with Google...');
      const result = await signInWithPopup(auth, googleProvider);
      console.log('✅ Google login successful:', result.user.email);
    } catch (error) {
      console.error('❌ Google login error:', error);
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    console.log('🔍 AuthContext.logout called');

    try {
      console.log('🔍 Calling Firebase signOut...');
      await signOut(auth);
      console.log('✅ Firebase logout successful');
    } catch (error) {
      console.error('❌ Firebase logout error:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    console.log('🔍 AuthContext.resetPassword called with:', email);

    try {
      console.log('🔍 Calling Firebase sendPasswordResetEmail...');
      await sendPasswordResetEmail(auth, email);
      console.log('✅ Firebase password reset email sent');
    } catch (error) {
      console.error('❌ Firebase password reset error:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    currentUser,
    login,
    signup,
    loginWithGoogle,
    logout,
    resetPassword,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
