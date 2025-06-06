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
  Query, // ⭐ Import Query type for better TypeScript inference
} from 'firebase/firestore';
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

interface GenerateQuizCallableRequest {
  title?: string;
  category: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  numberOfQuestions: number;
  team?: string;
  event?: string;
  country?: string;
  visibility?: 'global' | 'private';
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

  generateQuiz: async (config: QuizConfig) => {
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
        visibility: finalVisibility,
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
      // Get the current user's ID to set as createdBy if it's a new quiz
      const auth = getAuth();
      const currentUser = auth.currentUser;
      const createdBy = currentUser?.uid || 'anonymous'; // Fallback to anonymous if no user

      const quizToSave = { ...quiz };

      if (!quizToSave.id) {
        // New quiz: add createdAt and createdBy
        quizToSave.createdAt = Timestamp.now().toMillis(); // Store as millis
        quizToSave.createdBy = createdBy;
        const docRef = await addDoc(collection(db, 'quizzes'), quizToSave);
        quizToSave.id = docRef.id;
      } else {
        // Existing quiz: only update if necessary, but createdBy/createdAt usually immutable
        await setDoc(doc(db, 'quizzes', quizToSave.id), quizToSave, { merge: true }); // Use merge to avoid overwriting
      }
      // Re-fetch quizzes after saving to update the list, apply current filters
      await get().fetchQuizzes({}); // Re-fetch all or apply specific filters if current context allows
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
      // Start with a reference to the quizzes collection
      let quizzesQuery: Query<DocumentData> = collection(db, 'quizzes');

      // Apply filters based on the `filter` object
      if (filter.category) {
        quizzesQuery = query(quizzesQuery, where('category', '==', filter.category));
      }
      if (filter.difficulty) {
        quizzesQuery = query(quizzesQuery, where('difficulty', '==', filter.difficulty));
      }
      if (filter.team) {
        quizzesQuery = query(quizzesQuery, where('team', '==', filter.team));
      }
      if (filter.event) {
        quizzesQuery = query(quizzesQuery, where('event', '==', filter.event));
      }
      if (filter.country) {
        quizzesQuery = query(quizzesQuery, where('country', '==', filter.country));
      }
      if (filter.title) {
        // For partial title matches, you might need more advanced techniques
        // like Algolia or a specific cloud function.
        // For exact match, this is fine:
        quizzesQuery = query(quizzesQuery, where('title', '==', filter.title));
      }

      // ⭐ Core changes for Step 7: Apply visibility and createdBy filters ⭐
      if (filter.visibility) {
        quizzesQuery = query(quizzesQuery, where('visibility', '==', filter.visibility));
      }
      if (filter.createdBy) {
        quizzesQuery = query(quizzesQuery, where('createdBy', '==', filter.createdBy));
      }

      // Always order by createdAt and limit the results
      quizzesQuery = query(quizzesQuery, orderBy('createdAt', 'desc'));
      quizzesQuery = query(quizzesQuery, limit(20)); // Limit to a reasonable number of quizzes

      const querySnapshot = await getDocs(quizzesQuery);
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