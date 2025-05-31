// src/types/index.ts

export type User = {
  id: string;
  email: string;
  displayName?: string;
  isAdmin?: boolean;
};

export type QuizQuestion = {
  id: string;
  text: string;
  type: 'multiple_choice' | 'true_false';
  options?: string[];
  correctAnswer: string; // Changed to string, assuming 'A', 'B', 'C', 'D' or 'True'/'False'
};

export type Quiz = {
  id: string;
  title: string;
  category: string;
  subCategory?: string;
  team?: string;
  country?: string;
  event?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questions: QuizQuestion[];
  createdAt: number;
  createdBy: string;
};

export type QuizAttempt = {
  id: string;
  quizId: string;
  userId: string;
  score: number;
  totalQuestions: number;
  // Updated `answers` array to match the backend's reviewDetails structure
  answers: {
    questionId: string;
    userAnswer: string; // Represents the selected option from the user (e.g., 'A', 'True')
    correctAnswer: string; // The correct option as stored in the quiz (e.g., 'B', 'False')
    isCorrect: boolean; // Boolean indicating if the user's answer was correct
  }[];
  completedAt: number;
  timeSpent: number; // in seconds
};

export type QuizFilter = {
  title?: string;
  category?: string;
  team?: string;
  country?: string;
  event?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
};

export type Category = {
  id: string;
  name: string;
  icon?: string; // Optional Lucide icon
};