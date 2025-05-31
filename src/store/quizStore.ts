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
} from 'firebase/firestore';
import { Quiz, QuizAttempt, QuizFilter } from '../types';
import { db } from '../firebase/config';
import { fetch as crossFetch } from 'cross-fetch';
import { useAuthStore } from './authStore'; // ⭐ IMPORT YOUR AUTH STORE HERE ⭐

interface QuizState {
  quizzes: Quiz[];
  currentQuiz: Quiz | null;
  quizAttempts: QuizAttempt[];
  loading: boolean;
  error: string | null;

  generateQuiz: (filter: QuizFilter) => Promise<Quiz | null>;
  saveQuiz: (quiz: Quiz) => Promise<void>;
  fetchQuizById: (id: string) => Promise<void>;
  fetchUserAttempts: (userId: string) => Promise<void>;
  saveQuizAttempt: (attempt: Omit<QuizAttempt, 'id'>) => Promise<string>;
  fetchQuizzes: (filter?: QuizFilter) => Promise<void>;
}

export const useQuizStore = create<QuizState>((set, get) => ({
  quizzes: [],
  currentQuiz: null,
  quizAttempts: [],
  loading: false,
  error: null,

  /**
   * 🔁 Generates a quiz from Firebase Function with Gemini
   * ⭐ MODIFIED to set quiz visibility based on user's isAdmin status ⭐
   */
  generateQuiz: async (filter: QuizFilter) => {
    set({ loading: true, error: null });

    try {
      const currentUser = getAuth().currentUser;

      if (!currentUser) {
        throw new Error('User not authenticated for quiz generation.');
      }

      // ⭐ Get isAdmin status from authStore state ⭐
      // We directly access the state using .getState() as we're outside a React component.
      const { user: authUser } = useAuthStore.getState();
      const isAdmin = authUser?.isAdmin || false; // Default to false if user is not loaded or not admin

      // Determine visibility before sending to cloud function
      const quizVisibility: 'global' | 'private' = isAdmin ? 'global' : 'private';

      // Send the filter, current user ID, and determined visibility to the Cloud Function
      const response = await crossFetch(
        'https://us-central1-sportsquiz-3bb45.cloudfunctions.net/generateQuiz',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...filter,
            createdBy: currentUser.uid, // Always send the actual creator UID
            visibility: quizVisibility, // ⭐ Pass visibility to the Cloud Function ⭐
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

      // The Cloud Function should ideally return the full Quiz object with all properties,
      // including `visibility` and `createdBy` as it saved them.
      // If the cloud function doesn't add it, you might need to manually add it here
      // for the local state update, but ensure your cloud function saves it correctly.
      const generatedQuizWithVisibility: Quiz = {
        ...quiz,
        visibility: quiz.visibility || quizVisibility, // Ensure visibility is set on the returned quiz
        createdBy: quiz.createdBy || currentUser.uid, // Ensure createdBy is set
        // createdAt would ideally be Timestamp from Firestore, but your type uses number.
        // If your cloud function sets serverTimestamp, it will be a Timestamp object.
        // You might need to convert it here or adjust your Quiz type's createdAt to Timestamp.
        createdAt: quiz.createdAt || Date.now(), // Fallback if cloud function doesn't return it
      };


      // Instead of storing locally, we now rely on fetchQuizzes to get the latest
      // A full refetch might be inefficient for a single new quiz.
      // Consider adding the new quiz to the state directly, and then refetching if necessary.
      // For now, let's keep the refetch as per the plan, but note this optimization.
      // await get().fetchQuizzes(); // Removed this line, it might refetch unnecessary data
      set((state) => ({
        quizzes: [generatedQuizWithVisibility, ...state.quizzes], // Add the new quiz directly to the beginning
        loading: false,
      }));

      return generatedQuizWithVisibility; // Return the created quiz
    } catch (err: any) {
      set({ error: err.message || 'Error generating quiz', loading: false });
      return null; // Return null on error
    }
  },

  /**
   * 💾 Save quiz manually (if needed — not used after generateQuiz)
   */
  saveQuiz: async (quiz: Quiz) => {
    try {
      await setDoc(doc(db, 'quizzes', quiz.id), quiz);
      // Refresh the list of quizzes
      await get().fetchQuizzes();
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
      const attempts = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          quizId: data.quizId,
          userId: data.userId,
          score: data.score,
          totalQuestions: data.totalQuestions,
          answers: data.answers,
          timeSpent: data.timeSpent,
          // ⭐ CRITICAL CHANGE: Ensure completedAt is treated as a Timestamp ⭐
          // This conversion handles cases where data.completedAt might be a plain object from Firestore
          // which needs to be converted back to a Timestamp if it's not already one.
          completedAt: data.completedAt instanceof Timestamp
            ? data.completedAt
            : (new Timestamp(data.completedAt.seconds, data.completedAt.nanoseconds)),
        };
      }) as QuizAttempt[];
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
      // Ensure completedAt is a Firebase Timestamp when saving
      const attemptToSave = {
        ...attempt,
        completedAt: Timestamp.now(), // Use Firebase's server Timestamp for consistency
      };
      const attemptRef = await addDoc(collection(db, 'quizAttempts'), attemptToSave);
      await get().fetchUserAttempts(attempt.userId); // Re-fetch user attempts
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
   * ⭐ MODIFIED to accept new visibility and createdBy filters ⭐
   */
  fetchQuizzes: async (filter: QuizFilter = {}) => { // ⭐ Added default empty object for filter ⭐
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
      // Assuming you want to search by title, an exact match is usually simple.
      // For more complex text search, you'd need a dedicated search service (e.g., Algolia, ElasticSearch)
      if (filter.title) {
        q = query(q, where('title', '==', filter.title));
      }

      // ⭐ NEW: Filter by visibility ⭐
      if (filter.visibility) {
        q = query(q, where('visibility', '==', filter.visibility));
      }

      // ⭐ NEW: Filter by createdBy ⭐
      if (filter.createdBy) {
        q = query(q, where('createdBy', '==', filter.createdBy));
      }

      // Add ordering and limit if desired, e.g., orderBy('createdAt', 'desc')
      q = query(q, orderBy('createdAt', 'desc')); // Order by creation date descending
      q = query(q, limit(20)); // Limit to 20 quizzes for browse page (adjust as needed)

      const querySnapshot = await getDocs(q);
      const fetchedQuizzes = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        // Ensure that createdAt (number) and visibility are correctly typed from Firestore data
        // Firestore data will return 'createdAt' as a Timestamp. Convert it to a number if your Quiz type expects number.
        // Or better, update Quiz type to use Timestamp. For now, assuming you still want number for createdAt.
        createdAt: doc.data().createdAt?.toMillis ? doc.data().createdAt.toMillis() : Date.now(),
        ...doc.data(), // Spread remaining fields (like title, category, visibility, createdBy etc.)
      })) as Quiz[];
      set({ quizzes: fetchedQuizzes, loading: false });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to fetch quizzes';
      set({ error: errorMsg, loading: false });
      console.error('Error fetching quizzes:', error);
    }
  },
}));