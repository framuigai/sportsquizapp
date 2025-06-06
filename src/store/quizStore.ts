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
  Timestamp,
  DocumentData,
} from 'firebase/firestore';
// ✅ Import QuizConfig (now includes visibility)
import { Quiz, QuizAttempt, QuizFilter, QuizConfig } from '../types';
import { db, functions } from '../firebase/config';
import { httpsCallable } from 'firebase/functions';
import { useAuthStore } from './authStore';

interface RawQuizDocument extends DocumentData {
  createdAt?: Timestamp | number;
}

interface RawQuizAttemptDocument extends DocumentData {
  completedAt?: Timestamp;
}

// ✅ Corrected: GenerateQuizCallableRequest matches backend, now including quizType AND visibility
interface GenerateQuizCallableRequest {
  title?: string;
  category: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  numberOfQuestions: number;
  team?: string;
  event?: string;
  country?: string;
  visibility?: 'global' | 'private'; // ⭐ NOW MATCHES THE BACKEND'S EXPECTATION ⭐
  quizType: 'multiple_choice' | 'true_false';
}

interface GenerateQuizCallableResponse {
  quiz: Quiz;
}

interface QuizState {
  quizzes: Quiz[];
  currentQuiz: Quiz | null;
  quizAttempts: QuizAttempt[];
  loading: boolean;
  error: string | null;

  // ✅ Corrected signature: Now takes QuizConfig (which includes visibility & quizType)
  generateQuiz: (config: QuizConfig) => Promise<Quiz>;
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

  generateQuiz: async (config: QuizConfig) => { // ✅ Corrected parameter type
    set({ loading: true, error: null, currentQuiz: null });

    const authState = useAuthStore.getState();
    const userId = authState.user?.id;
    const isAdmin = authState.user?.isAdmin || false;

    if (!userId) {
      const errorMessage = 'User not authenticated for quiz generation.';
      set({ loading: false, error: errorMessage });
      throw new Error(errorMessage);
    }

    try {
      // ⭐ FIX APPLIED HERE: config.visibility is now a valid property thanks to src/types/index.ts update ⭐
      const finalVisibility: 'global' | 'private' =
        isAdmin && config.visibility === 'global' ? 'global' : 'private';

      const payload: GenerateQuizCallableRequest = {
        title: config.title,
        category: config.category,
        difficulty: config.difficulty,
        numberOfQuestions: config.numberOfQuestions,
        team: config.team,
        event: config.event,
        country: config.country,
        visibility: finalVisibility, // ✅ No error now, as visibility is part of payload
        quizType: config.quizType,
      };

      const callGenerateQuiz = httpsCallable<GenerateQuizCallableRequest, GenerateQuizCallableResponse>(
        functions,
        'generateQuiz'
      );

      const result = await callGenerateQuiz(payload);
      const generatedQuiz = result.data.quiz;

      if (!generatedQuiz || !generatedQuiz.questions || generatedQuiz.questions.length === 0) {
        throw new Error('Generated quiz has no questions or is incomplete (from server response).');
      }

      set({ loading: false, currentQuiz: generatedQuiz });
      return generatedQuiz;
    } catch (err: any) {
      const errorMessage = err.message || 'Error generating quiz';
      set({ error: errorMessage, loading: false, currentQuiz: null });
      console.error('Error generating quiz:', err);
      throw err;
    }
  },

  saveQuiz: async (quiz: Quiz) => {
    try {
      if (!quiz.id) {
        const docRef = await addDoc(collection(db, 'quizzes'), quiz);
        quiz.id = docRef.id;
      } else {
        await setDoc(doc(db, 'quizzes', quiz.id), quiz);
      }
      await get().fetchQuizzes({});
    } catch (error) {
      console.error('Error saving quiz:', error);
      set({ error: 'Error saving quiz' });
      throw error;
    }
  },

  fetchQuizById: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const quizDoc = await getDoc(doc(db, 'quizzes', id));
      if (quizDoc.exists()) {
        const rawData = quizDoc.data() as RawQuizDocument;
        const createdAtMillis = rawData.createdAt instanceof Timestamp
          ? rawData.createdAt.toMillis()
          : (typeof rawData.createdAt === 'number' ? rawData.createdAt : Date.now());

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
        const completedAtTimestamp = rawData.completedAt instanceof Timestamp
          ? rawData.completedAt
          : Timestamp.now();

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