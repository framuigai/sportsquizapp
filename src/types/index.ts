// types/index.ts

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
  correctAnswer: string | boolean;
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
  answers: {
    questionId: string;
    userAnswer: string | boolean;
    isCorrect: boolean;
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
