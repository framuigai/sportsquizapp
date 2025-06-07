// src/firebase/functions.ts

import { getFunctions, httpsCallable } from 'firebase/functions';
// CORRECTED: Import 'app' as a default import because config.ts uses 'export default app;'
import app from './config';

// Initialize the Firebase Functions SDK.
// IMPORTANT: Replace 'us-central1' with your function's actual region.
// This region MUST match the region where you deploy your Cloud Functions.
const functions = getFunctions(app, 'us-central1');

// Expose your callable Cloud Functions
export const generateQuizCallable = httpsCallable(functions, 'generateQuiz');
// Assuming submitQuizCallable is already defined or will be soon
export const submitQuizCallable = httpsCallable(functions, 'submitQuiz');

// ⭐ NEW: Export the deleteQuiz callable function ⭐
export const deleteQuizCallable = httpsCallable<
  { quizId: string }, // Request data type
  { success: boolean; message: string } // Response data type
>(functions, 'deleteQuiz');

// You can add more callable functions here as your app grows