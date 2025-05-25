import React, { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import QuizCard from '../components/quiz/QuizCard';
import QuizFilter from '../components/quiz/QuizFilter';
import { useQuizStore } from '../store/quizStore';
import { QuizFilter as QuizFilterType } from '../types';

const QuizzesPage: React.FC = () => {
  const { quizzes, loading, error, fetchQuizzes } = useQuizStore();
  const [filter, setFilter] = useState<QuizFilterType>({});
  
  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);
  
  const handleFilterChange = (newFilter: QuizFilterType) => {
    setFilter(newFilter);
    fetchQuizzes(newFilter);
  };
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Browse Quizzes</h1>
        <p className="text-slate-600 mt-2">
          Select a quiz to test your sports knowledge
        </p>
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
              ? "Try changing your filters to see more quizzes."
              : "There are no quizzes available at the moment."}
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