import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
// 👇 CHANGE HERE: Add .js to the relative import
import { generateQuiz } from "./generateQuiz.js"; // ✅ Import your Gemini function

// Example function
export const helloWorld = onRequest((request, response) => {
  logger.info("Hello logs!", { structuredData: true });
  response.send("Hello from Firebase!");
});

// ✅ Export your Gemini function so Firebase deploys it
export { generateQuiz };