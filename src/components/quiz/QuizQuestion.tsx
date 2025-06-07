// src/components/quiz/QuizQuestion.tsx
import React, { useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { QuizQuestion as QuizQuestionType } from '../../types'; // Ensure correct import
import Button from '../ui/Button'; // Assuming Button is a common UI component

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
    // Prevent re-selection if feedback is already showing
    if (showFeedback) return;

    setSelectedAnswer(answer); // Store the user's selected answer
    setShowFeedback(true);     // Trigger feedback display

    // After a delay, call the onAnswer prop to move to the next question
    // and reset the internal state for the next question.
    setTimeout(() => {
      onAnswer(answer); // This tells the parent (QuizPlayer) that an answer was submitted
      setSelectedAnswer(null); // Reset for the next question
      setShowFeedback(false);  // Reset for the next question
    }, 1500); // Display feedback for 1.5 seconds
  };

  // Determines if the given option is the correct answer
  const isCorrectAnswer = (option: string) => {
    // Only show correct styling if feedback is active AND this option is the correct answer
    return showFeedback && option === question.correctAnswer;
  };

  // Determines if the given option is the selected answer AND it's incorrect
  const isIncorrectAnswer = (option: string) => {
    // Only show incorrect styling if feedback is active AND this option was selected AND it's not the correct answer
    return showFeedback && selectedAnswer === option && option !== question.correctAnswer;
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
          {question.text} {/* FIX: Changed from question.questionText to question.text */}
        </h2>

        <div className="space-y-3">
          {/* Conditional rendering based on question.type */}
          {question.type === 'multiple_choice' ? (
            question.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(option)}
                // Disable button once an answer is selected and feedback is showing
                disabled={showFeedback}
                className={`w-full text-left p-3 rounded-md border transition-all duration-200 ease-in-out
                  ${selectedAnswer === option && !showFeedback // Style for selected but no feedback yet
                    ? 'border-slate-500 bg-slate-50'
                    : 'border-slate-300 hover:border-slate-500'
                  }
                  ${isCorrectAnswer(option) // Apply green for correct answer
                    ? 'bg-green-100 border-green-500 text-green-800'
                    : isIncorrectAnswer(option) // Apply red for incorrect selected answer
                    ? 'bg-red-100 border-red-500 text-red-800'
                    : showFeedback // Fade unselected options when feedback is shown
                    ? 'opacity-60 bg-white border-gray-200'
                    : 'bg-white' // Default for unselected and no feedback
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <span>{option}</span>
                  {showFeedback && option === question.correctAnswer && ( // Show check for correct answer
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                  {showFeedback && selectedAnswer === option && option !== question.correctAnswer && ( // Show X for incorrect selected answer
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
              </button>
            ))
          ) : (
            // Handles true/false questions
            <div className="flex space-x-4">
              {['True', 'False'].map((option, index) => (
                <Button
                  key={index}
                  onClick={() => handleAnswerSelect(option)}
                  disabled={showFeedback} // Disable button once an answer is selected and feedback is showing
                  className={`flex-1 transition-all duration-200 ease-in-out
                    ${selectedAnswer === option && !showFeedback // Style for selected but no feedback yet
                      ? 'bg-sky-600 hover:bg-sky-700' // Darker blue for true/false buttons
                      : 'bg-sky-500 hover:bg-sky-600'
                    }
                    ${isCorrectAnswer(option) // Apply green for correct answer
                      ? 'bg-green-500 hover:bg-green-600'
                      : isIncorrectAnswer(option) // Apply red for incorrect selected answer
                      ? 'bg-red-500 hover:bg-red-600'
                      : showFeedback // Fade unselected options when feedback is shown
                      ? 'opacity-60 bg-gray-300 hover:bg-gray-400' // Neutral gray for unselected true/false
                      : 'bg-sky-500' // Default for unselected and no feedback
                    }
                  `}
                >
                  <div className="flex items-center justify-center">
                    <span>{option}</span>
                    {showFeedback && option === question.correctAnswer && ( // Show check for correct answer
                      <CheckCircle className="h-5 w-5 ml-2" />
                    )}
                    {showFeedback && selectedAnswer === option && option !== question.correctAnswer && ( // Show X for incorrect selected answer
                      <XCircle className="h-5 w-5 ml-2" />
                    )}
                  </div>
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizQuestion;