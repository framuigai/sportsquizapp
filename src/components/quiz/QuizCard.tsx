// src/components/quiz/QuizCard.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock, BarChart, Trophy, Tent as Tennis, ShoppingBasket as Basketball,
  Dumbbell, Car, Play, Download, Eye, EyeOff, Archive, ArchiveRestore, Loader2
} from 'lucide-react';
import Card, { CardContent, CardFooter } from '../ui/Card';
import Button from '../ui/Button';

import { Quiz } from '../../types';

interface QuizCardProps {
  quiz: Quiz;
  isAdmin?: boolean;
  onToggleVisibility?: (quizId: string, currentVisibility: 'global' | 'private') => Promise<void>;
  onToggleStatus?: (quiz: Quiz) => Promise<void>; // Modified: Pass entire quiz object
  onExport?: (quizId: string) => void;
  isSoftDeleted?: boolean; // NEW: Indicates if the quiz's status is 'deleted'
  updateLoading?: boolean; // NEW: To show loading state on specific buttons
}

const QuizCard: React.FC<QuizCardProps> = ({
  quiz,
  isAdmin = false,
  onToggleVisibility,
  onToggleStatus,
  onExport,
  isSoftDeleted = false, // Default to false if not provided
  updateLoading = false, // Default to false if not provided
}) => {
  const navigate = useNavigate();

  const handleStartQuiz = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/quiz/${quiz.id}`);
  };

  const handleButtonClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  const difficultyColor = {
    easy: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    hard: 'bg-red-100 text-red-800',
  }[quiz.difficulty];

  const getCategoryIcon = () => {
    switch (quiz.category.toLowerCase()) {
      case 'football':
        return <Trophy className="h-5 w-5 text-sky-500" />;
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

  // Determine badge color for status
  const statusBadgeColor = isSoftDeleted ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700';

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
        <div className="absolute top-2 left-2 flex space-x-1">
          {/* Conditional Export Button */}
          {onExport && (
            <button
              onClick={(e) => handleButtonClick(e, () => onExport(quiz.id))}
              className="bg-sky-600 hover:bg-sky-700 text-white p-1 rounded-full shadow-md transition-colors duration-200"
              title="Export Quiz"
            >
              <Download className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <CardContent className="flex-grow">
        <h3 className="text-lg font-semibold text-slate-800 mb-2">{quiz.title}</h3>

        <div className="flex items-center text-sm text-slate-500 mb-2">
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

        <div className="flex items-center space-x-4 text-sm mb-4">
          <div className="flex items-center text-slate-600">
            <BarChart className="h-4 w-4 mr-1" />
            <span>{quiz.questions.length} questions</span>
          </div>

          <div className="flex items-center text-slate-600">
            <Clock className="h-4 w-4 mr-1" />
            <span>~{Math.round(quiz.questions.length * 0.5)} min</span>
          </div>
        </div>

        {/* Display Visibility and Status */}
        <div className="text-sm text-slate-500 mb-2">
            Visibility: <span className="font-medium text-slate-700 capitalize">{quiz.visibility}</span>
        </div>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadgeColor}`}>
          Status: {isSoftDeleted ? 'Deleted' : 'Active'}
        </span>
      </CardContent>

      <CardFooter className="bg-slate-50 p-4 flex flex-wrap gap-2 justify-between items-center">
        <span className="text-sm text-slate-500 min-w-[100px]">
          {quiz.country || quiz.event || "General Knowledge"}
        </span>

        <div className="flex flex-wrap gap-2 justify-end items-center">
          {/* Admin Visibility Toggle Button */}
          {isAdmin && onToggleVisibility && (
            <Button
              onClick={(e) => handleButtonClick(e, () => onToggleVisibility(quiz.id, quiz.visibility))}
              variant="outline"
              size="sm"
              className="flex items-center"
              disabled={updateLoading}
            >
              {updateLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : quiz.visibility === 'global' ? (
                <EyeOff className="h-4 w-4 mr-2" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              {quiz.visibility === 'global' ? 'Make Private' : 'Make Global'}
            </Button>
          )}

          {/* Admin Status Toggle Button (Delete/Restore) */}
          {isAdmin && onToggleStatus && (
            <Button
              onClick={(e) => handleButtonClick(e, () => onToggleStatus(quiz))}
              variant="outline"
              size="sm"
              className="flex items-center"
              disabled={updateLoading}
            >
              {updateLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : isSoftDeleted ? (
                <ArchiveRestore className="h-4 w-4 mr-2" />
              ) : (
                <Archive className="h-4 w-4 mr-2" />
              )}
              {isSoftDeleted ? 'Restore' : 'Mark as Deleted'}
            </Button>
          )}

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