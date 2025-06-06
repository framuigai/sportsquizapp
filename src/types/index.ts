// src/types/index.ts

import { Timestamp } from 'firebase/firestore';

export type User = {
  id: string;
  email: string;
  displayName?: string;
  isAdmin?: boolean;
};

// --- MODIFICATION 1: Update QuizConfig to include all generation parameters & visibility ---
export interface QuizConfig {
  title?: string; // ✅ ADDED: Optional title for the quiz
  category: string; // ✅ ADDED: Category is typically a core parameter for generation
  difficulty: 'easy' | 'medium' | 'hard';
  numberOfQuestions: number;
  quizType: 'multiple_choice' | 'true_false'; // This is the key addition for Step 1
  team?: string; // ✅ ADDED: Optional team parameter
  event?: string; // ✅ ADDED: Optional event parameter
  country?: string; // ✅ ADDED: Optional country parameter
  visibility?: 'global' | 'private'; // ✅ ADDED: For frontend forms to suggest visibility
}

export type QuizQuestion = {
  id: string;
  text: string;
  type: 'multiple_choice' | 'true_false';
  options?: string[];
  correctAnswer: string;
};

// --- MODIFICATION 2: Add quizType to the Quiz interface ---
export type Quiz = {
  id: string;
  title: string;
  category: string;
  subCategory?: string; // Keep if still relevant
  team?: string;
  country?: string;
  event?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questions: QuizQuestion[];
  createdAt: number;
  createdBy: string;
  visibility: 'global' | 'private';
  quizType: 'multiple_choice' | 'true_false'; // ✅ ADDED: Crucial for displaying saved quizzes correctly
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
};

export type Category = {
  id: string;
  name: string;
  icon?: string;
};