import React, { useEffect, useState } from 'react';
import { AlertCircle, Sparkles } from 'lucide-react';
import QuizCard from '../components/quiz/QuizCard';
import QuizFilter from '../components/quiz/QuizFilter';
import Button from '../components/ui/Button';
import { useQuizStore } from '../store/quizStore';
import { Quiz, QuizFilter as QuizFilterType } from '../types';

const QuizzesPage: React.FC = () => {
  // Destructure fetchQuizzes from useQuizStore
  const { quizzes, loading, error, fetchQuizzes, generateQuiz } = useQuizStore(); // Removed saveQuiz as generateQuiz now calls fetchQuizzes internally
  const [filter, setFilter] = useState<QuizFilterType>({});
  const [generating, setGenerating] = useState(false);

  // Initial fetch of quizzes on component mount
  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]); // Dependency array to re-run if fetchQuizzes reference changes (though it shouldn't)

  const handleFilterChange = (newFilter: QuizFilterType) => {
    setFilter(newFilter);
    fetchQuizzes(newFilter); // Pass the new filter to fetchQuizzes
  };

  const handleGenerateQuiz = async () => {
    setGenerating(true);
    try {
      // generateQuiz now directly saves to Firestore and refetches the list internally
      await generateQuiz(filter);
      // Removed the manual saveQuiz and temporary ID generation here
      // const newQuiz: Quiz = {
      //   ...generated,
      //   id: Math.random().toString(36).substring(2, 10), // Temp ID (replace with Firestore ID if saving)
      //   createdBy: 'AI',
      //   createdAt: Date.now(),
      // };
      // await saveQuiz(newQuiz);
    } catch (err: any) { // Type 'any' for the error
      console.error('Failed to generate quiz:', err);
      // Optionally, set a local error state here if you want to display it
      // setLocalError(err.message || 'Failed to generate quiz');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Browse Quizzes</h1>
          <p className="text-slate-600 mt-2">
            Select a quiz to test your sports knowledge, or generate one with AI.
          </p>
        </div>
        <Button
          onClick={handleGenerateQuiz}
          isLoading={generating}
          leftIcon={<Sparkles className="w-4 h-4" />}
          className="mt-4 sm:mt-0"
        >
          Generate Quiz with AI
        </Button>
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
          <p className="text-slate-500">
            {Object.keys(filter).length > 0
              ? "Try changing your filters or generate a new quiz."
              : "There are no quizzes available at the moment. Generate one!"}
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