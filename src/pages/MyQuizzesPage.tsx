// src/pages/MyQuizzesPage.tsx
import React, { useEffect } from 'react';
import { useQuizStore } from '../store/quizStore';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { BookOpenText, Loader2, Frown, Info } from 'lucide-react'; // Added Info icon for clarity
import QuizCard from '../components/quiz/QuizCard';
import Alert from '../components/ui/Alert';

const MyQuizzesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isInitialized } = useAuthStore();
  const { quizzes, loading, error, fetchQuizzes } = useQuizStore();

  useEffect(() => {
    // Only proceed if authentication state has been initialized
    if (!isInitialized) {
      return;
    }

    // If user is not logged in after initialization, redirect to login page
    if (!user) {
      navigate('/login');
      // No need to fetch or clear quizzes here, as the user is being redirected
      return;
    }

    // If user is logged in, fetch their private quizzes
    // This query now correctly aligns with the new rule: all generated quizzes start as 'private'
    // and only the creator (user.id) can see their own private quizzes here.
    fetchQuizzes({ createdBy: user.id, visibility: 'private' });

    // Optional: Cleanup function if you had subscriptions, though not strictly needed here
    // return () => {
    //   // If needed, you could reset quiz store state here to prevent stale data
    //   // useQuizStore.setState({ quizzes: [], currentQuiz: null, error: null });
    // };
  }, [user, isInitialized, fetchQuizzes, navigate]); // Dependencies are correct

  // --- Render Logic ---

  // 1. Show global loading indicator while authentication is being initialized
  if (!isInitialized) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]"> {/* Adjust height as per your layout */}
        <Loader2 className="h-12 w-12 animate-spin text-sky-500" />
        <p className="ml-3 text-lg text-slate-600">Initializing authentication...</p>
      </div>
    );
  }

  // 2. User will be redirected by useEffect if not logged in, so this block won't be reached
  // if (!user) { /* This conditional branch will effectively be skipped due to the navigate('/login') above */ }

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

      {/* 3. Display loading state for quiz fetching */}
      {loading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
          <span className="ml-3 text-lg text-slate-600">Loading your quizzes...</span>
        </div>
      )}

      {/* 4. Display error state for quiz fetching */}
      {error && (
        <Alert type="error" message={error} className="mt-4" />
      )}

      {/* 5. Display message if no quizzes are found after loading and no error */}
      {!loading && !error && quizzes.length === 0 && (
        <div className="text-center py-10 text-slate-500">
          <Frown className="h-12 w-12 mx-auto mb-4 text-slate-400" />
          <p className="text-xl font-semibold mb-2">No private quizzes generated yet.</p>
          <p className="text-md">Go to "Generate Quiz" to create your first one!</p>
        </div>
      )}

      {/* 6. Display quizzes if successfully loaded */}
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