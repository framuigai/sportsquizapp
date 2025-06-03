// functions/src/generateQuiz.ts
// Changed import from v1 to v2 for onCall
import { onCall, CallableRequest } from 'firebase-functions/v2/https';
// Keep this import for functions.logger and functions.https.HttpsError
import * as functions from 'firebase-functions';

// 🛑🛑🛑 IMPORTANT FIX FOR "admin.firestore is not a function" 🛑🛑🛑
// Instead of importing all of 'firebase-admin' and relying on default exports,
// we import specific functions from their modular paths.
// 'getApp()' is used to retrieve the default app instance that was initialized in index.ts.
import { getApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore'; // Specifically import getFirestore and FieldValue
import { getAuth } from 'firebase-admin/auth'; // Specifically import getAuth

// We keep the main 'admin' import for things like admin.firestore.FieldValue,
// but it's often better to import FieldValue directly as shown above.
// For consistency, let's stick with the modular imports for services.
// Note: 'admin' itself is still useful for types or if you absolutely need the whole namespace for other utilities not covered by modular imports.
// For this error, the key is using getFirestore() and getAuth().
// 🛑🛑🛑 END IMPORTANT FIX 🛑🛑🛑

import { GoogleGenerativeAI, GenerateContentRequest } from "@google/generative-ai";
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

// Securely fetch Gemini API key
let geminiApiKey: string | undefined;
async function getGeminiApiKey(): Promise<string | undefined> {
  if (geminiApiKey) return geminiApiKey; // Memoize the key
  const client = new SecretManagerServiceClient();
  try {
    const [version] = await client.accessSecretVersion({
      name: 'projects/sportsquiz-3bb45/secrets/GEMINI_API_KEY/versions/latest'
    });
    geminiApiKey = version.payload?.data?.toString();
    return geminiApiKey;
  } catch (error: unknown) {
    let errorMessage = 'Unknown error accessing Secret Manager';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    functions.logger.error("Failed to access Secret Manager for Gemini API Key:", errorMessage);
    return undefined;
  }
}

// Define expected request body from client for onCall
interface QuizGenerationCallableRequest {
  title?: string;
  category: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  numberOfQuestions: number;
  team?: string;
  event?: string;
  country?: string;
  visibility?: 'global' | 'private'; // Optional visibility for admins
}

// Define Gemini output structure
interface GeminiQuestion {
  question: string;
  options: string[];
  answer: string;
}

// Use onCall from v2, with corrected signature
export const generateQuiz = onCall({ region: 'us-central1' }, async (request: CallableRequest<QuizGenerationCallableRequest>) => {
  // 🛑🛑🛑 FIX: Get the initialized app and then services from it 🛑🛑🛑
  const app = getApp(); // Get the default Firebase app initialized in index.ts
  const db = getFirestore(app); // Get Firestore instance from the app
  const authService = getAuth(app); // Get Auth instance from the app (renamed to avoid conflict with request.auth)
  // 🛑🛑🛑 END FIX 🛑🛑🛑

  // Destructure data and auth from the single request object
  const { data } = request;
  const requestAuth = request.auth; // auth from the client request

  // 1. Authentication Check
  if (!requestAuth) { // Check if auth exists from the request
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  const userId = requestAuth.uid; // Access uid from auth

  // ⭐ NEW: Fetch user's custom claims to check for admin status ⭐
  let isAdmin = false;
  try {
    const userRecord = await authService.getUser(userId); // 🛑 FIX: Use authService here 🛑
    isAdmin = userRecord.customClaims ? (userRecord.customClaims as { admin?: boolean }).admin === true : false;
  } catch (err: unknown) {
    let errorMessage = 'Unknown error fetching custom claims';
    if (err instanceof Error) {
      errorMessage = err.message;
    }
    functions.logger.warn(`Could not fetch custom claims for user ${userId}: ${errorMessage}`);
  }

  // 2. Validate input from data (payload)
  const { category, difficulty, numberOfQuestions, team, event, country, title } = data;
  const requestedVisibility = data.visibility || 'private';

  if (!category || typeof category !== 'string' || category.trim() === '') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Category is required and must be a non-empty string.'
    );
  }
  // Corrected the redundant condition
  if (!numberOfQuestions || typeof numberOfQuestions !== 'number' || numberOfQuestions < 1 || numberOfQuestions > 20) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Number of questions is required and must be between 1 and 20.'
    );
  }

  // 3. Determine final visibility based on user role and request
  const finalVisibility: 'private' | 'global' =
    isAdmin && requestedVisibility === 'global' ? 'global' : 'private';

  const apiKey = await getGeminiApiKey();
  if (!apiKey) {
    functions.logger.error("Gemini API key not found during function execution.");
    throw new functions.https.HttpsError('internal', 'Server configuration error: Gemini API key missing.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const promptText = `You are a professional sports quiz generator. Generate exactly ${numberOfQuestions} multiple-choice questions about ${category}${difficulty ? ` with ${difficulty} difficulty` : ""}${team ? ` focused on ${team}` : ""}${event ? ` about the ${event}` : ""}${country ? ` in ${country}` : ""}.

Each question must have:
- A field "question" (string),
- A field "options" (array of 4 strings formatted "A. ..", "B. .." etc.),
- A field "answer" (string, one of "A", "B", "C", or "D")

Return ONLY a JSON array of ${numberOfQuestions} such objects, parsable by JSON.parse(). DO NOT add explanations, markdown, or extra text.`;

  const generateContentRequest: GenerateContentRequest = {
    contents: [{ role: 'user', parts: [{ text: promptText }] }],
    generationConfig: {
      responseMimeType: "application/json",
    },
  };

  let text: string;
  try {
    const result = await model.generateContent(generateContentRequest);
    const response = result.response;
    text = await response.text();
  } catch (aiError: unknown) {
    let errorMessage = 'Unknown AI error';
    if (aiError instanceof Error) {
      errorMessage = aiError.message;
    } else if (typeof aiError === 'string') {
      errorMessage = aiError;
    }
    functions.logger.error("Gemini API call failed:", errorMessage);
    throw new functions.https.HttpsError('internal', 'Failed to generate quiz content from AI.');
  }

  functions.logger.info("RAW GEMINI RESPONSE:", text);

  let cleanedText = text.trim();
  if (cleanedText.startsWith('```json')) cleanedText = cleanedText.slice(7);
  if (cleanedText.endsWith('```')) cleanedText = cleanedText.slice(0, -3);
  cleanedText = cleanedText.trim();

  let questionsRaw: GeminiQuestion[];
  try {
    questionsRaw = JSON.parse(cleanedText);
  } catch (e: unknown) {
    let errorMessage = 'Unknown JSON parse error';
    if (e instanceof Error) {
      errorMessage = e.message;
    }
    functions.logger.error("Failed to parse JSON from Gemini:", { rawOutput: cleanedText, parseError: errorMessage });
    throw new functions.https.HttpsError('internal', "Invalid JSON format from AI. Please try again.");
  }

  if (!Array.isArray(questionsRaw) || questionsRaw.length !== numberOfQuestions) {
    functions.logger.error(`Expected ${numberOfQuestions} questions but got:`, questionsRaw.length, questionsRaw);
    throw new functions.https.HttpsError('internal', `AI did not return the expected number of questions or format.`);
  }

  const invalidQuestions = questionsRaw.filter((q, index) => {
    const isValid =
      typeof q.question === 'string' && q.question.trim().length > 0 &&
      Array.isArray(q.options) && q.options.length === 4 &&
      q.options.every(opt => typeof opt === 'string' && opt.trim().length > 0) &&
      typeof q.answer === 'string' && ['A', 'B', 'C', 'D'].includes(q.answer);

    if (!isValid) {
      functions.logger.error(`Invalid question at index ${index} from AI:`, q);
    }
    return !isValid;
  });

  if (invalidQuestions.length > 0) {
    throw new functions.https.HttpsError('internal', `Some generated questions were invalid.`);
  }

  const questions = questionsRaw.map((q, i) => ({
    id: `q${i + 1}`,
    text: q.question,
    type: 'multiple_choice',
    options: q.options,
    correctAnswer: q.answer
  }));

  const quizId = db.collection('quizzes').doc().id;
  const quizToSave = {
    id: quizId,
    title: title || `Generated Quiz - ${category}`,
    category,
    difficulty: difficulty || 'medium',
    event: event || '',
    team: team || '',
    country: country || '',
    questions,
    createdAt: FieldValue.serverTimestamp(), // 🛑 FIX: Use imported FieldValue 🛑
    createdBy: userId,
    visibility: finalVisibility,
  };

  functions.logger.info("Saving quiz to Firestore:", JSON.stringify(quizToSave, null, 2));
  await db.collection('quizzes').doc(quizId).set(quizToSave);

  return { quiz: quizToSave };
});