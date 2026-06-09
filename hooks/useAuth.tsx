'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isBypassed: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  bypassLogin: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isBypassed: false,
  loginWithGoogle: async () => {},
  logout: async () => {},
  bypassLogin: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBypassed, setIsBypassed] = useState(false);

  useEffect(() => {
    // Check if bypass flag exists in sessionStorage
    const bypassFlag = sessionStorage.getItem('bypassLogin');
    if (bypassFlag === 'true') {
      setIsBypassed(true);
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // If login is successful, we can clear bypass just in case
      sessionStorage.removeItem('bypassLogin');
      setIsBypassed(false);
    } catch (error) {
      console.error('Failed to sign in with Google', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      sessionStorage.removeItem('bypassLogin');
      setIsBypassed(false);
    } catch (error) {
      console.error('Failed to log out', error);
      throw error;
    }
  };

  const bypassLogin = () => {
    sessionStorage.setItem('bypassLogin', 'true');
    setIsBypassed(true);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isBypassed, loginWithGoogle, logout, bypassLogin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
