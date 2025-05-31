// src/pages/QuizzesPage.tsx
import React, { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react'; // ⭐ Removed Sparkles import ⭐
import QuizCard from '../components/quiz/QuizCard';
import QuizFilter from '../components/quiz/QuizFilter';
// ⭐ Removed Button import if not used for other purposes on this page ⭐
// import Button from '../components/ui/Button'; // Keep if other buttons are on this page
import { useQuizStore } from '../store/quizStore';
import { Quiz, QuizFilter as QuizFilterType } from '../types';

const QuizzesPage: React.FC = () => {
  // ⭐ Removed 'generateQuiz' from destructuring ⭐
  const { quizzes, loading, error, fetchQuizzes } = useQuizStore();
  const [filter, setFilter] = useState<QuizFilterType>({});
  // ⭐ Removed 'generating' state and its setter ⭐
  // const [generating, setGenerating] = useState(false);

  // Initial fetch of quizzes on component mount
  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  const handleFilterChange = (newFilter: QuizFilterType) => {
    setFilter(newFilter);
    fetchQuizzes(newFilter); // Pass the new filter to fetchQuizzes
  };

  // ⭐ Removed the entire handleGenerateQuiz function ⭐
  // const handleGenerateQuiz = async () => {
  //   setGenerating(true);
  //   try {
  //     await generateQuiz(filter);
  //   } catch (err: any) {
  //     console.error('Failed to generate quiz:', err);
  //   } finally {
  //     setGenerating(false);
  //   }
  // };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Browse Quizzes</h1>
          {/* ⭐ Updated descriptive text for a Browse-only page ⭐ */}
          <p className="text-slate-600 mt-2">
            Select a quiz to test your sports knowledge.
          </p>
        </div>
        {/* ⭐ REMOVED THE "GENERATE QUIZ WITH AI" BUTTON ENTIRELY ⭐ */}
      </div>

      <QuizFilter onFilterChange={handleFilterChange} />

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-md flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div>
        </div>
      ) : quizzes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <h3 className="text-lg font-medium text-slate-900 mb-2">No quizzes found</h3>
          {/* ⭐ Updated message for no quizzes, removing reference to generation for general users ⭐ */}
          <p className="text-slate-500">
            Try changing your filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => (
            <QuizCard key={quiz.id} quiz={quiz} />
          ))}
        </div>
      )}
    </div>
  );
};

export default QuizzesPage;