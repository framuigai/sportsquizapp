// src/types/index.ts

import { Timestamp } from 'firebase/firestore';

export type User = {
  id: string;
  email: string;
  displayName?: string;
  isAdmin?: boolean;
};

export interface QuizConfig {
  // ⭐ IMPORTANT CHANGE HERE: Allow 'null' for optional string fields ⭐
  title?: string | null; 
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  numberOfQuestions: number;
  quizType: 'multiple_choice' | 'true_false';
  team?: string | null;   // Allow null
  event?: string | null;  // Allow null
  country?: string | null; // Allow null
  visibility?: 'global' | 'private'; // This one is already optional
}

// ⭐ DEFINITIVE FIX: Updated QuizQuestion type ⭐
// Changed 'questionText' to 'text' for consistency with QuizResult.tsx
// Added 'category' and 'difficulty' as optional properties,
// as they are needed to reconstruct QuizConfig for "Generate Similar Quiz"
export type QuizQuestion =
  | {
      id: string;
      text: string; // Renamed from questionText to text
      type: 'multiple_choice';
      options: string[];
      correctAnswer: string; // The value like "A" or "True"
      category?: string; // Added for 'Generate Similar Quiz'
      difficulty?: 'easy' | 'medium' | 'hard'; // Added for 'Generate Similar Quiz'
    }
  | {
      id: string;
      text: string; // Renamed from questionText to text
      type: 'true_false';
      correctAnswer: 'True' | 'False';
      category?: string; // Added for 'Generate Similar Quiz'
      difficulty?: 'easy' | 'medium' | 'hard'; // Added for 'Generate Similar Quiz'
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
  createdFromQuizConfig?: QuizConfig; // ⭐ NEW: Store the original config to make "Generate Similar Quiz" more robust ⭐
  createdBy: string;
  visibility: 'global' | 'private';
  quizType: 'multiple_choice' | 'true_false';
  status: 'active' | 'deleted';
};

export type QuizAttempt = {
  id: string;
  quizId: string;
  userId: string;
  score: number;
  totalQuestions: number;
  answers: {
    questionId: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
  }[];
  completedAt: Timestamp;
  timeSpent: number;
  // ⭐ NEW: Store the quiz's original config or essential details for 'Retake Similar Quiz' ⭐
  // This is better than deriving from questions if you want to regenerate based on the *original* config
  originalQuizConfig?: QuizConfig;
};

export type QuizFilter = {
  title?: string;
  category?: string;
  team?: string;
  country?: string;
  event?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  visibility?: 'global' | 'private';
  createdBy?: string;
  status?: 'active' | 'deleted' | 'all';
};

export type Category = {
  id: string;
  name: string;
  icon?: string;
};