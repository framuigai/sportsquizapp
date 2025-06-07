// src/components/layout/Footer.tsx
import React from 'react';
import { Link } from 'react-router-dom'; // ⭐ MODIFIED: Import Link
import { Trophy } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-800 text-white py-8 mt-auto"> {/* Added mt-auto to push footer to bottom */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Trophy className="h-6 w-6 text-sky-400" />
              <span className="text-xl font-bold">SportsQuiz</span>
            </div>
            <p className="text-slate-300 text-sm">
              Test your sports knowledge with our fun and challenging quizzes. 
              From football to tennis, we've got quizzes for every sports fan.
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-slate-300">
              <li>
                {/* ⭐ MODIFIED: Use Link for internal navigation */}
                <Link to="/" className="hover:text-sky-400 transition-colors">Home</Link>
              </li>
              <li>
                <Link to="/quizzes" className="hover:text-sky-400 transition-colors">Global Quizzes</Link>
              </li>
              <li>
                <Link to="/my-quizzes" className="hover:text-sky-400 transition-colors">My Quizzes</Link> {/* Added My Quizzes */}
              </li>
              <li>
                <Link to="/generate-quiz" className="hover:text-sky-400 transition-colors">Generate Quiz</Link> {/* Added Generate Quiz */}
              </li>
              <li>
                <Link to="/history" className="hover:text-sky-400 transition-colors">History</Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Categories</h3>
            <div className="flex flex-wrap gap-2">
              <span className="bg-slate-700 text-sm px-3 py-1 rounded-full">Football</span>
              <span className="bg-slate-700 text-sm px-3 py-1 rounded-full">Basketball</span>
              <span className="bg-slate-700 text-sm px-3 py-1 rounded-full">Tennis</span>
              <span className="bg-slate-700 text-sm px-3 py-1 rounded-full">Formula 1</span>
              <span className="bg-slate-700 text-sm px-3 py-1 rounded-full">Cricket</span>
            </div>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-slate-700 text-slate-400 text-sm flex flex-col md:flex-row justify-between items-center">
          <p>&copy; {new Date().getFullYear()} SportsQuiz. All rights reserved.</p>
          <div className="mt-4 md:mt-0 flex space-x-6">
            <a href="#" className="hover:text-sky-400">Privacy Policy</a>
            <a href="#" className="hover:text-sky-400">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;