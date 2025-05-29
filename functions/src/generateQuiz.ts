import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Firebase Admin SDK
initializeApp();

// Access Gemini API key securely using Secret Manager
async function getGeminiApiKey() {
  const client = new SecretManagerServiceClient();
  const [version] = await client.accessSecretVersion({
    name: 'projects/sportsquiz-3bb45/secrets/GEMINI_API_KEY/versions/latest'
  });
  return version.payload?.data?.toString();
}

// Main quiz generation function
export const generateQuiz = onRequest({ cors: true }, async (req, res) => {
  try {
    const { category, difficulty, team, event } = req.body;

    const apiKey = await getGeminiApiKey();
    if (!apiKey) throw new Error('Gemini API key not found');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash", // Or "gemini-1.5-pro"
    });

    // ✨ PROMPT REFINEMENT: Emphasize ONLY JSON output
    const prompt = `Generate 5 sports quiz questions about ${category || "sports"}${difficulty ? ` with ${difficulty} difficulty` : ""}${team ? ` focused on ${team}` : ""}${event ? ` about the ${event}` : ""}.
Each question should be a JSON object with:
{
  "question": "Your question here",
  "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
  "answer": "A" // The correct option letter, e.g., "A", "B", "C", or "D"
}
Strictly return an array of 5 such JSON objects.
DO NOT include any conversational text, markdown formatting (like '''json), or extra characters outside the JSON array.
Respond ONLY with the JSON array.`;

    const result = await model.generateContent(prompt);
    // Use response.text() directly, but prepare for it to be non-JSON
    const text = await result.response.text();

    try {
      // ✨ PARSING REFINEMENT:
      // 1. Trim whitespace
      let cleanedText = text.trim();
      // 2. Remove leading/trailing markdown fences if they appear despite prompt
      if (cleanedText.startsWith('```json')) {
          cleanedText = cleanedText.substring('```json'.length);
      }
      if (cleanedText.endsWith('```')) {
          cleanedText = cleanedText.substring(0, cleanedText.length - '```'.length);
      }
      // 3. Trim again after removing fences
      cleanedText = cleanedText.trim();

      const quiz = JSON.parse(cleanedText); // Try to parse the cleaned text

      // Add a check to ensure it's an array and not empty, and has expected structure
      if (!Array.isArray(quiz) || quiz.length === 0 || !quiz[0].question) {
        logger.error("Gemini returned a non-array, empty, or malformed quiz structure:", cleanedText);
        res.status(500).send({ error: "Gemini returned invalid or empty quiz format after parsing." });
        return;
      }

      res.status(200).json({ quiz });
    } catch (parseErr) {
      logger.error("Failed to parse Gemini response as JSON:", parseErr, "Raw text received:", text);
      res.status(500).send({ error: "Gemini returned invalid JSON format. Check logs for raw response." });
    }

  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error("Unknown error occurred during quiz generation.");
    logger.error("Quiz generation failed:", error.message, error.stack);
    res.status(500).send({ error: error.message });
  }
});