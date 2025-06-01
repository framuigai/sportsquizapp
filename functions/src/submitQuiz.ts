// functions/src/submitQuiz.ts
import * as functions from 'firebase-functions'; // Still needed for functions.https.HttpsError
import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin'; // For Firestore and FieldValue
// No explicit logger import needed if you use functions.logger directly (which we do)

// REMOVED: if (!admin.apps.length) { admin.initializeApp(); }
// This initialization is handled globally in functions/src/index.ts

// Define interfaces for clarity and type safety
interface UserSelectedAnswerForFunction {
    questionId: string;
    selectedOption: string; // e.g., 'A. Option Text' or 'True'/'False'
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
    correctAnswer: string; // e.g., 'A', 'B', 'C', 'D' or 'True'/'False' (should be just the letter/boolean value)
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
    userId: string;
    quizId: string;
    score: number; // Only storing correct count for score
    totalQuestions: number;
    answers: { // Simplified to match frontend QuizAttempt['answers'] type
        questionId: string;
        userAnswer: string; // The full string the user selected, e.g., "A. Option Text"
        correctAnswer: string; // The actual correct option (e.g., 'A' or 'True')
        isCorrect: boolean;
    }[];
    timeSpent: number;
    completedAt: admin.firestore.FieldValue; // Use server timestamp for consistency and accuracy
}


// Cloud Function handler for submitting a quiz (using onCall from v2)
export const submitQuiz = onCall({ region: 'us-central1' }, async (event) => {
    // Initialize Firestore instance inside the function handler
    // This ensures admin.initializeApp() has run.
    const db = admin.firestore();

    const userId = event.auth?.uid;
    if (!userId) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required. User not logged in.');
    }

    const data: QuizSubmissionData = event.data as QuizSubmissionData;
    const { quizId, userAnswers, quizStartTime } = data;

    if (!quizId || !Array.isArray(userAnswers) || userAnswers.length === 0 || !quizStartTime) {
        throw new functions.https.HttpsError('invalid-argument', 'quizId, userAnswers (non-empty array), and quizStartTime are required.');
    }

    try {
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

        let correctCount = 0;
        const attemptDetails: QuizAttemptData['answers'] = [];

        const correctAnswersMap = new Map<string, string>();
        quizQuestions.forEach(q => {
            // Ensure correctAnswer is consistently stored as just the letter/value (e.g., 'A', 'True')
            correctAnswersMap.set(q.id, q.correctAnswer.toString());
        });

        for (const userAnswer of userAnswers) {
            const questionId = userAnswer.questionId;
            const selectedOption = userAnswer.selectedOption; // This will be "A. Option Text" or "True"/"False"

            const correctOption = correctAnswersMap.get(questionId); // This should be "A" or "True"/"False"

            if (correctOption !== undefined) {
                let isCorrect: boolean;

                // ⭐ NEW LOGIC STARTS HERE ⭐
                // We need to parse the user's selectedOption to get just the 'A', 'B', 'C', 'D', 'True', or 'False'
                if (quizQuestions.find(q => q.id === questionId)?.type === 'multiple_choice') {
                    // For multiple choice, assume format "A. Option Text" and extract 'A'
                    const userSelectedLetter = selectedOption.charAt(0);
                    isCorrect = userSelectedLetter === correctOption;
                } else if (quizQuestions.find(q => q.id === questionId)?.type === 'true_false') {
                    // For true/false, direct comparison should work if both are "True" or "False"
                    isCorrect = selectedOption === correctOption;
                } else {
                    // Fallback for unknown types or malformed data - assume incorrect
                    isCorrect = false;
                    functions.logger.warn(`Unknown question type or malformed answer for question ID: ${questionId}`);
                }
                // ⭐ NEW LOGIC ENDS HERE ⭐

                if (isCorrect) {
                    correctCount++;
                }
                attemptDetails.push({
                    questionId: questionId,
                    userAnswer: selectedOption, // Keep the full string the user selected for review
                    correctAnswer: correctOption, // Keep the concise correct answer for review
                    isCorrect: isCorrect
                });
            } else {
                functions.logger.warn(`User ${userId} submitted answer for unknown question ID: ${questionId} in quiz ${quizId}`);
                attemptDetails.push({
                    questionId: questionId,
                    userAnswer: selectedOption,
                    correctAnswer: 'N/A (Question Not Found)',
                    isCorrect: false,
                });
            }
        }

        const incorrectCount = totalQuestions - correctCount;
        const timeSpentSeconds = Math.round((Date.now() - quizStartTime) / 1000);

        const newAttemptRef = db.collection('quizAttempts').doc();

        const quizAttemptData: QuizAttemptData = {
            id: newAttemptRef.id,
            userId: userId,
            quizId: quizId,
            score: correctCount,
            totalQuestions: totalQuestions,
            answers: attemptDetails,
            timeSpent: timeSpentSeconds,
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        await newAttemptRef.set(quizAttemptData);
        functions.logger.info(`User ${userId} completed quiz ${quizId}. Score: ${correctCount}/${totalQuestions}. Attempt ID: ${newAttemptRef.id}`);

        return {
            message: "Quiz submitted successfully!",
            score: {
                correct: correctCount,
                incorrect: incorrectCount,
                total: totalQuestions
            },
            attemptId: newAttemptRef.id,
            reviewDetails: attemptDetails.map(detail => ({
                questionId: detail.questionId,
                selectedOption: detail.userAnswer,
                correctOption: detail.correctAnswer,
                isCorrect: detail.isCorrect
            })),
            timeSpentSeconds: timeSpentSeconds
        };

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        functions.logger.error("Error in submitQuiz function:", { error: errorMessage, stack: error instanceof Error ? error.stack : 'N/A' });

        if (error instanceof functions.https.HttpsError) {
            throw error;
        } else {
            throw new functions.https.HttpsError('internal', 'An unexpected error occurred during quiz submission.', errorMessage);
        }
    }
});