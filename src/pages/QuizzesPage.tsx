// src/pages/QuizzesPage.tsx
import React, { useEffect, useState } from 'react';
import { AlertCircle, Loader2, BookOpenText, Download } from 'lucide-react';
import QuizCard from '../components/quiz/QuizCard';
import QuizFilter from '../components/quiz/QuizFilter';
import Alert from '../components/ui/Alert';
import { useQuizStore } from '../store/quizStore'; // Import useQuizStore
import { QuizFilter as QuizFilterType, Quiz } from '../types'; // Import Quiz type
import { useAuthStore } from '../store/authStore';
// Removed deleteQuizCallable import as it's no longer used for soft delete here
// import { deleteQuizCallable } from '../firebase/functions';

const QuizzesPage: React.FC = () => {
  // Destructure updateQuizStatus from the store
  const { quizzes, loading, error, fetchQuizzes, updateQuizStatus } = useQuizStore();
  const { user } = useAuthStore();
  const isAdmin = user?.isAdmin || false;

  const [filter, setFilter] = useState<QuizFilterType>({});
  const [updateLoading, setUpdateLoading] = useState<string | null>(null); // For loading state on actions

  useEffect(() => {
    // For regular users, only fetch active and global quizzes
    fetchQuizzes({ ...filter, visibility: 'global', status: 'active' });
  }, [fetchQuizzes, filter]); // Added filter to dependency array

  const handleFilterChange = (newFilter: QuizFilterType) => {
    setFilter(newFilter);
    fetchQuizzes({ ...newFilter, visibility: 'global', status: 'active' });
  };

  // ⭐ MODIFIED: Use updateQuizStatus for soft delete ⭐
  const handleToggleQuizStatus = async (quiz: Quiz) => {
    // In QuizzesPage, a non-admin might only see an "Archive" option if it's their own quiz,
    // or if the action is to mark as deleted from a public list (only for admins).
    // For non-admins on QuizzesPage, the soft delete action might not even be available.
    // If it's an admin on QuizzesPage, they can use this to mark global quizzes as deleted.
    if (!isAdmin) {
      alert("You don't have permission to perform this action.");
      return;
    }

    const newStatus = quiz.status === 'deleted' ? 'active' : 'deleted';
    const action = newStatus === 'active' ? 'restore' : 'mark as deleted';

    if (!window.confirm(`Are you sure you want to ${action} this quiz "${quiz.title}"?`)) {
      return;
    }

    setUpdateLoading(quiz.id);
    try {
      await updateQuizStatus(quiz.id, newStatus);
      alert(`Quiz "${quiz.title}" successfully ${action}d.`);
      // Re-fetch to ensure the list is accurate based on the 'active' status filter for non-admins
      fetchQuizzes({ ...filter, visibility: 'global', status: 'active' });
    } catch (err: any) {
      console.error(`Error ${action}ing quiz:`, err);
      let errorMessage = `Failed to ${action} quiz: ${err.message || 'Unknown error'}`;
      alert(errorMessage);
    } finally {
      setUpdateLoading(null);
    }
  };

  const handleExportQuiz = (quizId: string) => {
    const quizToExport = quizzes.find(q => q.id === quizId);
    if (!quizToExport) {
      alert('Quiz not found for export.');
      return;
    }

    let exportContent = `--- Quiz: ${quizToExport.title} ---\n`;
    exportContent += `Category: ${quizToExport.category}\n`;
    exportContent += `Difficulty: ${quizToExport.difficulty}\n`;
    if (quizToExport.team) exportContent += `Team: ${quizToExport.team}\n`;
    if (quizToExport.country) exportContent += `Country: ${quizToExport.country}\n`;
    exportContent += `\n`;

    quizToExport.questions.forEach((question, qIndex) => {
      exportContent += `Question ${qIndex + 1}: ${question.questionText}\n`;

      if (question.type === 'multiple_choice') {
        question.options.forEach((option, oIndex) => {
          exportContent += `  ${String.fromCharCode(65 + oIndex)}. ${option}\n`;
        });
        const correctOptionText = question.options[question.correctOptionIndex];
        exportContent += `  Correct Answer: ${String.fromCharCode(65 + question.correctOptionIndex)}. ${correctOptionText}\n\n`;
      } else if (question.type === 'true_false') {
        exportContent += `  Correct Answer: ${question.correctAnswer}\n\n`;
      }
    });

    const blob = new Blob([exportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${quizToExport.title.replace(/[^a-z0-9]/gi, '_')}_quiz.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            <BookOpenText className="inline-block h-8 w-8 text-sky-500 mr-2 align-middle" />
            Global Quizzes
          </h1>
          <p className="text-slate-600 mt-2">
            Explore a wide range of quizzes generated by administrators for everyone to enjoy.
          </p>
        </div>
      </div>

      <QuizFilter
        onFilterChange={handleFilterChange}
        hideVisibilityFilter={true}
        hideCreatedByFilter={true}
      />

      {error && (
        <Alert
          type="error"
          message={error}
          className="mt-4"
          icon={<AlertCircle className="h-5 w-5" />}
        />
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-sky-500" />
        </div>
      ) : quizzes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <h3 className="text-lg font-medium text-slate-900 mb-2">No global quizzes found</h3>
          <p className="text-slate-500">
            Try changing your filters or check back later for new global quizzes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => (
            <QuizCard
              key={quiz.id}
              quiz={quiz}
              isAdmin={isAdmin}
              // Only provide onToggleStatus if the user is an admin
              onToggleStatus={isAdmin ? handleToggleQuizStatus : undefined}
              onExport={handleExportQuiz}
              isSoftDeleted={quiz.status === 'deleted'}
              updateLoading={updateLoading === quiz.id}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default QuizzesPage;