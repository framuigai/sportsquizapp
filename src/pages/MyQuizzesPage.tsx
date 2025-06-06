// src/pages/MyQuizzesPage.tsx
import React, { useEffect } from 'react';
import { useQuizStore } from '../store/quizStore';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { BookOpenText, Loader2, Frown, Info } from 'lucide-react';
import QuizCard from '../components/quiz/QuizCard';
import Alert from '../components/ui/Alert'; // Assuming you have an Alert component

const MyQuizzesPage: React.FC = () => {
  const navigate = useNavigate();
  // Destructure user and isInitialized from useAuthStore to manage authentication state
  const { user, isInitialized } = useAuthStore();
  // Destructure relevant state and actions from useQuizStore
  const { quizzes, loading, error, fetchQuizzes } = useQuizStore();

  useEffect(() => {
    // Explanation 1: Wait for Auth Initialization
    // It's crucial to wait until `isInitialized` is true to ensure Firebase Auth
    // has completed its initial check (whether a user is logged in or not).
    if (!isInitialized) {
      return;
    }

    // Explanation 2: Redirect if Not Authenticated
    // If authentication is initialized and there's no `user`,
    // it means the user is not logged in. Redirect them to the login page.
    if (!user) {
      navigate('/login');
      return; // Stop further execution of this effect
    }

    // Explanation 3: Fetch User-Specific Private Quizzes
    // If the user is logged in (`user` is present), fetch their quizzes.
    // We use the `fetchQuizzes` action from `useQuizStore` and apply filters:
    // - `createdBy: user.id`: Ensures we only get quizzes created by the current user.
    // - `visibility: 'private'`: Ensures we only get their *private* quizzes.
    // This perfectly aligns with the purpose of "My Quizzes" page and Step 7's enhancements.
    fetchQuizzes({ createdBy: user.id, visibility: 'private' });

    // Dependencies for useEffect:
    // - `user`: Re-run if the user object changes (e.g., login/logout).
    // - `isInitialized`: Re-run once authentication state is known.
    // - `fetchQuizzes`: Dependency for the `fetchQuizzes` function (Zustand actions are stable, but good practice).
    // - `Maps`: Dependency for the `Maps` function.
  }, [user, isInitialized, fetchQuizzes, navigate]);

  // --- Render Logic ---

  // Explanation 4: Initial Loading State for Auth
  // Show a full-page loading spinner while Firebase Auth is initializing.
  if (!isInitialized) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        <Loader2 className="h-12 w-12 animate-spin text-sky-500" />
        <p className="ml-3 text-lg text-slate-600">Initializing authentication...</p>
      </div>
    );
  }

  // Note: The `if (!user)` check is handled by the `useEffect` redirect.
  // This means if `isInitialized` is true and `user` is null, the user will be
  // redirected, so the code below this won't execute for unauthenticated users.

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-extrabold text-slate-900 mb-6 text-center">
        <BookOpenText className="inline-block h-10 w-10 text-sky-500 mr-3 align-middle" />
        My Private Quizzes
      </h1>
      <p className="text-center text-slate-600 mb-8 max-w-2xl mx-auto">
        Here are the quizzes you've personally generated. These quizzes are private and only visible to you,
        until an admin makes them global for everyone to see.
      </p>

      {/* Explanation 5: Displaying Loading, Error, or No Quizzes */}
      {/* 5a. Loading state for quiz fetching */}
      {loading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
          <span className="ml-3 text-lg text-slate-600">Loading your quizzes...</span>
        </div>
      )}

      {/* 5b. Error state for quiz fetching */}
      {error && (
        <Alert type="error" message={error} className="mt-4" />
      )}

      {/* 5c. Message if no quizzes are found after loading and no error */}
      {!loading && !error && quizzes.length === 0 && (
        <div className="text-center py-10 text-slate-500">
          <Frown className="h-12 w-12 mx-auto mb-4 text-slate-400" />
          <p className="text-xl font-semibold mb-2">No private quizzes generated yet.</p>
          <p className="text-md">Go to "Generate Quiz" to create your first one!</p>
        </div>
      )}

      {/* 5d. Display quizzes if successfully loaded and available */}
      {!loading && !error && quizzes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {quizzes.map((quiz) => (
            <QuizCard key={quiz.id} quiz={quiz} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MyQuizzesPage;