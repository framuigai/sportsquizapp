import React, { useState } from 'react';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { useAuthStore } from '../../store/authStore';

interface AuthFormProps {
  isLogin?: boolean;
}

const AuthForm: React.FC<AuthFormProps> = ({ isLogin = true }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const { signIn, signUp, loading, error, clearError } = useAuthStore();
  
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const validateForm = (): boolean => {
    if (!email || !password) {
      setValidationError('Email and password are required');
      return false;
    }
    
    if (!isLogin && password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return false;
    }
    
    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters');
      return false;
    }
    
    setValidationError(null);
    return true;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    if (!validateForm()) {
      return;
    }
    
    if (isLogin) {
      await signIn(email, password);
    } else {
      await signUp(email, password);
    }
  };
  
  return (
    <div className="w-full max-w-md">
      <div className="bg-white px-8 pt-6 pb-8 mb-4 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-slate-800">
          {isLogin ? 'Sign In' : 'Create Account'}
        </h2>
        
        {(error || validationError) && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-md flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <span>{validationError || error}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <Input
              type="email"
              id="email"
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="h-5 w-5 text-slate-400" />}
              fullWidth
              required
            />
          </div>
          
          <div className="mb-4">
            <Input
              type="password"
              id="password"
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="h-5 w-5 text-slate-400" />}
              fullWidth
              required
            />
          </div>
          
          {!isLogin && (
            <div className="mb-6">
              <Input
                type="password"
                id="confirmPassword"
                label="Confirm Password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                leftIcon={<Lock className="h-5 w-5 text-slate-400" />}
                fullWidth
                required
              />
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <Button
              type="submit"
              isLoading={loading}
              fullWidth
            >
              {isLogin ? 'Sign In' : 'Sign Up'}
            </Button>
          </div>
        </form>
      </div>
      
      <div className="text-center">
        <p className="text-sm text-slate-600">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <a 
            href={isLogin ? "/signup" : "/login"} 
            className="font-medium text-sky-600 hover:text-sky-500"
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </a>
        </p>
      </div>
    </div>
  );
};

export default AuthForm;