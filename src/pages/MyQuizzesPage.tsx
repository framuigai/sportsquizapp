// src/pages/MyQuizzesPage.tsx
import React, { useEffect } from 'react';
import { useQuizStore } from '../store/quizStore';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { BookOpenText, Loader2, Frown } from 'lucide-react'; // 'Info' and 'Download' icons are no longer directly used here, but implicitly by QuizCard or for general use. Removed 'Info' from import as it's not used. 'Download' is used within QuizCard now.
import QuizCard from '../components/quiz/QuizCard';
import Alert from '../components/ui/Alert';
// import Button from '../ui/Button'; // Button is not directly used here, but within QuizCard

const MyQuizzesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isInitialized } = useAuthStore();
  const { quizzes, loading, error, fetchQuizzes } = useQuizStore();

  useEffect(() => {
    // Ensure authentication state is initialized before proceeding
    if (!isInitialized) {
      return;
    }

    // Redirect unauthenticated users to the login page
    if (!user) {
      navigate('/login');
      return;
    }

    // ⭐ Explanation 1: Fetching User's Private, Active Quizzes ⭐
    // This useEffect correctly fetches quizzes:
    // - created by the current user (`createdBy: user.id`)
    // - that are private (`visibility: 'private'`)
    // - that are currently active (not soft-deleted) (`status: 'active'`)
    // This ensures users only see their own available quizzes.
    fetchQuizzes({ createdBy: user.id, visibility: 'private', status: 'active' });
  }, [user, isInitialized, fetchQuizzes, navigate]); // Dependencies ensure this runs when user/auth state changes

  // ⭐ Explanation 2: Quiz Export Functionality ⭐
  // This function is correctly implemented for client-side quiz export.
  // It takes a quiz ID, finds the corresponding quiz, formats its content
  // into a readable text string, and triggers a download using Blob and URL.createObjectURL.
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

  // Display a loading spinner during authentication initialization
  if (!isInitialized) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        <Loader2 className="h-12 w-12 animate-spin text-sky-500" />
        <p className="ml-3 text-lg text-slate-600">Initializing authentication...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-extrabold text-slate-900 mb-6 text-center">
        <BookOpenText className="inline-block h-10 w-10 text-sky-500 mr-3 align-middle" />
        My Private Quizzes
      </h1>
      <p className="text-center text-slate-600 mb-8 max-w-2xl mx-auto">
        Here are the quizzes you've personally generated. These quizzes are private and only visible to you.
      </p>

      {/* Loading state for fetching quizzes */}
      {loading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
          <span className="ml-3 text-lg text-slate-600">Loading your quizzes...</span>
        </div>
      )}

      {/* Error display */}
      {error && (
        <Alert type="error" message={error} className="mt-4" />
      )}

      {/* No quizzes found message */}
      {!loading && !error && quizzes.length === 0 && (
        <div className="text-center py-10 text-slate-500">
          <Frown className="h-12 w-12 mx-auto mb-4 text-slate-400" />
          <p className="text-xl font-semibold mb-2">No private quizzes generated yet.</p>
          <p className="text-md">Go to "Generate Quiz" to create your first one!</p>
        </div>
      )}

      {/* Display quizzes if loaded */}
      {!loading && !error && quizzes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {quizzes.map((quiz) => (
            // ⭐ Explanation 3: QuizCard Props for MyQuizzesPage ⭐
            // - `key`: Essential for React list rendering.
            // - `quiz`: The quiz data object.
            // - `onExport`: Passed to enable the export button on each card.
            // - `isAdmin`: Not passed, so it defaults to `false` in QuizCard, correctly hiding admin controls.
            // - `onToggleVisibility`, `onToggleStatus`: Not passed, so they are `undefined` in QuizCard, correctly hiding admin buttons.
            // - `isSoftDeleted`: The `fetchQuizzes` filter already ensures only `active` quizzes are shown, so this will always be `false`.
            // - `updateLoading`: Not used for any actions on this page, so it's correctly omitted.
            <QuizCard
              key={quiz.id}
              quiz={quiz}
              onExport={() => handleExportQuiz(quiz.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MyQuizzesPage;