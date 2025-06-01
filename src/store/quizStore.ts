// src/store/quizStore.ts
import { create } from 'zustand';
import { getAuth } from 'firebase/auth';
import {
  collection,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  doc,
  setDoc,
  addDoc,
  Timestamp, // Firebase Timestamp type
  DocumentData, // Import DocumentData: Crucial for accessing raw Firestore data
} from 'firebase/firestore';
import { Quiz, QuizAttempt, QuizFilter } from '../types';
import { db, functions } from '../firebase/config'; // 'functions' will now be exported from config.ts
import { httpsCallable } from 'firebase/functions'; // Import httpsCallable
import { useAuthStore } from './authStore';

// Define the raw document types as they come directly from Firestore
// This helps TypeScript understand the potential types before conversion
interface RawQuizDocument extends DocumentData {
  createdAt?: Timestamp | number; // Firestore will return Timestamp, but could be number if manually set
}

interface RawQuizAttemptDocument extends DocumentData {
  completedAt?: Timestamp; // Firestore will return Timestamp
}

// Define the type for the callable function's request payload
interface GenerateQuizCallableRequest {
  title?: string;
  category: string; // This is a required string for the Cloud Function
  difficulty?: 'easy' | 'medium' | 'hard';
  numberOfQuestions: number;
  team?: string;
  event?: string;
  country?: string;
  visibility?: 'global' | 'private'; // Optional, will be handled by server based on admin status
}

// Define the type for the callable function's response data
interface GenerateQuizCallableResponse {
  quiz: Quiz;
}

interface QuizState {
  quizzes: Quiz[];
  currentQuiz: Quiz | null;
  quizAttempts: QuizAttempt[];
  loading: boolean;
  error: string | null;

  // Modified generateQuiz signature:
  // - Omit 'category' from QuizFilter because we're making it explicitly required here.
  // - Add 'category: string' to ensure it's always passed as a string.
  generateQuiz: (filter: Omit<QuizFilter, 'createdBy' | 'visibility' | 'category'> & { category: string; numberOfQuestions: number; visibility?: 'global' | 'private'; }) => Promise<Quiz>;
  saveQuiz: (quiz: Quiz) => Promise<void>;
  fetchQuizById: (id: string) => Promise<void>;
  fetchUserAttempts: (userId: string) => Promise<void>;
  saveQuizAttempt: (attempt: Omit<QuizAttempt, 'id'>) => Promise<string>;
  fetchQuizzes: (filter?: QuizFilter) => Promise<void>;
  updateQuizVisibility: (quizId: string, newVisibility: 'global' | 'private') => Promise<void>;
}

