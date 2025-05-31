// src/pages/QuizPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import QuizQuestion from '../components/quiz/QuizQuestion';
import QuizResult from '../components/quiz/QuizResult';
import Button from '../components/ui/Button';
import { useQuizStore } from '../store/quizStore';
import { useAuthStore } from '../store/authStore';
import { QuizAttempt, QuizQuestion as QuizQuestionType } from '../types'; // ⭐ Renamed QuizQuestion to QuizQuestionType to avoid conflict with component name ⭐
import { submitQuizCallable } from '../firebase/functions.ts';
import { Timestamp } from 'firebase/firestore';

// Define types for data exchanged with the backend
interface BackendSubmitResponse {
  message: string;
  score: {
    correct: number;
    incorrect: number;
    total: number;
  };
  attemptId: string;
  reviewDetails: {
    questionId: string;
    selectedOption: string;
    correctOption: string; // This is 'A', 'B', 'True', 'False'
    isCorrect: boolean;
  }[];
  timeSpentSeconds: number;
}

interface UserSelectedAnswerForBackend {
  questionId: string;
  selectedOption: string;
}

const QuizPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentQuiz, loading, error, fetchQuizById } = useQuizStore();
  const { user, isInitialized } = useAuthStore();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<UserSelectedAnswerForBackend[]>([]);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizStartTime, setQuizStartTime] = useState(Date.now());
  const [quizAttempt, setQuizAttempt] = useState<QuizAttempt | null>(null);

  useEffect(() => {
    if (id) {
      fetchQuizById(id);
      setQuizStartTime(Date.now());
    }
  }, [id, fetchQuizById]);

  useEffect(() => {
    if (isInitialized && !user) {
      navigate('/login');
    }
  }, [isInitialized, user, navigate]);

  const handleAnswer = (selectedOption: string) => {
    if (!currentQuiz) return;

    const question = currentQuiz.questions[currentQuestionIndex];

    const updatedAnswers: UserSelectedAnswerForBackend[] = [...answers, {
      questionId: question.id,
      selectedOption: selectedOption,
    }];
    setAnswers(updatedAnswers);

    if (currentQuestionIndex < currentQuiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      completeQuiz(updatedAnswers);
    }
  };

  const completeQuiz = async (finalAnswers: UserSelectedAnswerForBackend[]) => {
    if (!currentQuiz || !user) {
      console.warn("Attempted to complete quiz without currentQuiz or user data.");
      return;
    }

    try {
      const result = await submitQuizCallable({
        quizId: currentQuiz.id,
        userAnswers: finalAnswers,
        quizStartTime: quizStartTime,
      });

      const responseData = result.data as BackendSubmitResponse;
      console.log('Quiz submission response:', responseData);

      const newQuizAttempt: QuizAttempt = {
        id: responseData.attemptId,
        quizId: currentQuiz.id,
        userId: user.id,
        score: responseData.score.correct,
        totalQuestions: responseData.score.total,
        answers: responseData.reviewDetails.map(detail => ({
          questionId: detail.questionId,
          userAnswer: detail.selectedOption,
          correctAnswer: detail.correctOption,
          isCorrect: detail.isCorrect,
        })),
        completedAt: Timestamp.now(),
        timeSpent: responseData.timeSpentSeconds,
      };

      setQuizAttempt(newQuizAttempt);
      setQuizCompleted(true);
    } catch (err: any) {
      console.error('Error submitting quiz:', err);
      alert(`Failed to submit quiz: ${err.message || 'Unknown error'}`);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading quiz...</div>;
  }

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

  if (quizCompleted && quizAttempt) {
    return (
      <QuizResult
        quizAttempt={quizAttempt}
        quizTitle={currentQuiz.title}
        onRetake={() => {
          setQuizCompleted(false);
          setCurrentQuestionIndex(0);
          setAnswers([]);
          setQuizAttempt(null);
          setQuizStartTime(Date.now()); // Reset timer
        }}
        onViewQuizzes={() => navigate('/quizzes')}
        // ⭐ CRITICAL CHANGE: Pass the current quiz's questions ⭐
        quizQuestions={currentQuiz.questions}
      />
    );
  }

  return (
    <QuizQuestion
      question={currentQuiz.questions[currentQuestionIndex]}
      onAnswer={handleAnswer}
      questionNumber={currentQuestionIndex + 1}
      totalQuestions={currentQuiz.questions.length}
    />
  );
};

export default QuizPage;