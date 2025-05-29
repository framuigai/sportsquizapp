import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import QuizForm from '../components/admin/QuizForm';
import { useAuthStore } from '../store/authStore';

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isInitialized } = useAuthStore();

  useEffect(() => {
    if (isInitialized) {
      // 🛡️ Redirect if not logged in or not admin
      if (!user) {
        navigate('/login');
      } else if (!user.isAdmin) {
        navigate('/quizzes');
      }
    }
  }, [isInitialized, user, navigate]);

  // ✅ Protect against flicker
  if (!user?.isAdmin) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 👤 Header */}
      <div className="mb-8 flex items-center">
        <Shield className="h-8 w-8 text-sky-500 mr-3" />
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Admin Dashboard</h1>
          <p className="text-slate-600 mt-1">
            Create and manage quizzes
          </p>
        </div>
      </div>

      {/* 🧠 Manual Quiz Form for Admins */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Create New Quiz</h2>
        <QuizForm />
      </div>
    </div>
  );
};

export default AdminPage;
