// store/quizStore.ts

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
  addDoc // Fixed: Added addDoc import
} from 'firebase/firestore';
import { Quiz, QuizAttempt, QuizFilter } from '../types';
import { db } from '../firebase/config';
import { fetch as crossFetch } from 'cross-fetch';

interface QuizState {
  quizzes: Quiz[];
  currentQuiz: Quiz | null;
  quizAttempts: QuizAttempt[];
  loading: boolean;
  error: string | null;

  generateQuiz: (filter: QuizFilter) => Promise<Quiz>;
  saveQuiz: (quiz: Quiz) => Promise<void>;
  fetchQuizById: (id: string) => Promise<void>;
  fetchUserAttempts: (userId: string) => Promise<void>;
  saveQuizAttempt: (attempt: Omit<QuizAttempt, 'id'>) => Promise<string>;
}

export const useQuizStore = create<QuizState>((set, get) => ({
  quizzes: [],
  currentQuiz: null,
  quizAttempts: [],
  loading: false,
  error: null,

  /**
   * 🔁 Generates a quiz from Firebase Function with Gemini
   */
  generateQuiz: async (filter: QuizFilter) => {
    set({ loading: true, error: null });

    try {
      const response = await crossFetch(
        'https://us-central1-sportsquiz-3bb45.cloudfunctions.net/generateQuiz',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...filter,
            createdBy: getAuth().currentUser?.uid || 'guest',
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' })); // Attempt to parse error
        throw new Error(errorData.error || 'Failed to generate quiz'); // Use specific error if available
      }
      const { quiz } = await response.json();

      // ✅ Validate questions - this part is critical for the frontend error
      if (!quiz.questions || quiz.questions.length === 0) {
        // Log the actual quiz object received to help debug
        console.error("Quiz object received from function had no questions:", quiz);
        throw new Error('Generated quiz has no questions (from server response)');
      }

      // ✅ Store locally for UI
      set({ quizzes: [...get().quizzes, quiz], loading: false });

      return quiz;
    } catch (err: any) {
      set({ error: err.message || 'Error generating quiz', loading: false });
      throw err;
    }
  },

  /**
   * 💾 Save quiz manually (if needed — not used after generateQuiz)
   */
  saveQuiz: async (quiz: Quiz) => {
    try {
      await setDoc(doc(db, 'quizzes', quiz.id), quiz);
      const quizzes = [...get().quizzes, quiz];
      set({ quizzes });
    } catch (error) {
      console.error('Error saving quiz:', error);
      set({ error: 'Error saving quiz' });
    }
  },

  /**
   * 📦 Load a specific quiz by ID
   */
  fetchQuizById: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const quizDoc = await getDoc(doc(db, 'quizzes', id));
      if (quizDoc.exists()) {
        const quizData = quizDoc.data() as Quiz;
        set({ currentQuiz: quizData, loading: false });
      } else {
        set({ error: 'Quiz not found', loading: false });
      }
    } catch (error) {
      set({ error: 'Failed to fetch quiz', loading: false });
    }
  },

  /**
   * 🧾 Fetch past attempts for a user
   */
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
        error: error instanceof Error ? error.message : 'Error fetching attempts',
        loading: false,
      });
    }
  },

  /**
   * ✅ Record quiz completion
   */
  saveQuizAttempt: async (attempt) => {
    set({ loading: true, error: null });
    try {
      const attemptRef = await addDoc(collection(db, 'quizAttempts'), attempt); // Fixed: addDoc is now imported
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
}));