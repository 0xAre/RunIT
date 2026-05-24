import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from '@/src/lib/firebase';
import { useEventStore } from '@/store/eventStore';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { clearCurrentEvent, setCurrentEvent } = useEventStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      if (!firebaseUser) {
        clearCurrentEvent();
      } else {
        // Optionally load last event for the user
        // This is a placeholder; actual Firestore listener will populate store
      }
    });
    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await signOut(auth);
    clearCurrentEvent();
  };

  return { user, loading, logout };
};
