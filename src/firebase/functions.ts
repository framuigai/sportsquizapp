// src/firebase/functions.ts

import { getFunctions, httpsCallable } from 'firebase/functions';
// CORRECTED: Import 'app' as a default import because config.ts uses 'export default app;'
import app from './config'; // Changed from { app } to app

// Initialize the Firebase Functions SDK.
// IMPORTANT: Replace 'us-central1' with your function's actual region.
// This region MUST match the region where you deploy your Cloud Functions.
const functions = getFunctions(app, 'us-central1');

// Expose your callable Cloud Functions
export const generateQuizCallable = httpsCallable(functions, 'generateQuiz');
export const submitQuizCallable = httpsCallable(functions, 'submitQuiz'); // <-- NEW callable function

// You can add more callable functions here as your app grows