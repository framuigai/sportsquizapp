// src/components/quiz/QuizCard.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, BarChart, Trophy, Tent as Tennis, ShoppingBasket as Basketball, Dumbbell, Car, Play } from 'lucide-react'; // ⭐ Removed SoccerBall, keeping Trophy ⭐
import Card, { CardContent, CardFooter } from '../ui/Card';
import Button from '../ui/Button';
import { Quiz } from '../../types';

interface QuizCardProps {
  quiz: Quiz;
}

const QuizCard: React.FC<QuizCardProps> = ({ quiz }) => {
  const navigate = useNavigate();

  const handleStartQuiz = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/quiz/${quiz.id}`);
  };

  const difficultyColor = {
    easy: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    hard: 'bg-red-100 text-red-800',
  }[quiz.difficulty];

  const getCategoryIcon = () => {
    switch (quiz.category.toLowerCase()) {
      case 'football':
        return <Trophy className="h-5 w-5 text-sky-500" />; // ⭐ Using Trophy as a fallback ⭐
      case 'tennis':
        return <Tennis className="h-5 w-5 text-green-500" />;
      case 'basketball':
        return <Basketball className="h-5 w-5 text-orange-500" />;
      case 'formula 1':
      case 'racing':
        return <Car className="h-5 w-5 text-red-500" />;
      default:
        return <Dumbbell className="h-5 w-5 text-slate-500" />;
    }
  };

  return (
    <Card
      className="h-full flex flex-col transition-transform hover:translate-y-[-4px] cursor-pointer"
    >
      <div className="h-32 bg-gradient-to-r from-sky-500 to-indigo-500 relative">
        <div className="absolute inset-0 flex items-center justify-center">
          {getCategoryIcon()}
        </div>
        <div className="absolute top-3 right-3">
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${difficultyColor}`}>
            {quiz.difficulty.charAt(0).toUpperCase() + quiz.difficulty.slice(1)}
          </span>
        </div>
      </div>

      <CardContent className="flex-grow">
        <h3 className="text-lg font-semibold text-slate-800 mb-2">{quiz.title}</h3>

        <div className="flex items-center text-sm text-slate-500 mb-4">
          <span className="flex items-center">
            {getCategoryIcon()}
            <span className="ml-1">{quiz.category}</span>
          </span>
          {quiz.team && (
            <span className="ml-3 flex items-center">
              <Trophy className="h-4 w-4 mr-1" />
              {quiz.team}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center text-slate-600">
            <BarChart className="h-4 w-4 mr-1" />
            <span>{quiz.questions.length} questions</span>
          </div>

          <div className="flex items-center text-slate-600">
            <Clock className="h-4 w-4 mr-1" />
            <span>~{Math.round(quiz.questions.length * 0.5)} min</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="bg-slate-50 p-4">
        <div className="w-full flex justify-between items-center">
          <span className="text-sm text-slate-500">
            {quiz.country || quiz.event || "General Knowledge"}
          </span>
          <Button
            variant="primary"
            size="sm"
            onClick={handleStartQuiz}
            leftIcon={<Play className="h-4 w-4" />}
          >
            Start Quiz
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default QuizCard;