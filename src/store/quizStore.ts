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
  // Added getDocs and query for fetching multiple quizzes
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
  fetchQuizzes: (filter?: QuizFilter) => Promise<void>; // Added: fetchQuizzes signature
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
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to generate quiz');
      }
      const { quiz } = await response.json();

      // ✅ Validate questions
      if (!quiz.questions || quiz.questions.length === 0) {
        console.error("Quiz object received from function had no questions:", quiz);
        throw new Error('Generated quiz has no questions (from server response)');
      }

      // Instead of storing locally, we now rely on fetchQuizzes to get the latest
      // set({ quizzes: [...get().quizzes, quiz], loading: false }); // Removed this line
      await get().fetchQuizzes(); // Fetch all quizzes again to include the new one
      set({ loading: false }); // Set loading to false after refetching

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
      // Instead of storing locally, we now rely on fetchQuizzes to get the latest
      // const quizzes = [...get().quizzes, quiz]; // Removed this line
      // set({ quizzes }); // Removed this line
      await get().fetchQuizzes(); // Fetch all quizzes again to include the new one
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
      const attemptRef = await addDoc(collection(db, 'quizAttempts'), attempt);
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

  /**
   * 📚 Fetches a list of quizzes with optional filtering
   */
  fetchQuizzes: async (filter: QuizFilter = {}) => {
    set({ loading: true, error: null });
    try {
      let q = query(collection(db, 'quizzes'));

      if (filter.category) {
        q = query(q, where('category', '==', filter.category));
      }
      if (filter.difficulty) {
        q = query(q, where('difficulty', '==', filter.difficulty));
      }
      if (filter.team) {
        q = query(q, where('team', '==', filter.team));
      }
      if (filter.event) {
        q = query(q, where('event', '==', filter.event));
      }
      if (filter.country) {
        q = query(q, where('country', '==', filter.country));
      }

      // Add ordering and limit if desired, e.g., orderBy('createdAt', 'desc')
      q = query(q, orderBy('createdAt', 'desc')); // Order by creation date descending
      q = query(q, limit(20)); // Limit to 20 quizzes for browse page

      const querySnapshot = await getDocs(q);
      const fetchedQuizzes = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Quiz[];
      set({ quizzes: fetchedQuizzes, loading: false });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to fetch quizzes';
      set({ error: errorMsg, loading: false });
      console.error('Error fetching quizzes:', error);
    }
  },
}));