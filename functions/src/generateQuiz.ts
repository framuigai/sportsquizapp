// functions/src/generateQuiz.ts

import { onRequest, Request, Response } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Firebase Admin SDK
initializeApp();
const db = getFirestore();

// Securely fetch Gemini API key from Secret Manager
async function getGeminiApiKey() {
  const client = new SecretManagerServiceClient();
  const [version] = await client.accessSecretVersion({
    name: 'projects/sportsquiz-3bb45/secrets/GEMINI_API_KEY/versions/latest'
  });
  return version.payload?.data?.toString();
}

// Main handler
export const generateQuiz = onRequest({ cors: true }, async (req: Request, res: Response) => {
  try {
    const { title, category, difficulty, team, event, country, createdBy } = req.body;

    // Basic validation for category
    if (!category || typeof category !== 'string' || category.trim() === '') {
      logger.warn("Received quiz generation request with invalid category:", req.body);
      return res.status(400).json({ error: "Category is required and must be a non-empty string." });
    }

    const apiKey = await getGeminiApiKey();
    if (!apiKey) {
      logger.error("Gemini API key not found in Secret Manager.");
      throw new Error('Gemini API key not found');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are a professional sports quiz generator. Generate exactly 5 multiple-choice questions about ${category || "sports"}${difficulty ? ` with ${difficulty} difficulty` : ""}${team ? ` focused on ${team}` : ""}${event ? ` about the ${event}` : ""}${country ? ` in ${country}` : ""}.

For each question, provide exactly 4 plausible options (A, B, C, D) and clearly indicate which one is correct.

Format your response as a JSON array of exactly 5 objects, each with these exact properties:
[
  {
    "question": "Your question here",
    "options": ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"],
    "answer": "A" // Must be one of A, B, C, or D
  }
]

IMPORTANT RULES:
1. Return ONLY the JSON array - no other text or explanations
2. Each question must be unique and relevant to the topic
3. Options must be plausible but only one can be correct
4. Questions should be challenging but fair
5. Format must be strictly JSON-parseable

Example output (do NOT include this example in your response):
[
  {
    "question": "Which team won the 2023 World Cup?",
    "options": ["A. Brazil", "B. Germany", "C. Argentina", "D. France"],
    "answer": "C"
  }
]`;

    const result = await model.generateContent(prompt, {
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const response = result.response;
    const rawText = await response.text();
    logger.info("RAW GEMINI RESPONSE:", rawText);

    let cleanedText = rawText.trim();
    if (cleanedText.startsWith('```json')) cleanedText = cleanedText.slice(7);
    if (cleanedText.endsWith('```')) cleanedText = cleanedText.slice(0, -3);
    cleanedText = cleanedText.trim();

    let questionsRaw: any[];
    try {
      questionsRaw = JSON.parse(cleanedText);
    } catch (e) {
      logger.error("Failed to parse Gemini output as JSON.", { rawOutput: cleanedText, parseError: e });
      return res.status(500).json({ error: "Invalid JSON format from Gemini. Check function logs." });
    }

    if (!Array.isArray(questionsRaw)) {
      logger.error("Invalid response format: Expected array but got", typeof questionsRaw, { rawOutput: questionsRaw });
      return res.status(500).json({ error: "Invalid response format: Expected array of questions." });
    }

    if (questionsRaw.length !== 5) {
      logger.error(`Wrong number of questions: Expected 5 but got ${questionsRaw.length}`, { questions: questionsRaw });
      return res.status(500).json({
        error: `Invalid number of questions: Expected exactly 5 questions but got ${questionsRaw.length}.`
      });
    }

    const invalidQuestions = questionsRaw.filter((q: any, index: number) => {
      const isValid =
        typeof q.question === 'string' && q.question.trim().length > 0 &&
        Array.isArray(q.options) && q.options.length === 4 &&
        q.options.every((opt: any) => typeof opt === 'string' && opt.trim().length > 0) &&
        typeof q.answer === 'string' && ['A', 'B', 'C', 'D'].includes(q.answer);

      if (!isValid) {
        logger.error(`Question ${index + 1} is invalid:`, q);
      }
      return !isValid;
    });

    if (invalidQuestions.length > 0) {
      logger.error(`Found ${invalidQuestions.length} invalid questions in the response`, { invalidQuestions });
      return res.status(500).json({
        error: `Some questions in the response are invalid. ${invalidQuestions.length} questions failed validation. Check function logs.`
      });
    }

    const questions = questionsRaw.map((q: any, i: number) => ({
      id: `q${i + 1}`,
      text: q.question,
      type: 'multiple_choice',
      options: q.options,
      correctAnswer: q.answer
    }));

    // CRITICAL NEW LOG: Log the final 'quiz' object BEFORE sending it to the client
    const quiz = {
      id: db.collection('quizzes').doc().id,
      title: title || `Generated Quiz - ${category || 'Sports'}`,
      category: category || 'sports',
      difficulty: difficulty || 'medium',
      event: event || '',
      team: team || '',
      country: country || '',
      questions, // This should now be a valid array of questions, containing 5 items
      createdAt: Date.now(),
      createdBy: createdBy || 'anonymous'
    };

    logger.info("FINAL QUIZ OBJECT SENT TO CLIENT:", JSON.stringify(quiz, null, 2)); // Stringify for readability

    await db.collection('quizzes').doc(quiz.id).set(quiz);

    return res.status(200).json({ quiz });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
    logger.error("Quiz generation failed:", { message: errorMessage, stack: err instanceof Error ? err.stack : 'No stack' });
    return res.status(500).json({ error: errorMessage });
  }
});