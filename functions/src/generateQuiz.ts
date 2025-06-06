// functions/src/generateQuiz.ts
// Changed import from v1 to v2 for onCall
import { onCall, CallableRequest } from 'firebase-functions/v2/https';
// Keep this import for functions.logger and functions.https.HttpsError
import * as functions from 'firebase-functions';

// 🛑🛑🛑 IMPORTANT FIX: Ensure modular imports are used for services from firebase-admin 🛑🛑🛑
import { getApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore'; // Specifically import getFirestore and FieldValue
import { getAuth } from 'firebase-admin/auth';

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

// --- MODIFICATION 1: Update QuizGenerationCallableRequest interface ---
// Define expected request body from client for onCall
interface QuizGenerationCallableRequest {
  title?: string;
  category: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  numberOfQuestions: number;
  team?: string;
  event?: string;
  country?: string;
  visibility?: 'global' | 'private';
  // ✅ NEW: Add quizType to the expected request payload
  quizType: 'multiple_choice' | 'true_false';
}

// Define Gemini output structure (No change needed here for this step)
interface GeminiQuestion {
  question: string;
  options: string[];
  answer: string;
}

// Use onCall from v2, with corrected signature
export const generateQuiz = onCall({ region: 'us-central1' }, async (request: CallableRequest<QuizGenerationCallableRequest>) => {
  const app = getApp();
  const db = getFirestore(app);
  const authService = getAuth(app);

  const { data } = request;
  const requestAuth = request.auth;

  // 1. Authentication Check
  if (!requestAuth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  const userId = requestAuth.uid;

  let isAdmin = false;
  try {
    const userRecord = await authService.getUser(userId);
    isAdmin = userRecord.customClaims ? (userRecord.customClaims as { admin?: boolean }).admin === true : false;
  } catch (err: unknown) {
    let errorMessage = 'Unknown error fetching custom claims';
    if (err instanceof Error) {
      errorMessage = err.message;
    }
    functions.logger.warn(`Could not fetch custom claims for user ${userId}: ${errorMessage}`);
  }

  // --- MODIFICATION 2: Destructure and Validate new quizType ---
  // 2. Validate input from data (payload)
  const { category, difficulty, numberOfQuestions, team, event, country, title, quizType } = data; // ✅ NEW: Destructure quizType
  const requestedVisibility = data.visibility || 'private';

  if (!category || typeof category !== 'string' || category.trim() === '') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Category is required and must be a non-empty string.'
    );
  }
  if (!numberOfQuestions || typeof numberOfQuestions !== 'number' || numberOfQuestions < 1 || numberOfQuestions > 20) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Number of questions is required and must be between 1 and 20.'
    );
  }
  // ✅ NEW: Validate quizType
  if (!quizType || !['multiple_choice', 'true_false'].includes(quizType)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Quiz type is required and must be "multiple_choice" or "true_false".'
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

  // --- MODIFICATION 3: Dynamically construct the Gemini prompt ---
  let questionFormatInstructions: string;
  let responseFormatInstructions: string;
  // REMOVE 'answerChoiceOptions' declaration, as it's not used directly
  // let answerChoiceOptions: string; // To specify options for validation later

  let expectedAnswers: string[]; // Define this to use for validation

  if (quizType === 'multiple_choice') {
    questionFormatInstructions = `multiple-choice questions. Each question must have exactly 4 options.`;
    responseFormatInstructions = `question (string), options (array of 4 strings, e.g., ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"]), and answer (string, one of "A", "B", "C", or "D").`;
    expectedAnswers = ['A', 'B', 'C', 'D']; // Use this for validation
  } else if (quizType === 'true_false') {
    questionFormatInstructions = `True/False questions. Each question must be a statement that is either definitively True or False.`;
    responseFormatInstructions = `question (string), options (array containing ONLY "True" and "False"), and answer (string, either "True" or "False").`;
    expectedAnswers = ['True', 'False']; // Use this for validation
  } else {
    // This case should ideally be caught by validation above, but as a fallback:
    throw new functions.https.HttpsError('invalid-argument', `Unsupported quizType: ${quizType}.`);
  }

  const promptText = `You are a professional sports quiz generator. Generate exactly ${numberOfQuestions} ${questionFormatInstructions} about ${category}${difficulty ? ` with ${difficulty} difficulty` : ""}${team ? ` focused on ${team}` : ""}${event ? ` about the ${event}` : ""}${country ? ` in ${country}` : ""}.

Return ONLY a JSON array of ${numberOfQuestions} such objects, parsable by JSON.parse(). Each object should have these properties: ${responseFormatInstructions} DO NOT add explanations, markdown, or extra text.`;

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

  // --- MODIFICATION 4: Update question validation and mapping for quizType ---
  const invalidQuestions = questionsRaw.filter((q, index) => {
    let isValid = typeof q.question === 'string' && q.question.trim().length > 0 &&
      Array.isArray(q.options) && q.options.every(opt => typeof opt === 'string' && opt.trim().length > 0);

    if (quizType === 'multiple_choice') {
      // Use expectedAnswers for validation here
      isValid = isValid && q.options.length === 4 && expectedAnswers.includes(q.answer);
    } else if (quizType === 'true_false') {
      // Use expectedAnswers for validation here
      isValid = isValid && q.options.length === 2 &&
        (q.options[0] === 'True' && q.options[1] === 'False' || q.options[0] === 'False' && q.options[1] === 'True') &&
        expectedAnswers.includes(q.answer);
    }

    if (!isValid) {
      functions.logger.error(`Invalid question at index ${index} from AI for type ${quizType}:`, q);
    }
    return !isValid;
  });

  if (invalidQuestions.length > 0) {
    throw new functions.https.HttpsError('internal', `Some generated questions were invalid for type ${quizType}.`);
  }

  const questions = questionsRaw.map((q) => ({ // REMOVED 'i' from here as it's unused
    id: db.collection('quizzes').doc().id, // Generate unique ID for each question
    text: q.question,
    type: quizType, // ✅ NEW: Assign the generated quizType to each question
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
    createdAt: FieldValue.serverTimestamp(),
    createdBy: userId,
    visibility: finalVisibility,
    // --- MODIFICATION 5: Add quizType to the saved Quiz object ---
    quizType: quizType // ✅ NEW: Store the type it was generated as in the database
  };

  functions.logger.info("Saving quiz to Firestore:", JSON.stringify(quizToSave, null, 2));
  await db.collection('quizzes').doc(quizId).set(quizToSave);

  // --- MODIFICATION 6: Ensure the full quizToSave object is returned ---
  return { quiz: quizToSave }; // Already correctly returning the object from your code!
});