export const useQuizStore = create<QuizState>((set, get) => ({
  quizzes: [],
  currentQuiz: null,
  quizAttempts: [],
  loading: false,
  error: null,

  generateQuiz: async (filter) => {
    set({ loading: true, error: null });

    try {
      const currentUser = getAuth().currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated for quiz generation.');
      }

      // Prepare the callable function
      // 'functions' is now properly imported and initialized
      const callGenerateQuiz = httpsCallable<GenerateQuizCallableRequest, GenerateQuizCallableResponse>(functions, 'generateQuiz');

      // The payload structure matches the callable function's expected data.
      // `userId` and `visibility` (if not explicitly set by admin) are handled server-side.
      const payload: GenerateQuizCallableRequest = {
        title: filter.title,
        category: filter.category, // TypeScript now ensures this is a string due to the updated signature
        difficulty: filter.difficulty,
        numberOfQuestions: filter.numberOfQuestions, // Explicitly pass
        team: filter.team,
        event: filter.event,
        country: filter.country,
        visibility: filter.visibility // Pass if explicitly set by admin, otherwise undefined
      };

      // Call the cloud function
      const result = await callGenerateQuiz(payload);
      const generatedQuiz = result.data.quiz;

      if (!generatedQuiz || !generatedQuiz.questions || generatedQuiz.questions.length === 0) {
        throw new Error('Generated quiz has no questions or is incomplete (from server response)');
      }

      // Fetch quizzes for the current user's visibility after generation
      await get().fetchQuizzes({ createdBy: currentUser.uid, visibility: 'private' });

      set({ loading: false });
      return generatedQuiz; // Return the full Quiz object
    } catch (err: any) {
      const errorMessage = err.message || 'Error generating quiz';
      set({ error: errorMessage, loading: false });
      // Re-throw to allow component to catch if needed for specific display
      throw err;
    }
  },

  saveQuiz: async (quiz: Quiz) => {
    // This `saveQuiz` function is primarily used by the admin section's QuizForm
    // for direct saving after generation, or manual saving.
    // Ensure the quiz object received here has an 'id' from the generation step.
    try {
      // If quiz.id is not present, add a new document
      if (!quiz.id) {
          const docRef = await addDoc(collection(db, 'quizzes'), quiz);
          quiz.id = docRef.id; // Assign the newly generated ID
      } else {
          // Otherwise, set the document with the existing ID
          await setDoc(doc(db, 'quizzes', quiz.id), quiz);
      }
      // Re-fetch quizzes to update the list
      await get().fetchQuizzes({}); // Fetch all quizzes for admin view
    } catch (error) {
      console.error('Error saving quiz:', error);
      set({ error: 'Error saving quiz' });
      throw error; // Re-throw to propagate the error
    }
  },

  fetchQuizById: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const quizDoc = await getDoc(doc(db, 'quizzes', id));
      if (quizDoc.exists()) {
        const rawData = quizDoc.data() as RawQuizDocument;
        // Convert Firestore Timestamp to milliseconds for client-side Quiz type
        const createdAtMillis = rawData.createdAt instanceof Timestamp
          ? rawData.createdAt.toMillis()
          : (typeof rawData.createdAt === 'number' ? rawData.createdAt : Date.now()); // Fallback

        set({
          currentQuiz: {
            id: quizDoc.id,
            ...(rawData as Omit<Quiz, 'id' | 'createdAt'>),
            createdAt: createdAtMillis,
          } as Quiz,
          loading: false,
        });
      } else {
        set({ error: 'Quiz not found', loading: false });
      }
    } catch (error) {
      set({ error: 'Failed to fetch quiz', loading: false });
    }
  },

  fetchUserAttempts: async (userId) => {
    set({ loading: true, error: null });
    try {
      const attemptsQuery = query(
        collection(db, 'quizAttempts'),
        where('userId', '==', userId),
        orderBy('completedAt', 'desc'),
        limit(10)
      );
      const querySnapshot = await getDocs(attemptsQuery);
      const attempts = querySnapshot.docs.map((doc) => {
        const rawData = doc.data() as RawQuizAttemptDocument;
        // Convert Firestore Timestamp
        const completedAtTimestamp = rawData.completedAt instanceof Timestamp
          ? rawData.completedAt
          : Timestamp.now(); // Fallback to current timestamp if not a Timestamp instance

        return {
          id: doc.id,
          ...(rawData as Omit<QuizAttempt, 'id' | 'completedAt'>),
          completedAt: completedAtTimestamp,
        } as QuizAttempt;
      });
      set({ quizAttempts: attempts, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Error fetching attempts',
        loading: false,
      });
      console.error('Error fetching attempts:', error);
    }
  },

  saveQuizAttempt: async (attempt) => {
    set({ loading: true, error: null });
    try {
      const attemptToSave = {
        ...attempt,
        completedAt: Timestamp.now(),
      };
      const attemptRef = await addDoc(collection(db, 'quizAttempts'), attemptToSave);
      await get().fetchUserAttempts(attempt.userId);
      set({ loading: false });
      return attemptRef.id;
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Failed to save quiz attempt';
      set({ error: errorMsg, loading: false });
      console.error('Error saving quiz attempt:', error);
      return '';
    }
  },

  fetchQuizzes: async (filter: QuizFilter = {}) => {
    set({ loading: true, error: null });
    try {
      let q: any = collection(db, 'quizzes');

      if (filter.category) { q = query(q, where('category', '==', filter.category)); }
      if (filter.difficulty) { q = query(q, where('difficulty', '==', filter.difficulty)); }
      if (filter.team) { q = query(q, where('team', '==', filter.team)); }
      if (filter.event) { q = query(q, where('event', '==', filter.event)); }
      if (filter.country) { q = query(q, where('country', '==', filter.country)); }
      if (filter.title) { q = query(q, where('title', '==', filter.title)); }

      if (filter.visibility) { q = query(q, where('visibility', '==', filter.visibility)); }
      if (filter.createdBy) { q = query(q, where('createdBy', '==', filter.createdBy)); }

      q = query(q, orderBy('createdAt', 'desc'));
      q = query(q, limit(20));

      const querySnapshot = await getDocs(q);
      const fetchedQuizzes = querySnapshot.docs.map((doc) => {
        const rawData = doc.data() as RawQuizDocument;

        const createdAtMillis = rawData.createdAt instanceof Timestamp
          ? rawData.createdAt.toMillis()
          : (typeof rawData.createdAt === 'number' ? rawData.createdAt : Date.now());

        return {
          id: doc.id,
          ...(rawData as Omit<Quiz, 'id' | 'createdAt'>),
          createdAt: createdAtMillis,
        } as Quiz;
      });
      set({ quizzes: fetchedQuizzes, loading: false });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to fetch quizzes';
      set({ error: errorMsg, loading: false });
      console.error('Error fetching quizzes:', error);
    }
  },

  updateQuizVisibility: async (quizId: string, newVisibility: 'global' | 'private') => {
    set({ error: null });

    try {
      const auth = getAuth();
      if (!auth.currentUser) {
        throw new Error('User not authenticated.');
      }

      const { user: authUser } = useAuthStore.getState();
      if (!authUser?.isAdmin) {
        throw new Error('Unauthorized: Only administrators can change quiz visibility.');
      }

      const quizRef = doc(db, 'quizzes', quizId);
      await setDoc(quizRef, { visibility: newVisibility }, { merge: true });

      set((state) => ({
        quizzes: state.quizzes.map((quiz) =>
          quiz.id === quizId ? { ...quiz, visibility: newVisibility } : quiz
        ),
      }));

      console.log(`Quiz ${quizId} visibility updated to ${newVisibility}`);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to update quiz visibility.';
      set({ error: errorMsg });
      console.error('Error updating quiz visibility:', err);
      throw err;
    }
  },
}));