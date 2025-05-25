import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Clock, BadgeCheck, BarChart4 } from 'lucide-react';
import Button from '../ui/Button';
import { QuizAttempt } from '../../types';

interface QuizResultProps {
  attempt: QuizAttempt;
  quizTitle: string;
}

const QuizResult: React.FC<QuizResultProps> = ({ attempt, quizTitle }) => {
  const navigate = useNavigate();
  
  const percentage = Math.round((attempt.score / attempt.totalQuestions) * 100);
  
  // Determine result category
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
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold">{percentage}%</span>
              </div>
            </div>
            
            <h3 className={`text-2xl font-bold ${resultColor}`}>
              {resultCategory}
            </h3>
            
            <p className="text-slate-500 mt-1">
              You scored {attempt.score} out of {attempt.totalQuestions}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="flex items-center p-4 bg-slate-50 rounded-lg">
              <Clock className="h-6 w-6 text-slate-500 mr-3" />
              <div>
                <p className="text-sm text-slate-500">Time Spent</p>
                <p className="font-semibold">{formatTime(attempt.timeSpent)}</p>
              </div>
            </div>
            
            <div className="flex items-center p-4 bg-slate-50 rounded-lg">
              <BadgeCheck className="h-6 w-6 text-green-500 mr-3" />
              <div>
                <p className="text-sm text-slate-500">Correct Answers</p>
                <p className="font-semibold">{attempt.score}</p>
              </div>
            </div>
            
            <div className="flex items-center p-4 bg-slate-50 rounded-lg">
              <BarChart4 className="h-6 w-6 text-red-500 mr-3" />
              <div>
                <p className="text-sm text-slate-500">Incorrect Answers</p>
                <p className="font-semibold">{attempt.totalQuestions - attempt.score}</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <Button
              variant="outline"
              onClick={() => navigate('/quizzes')}
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizResult;