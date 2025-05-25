import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { User } from '../types';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isInitialized: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const convertFirebaseUserToUser = async (firebaseUser: FirebaseUser): Promise<User> => {
  const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
  const userData = userDoc.data();
  
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName: userData?.displayName || firebaseUser.displayName || '',
    isAdmin: userData?.isAdmin || false,
  };
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      loading: false,
      error: null,
      isInitialized: false,

      signUp: async (email, password) => {
        set({ loading: true, error: null });
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const user = await convertFirebaseUserToUser(userCredential.user);
          
          // Create user document in Firestore
          await setDoc(doc(db, 'users', user.id), {
            email: user.email,
            displayName: user.displayName || '',
            isAdmin: false,
            createdAt: new Date().getTime(),
          });
          
          set({ user, loading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'An unknown error occurred',
            loading: false 
          });
        }
      },

      signIn: async (email, password) => {
        set({ loading: true, error: null });
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const user = await convertFirebaseUserToUser(userCredential.user);
          set({ user, loading: false });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to sign in';
          console.error('Sign in error:', error);
          set({ 
            error: errorMessage,
            loading: false 
          });
        }
      },

      signOut: async () => {
        set({ loading: true, error: null });
        try {
          await firebaseSignOut(auth);
          set({ user: null, loading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'An unknown error occurred',
            loading: false 
          });
        }
      },

      clearError: () => {
        set({ error: null });
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
    }
  )
);

// Initialize auth state listener
onAuthStateChanged(auth, async (firebaseUser) => {
  if (firebaseUser) {
    const user = await convertFirebaseUserToUser(firebaseUser);
    useAuthStore.setState({ user, isInitialized: true });
  } else {
    useAuthStore.setState({ user: null, isInitialized: true });
  }
});