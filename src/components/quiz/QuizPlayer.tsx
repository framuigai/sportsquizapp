// src/components/quiz/QuizPlayer.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react'; // Re-import for potential internal errors
import QuizQuestion from './QuizQuestion'; // Relative import for component in same directory
import QuizResult from './QuizResult'; // Relative import for component in same directory
import Button from '../ui/Button'; // Relative import for UI component
import { useQuizStore } from '../../store/quizStore'; // Relative import for store
import { useAuthStore } from '../../store/authStore'; // Relative import for store
import { Quiz, QuizAttempt, QuizQuestion as QuizQuestionType } from '../../types'; // Import QuizQuestion as QuizQuestionType to avoid naming conflict
import { submitQuizCallable } from '../../firebase/functions'; // Import callable function
import { Timestamp } from 'firebase/firestore'; // Import Timestamp

// Define types for data exchanged with the backend (copied from QuizPage.tsx)
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

interface QuizPlayerProps {
  quizData: Quiz; // The full quiz object fetched from the store
}

const QuizPlayer: React.FC<QuizPlayerProps> = ({ quizData }) => {
  const navigate = useNavigate(); // Used for navigation after completion
  const { user } = useAuthStore(); // Get user for submission
  // const { saveQuizAttempt } = useQuizStore(); // No longer needed directly here, as submitQuizCallable handles saving

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<UserSelectedAnswerForBackend[]>([]);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizStartTime, setQuizStartTime] = useState(Date.now());
  const [quizAttempt, setQuizAttempt] = useState<QuizAttempt | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null); // State for submission error

  // Reset quiz state when quizData changes (e.g., if playing a new quiz)
  useEffect(() => {
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setQuizCompleted(false);
    setQuizAttempt(null);
    setQuizStartTime(Date.now());
    setSubmitError(null);
  }, [quizData]);

  const handleAnswer = useCallback((selectedOption: string) => {
    if (!quizData) return;

    const question = quizData.questions[currentQuestionIndex];

    const updatedAnswers: UserSelectedAnswerForBackend[] = [...answers, {
      questionId: question.id,
      selectedOption: selectedOption,
    }];
    setAnswers(updatedAnswers);

    if (currentQuestionIndex < quizData.questions.length - 1) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
    } else {
      // Last question answered, complete the quiz
      completeQuiz(updatedAnswers);
    }
  }, [answers, currentQuestionIndex, quizData]);

  const completeQuiz = useCallback(async (finalAnswers: UserSelectedAnswerForBackend[]) => {
    if (!quizData || !user) {
      console.warn("Attempted to complete quiz without quizData or user data.");
      setSubmitError("Authentication or quiz data missing for submission.");
      return;
    }

    setSubmitError(null); // Clear previous errors
    try {
      const result = await submitQuizCallable({
        quizId: quizData.id,
        userAnswers: finalAnswers,
        quizStartTime: quizStartTime,
      });

      const responseData = result.data as BackendSubmitResponse;
      console.log('Quiz submission response:', responseData);

      // Construct the QuizAttempt object from the backend response
      const newQuizAttempt: QuizAttempt = {
        id: responseData.attemptId,
        quizId: quizData.id,
        userId: user.id,
        score: responseData.score.correct,
        totalQuestions: responseData.score.total,
        answers: responseData.reviewDetails.map(detail => ({
          questionId: detail.questionId,
          userAnswer: detail.selectedOption,
          correctAnswer: detail.correctOption,
          isCorrect: detail.isCorrect,
        })),
        completedAt: Timestamp.now(), // Use client-side timestamp for consistency
        timeSpent: responseData.timeSpentSeconds,
      };

      setQuizAttempt(newQuizAttempt);
      setQuizCompleted(true);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to submit quiz. Please try again.';
      setSubmitError(errorMessage);
      console.error('Error submitting quiz:', err);
    }
  }, [quizData, user, quizStartTime]);

  const handleRetake = useCallback(() => {
    setQuizCompleted(false);
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setQuizAttempt(null);
    setQuizStartTime(Date.now()); // Reset timer for retake
    setSubmitError(null);
  }, []);

  const handleViewQuizzes = useCallback(() => {
    navigate('/quizzes');
  }, [navigate]);

  const currentQuestion = quizData.questions[currentQuestionIndex];

  // Render logic for QuizPlayer
  if (quizCompleted && quizAttempt) {
    return (
      <QuizResult
        quizAttempt={quizAttempt}
        quizTitle={quizData.title}
        onRetake={handleRetake}
        onViewQuizzes={handleViewQuizzes}
        quizQuestions={quizData.questions} // Pass the full questions array for review
      />
    );
  }

  // Display error if submission failed
  if (submitError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-red-500">
        <AlertCircle size={48} className="mb-4" />
        <h2 className="text-xl font-semibold">Quiz Submission Error</h2>
        <p className="text-lg">{submitError}</p>
        <Button onClick={handleRetake} className="mt-4">
          Try Again
        </Button>
        <Button onClick={handleViewQuizzes} variant="secondary" className="mt-2">
          Back to Quizzes
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-center mb-6">{quizData.title}</h2>
      <QuizQuestion
        question={currentQuestion}
        onAnswer={handleAnswer}
        questionNumber={currentQuestionIndex + 1}
        totalQuestions={quizData.questions.length}
      />
    </div>
  );
};

export default QuizPlayer;