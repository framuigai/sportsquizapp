// functions/src/index.ts

import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
// REMOVED: import * as admin from "firebase-admin"; // This line is no longer needed in index.ts if 'admin' is not directly used here
import { initializeApp } from 'firebase-admin/app'; // This is what we use for initialization

// ✅ Initialize Firebase Admin SDK only once
initializeApp(); // Call initializeApp directly from the specific import

// ✅ Import Gen2 callable functions with .js extension after build
import { generateQuiz } from "./generateQuiz.js";
import { submitQuiz } from "./submitQuiz.js";

// ✅ Test function for emulator verification
export const helloWorld = onRequest((request, response) => {
  logger.info("Hello logs!", { structuredData: true });
  response.send("Hello from Firebase!");
});

// ✅ Export your callable Cloud Functions for Firebase to detect
export { generateQuiz };
export { submitQuiz };

