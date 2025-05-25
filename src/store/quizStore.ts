import { create } from 'zustand';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Quiz, QuizAttempt, QuizFilter } from '../types';

// Helper: recursively remove undefined values from objects and arrays
const deepClean = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(deepClean);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, deepClean(v)])
    );
  }
  return obj;
};

interface QuizState {
  quizzes: Quiz[];
  currentQuiz: Quiz | null;
  quizAttempts: QuizAttempt[];
  loading: boolean;
  error: string | null;

  fetchQuizzes: (filter?: QuizFilter) => Promise<void>;
  fetchQuizById: (id: string) => Promise<void>;

  saveQuizAttempt: (attempt: Omit<QuizAttempt, 'id'>) => Promise<string>;
  fetchUserAttempts: (userId: string) => Promise<void>;

  createQuiz: (quiz: Omit<Quiz, 'id' | 'createdAt'>) => Promise<string>;
}

export const useQuizStore = create<QuizState>((set, get) => ({
  quizzes: [],
  currentQuiz: null,
  quizAttempts: [],
  loading: false,
  error: null,

  fetchQuizzes: async (filter) => {
    set({ loading: true, error: null });
    try {
      // Create base query with order by
      let quizQuery = query(
        collection(db, 'quizzes'),
        orderBy('createdAt', 'desc')
      );

      // Add filter conditions if they exist
      if (filter?.category) quizQuery = query(quizQuery, where('category', '==', filter.category));
      if (filter?.team) quizQuery = query(quizQuery, where('team', '==', filter.team));
      if (filter?.country) quizQuery = query(quizQuery, where('country', '==', filter.country));
      if (filter?.event) quizQuery = query(quizQuery, where('event', '==', filter.event));
      if (filter?.difficulty) quizQuery = query(quizQuery, where('difficulty', '==', filter.difficulty));

      const querySnapshot = await getDocs(quizQuery);
      const quizzes = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Quiz[];

      set({ quizzes, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        loading: false,
      });
    }
  },

  fetchQuizById: async (id) => {
    set({ loading: true, error: null });
    try {
      const quizDoc = await getDoc(doc(db, 'quizzes', id));

      if (quizDoc.exists()) {
        const quiz = { id: quizDoc.id, ...quizDoc.data() } as Quiz;
        set({ currentQuiz: quiz, loading: false });
      } else {
        set({
          error: 'Quiz not found',
          loading: false,
          currentQuiz: null,
        });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        loading: false,
      });
    }
  },

  saveQuizAttempt: async (attempt) => {
    set({ loading: true, error: null });
    try {
      const attemptRef = await addDoc(collection(db, 'quizAttempts'), attempt);
      
      // Wait for the attempt to be saved before fetching user attempts
      const userId = attempt.userId;
      await get().fetchUserAttempts(userId);

      set({ loading: false });
      return attemptRef.id;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save quiz attempt';
      set({
        error: errorMessage,
        loading: false,
      });
      console.error('Error saving quiz attempt:', error);
      return '';
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
      const attempts = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as QuizAttempt[];

      set({ quizAttempts: attempts, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        loading: false,
      });
    }
  },

  createQuiz: async (quizData) => {
    set({ loading: true, error: null });
    try {
      // Remove undefined values deeply from quizData
      const cleanedQuizData = deepClean(quizData);

      const quiz = {
        ...cleanedQuizData,
        createdAt: new Date().getTime(),
      };

      const quizRef = await addDoc(collection(db, 'quizzes'), quiz);

      await get().fetchQuizzes();

      set({ loading: false });
      return quizRef.id;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        loading: false,
      });
      return '';
    }
  },
}));
