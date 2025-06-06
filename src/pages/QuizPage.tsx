// src/pages/QuizPage.tsx
import React, { useEffect } from 'react'; // Removed useState
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import { useQuizStore } from '../store/quizStore';
import { useAuthStore } from '../store/authStore';
// ⭐ NEW IMPORT: Import the new QuizPlayer component ⭐
import QuizPlayer from '../components/quiz/QuizPlayer'; 

// Removed all types, state, and logic related to quiz playing from here.
// They are now in QuizPlayer.tsx

const QuizPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentQuiz, loading, error, fetchQuizById } = useQuizStore();
  const { user, isInitialized } = useAuthStore();

  useEffect(() => {
    // Only fetch the quiz by ID
    if (id) {
      fetchQuizById(id);
    }
  }, [id, fetchQuizById]);

  useEffect(() => {
    // Keep authentication check
    if (isInitialized && !user) {
      navigate('/login');
    }
  }, [isInitialized, user, navigate]);

  // Handle loading state for fetching the quiz
  if (loading) {
    return <div className="text-center py-8">Loading quiz...</div>;
  }

  // Handle error state for fetching the quiz
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-red-500">
        <AlertCircle size={48} className="mb-4" />
        <h2 className="text-xl font-semibold">Error Loading Quiz</h2>
        <p className="text-lg">{error}</p>
        <Button onClick={() => navigate('/quizzes')} className="mt-4">
          Back to Quizzes
        </Button>
      </div>
    );
  }

  // Handle case where quiz is not found after loading
  if (!currentQuiz) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-slate-600">
        <AlertCircle size={48} className="mb-4" />
        <h2 className="text-xl font-semibold">Quiz Not Found</h2>
        <p className="text-lg">The quiz you are looking for does not exist.</p>
        <Button onClick={() => navigate('/quizzes')} className="mt-4">
          Back to Quizzes
        </Button>
      </div>
    );
  }

  // ⭐ The main change: Render QuizPlayer and pass the fetched quizData ⭐
  return (
    <div className="container mx-auto p-4">
      {/* Quiz title can be displayed here, or moved inside QuizPlayer if desired */}
      {/* <h1 className="text-3xl font-bold text-center mb-6">{currentQuiz.title}</h1> */}
      <QuizPlayer quizData={currentQuiz} />
    </div>
  );
};

/**
 * Page that displays a quiz by fetching it and delegates playing logic to QuizPlayer.
 *
 * This page is now solely responsible for:
 * - Extracting the quiz ID from URL params.
 * - Fetching the quiz data using useQuizStore.
 * - Handling loading and error states during data fetching.
 * - Rendering the QuizPlayer component once data is available.
 *
 * @returns The QuizPage component.
 */
export default QuizPage;