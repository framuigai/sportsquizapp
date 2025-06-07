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
  Query,
} from 'firebase/firestore';
import { Quiz, QuizAttempt, QuizFilter, QuizConfig } from '../types';
import { db, functions } from '../firebase/config';
import { httpsCallable } from 'firebase/functions';
import { useAuthStore } from './authStore';

// We need a specific type for data coming out of Firestore that might have Timestamps.
// It extends Quiz, but redefines 'createdAt' to be a Timestamp.
interface FirestoreQuizDocument extends Omit<Quiz, 'createdAt'>, DocumentData {
  createdAt?: Timestamp; // When reading from Firestore, it could be a Timestamp
}

interface RawQuizAttemptDocument extends DocumentData {
  completedAt?: Timestamp;
}

interface GenerateQuizCallableRequest {
  title?: string | null;
  category: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  numberOfQuestions: number;
  team?: string | null;
  event?: string | null;
  country?: string | null;
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
  saveQuiz: (quiz: Quiz, configUsedToGenerate?: QuizConfig) => Promise<void>;
  fetchQuizById: (id: string) => Promise<void>;
  fetchUserAttempts: (userId: string) => Promise<void>;
  saveQuizAttempt: (attempt: Omit<QuizAttempt, 'id'>, originalQuizConfig?: QuizConfig) => Promise<string>;
  fetchQuizzes: (filter?: QuizFilter) => Promise<void>;
  updateQuizVisibility: (quizId: string, newVisibility: 'global' | 'private') => Promise<void>;
  updateQuizStatus: (quizId: string, newStatus: 'active' | 'deleted') => Promise<void>;
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

      const quizWithConfig: Quiz = { ...generatedQuiz, createdFromQuizConfig: config };

