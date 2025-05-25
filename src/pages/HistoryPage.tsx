import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, BarChart4, Trophy } from 'lucide-react';
import Card, { CardContent } from '../components/ui/Card';
import { useQuizStore } from '../store/quizStore';
import { useAuthStore } from '../store/authStore';

const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { quizAttempts, loading, fetchUserAttempts } = useQuizStore();
  const { user, isInitialized } = useAuthStore();
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (isInitialized && !user) {
      navigate('/login');
    }
  }, [isInitialized, user, navigate]);
  
  // Fetch user attempts
  useEffect(() => {
    if (user) {
      fetchUserAttempts(user.id);
    }
  }, [user, fetchUserAttempts]);
  
  // Format date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };
  
  // Format time
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Quiz History</h1>
        <p className="text-slate-600 mt-2">
          View your past quiz attempts and scores
        </p>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div>
        </div>
      ) : quizAttempts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <Trophy className="h-12 w-12 mx-auto text-slate-400" />
          <h3 className="text-lg font-medium text-slate-900 mt-4 mb-2">No quiz history yet</h3>
          <p className="text-slate-500 max-w-md mx-auto">
            You haven't completed any quizzes yet. Start taking quizzes to build your history.
          </p>
          <div className="mt-6">
            <button
              onClick={() => navigate('/quizzes')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
            >
              Browse Quizzes
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {quizAttempts.map((attempt) => {
            const percentage = Math.round((attempt.score / attempt.totalQuestions) * 100);
            
            // Determine color based on score
            let scoreColor = 'text-red-500';
            if (percentage >= 70) {
              scoreColor = 'text-green-500';
            } else if (percentage >= 40) {
              scoreColor = 'text-yellow-500';
            }
            
            return (
              <Card key={attempt.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="grid grid-cols-1 md:grid-cols-6 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                    <div className="col-span-4 p-6">
                      <h3 className="font-semibold text-lg text-slate-800 mb-2">
                        {/* Normally we'd fetch quiz title, but using quizId as placeholder */}
                        Quiz #{attempt.quizId.slice(-6)}
                      </h3>
                      
                      <div className="flex flex-wrap gap-y-2 text-sm text-slate-500">
                        <div className="flex items-center mr-6">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>{formatDate(attempt.completedAt)}</span>
                        </div>
                        
                        <div className="flex items-center mr-6">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>{formatTime(attempt.timeSpent)}</span>
                        </div>
                        
                        <div className="flex items-center">
                          <BarChart4 className="h-4 w-4 mr-1" />
                          <span>{attempt.totalQuestions} questions</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="col-span-2 p-6 flex flex-col justify-center items-center bg-slate-50">
                      <div className="text-3xl font-bold mb-1 flex items-center">
                        <span className={scoreColor}>{attempt.score}</span>
                        <span className="text-slate-600">/{attempt.totalQuestions}</span>
                      </div>
                      <div className="text-sm text-slate-500">
                        {percentage}% correct
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HistoryPage;