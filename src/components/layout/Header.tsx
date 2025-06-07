// src/components/layout/Header.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, User, Trophy, Sparkles, Menu } from 'lucide-react'; // Added Menu for mobile toggle
import Button from '../ui/Button';
import { useAuthStore } from '../../store/authStore';
import { useState } from 'react'; // Added for mobile menu state

const Header: React.FC = () => {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // State for mobile menu

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-20"> {/* Increased z-index */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center"> {/* Added items-center */}
          <div className="flex items-center"> {/* Group logo and desktop nav */}
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <Trophy className="h-8 w-8 text-sky-500" />
                <span className="text-xl font-bold text-slate-800">SportsQuiz</span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            {user && (
              <nav className="hidden md:ml-6 md:flex md:space-x-4 lg:space-x-8"> {/* Hide on mobile, show on md+ */}
                <Link
                  to="/quizzes"
                  className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-slate-600 hover:text-slate-800 hover:border-slate-300"
                >
                  Global Quizzes
                </Link>
                <Link
                  to="/my-quizzes"
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

          {/* Right section: User info/Auth buttons + Mobile menu button */}
          <div className="flex items-center">
            {user ? (
              <div className="flex items-center space-x-4">
                <div className="hidden sm:flex items-center space-x-2"> {/* Hide user name on extra small screens */}
                  <div className="h-8 w-8 rounded-full bg-sky-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-sky-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">
                    {user.displayName || user.email}
                  </span>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  leftIcon={<LogOut className="h-4 w-4" />}
                  className="hidden md:flex" // Hide on mobile, show on md+
                >
                  Sign out
                </Button>
                {/* Sign out for mobile */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="flex md:hidden" // Show on mobile, hide on md+
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              // ⭐ MODIFIED: Ensure sign-in/sign-up buttons are always visible on mobile if user is not logged in
              <div className="flex space-x-4"> {/* Removed 'hidden md:flex' to make visible on mobile */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/login')}
                  className="hidden sm:flex" // Hide on extra small screens for more space
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

            {/* Mobile menu button (Hamburger) */}
            {user && ( // Only show hamburger if user is logged in (has navigation links)
              <div className="-mr-2 flex md:hidden">
                <button
                  onClick={toggleMobileMenu}
                  className="inline-flex items-center justify-center p-2 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-sky-500"
                  aria-expanded={isMobileMenuOpen ? 'true' : 'false'}
                >
                  <span className="sr-only">Open main menu</span>
                  <Menu className="block h-6 w-6" aria-hidden="true" />
                </button>
              </div>
            )}
            {/* Removed the redundant !user block here as the above condition handles it */}
          </div>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {isMobileMenuOpen && user && ( // Only show if menu is open AND user is logged in
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link
              to="/quizzes"
              className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Global Quizzes
            </Link>
            <Link
              to="/my-quizzes"
              className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              My Quizzes
            </Link>
            <Link
              to="/generate-quiz"
              className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Generate Quiz
            </Link>
            <Link
              to="/history"
              className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              History
            </Link>
            {user.isAdmin && (
              <Link
                to="/admin"
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Admin
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;