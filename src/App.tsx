import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import QuizzesPage from './pages/QuizzesPage';
import QuizPage from './pages/QuizPage';
import HistoryPage from './pages/HistoryPage';
import AdminPage from './pages/AdminPage';
import { useAuthStore } from './store/authStore';

// Auth guard for protected routes
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isInitialized } = useAuthStore();
  
  if (!isInitialized) {
    // Auth not initialized yet, show loading
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div>
      </div>
    );
  }
  
  if (!user) {
    // Not logged in, redirect to login
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Admin guard for admin routes
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isInitialized } = useAuthStore();
  
  if (!isInitialized) {
    // Auth not initialized yet, show loading
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div>
      </div>
    );
  }
  
  if (!user || !user.isAdmin) {
    // Not logged in or not admin, redirect to home
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  // Set page title
  useEffect(() => {
    document.title = 'SportsQuiz - Test Your Sports Knowledge';
  }, []);
  
  return (
    <Router>
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
            path="admin" 
            element={
              <AdminRoute>
                <AdminPage />
              </AdminRoute>
            } 
          />
          
          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;