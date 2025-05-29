import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import QuizQuestion from '../components/quiz/QuizQuestion';
import QuizResult from '../components/quiz/QuizResult';
import Button from '../components/ui/Button';
import { useQuizStore } from '../store/quizStore';
import { useAuthStore } from '../store/authStore';
import { QuizAttempt } from '../types';

const QuizPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentQuiz, loading, error, fetchQuizById } = useQuizStore();
  const { user, isInitialized } = useAuthStore();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<{
    questionId: string;
    userAnswer: string | boolean;
    isCorrect: boolean;
  }>>([]);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizStartTime, setQuizStartTime] = useState(Date.now());
  const [quizAttempt, setQuizAttempt] = useState<QuizAttempt | null>(null);

  useEffect(() => {
    if (id) {
      fetchQuizById(id); // still uses locally saved quizzes
      setQuizStartTime(Date.now());
    }
  }, [id, fetchQuizById]);

  useEffect(() => {
    if (isInitialized && !user) {
      navigate('/login');
    }
  }, [isInitialized, user, navigate]);

  const handleAnswer = (answer: string | boolean, isCorrect: boolean) => {
    if (!currentQuiz) return;

    const question = currentQuiz.questions[currentQuestionIndex];

    const newAnswers = [...answers, {
      questionId: question.id,
      userAnswer: answer,
      isCorrect,
    }];
    setAnswers(newAnswers);

    if (currentQuestionIndex < currentQuiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      completeQuiz(newAnswers);
    }
  };

  const completeQuiz = async (finalAnswers: typeof answers) => {
    if (!currentQuiz || !user) return;

    const score = finalAnswers.filter(ans => ans.isCorrect).length;
    const timeSpent = Math.round((Date.now() - quizStartTime) / 1000);

    const attempt: Omit<QuizAttempt, 'id'> = {
      quizId: currentQuiz.id,
      userId: user.id,
      score,
      totalQuestions: currentQuiz.questions.length,
      answers: finalAnswers,
      completedAt: Date.now(),
      timeSpent,
    };

    const attemptId = await useQuizStore.getState().saveQuizAttempt(attempt);

    if (attemptId) {
      setQuizAttempt({ id: attemptId, ...attempt });
      setQuizCompleted(true);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  if (error || !currentQuiz) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-md flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Quiz not found</p>
            <p className="mt-1">{error || "This quiz doesn't exist or has been removed."}</p>
          </div>
        </div>
        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={() => navigate('/quizzes')}>
            Back to Quizzes
          </Button>
        </div>
      </div>
    );
  }

  if (quizCompleted && quizAttempt) {
    return <QuizResult attempt={quizAttempt} quizTitle={currentQuiz.title} />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">{currentQuiz.title}</h1>
        <div className="flex items-center text-sm text-slate-500 mt-1">
          <span className="font-medium text-slate-600">{currentQuiz.category}</span>
          {currentQuiz.team && (
            <>
              <span className="mx-2">•</span>
              <span>{currentQuiz.team}</span>
            </>
          )}
          <span className="mx-2">•</span>
          <span className="capitalize">{currentQuiz.difficulty} difficulty</span>
        </div>
      </div>

      {currentQuiz.questions.length > 0 && (
        <QuizQuestion
          question={currentQuiz.questions[currentQuestionIndex]}
          onAnswer={handleAnswer}
          questionNumber={currentQuestionIndex + 1}
          totalQuestions={currentQuiz.questions.length}
        />
      )}
    </div>
  );
};

export default QuizPage;