      set({ loading: false, currentQuiz: quizWithConfig });
      return quizWithConfig;
    } catch (err: any) {
      const errorMessage = err.message || 'Error generating quiz';
      set({ error: errorMessage, loading: false, currentQuiz: null });
      console.error('Error generating quiz:', err);
      throw err;
    }
  },

  saveQuiz: async (quiz: Quiz, configUsedToGenerate?: QuizConfig) => {
    set({ loading: true, error: null });
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      const createdBy = currentUser?.uid || 'anonymous';

      // Start with the quiz data, then adjust for Firestore storage
      // Ensure createdAt is a Timestamp for Firestore saving
      let quizDataForFirestore: FirestoreQuizDocument = {
        ...(quiz as Omit<Quiz, 'createdAt'>), // Spread all Quiz properties except for createdAt
        // Convert the incoming quiz.createdAt (which is a number) to a Timestamp for Firestore.
        // If it's not a number (e.g., undefined for a brand new quiz), it will be handled below.
        createdAt: typeof quiz.createdAt === 'number'
          ? Timestamp.fromMillis(quiz.createdAt)
          : undefined, // Explicitly set to undefined if not a number
      } as FirestoreQuizDocument;

      if (!quizDataForFirestore.id) {
        // This block handles new quizzes being saved for the first time
        // Always set createdAt to Timestamp.now() for new quizzes
        quizDataForFirestore.createdAt = Timestamp.now();
        quizDataForFirestore.createdBy = createdBy;
        quizDataForFirestore.status = 'active'; // Ensure new quizzes are saved as 'active'

        if (configUsedToGenerate) {
          quizDataForFirestore.createdFromQuizConfig = configUsedToGenerate;
        } else if (quiz.createdFromQuizConfig) {
          quizDataForFirestore.createdFromQuizConfig = quiz.createdFromQuizConfig;
        }

        const docRef = await addDoc(collection(db, 'quizzes'), quizDataForFirestore);
        quizDataForFirestore.id = docRef.id;

        // Optimistic update for new quizzes: Convert Timestamp to millis for client state
        // Safely get milliseconds from createdAt, providing a fallback
        const createdAtForState = quizDataForFirestore.createdAt instanceof Timestamp
          ? quizDataForFirestore.createdAt.toMillis()
          : Date.now(); // Fallback if for some reason it's not a Timestamp (shouldn't happen here)

        const quizForState: Quiz = {
          ...(quizDataForFirestore as Omit<FirestoreQuizDocument, 'createdAt'>),
          id: quizDataForFirestore.id!,
          createdAt: createdAtForState,
        } as Quiz;

        set((state) => ({
          quizzes: [
            quizForState,
            ...state.quizzes.filter(q => q.id !== quizForState.id)
          ].sort((a, b) => b.createdAt - a.createdAt),
          loading: false,
        }));
      } else {
        // This block handles updates to existing quizzes
        // Ensure createdAt is a Timestamp if it came in as a number or was missing
        if (typeof quizDataForFirestore.createdAt === 'number') {
          quizDataForFirestore.createdAt = Timestamp.fromMillis(quizDataForFirestore.createdAt);
        } else if (!(quizDataForFirestore.createdAt instanceof Timestamp)) {
          // If it's not a Timestamp and not a number (e.g., undefined), set it to now
          quizDataForFirestore.createdAt = Timestamp.now();
        }

        await setDoc(doc(db, 'quizzes', quizDataForFirestore.id), quizDataForFirestore, { merge: true });

        // Optimistic update for existing quizzes: Convert Timestamp to millis for client state
        // Safely get milliseconds from createdAt, providing a fallback
        const createdAtForState = quizDataForFirestore.createdAt instanceof Timestamp
          ? quizDataForFirestore.createdAt.toMillis()
          : Date.now(); // Fallback

        const quizForState: Quiz = {
          ...(quizDataForFirestore as Omit<FirestoreQuizDocument, 'createdAt'>),
          id: quizDataForFirestore.id,
          createdAt: createdAtForState,
        } as Quiz;

        set((state) => ({
          quizzes: state.quizzes.map((q) =>
            q.id === quizForState.id
              ? quizForState
              : q
          ),
          currentQuiz: state.currentQuiz?.id === quizForState.id
            ? quizForState
            : state.currentQuiz,
          loading: false,
        }));
      }
    } catch (error: any) {
      console.error('Error saving quiz:', error);
      const errorMessage = error.message || 'Error saving quiz';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  fetchQuizById: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const quizDoc = await getDoc(doc(db, 'quizzes', id));
      if (quizDoc.exists()) {
        const rawData = quizDoc.data() as FirestoreQuizDocument; // Use FirestoreQuizDocument

        // Ensure createdAt is always a number (milliseconds) for the client-side Quiz type
        const createdAtMillis = rawData.createdAt instanceof Timestamp
          ? rawData.createdAt.toMillis()
          : Date.now(); // Fallback if data is malformed or missing

        // Corrected construction of fetchedQuizData
        const fetchedQuizData: Quiz = {
          ...rawData, // Spread all properties from rawData first
          id: quizDoc.id, // Override id with the actual document ID
          createdAt: createdAtMillis, // Override createdAt with the converted number
          status: (rawData.status as Quiz['status']) || 'active', // Ensure status type is correct, default to 'active'
        };

        const authState = useAuthStore.getState();
        const isAdmin = authState.user?.isAdmin || false;
        if (fetchedQuizData.status === 'deleted' && !isAdmin) {
          set({ error: 'Quiz not found or is deleted', loading: false, currentQuiz: null });
          return;
        }

        set({
          currentQuiz: fetchedQuizData,
          loading: false,
        });
      } else {
        set({ error: 'Quiz not found', loading: false });
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to fetch quiz';
      set({ error: errorMessage, loading: false });
      console.error('Error fetching quiz:', error);
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
          : Timestamp.now(); // Fallback if somehow not a Timestamp

        return {
          id: doc.id,
          ...(rawData as Omit<QuizAttempt, 'id' | 'completedAt'>),
          completedAt: completedAtTimestamp,
        } as QuizAttempt;
      });
      set({ quizAttempts: attempts, loading: false });
    } catch (error: any) {
      set({
        error: error instanceof Error ? error.message : 'Error fetching attempts',
        loading: false,
      });
      console.error('Error fetching attempts:', error);
    }
  },

  saveQuizAttempt: async (attempt, originalQuizConfig) => {
    set({ loading: true, error: null });
    try {
      const attemptToSave = {
        ...attempt,
        completedAt: Timestamp.now(), // Store as Timestamp directly
        originalQuizConfig: originalQuizConfig || attempt.originalQuizConfig,
      };
      const attemptRef = await addDoc(collection(db, 'quizAttempts'), attemptToSave);
      await get().fetchUserAttempts(attempt.userId); // Refetch user attempts to update list
      set({ loading: false });
      return attemptRef.id;
    } catch (error: any) {
      const errorMsg =
        error instanceof Error ? error.message : 'Failed to save quiz attempt';
      set({ error: errorMsg, loading: false });
      console.error('Error saving quiz attempt:', error);
      throw error;
    }
  },

  fetchQuizzes: async (filter: QuizFilter = {}) => {
    set({ loading: true, error: null });
    try {
      let quizzesQuery: Query<DocumentData> = collection(db, 'quizzes');

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
        quizzesQuery = query(quizzesQuery, where('title', '==', filter.title));
      }

      if (filter.status && filter.status !== 'all') {
        quizzesQuery = query(quizzesQuery, where('status', '==', filter.status));
      } else if (!filter.status) {
        quizzesQuery = query(quizzesQuery, where('status', '==', 'active'));
      }

      if (filter.visibility) {
        quizzesQuery = query(quizzesQuery, where('visibility', '==', filter.visibility));
      }
      if (filter.createdBy) {
        quizzesQuery = query(quizzesQuery, where('createdBy', '==', filter.createdBy));
      }

      quizzesQuery = query(quizzesQuery, orderBy('createdAt', 'desc'));
      quizzesQuery = query(quizzesQuery, limit(20));

      const querySnapshot = await getDocs(quizzesQuery);
      const fetchedQuizzes = querySnapshot.docs.map((doc) => {
        const rawData = doc.data() as FirestoreQuizDocument; // Use FirestoreQuizDocument

        const createdAtMillis = rawData.createdAt instanceof Timestamp
          ? rawData.createdAt.toMillis()
          : Date.now(); // Fallback if data is malformed or missing

        // Corrected construction of the returned Quiz object
        return {
          ...rawData, // Spread all properties from rawData first
          id: doc.id, // Override id with the actual document ID
          createdAt: createdAtMillis, // Override createdAt with the converted number
          status: (rawData.status as Quiz['status']) || 'active', // Ensure status type is correct, default to 'active'
        };
      });
      set({ quizzes: fetchedQuizzes, loading: false });
    } catch (error: any) {
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

  updateQuizStatus: async (quizId: string, newStatus: 'active' | 'deleted') => {
    set({ error: null });

    try {
      const auth = getAuth();
      if (!auth.currentUser) {
        throw new Error('User not authenticated.');
      }

      const { user: authUser } = useAuthStore.getState();
      if (!authUser?.isAdmin) {
        throw new Error('Unauthorized: Only administrators can change quiz status.');
      }

      const quizRef = doc(db, 'quizzes', quizId);
      await setDoc(quizRef, { status: newStatus }, { merge: true });

      set((state) => ({
        quizzes: state.quizzes.map((quiz) =>
          quiz.id === quizId ? { ...quiz, status: newStatus } : quiz
        ),
        currentQuiz: state.currentQuiz?.id === quizId
          ? { ...state.currentQuiz, status: newStatus }
          : state.currentQuiz,
      }));

      console.log(`Quiz ${quizId} status updated to ${newStatus}`);
    } catch (err: any) {
      const errorMsg = err.message || `Failed to update quiz status to ${newStatus}.`;
      set({ error: errorMsg });
      console.error('Error updating quiz status:', err);
      throw err;
    }
  },
}));