import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, User, Trophy, Sparkles } from 'lucide-react';
import Button from '../ui/Button';
import { useAuthStore } from '../../store/authStore';

const Header: React.FC = () => {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <Trophy className="h-8 w-8 text-sky-500" />
                <span className="text-xl font-bold text-slate-800">SportsQuiz</span>
              </Link>
            </div>

            {user && (
              <nav className="ml-6 flex space-x-4 sm:space-x-8">
                <Link
                  to="/quizzes"
                  className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-slate-600 hover:text-slate-800 hover:border-slate-300"
                >
                  Global Quizzes
                </Link>
                <Link
                  to="/my-quizzes" // ⭐ LINK TO MY QUIZZES PAGE ⭐
                  className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-slate-600 hover:text-slate-800 hover:border-slate-300"
                >
                  My Quizzes
                </Link>
                <Link
                  to="/generate-quiz"
                  className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-slate-600 hover:text-slate-800 hover:border-slate-300"
                >
                  Generate Quiz
                </Link>
                <Link
                  to="/history"
                  className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-slate-600 hover:text-slate-800 hover:border-slate-300"
                >
                  History
                </Link>
                {user.isAdmin && (
                  <Link
                    to="/admin"
                    className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-slate-600 hover:text-slate-800 hover:border-slate-300"
                  >
                    Admin
                  </Link>
                )}
              </nav>
            )}
          </div>

          <div className="flex items-center">
            {user ? (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 rounded-full bg-sky-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-sky-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 hidden sm:inline-block">
                    {user.displayName || user.email}
                  </span>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  leftIcon={<LogOut className="h-4 w-4" />}
                >
                  <span className="sr-only sm:not-sr-only">Sign out</span>
                </Button>
              </div>
            ) : (
              <div className="flex space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/login')}
                >
                  Sign in
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/signup')}
                >
                  Sign up
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;