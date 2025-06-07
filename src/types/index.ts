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

// ⭐ IMPORTANT FIX: Use Discriminated Unions for QuizQuestion ⭐
export type QuizQuestion =
  | {
      id: string;
      questionText: string; // Changed from 'text' to 'questionText' for consistency with frontend
      type: 'multiple_choice';
      options: string[]; // ⭐ REQUIRED for multiple_choice ⭐
      correctOptionIndex: number; // ⭐ REQUIRED for multiple_choice ⭐
    }
  | {
      id: string;
      questionText: string; // Changed from 'text' to 'questionText' for consistency with frontend
      type: 'true_false';
      correctAnswer: 'True' | 'False'; // Assuming correct answer is 'True' or 'False' for true/false questions
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
  status: 'active' | 'deleted'; // ⭐ NEW: Added status field for soft delete ⭐
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
  status?: 'active' | 'deleted' | 'all'; // ⭐ NEW: Added status filter option ⭐
};

export type Category = {
  id: string;
  name: string;
  icon?: string;
};