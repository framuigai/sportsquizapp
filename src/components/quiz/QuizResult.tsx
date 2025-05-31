// src/components/quiz/QuizResult.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Clock, BadgeCheck, BarChart4 } from 'lucide-react';
import Button from '../ui/Button';
import { QuizAttempt, QuizQuestion } from '../../types';

interface QuizResultProps {
  quizAttempt: QuizAttempt;
  quizTitle: string;
  onRetake: () => void;
  onViewQuizzes: () => void;
  quizQuestions: QuizQuestion[]; // Array of original quiz questions
}

const QuizResult: React.FC<QuizResultProps> = ({
  quizAttempt,
  quizTitle,
  onRetake,
  onViewQuizzes,
  quizQuestions,
}) => {
  const navigate = useNavigate();

  const percentage = Math.round((quizAttempt.score / quizAttempt.totalQuestions) * 100);

  let resultCategory = '';
  let resultColor = '';

  if (percentage >= 90) {
    resultCategory = 'Expert';
    resultColor = 'text-indigo-500';
  } else if (percentage >= 70) {
    resultCategory = 'Skilled';
    resultColor = 'text-sky-500';
  } else if (percentage >= 50) {
    resultCategory = 'Amateur';
    resultColor = 'text-green-500';
  } else if (percentage >= 30) {
    resultCategory = 'Novice';
    resultColor = 'text-yellow-500';
  } else {
    resultCategory = 'Beginner';
    resultColor = 'text-red-500';
  }

  // Format time spent
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Helper function to get the full correct option text
  const getFullCorrectAnswerText = (questionId: string, correctOptionValue: string): string => {
    const question = quizQuestions.find(q => q.id === questionId);
    if (!question) {
      return correctOptionValue; // Fallback if question not found
    }

    if (question.type === 'multiple_choice' && question.options) {
      const foundOption = question.options.find(option =>
        option.startsWith(`${correctOptionValue}.`)
      );
      return foundOption || correctOptionValue;
    } else if (question.type === 'true_false') {
      return correctOptionValue;
    }
    return correctOptionValue;
  };

  // ⭐ NEW HELPER FUNCTION: To get the question text ⭐
  const getQuestionText = (questionId: string): string => {
    const question = quizQuestions.find(q => q.id === questionId);
    return question ? question.text : 'Question text not found.';
  };


  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:px-6 lg:px-8 animate-fadeIn">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="bg-gradient-to-r from-sky-500 to-indigo-500 py-6 px-6 text-white">
          <h2 className="text-xl font-semibold">Quiz Results</h2>
          <p className="opacity-90">{quizTitle}</p>
        </div>

        <div className="p-6">
          <div className="flex flex-col items-center mb-8">
            <div className="relative w-32 h-32 mb-4">
              <div className="absolute inset-0 flex items-center justify-center">
                <Trophy className={`h-16 w-16 ${resultColor}`} />
              </div>
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle
                  className="text-slate-200"
                  strokeWidth="8"
                  stroke="currentColor"
                  fill="transparent"
                  r="42"
                  cx="50"
                  cy="50"
                />
                <circle
                  className={resultColor.replace('text', 'stroke')}
                  strokeWidth="8"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                  r="42"
                  cx="50"
                  cy="50"
                  strokeDasharray={`${percentage * 2.64}, 264`}
                  transform="rotate(-90 50 50)"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold">{percentage}%</span>
                </div>
              </svg>
            </div>

            <h3 className={`text-2xl font-bold ${resultColor}`}>
              {resultCategory}
            </h3>

            <p className="text-slate-500 mt-1">
              You scored {quizAttempt.score} out of {quizAttempt.totalQuestions}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="flex items-center p-4 bg-slate-50 rounded-lg">
              <Clock className="h-6 w-6 text-slate-500 mr-3" />
              <div>
                <p className="text-sm text-slate-500">Time Spent</p>
                <p className="font-semibold">{formatTime(quizAttempt.timeSpent)}</p>
              </div>
            </div>

            <div className="flex items-center p-4 bg-slate-50 rounded-lg">
              <BadgeCheck className="h-6 w-6 text-green-500 mr-3" />
              <div>
                <p className="text-sm text-slate-500">Correct Answers</p>
                <p className="font-semibold">{quizAttempt.score}</p>
              </div>
            </div>

            <div className="flex items-center p-4 bg-slate-50 rounded-lg">
              <BarChart4 className="h-6 w-6 text-red-500 mr-3" />
              <div>
                <p className="text-sm text-slate-500">Incorrect Answers</p>
                <p className="font-semibold">{quizAttempt.totalQuestions - quizAttempt.score}</p>
              </div>
            </div>
          </div>

          {quizAttempt.answers && quizAttempt.answers.length > 0 && (
            <div className="mt-8 text-left border-t pt-4 border-slate-200">
              <h3 className="text-xl font-semibold mb-4">Review Your Answers:</h3>
              <div className="space-y-4">
                {quizAttempt.answers.map((answerDetail, index) => (
                  <div key={answerDetail.questionId || index} className="p-3 rounded-md bg-slate-50 border border-slate-200">
                    <p className="font-medium text-slate-800 mb-1">
                      Question {index + 1}: {/* ⭐ Question Number ⭐ */}
                    </p>
                    {/* ⭐ ADDED QUESTION TEXT HERE ⭐ */}
                    <p className="text-base text-slate-700 mb-2">
                        {getQuestionText(answerDetail.questionId)}
                    </p>
                    <p className={`text-sm ${answerDetail.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                      Your Answer: "{answerDetail.userAnswer}" {answerDetail.isCorrect ? ' (Correct)' : ' (Incorrect)'}
                    </p>
                    {!answerDetail.isCorrect && (
                      <p className="text-sm text-slate-700">
                        Correct Answer: "{getFullCorrectAnswerText(answerDetail.questionId, answerDetail.correctAnswer)}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 mt-8">
            <Button
              variant="outline"
              onClick={onViewQuizzes}
              fullWidth
            >
              Browse More Quizzes
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate('/history')}
              fullWidth
            >
              View History
            </Button>
            <Button
              variant="secondary"
              onClick={onRetake}
              fullWidth
            >
              Retake Quiz
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizResult;