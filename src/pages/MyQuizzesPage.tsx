// src/pages/MyQuizzesPage.tsx
import React, { useEffect } from 'react';
import { useQuizStore } from '../store/quizStore';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { BookOpenText, Loader2, Frown } from 'lucide-react'; 
import QuizCard from '../components/quiz/QuizCard';
import Alert from '../components/ui/Alert';
import toast from 'react-hot-toast'; 

const MyQuizzesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isInitialized } = useAuthStore();
  const { quizzes, loading, error, fetchQuizzes } = useQuizStore();

  useEffect(() => {
    if (!isInitialized) {
      return;
    }
    if (!user) {
      navigate('/login');
      return;
    }
    // ⭐ My Quizzes: Fetch private, active quizzes created by the user ⭐
    fetchQuizzes({ createdBy: user.id, visibility: 'private', status: 'active' });
  }, [user, isInitialized, fetchQuizzes, navigate]);

  const handleExportQuiz = (quizId: string) => {
    const quizToExport = quizzes.find(q => q.id === quizId);
    if (!quizToExport) {
      toast.error('Quiz not found for export.');
      return;
    }

    let exportContent = `--- Quiz: ${quizToExport.title} ---\n`;
    exportContent += `Category: ${quizToExport.category}\n`;
    exportContent += `Difficulty: ${quizToExport.difficulty}\n`;
    if (quizToExport.team) exportContent += `Team: ${quizToExport.team}\n`;
    if (quizToExport.country) exportContent += `Country: ${quizToExport.country}\n`;
    exportContent += `\n`;

    quizToExport.questions.forEach((question, qIndex) => {
      // ⭐ FIX: Changed from question.questionText to question.text ⭐
      exportContent += `Question ${qIndex + 1}: ${question.text}\n`; 
      if (question.type === 'multiple_choice') {
        const correctOptionIndex = question.options.indexOf(question.correctAnswer); // ⭐ FIX: Get index from correctAnswer ⭐
        question.options.forEach((option, oIndex) => {
          exportContent += `  ${String.fromCharCode(65 + oIndex)}. ${option}\n`;
        });
        const correctOptionText = question.correctAnswer; // correctAnswer is already the text value
        exportContent += `  Correct Answer: ${String.fromCharCode(65 + correctOptionIndex)}. ${correctOptionText}\n\n`;
      } else if (question.type === 'true_false') {
        exportContent += `  Correct Answer: ${question.correctAnswer}\n\n`;
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
    toast.success(`Quiz "${quizToExport.title}" exported successfully!`);
  };

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

      {loading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
          <span className="ml-3 text-lg text-slate-600">Loading your quizzes...</span>
        </div>
      )}

      {error && (
        <Alert type="error" message={error} className="mt-4" />
      )}

      {!loading && !error && quizzes.length === 0 && (
        <div className="text-center py-10 text-slate-500">
          <Frown className="h-12 w-12 mx-auto mb-4 text-slate-400" />
          <p className="text-xl font-semibold mb-2">No private quizzes generated yet.</p>
          <p className="text-md">Go to "Generate Quiz" to create your first one!</p>
        </div>
      )}

      {!loading && !error && quizzes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {quizzes.map((quiz) => (
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