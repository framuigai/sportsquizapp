import React, { useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { QuizQuestion as QuizQuestionType } from '../../types';
import Button from '../ui/Button';

interface QuizQuestionProps {
  question: QuizQuestionType;
  onAnswer: (selectedOption: string) => void;
  questionNumber: number;
  totalQuestions: number;
}

const QuizQuestion: React.FC<QuizQuestionProps> = ({
  question,
  onAnswer,
  questionNumber,
  totalQuestions,
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const handleAnswerSelect = (answer: string) => {
    if (showFeedback) return;

    setSelectedAnswer(answer);
    setShowFeedback(true);

    setTimeout(() => {
      onAnswer(answer);
      setSelectedAnswer(null);
      setShowFeedback(false);
    }, 1500);
  };

  // ⭐ FIX: Updated isCorrectAnswer to handle both question types ⭐
  const isCorrectAnswer = (option: string) => {
    if (!showFeedback) return false;

    if (question.type === 'multiple_choice') {
      // Ensure question.options and question.correctOptionIndex exist for multiple_choice
      return option === question.options[question.correctOptionIndex];
    } else if (question.type === 'true_false') {
      return option === question.correctAnswer;
    }
    return false; // Should not happen
  };

  // ⭐ FIX: Updated isIncorrectAnswer to handle both question types ⭐
  const isIncorrectAnswer = (option: string) => {
    if (!showFeedback || selectedAnswer !== option) return false;

    if (question.type === 'multiple_choice') {
      // Ensure question.options and question.correctOptionIndex exist for multiple_choice
      return option !== question.options[question.correctOptionIndex];
    } else if (question.type === 'true_false') {
      return option !== question.correctAnswer;
    }
    return false; // Should not happen
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:px-6 lg:px-8 animate-fadeIn">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-slate-500">
            Question {questionNumber} of {totalQuestions}
          </span>
          <span className="text-sm font-medium text-slate-500">
            {question.type === 'multiple_choice' ? 'Multiple Choice' : 'True or False'}
          </span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div
            className="bg-sky-500 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-slate-800 mb-6">
          {question.questionText} {/* Use questionText here */}
        </h2>

        <div className="space-y-3">
          {/* ⭐ FIX: Conditional rendering based on question.type ⭐ */}
          {question.type === 'multiple_choice' ? (
            question.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(option)}
                className={`w-full text-left p-3 rounded-md border transition-all ${
                  selectedAnswer === option
                    ? 'border-slate-500 bg-slate-50'
                    : 'border-slate-300 hover:border-slate-500'
                } ${
                  isCorrectAnswer(option)
                    ? 'bg-green-50 border-green-500'
                    : isIncorrectAnswer(option)
                    ? 'bg-red-50 border-red-500'
                    : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{option}</span>
                  {isCorrectAnswer(option) && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                  {isIncorrectAnswer(option) && (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
              </button>
            ))
          ) : (
            // Handles true/false questions
            <div className="flex space-x-4">
              <Button
                onClick={() => handleAnswerSelect('True')}
                className={`flex-1 ${
                  isCorrectAnswer('True')
                    ? 'bg-green-500 hover:bg-green-600'
                    : isIncorrectAnswer('True')
                    ? 'bg-red-500 hover:bg-red-600'
                    : ''
                }`}
                disabled={showFeedback}
              >
                <div className="flex items-center justify-center">
                  <span>True</span>
                  {isCorrectAnswer('True') && (
                    <CheckCircle className="h-5 w-5 ml-2" />
                  )}
                </div>
              </Button>

              <Button
                onClick={() => handleAnswerSelect('False')}
                className={`flex-1 ${
                  isCorrectAnswer('False')
                    ? 'bg-green-500 hover:bg-green-600'
                    : isIncorrectAnswer('False')
                    ? 'bg-red-500 hover:bg-red-600'
                    : ''
                }`}
                disabled={showFeedback}
              >
                <div className="flex items-center justify-center">
                  <span>False</span>
                  {isCorrectAnswer('False') && (
                    <CheckCircle className="h-5 w-5 ml-2" />
                  )}
                </div>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizQuestion;