// functions/src/index.ts

import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp } from 'firebase-admin/app';

// ✅ Initialize Firebase Admin SDK only once
initializeApp(); // Call initializeApp directly from the specific import

// ✅ Import Gen2 callable functions with .js extension after build
import { generateQuiz } from "./generateQuiz.js";
import { submitQuiz } from "./submitQuiz.js"; // ⭐ FIX: Corrected '././submitQuiz.js' to './submitQuiz.js'
import { deleteQuiz } from "./deleteQuiz.js"; // ⭐ NEW: Import deleteQuiz

// ✅ Test function for emulator verification
export const helloWorld = onRequest((request, response) => {
  logger.info("Hello logs!", { structuredData: true });
  response.send("Hello from Firebase!");
});

// ✅ Export your callable Cloud Functions for Firebase to detect
export { generateQuiz };
export { submitQuiz };
export { deleteQuiz }; // ⭐ NEW: Export deleteQuiz