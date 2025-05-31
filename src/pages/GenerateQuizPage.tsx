// src/pages/GenerateQuizPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Loader2, Info, CheckCircle, XCircle } from 'lucide-react';
import QuizFilter from '../components/quiz/QuizFilter'; // Correct path to your QuizFilter
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import { useQuizStore } from '../store/quizStore';
import { useAuthStore } from '../store/authStore';
import { QuizFilter as QuizFilterType } from '../types';

const GenerateQuizPage: React.FC = () => {
  const navigate = useNavigate();
  // Destructure currentQuiz, although it's not directly used for display on this page
  // The generated quiz is added to the general 'quizzes' state in useQuizStore now.
  const { generateQuiz, loading, error } = useQuizStore();
  const { user } = useAuthStore();
  const [filter, setFilter] = useState<QuizFilterType>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Effect to clear messages when component mounts or filter changes (good practice)
  useEffect(() => {
    setSuccessMessage(null);
    useQuizStore.setState({ error: null }); // Clear quiz store error on mount
  }, []); // Run once on mount

  const handleFilterChange = (newFilter: QuizFilterType) => {
    setFilter(newFilter);
  };

  const handleGenerateQuiz = async () => {
    setSuccessMessage(null); // Clear previous success message
    useQuizStore.setState({ error: null }); // Clear previous error from store

    if (!user) {
      useQuizStore.setState({ error: "You must be logged in to generate a quiz." });
      return;
    }

    try {
      const generatedQuiz = await generateQuiz(filter);

      if (generatedQuiz) {
        setSuccessMessage(`Quiz "${generatedQuiz.title}" generated successfully! It's now in your 'My Quizzes'.`);
        // Optional: Navigate to the newly created quiz or 'My Quizzes' page
        // For example, to the quiz details page:
        // navigate(`/quiz/${generatedQuiz.id}`);
        // Or to My Quizzes page:
        // navigate('/my-quizzes');
      } else {
        // If generateQuiz returns null without setting an error (e.g., due to local validation)
        // This case is less likely now that generateQuiz in store sets error, but good to have a fallback.
        if (!error) { // Only set if store hasn't already set it
          useQuizStore.setState({ error: "Quiz generation failed. Please try again." });
        }
      }
    } catch (err: any) {
      // The generateQuiz action in the store should already set the error.
      // This catch block is mostly for unexpected errors that slip past the store's try-catch.
      console.error("Caught error in GenerateQuizPage:", err);
      if (!error) { // Only set if store hasn't already set it
        useQuizStore.setState({ error: err.message || "An unexpected error occurred during quiz generation." });
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-extrabold text-slate-900 mb-6 text-center">Generate Your Own Quiz</h1>
      <p className="text-center text-slate-600 mb-8 max-w-2xl mx-auto">
        Craft a personalized quiz just for you. Select your desired category, difficulty, and other details below, and our AI will create a unique quiz. This quiz will be private and only visible to you.
      </p>

      <div className="bg-white shadow-xl rounded-lg p-6 md:p-8 lg:p-10 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
          <Sparkles className="h-6 w-6 text-sky-500 mr-2" />
          Quiz Specifications
        </h2>

        {/* The QuizFilter component passes its internal state via onFilterChange */}
        <QuizFilter onFilterChange={handleFilterChange} />

        <div className="mt-8">
          <Button
            variant="primary"
            size="lg"
            onClick={handleGenerateQuiz}
            disabled={loading}
            className="w-full"
            leftIcon={loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
          >
            {loading ? 'Generating Quiz...' : 'Generate My Quiz'}
          </Button>

          {successMessage && (
            <Alert
              type="success"
              message={successMessage}
              className="mt-6"
              icon={<CheckCircle className="h-5 w-5" />}
            />
          )}

          {error && (
            <Alert
              type="error"
              message={error}
              className="mt-6"
              icon={<XCircle className="h-5 w-5" />}
            />
          )}
        </div>
      </div>

      <div className="mt-12 text-center">
        <p className="text-slate-500">
          Want to challenge the community? Only administrators can create public, global quizzes.
        </p>
      </div>
    </div>
  );
};

export default GenerateQuizPage;