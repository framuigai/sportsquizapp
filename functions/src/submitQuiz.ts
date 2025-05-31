// functions/src/submitQuiz.ts
import * as functions from 'firebase-functions'; // ⭐ KEEP THIS: Still needed for functions.https.HttpsError and functions.logger
import { onCall } from 'firebase-functions/v2/https'; // ⭐ CHANGE: Import onCall directly from v2/https
import * as admin from 'firebase-admin'; // For Firestore and FieldValue
// No explicit logger import needed if you use functions.logger directly


const db = admin.firestore(); // Get Firestore instance

// Define interfaces for clarity and type safety
interface UserSelectedAnswerForFunction {
    questionId: string;
    selectedOption: string; // e.g., 'A', 'B', 'C', 'D' or 'True'/'False'
}

interface QuizSubmissionData {
    quizId: string;
    userAnswers: UserSelectedAnswerForFunction[];
    quizStartTime: number; // To calculate time spent (frontend timestamp)
}

// Structure for the questions stored in Firestore, including the correct answer
interface StoredQuestion {
    id: string;
    text: string;
    type: 'multiple_choice' | 'true_false';
    options?: string[]; // e.g., ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"]
    correctAnswer: string; // e.g., 'A', 'B', 'C', 'D' or 'True'/'False'
}

// Structure for the quiz as stored in Firestore
interface StoredQuiz {
    id: string;
    title: string;
    questions: StoredQuestion[];
    // ... other quiz properties like category, difficulty etc.
}

// Interface for what we want to store for a single quiz attempt in Firestore
interface QuizAttemptData {
    id: string; // Storing the document ID within the document for easier access
    userId: string; // Changed from 'uid' to 'userId' for consistency
    quizId: string;
    score: number; // Only storing correct count for score
    totalQuestions: number;
    answers: { // Simplified to match frontend QuizAttempt['answers'] type
        questionId: string;
        userAnswer: string;
        correctAnswer: string;
        isCorrect: boolean;
    }[];
    timeSpent: number; // Changed from timeSpentSeconds for consistency with frontend type
    completedAt: admin.firestore.FieldValue; // Use server timestamp for consistency and accuracy
}


