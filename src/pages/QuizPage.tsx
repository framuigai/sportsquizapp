// src/pages/QuizPage.tsx
import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2 } from 'lucide-react'; // ⭐ NEW: Import Loader2
import Button from '../components/ui/Button';
import { useQuizStore } from '../store/quizStore';
import { useAuthStore } from '../store/authStore';
import QuizPlayer from '../components/quiz/QuizPlayer'; 

const QuizPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentQuiz, loading, error, fetchQuizById } = useQuizStore();
  const { user, isInitialized } = useAuthStore();

  useEffect(() => {
    if (id) {
      fetchQuizById(id);
    }
  }, [id, fetchQuizById]);

  useEffect(() => {
    if (isInitialized && !user) {
      navigate('/login');
    }
  }, [isInitialized, user, navigate]);

  // ⭐ MODIFIED: Enhanced loading state with a spinner
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-128px)]"> {/* Adjusted min-height for better centering with header/footer */}
        <Loader2 className="h-12 w-12 animate-spin text-sky-500" />
        <p className="ml-3 text-lg text-slate-600">Loading quiz details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-128px)] text-red-500 p-4">
        <AlertCircle size={48} className="mb-4" />
        <h2 className="text-xl font-semibold">Error Loading Quiz</h2>
        <p className="text-lg text-center">{error}</p>
        <Button onClick={() => navigate('/quizzes')} className="mt-4">
          Back to Quizzes
        </Button>
      </div>
    );
  }

  if (!currentQuiz) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-128px)] text-slate-600 p-4">
        <AlertCircle size={48} className="mb-4" />
        <h2 className="text-xl font-semibold">Quiz Not Found</h2>
        <p className="text-lg text-center">The quiz you are looking for does not exist or was deleted.</p>
        <Button onClick={() => navigate('/quizzes')} className="mt-4">
          Back to Quizzes
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <QuizPlayer quizData={currentQuiz} />
    </div>
  );
};

export default QuizPage;