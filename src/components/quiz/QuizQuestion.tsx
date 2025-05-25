import React, { useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { QuizQuestion as QuizQuestionType } from '../../types';
import Button from '../ui/Button';

interface QuizQuestionProps {
  question: QuizQuestionType;
  onAnswer: (answer: string | boolean, isCorrect: boolean) => void;
  questionNumber: number;
  totalQuestions: number;
}

const QuizQuestion: React.FC<QuizQuestionProps> = ({
  question,
  onAnswer,
  questionNumber,
  totalQuestions,
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string | boolean | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  
  const handleAnswerSelect = (answer: string | boolean) => {
    if (showFeedback) return;
    
    setSelectedAnswer(answer);
    setShowFeedback(true);
    
    const isCorrect = answer === question.correctAnswer;
    
    // Allow user to see feedback before moving to next question
    setTimeout(() => {
      onAnswer(answer, isCorrect);
      setSelectedAnswer(null);
      setShowFeedback(false);
    }, 1500);
  };
  
  const isCorrectAnswer = (answer: string | boolean) => {
    return showFeedback && answer === question.correctAnswer;
  };
  
  const isIncorrectAnswer = (answer: string | boolean) => {
    return showFeedback && selectedAnswer === answer && answer !== question.correctAnswer;
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
          {question.text}
        </h2>
        
        <div className="space-y-3">
          {question.type === 'multiple_choice' && question.options ? (
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
            <div className="flex space-x-4">
              <Button
                onClick={() => handleAnswerSelect(true)}
                className={`flex-1 ${
                  isCorrectAnswer(true)
                    ? 'bg-green-500 hover:bg-green-600'
                    : isIncorrectAnswer(true)
                    ? 'bg-red-500 hover:bg-red-600'
                    : ''
                }`}
                disabled={showFeedback}
              >
                <div className="flex items-center justify-center">
                  <span>True</span>
                  {isCorrectAnswer(true) && (
                    <CheckCircle className="h-5 w-5 ml-2" />
                  )}
                </div>
              </Button>
              
              <Button
                onClick={() => handleAnswerSelect(false)}
                className={`flex-1 ${
                  isCorrectAnswer(false)
                    ? 'bg-green-500 hover:bg-green-600'
                    : isIncorrectAnswer(false)
                    ? 'bg-red-500 hover:bg-red-600'
                    : ''
                }`}
                disabled={showFeedback}
              >
                <div className="flex items-center justify-center">
                  <span>False</span>
                  {isCorrectAnswer(false) && (
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