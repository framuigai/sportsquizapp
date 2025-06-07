// src/App.tsx
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast'; 
import Layout from './components/layout/Layout'; 
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import QuizzesPage from './pages/QuizzesPage';
import QuizPage from './pages/QuizPage';
import HistoryPage from './pages/HistoryPage';
import AdminPage from './pages/AdminPage';
import GenerateQuizPage from './pages/GenerateQuizPage';
import MyQuizzesPage from './pages/MyQuizzesPage';
import { useAuthStore } from './store/authStore';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isInitialized } = useAuthStore();

  if (!isInitialized) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isInitialized } = useAuthStore();

  if (!isInitialized) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  if (!user || !user.isAdmin) {
    return <Navigate to="/" replace />; 
  }

  return <>{children}</>;
};

function App() {
  useEffect(() => {
    document.title = 'SportsQuiz - Test Your Sports Knowledge';
  }, []);

  return (
    <Router>
      <Toaster 
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          className: '',
          duration: 3000,
          style: {
            background: '#fff',
            color: '#333',
          },
          // ⭐ MODIFIED: Applied consistent styling for success and error toasts
          success: {
            duration: 3000,
            style: {
              background: '#28a745', // Green background
              color: '#fff',        // White text
            },
          },
          error: {
            duration: 4000,
            style: {
              background: '#dc3545', // Red background
              color: '#fff',        // White text
            },
          },
        }}
      />
      <Routes>
        <Route path="/" element={<Layout />}> 
          <Route index element={<HomePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="signup" element={<SignupPage />} />

          <Route
            path="quizzes"
            element={
              <ProtectedRoute>
                <QuizzesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="quiz/:id"
            element={
              <ProtectedRoute>
                <QuizPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="history"
            element={
              <ProtectedRoute>
                <HistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="generate-quiz"
            element={
              <ProtectedRoute>
                <GenerateQuizPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="my-quizzes"
            element={
              <ProtectedRoute>
                <MyQuizzesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin"
            element={
              <AdminRoute>
                <AdminPage />
              </AdminRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;