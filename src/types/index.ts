// src/types/index.ts

import { Timestamp } from 'firebase/firestore';

export type User = {
  id: string;
  email: string;
  displayName?: string;
  isAdmin?: boolean;
};

// ⭐ NEW INTERFACE TO ADD FOR STEP 1 ⭐
export interface QuizConfig {
  topic: string;
  numberOfQuestions: number;
  difficulty: 'easy' | 'medium' | 'hard';
  quizType: 'multiple_choice' | 'true_false'; // This is the key addition for Step 1
  // Add other generation parameters here if you have them,
  // e.g., category, subCategory, team, country, event, if they are part of the *input* for generation
}

export type QuizQuestion = {
  id: string;
  text: string;
  type: 'multiple_choice' | 'true_false'; // This is already good here!
  options?: string[];
  correctAnswer: string;
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
  visibility: 'global' | 'private';
  // You might want to add 'quizType' here as well, if the generated quiz
  // itself stores the type it was generated as. This is often good practice.
  // quizType: 'multiple_choice' | 'true_false'; // Consider adding this here for clarity on stored quizzes
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