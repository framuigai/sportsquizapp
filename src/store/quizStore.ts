import { create } from 'zustand';
import { getAuth } from 'firebase/auth';
import { collection, addDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { Quiz, QuizAttempt, QuizFilter } from '../types';
import { db } from '../firebase/config';
import crossFetch from 'cross-fetch';

// Helper to clean undefined values deeply
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
  generateQuiz: (filter: QuizFilter) => Promise<Quiz>;
  saveQuiz: (quiz: Quiz) => Promise<void>;
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
      const response = await crossFetch('https://us-central1-sportsquiz-3bb45.cloudfunctions.net/generateQuiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuth().currentUser?.getIdToken()}`
        },
        body: JSON.stringify(filter)
      });

      if (!response.ok) throw new Error('Failed to generate quiz');
      const { quiz } = await response.json();
      set({ quizzes: [quiz], loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to generate quiz',
        loading: false,
      });
    }
  },

  generateQuiz: async (filter: QuizFilter) => {
    const response = await crossFetch('https://us-central1-sportsquiz-3bb45.cloudfunctions.net/generateQuiz', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuth().currentUser?.getIdToken()}`
      },
      body: JSON.stringify(filter)
    });

    if (!response.ok) throw new Error('Failed to generate quiz');
    const { quiz } = await response.json();
    return quiz;
  },

  saveQuiz: async (quiz: Quiz) => {
    const quizzes = [...get().quizzes, quiz];
    set({ quizzes });
  },

  fetchQuizById: async (id) => {
    set({ loading: true, error: null });
    const quiz = get().quizzes.find(q => q.id === id);
    if (quiz) {
      set({ currentQuiz: quiz, loading: false });
    } else {
      set({ error: 'Quiz not found', loading: false });
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
      const attempts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as QuizAttempt[];
      set({ quizAttempts: attempts, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Error fetching attempts', loading: false });
    }
  },

  saveQuizAttempt: async (attempt) => {
    set({ loading: true, error: null });
    try {
      const attemptRef = await addDoc(collection(db, 'quizAttempts'), attempt);
      await get().fetchUserAttempts(attempt.userId);
      set({ loading: false });
      return attemptRef.id;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to save quiz attempt';
      set({ error: errorMsg, loading: false });
      console.error('Error saving quiz attempt:', error);
      return '';
    }
  },
}));