// Cloud Function handler for submitting a quiz (using onCall from v2)
// ⭐ CHANGE: Use onCall directly from the v2 import and specify region in the config object
export const submitQuiz = onCall({ region: 'us-central1' }, async (event) => { // 'event' now contains data and auth
    // --- Explanation 1: onCall functions use `event.auth` for authentication, not `context.auth`.
    // The `declare module 'express-serve-static-core'` and `Request` type extensions
    // are ONLY for `onRequest` functions and are not needed here.
    const userId = event.auth?.uid; // Access auth from event.auth
    if (!userId) {
        // --- Explanation 2: Throw HttpsError for client-side SDK to catch
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required. User not logged in.');
    }

    // --- Explanation 3: Input validation for onCall functions
    // `event.data` is already parsed by the SDK, so direct property access is safe.
    const data: QuizSubmissionData = event.data as QuizSubmissionData; // Cast event.data to your expected type
    const { quizId, userAnswers, quizStartTime } = data;

    if (!quizId || !Array.isArray(userAnswers) || userAnswers.length === 0 || !quizStartTime) {
        throw new functions.https.HttpsError('invalid-argument', 'quizId, userAnswers (non-empty array), and quizStartTime are required.');
    }

    try {
        // 1. Fetch the original quiz from Firestore to get the authoritative correct answers
        const quizDocRef = db.collection('quizzes').doc(quizId);
        const quizDoc = await quizDocRef.get();

        if (!quizDoc.exists) {
            functions.logger.warn(`Quiz with ID ${quizId} not found for submission by user ${userId}.`);
            throw new functions.https.HttpsError('not-found', "Quiz not found.");
        }

        const quizData = quizDoc.data() as StoredQuiz;
        if (!quizData || !Array.isArray(quizData.questions) || quizData.questions.length === 0) {
            functions.logger.error(`Quiz data for ID ${quizId} is malformed or missing questions for user ${userId}. Data: ${JSON.stringify(quizData)}`);
            throw new functions.https.HttpsError('internal', "Quiz data is invalid on server. Cannot score.");
        }

        const quizQuestions: StoredQuestion[] = quizData.questions;
        const totalQuestions = quizQuestions.length;

        // 2. Initialize counters and details for review
        let correctCount = 0;
        const attemptDetails: QuizAttemptData['answers'] = []; // Renamed to 'answers' to match frontend QuizAttempt type

        // Create a map for quick lookup of correct answers
        const correctAnswersMap = new Map<string, string>();
        quizQuestions.forEach(q => {
            correctAnswersMap.set(q.id, q.correctAnswer.toString());
        });

        // 3. Compare user answers with correct answers
        for (const userAnswer of userAnswers) {
            const questionId = userAnswer.questionId;
            const selectedOption = userAnswer.selectedOption;

            const correctOption = correctAnswersMap.get(questionId);

            if (correctOption !== undefined) {
                const isCorrect = selectedOption === correctOption;
                if (isCorrect) {
                    correctCount++;
                }
                attemptDetails.push({
                    questionId: questionId,
                    userAnswer: selectedOption, // Use userAnswer to match frontend
                    correctAnswer: correctOption,
                    isCorrect: isCorrect
                });
            } else {
                functions.logger.warn(`User ${userId} submitted answer for unknown question ID: ${questionId} in quiz ${quizId}`);
                // Include in attemptDetails even if question is not found, marking as incorrect
                attemptDetails.push({
                    questionId: questionId,
                    userAnswer: selectedOption,
                    correctAnswer: 'N/A (Question Not Found)',
                    isCorrect: false,
                });
            }
        }

        // Calculate incorrect count based on total questions in quiz vs correct answers
        // This assumes all questions were attempted or unattempted questions count as incorrect.
        const incorrectCount = totalQuestions - correctCount;
        const timeSpentSeconds = Math.round((Date.now() - quizStartTime) / 1000);

        // 4. Prepare data for quiz attempt storage
        // Use an auto-generated ID for the document, then store it inside the document as 'id'
        const newAttemptRef = db.collection('quizAttempts').doc(); // Create new document reference

        const quizAttemptData: QuizAttemptData = {
            id: newAttemptRef.id, // The ID of the Firestore document
            userId: userId,
            quizId: quizId,
            score: correctCount, // Store just the correct count as the main score
            totalQuestions: totalQuestions,
            answers: attemptDetails, // detailed review
            timeSpent: timeSpentSeconds,
            completedAt: admin.firestore.FieldValue.serverTimestamp(), // Use server timestamp
        };

        // 5. Store the quiz attempt in Firestore
        await newAttemptRef.set(quizAttemptData);
        functions.logger.info(`User ${userId} completed quiz ${quizId}. Score: ${correctCount}/${totalQuestions}. Attempt ID: ${newAttemptRef.id}`);

        // 6. Return the result back to the frontend (matches FrontendBackendSubmitResponse)
        return {
            message: "Quiz submitted successfully!",
            score: {
                correct: correctCount,
                incorrect: incorrectCount,
                total: totalQuestions
            },
            attemptId: newAttemptRef.id,
            reviewDetails: attemptDetails.map(detail => ({ // Map to frontend reviewDetails structure
                questionId: detail.questionId,
                selectedOption: detail.userAnswer, // Match frontend's 'selectedOption'
                correctOption: detail.correctAnswer,
                isCorrect: detail.isCorrect
            })),
            timeSpentSeconds: timeSpentSeconds // Match frontend's 'timeSpentSeconds'
        };

    } catch (error: unknown) {
        // --- Explanation 4: Catch errors and re-throw as HttpsError
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        functions.logger.error("Error in submitQuiz function:", { error: errorMessage, stack: error instanceof Error ? error.stack : 'N/A' });

        if (error instanceof functions.https.HttpsError) {
            throw error; // Re-throw existing HttpsErrors
        } else {
            // For any other unexpected errors, throw a generic internal error
            throw new functions.https.HttpsError('internal', 'An unexpected error occurred during quiz submission.', errorMessage);
        }
    }
});