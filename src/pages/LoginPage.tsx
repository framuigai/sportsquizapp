import React from 'react';
import { Navigate } from 'react-router-dom';
import AuthForm from '../components/auth/AuthForm';
import { useAuthStore } from '../store/authStore';

const LoginPage: React.FC = () => {
  const { user, isInitialized } = useAuthStore();
  
  // Redirect if already logged in
  if (isInitialized && user) {
    return <Navigate to="/quizzes" replace />;
  }
  
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-bold text-slate-800">SportsQuiz</h1>
        <p className="mt-2 text-center text-sm text-slate-600">
          Sign in to access your account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <AuthForm isLogin={true} />
      </div>
    </div>
  );
};

export default LoginPage;