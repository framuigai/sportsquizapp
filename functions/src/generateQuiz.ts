import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { GoogleGenerativeAI, GenerateContentRequest } from "@google/generative-ai";

// Initialize Firebase Admin SDK
initializeApp();
const db = getFirestore();

// Define expected request body
interface QuizGenerationRequestBody {
  title?: string;
  category: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  team?: string;
  event?: string;
  country?: string;
  createdBy?: string;
}

// Define Gemini output structure
interface GeminiQuestion {
  question: string;
  options: string[];
  answer: string;
}

// Securely fetch Gemini API key
async function getGeminiApiKey(): Promise<string | undefined> {
  const client = new SecretManagerServiceClient();
  const [version] = await client.accessSecretVersion({
    name: 'projects/sportsquiz-3bb45/secrets/GEMINI_API_KEY/versions/latest'
  });
  return version.payload?.data?.toString();
}

// Cloud Function handler
export const generateQuiz = onRequest({ cors: true }, async (req, res) => {
  try {
    const {
      title,
      category,
      difficulty,
      team,
      event,
      country,
      createdBy
    } = req.body as QuizGenerationRequestBody;

    if (!category || typeof category !== 'string' || category.trim() === '') {
      logger.warn("Invalid or missing category in request:", req.body);
      res.status(400).json({ error: "Category is required and must be a non-empty string." });
      return;
    }

    const apiKey = await getGeminiApiKey();
    if (!apiKey) {
      logger.error("Gemini API key not found.");
      res.status(500).json({ error: 'Gemini API key not found' });
      return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const promptText = `You are a professional sports quiz generator. Generate exactly 5 multiple-choice questions about ${category}${difficulty ? ` with ${difficulty} difficulty` : ""}${team ? ` focused on ${team}` : ""}${event ? ` about the ${event}` : ""}${country ? ` in ${country}` : ""}.

Each question must have:
- A field "question" (string),
- A field "options" (array of 4 strings formatted "A. ..", "B. .." etc.),
- A field "answer" (string, one of "A", "B", "C", or "D")

Return ONLY a JSON array of 5 such objects, parsable by JSON.parse(). DO NOT add explanations, markdown, or extra text.`;

    const generateContentRequest: GenerateContentRequest = {
      contents: [{ role: 'user', parts: [{ text: promptText }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    };

    const result = await model.generateContent(generateContentRequest);
    const response = result.response;
    const rawText = await response.text();

    logger.info("RAW GEMINI RESPONSE:", rawText);

    let cleanedText = rawText.trim();
    if (cleanedText.startsWith('```json')) cleanedText = cleanedText.slice(7);
    if (cleanedText.endsWith('```')) cleanedText = cleanedText.slice(0, -3);
    cleanedText = cleanedText.trim();

    let questionsRaw: GeminiQuestion[];
    try {
      questionsRaw = JSON.parse(cleanedText);
    } catch (e) {
      logger.error("Failed to parse JSON from Gemini:", { rawOutput: cleanedText, parseError: e });
      res.status(500).json({ error: "Invalid JSON format from Gemini." });
      return;
    }

    if (!Array.isArray(questionsRaw) || questionsRaw.length !== 5) {
      logger.error("Expected 5 questions but got:", questionsRaw.length, questionsRaw);
      res.status(500).json({ error: "Expected exactly 5 quiz questions from Gemini." });
      return;
    }

    const invalidQuestions = questionsRaw.filter((q, index) => {
      const isValid =
        typeof q.question === 'string' && q.question.trim().length > 0 &&
        Array.isArray(q.options) && q.options.length === 4 &&
        q.options.every(opt => typeof opt === 'string' && opt.trim().length > 0) &&
        typeof q.answer === 'string' && ['A', 'B', 'C', 'D'].includes(q.answer);

      if (!isValid) {
        logger.error(`Invalid question at index ${index}:`, q);
      }

      return !isValid;
    });

    if (invalidQuestions.length > 0) {
      res.status(500).json({ error: `Some questions failed validation: ${invalidQuestions.length}` });
      return;
    }

    const questions = questionsRaw.map((q, i) => ({
      id: `q${i + 1}`,
      text: q.question,
      type: 'multiple_choice',
      options: q.options,
      correctAnswer: q.answer
    }));

    const quiz = {
      id: db.collection('quizzes').doc().id,
      title: title || `Generated Quiz - ${category}`,
      category,
      difficulty: difficulty || 'medium',
      event: event || '',
      team: team || '',
      country: country || '',
      questions,
      createdAt: Date.now(),
      createdBy: createdBy || 'anonymous'
    };

    logger.info("Saving quiz to Firestore:", JSON.stringify(quiz, null, 2));
    await db.collection('quizzes').doc(quiz.id).set(quiz);

    res.status(200).json({ quiz });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
    logger.error("Quiz generation failed:", { message: errorMessage, stack: err instanceof Error ? err.stack : 'No stack' });
    res.status(500).json({ error: errorMessage });
  }
});
