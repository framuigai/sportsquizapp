// functions/src/deleteQuiz.ts
// ⭐ IMPORT FOR V2 CALLABLE FUNCTIONS ⭐
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger'; // ⭐ NEW: Import logger for v2

// IMPORTANT: Admin SDK is typically initialized in index.ts for v2 projects,
// so you don't need the 'if (!admin.apps.length) { admin.initializeApp(); }' here.
// Assuming initializeApp(); is called once in functions/src/index.ts.

/**
 * Callable Cloud Function to delete a quiz (Cloud Functions v2).
 * Only administrators can delete quizzes, and only if the quiz's visibility is 'global'.
 */
export const deleteQuiz = onCall(async (request) => { // ⭐ V2 callable: 'request' object contains data and context
  // 1. Authentication Check
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The request is not authenticated. Please log in.');
  }

  // 2. Authorization Check: Is the user an administrator?
  // request.auth.token contains user claims
  if (!request.auth.token || !request.auth.token.admin) {
    throw new HttpsError('permission-denied', 'You do not have permission to delete quizzes. Only administrators can perform this action.');
  }

  // 3. Input Validation: data is now on request.data
  const quizId = request.data.quizId; // ⭐ V2: data is accessed via request.data

  if (typeof quizId !== 'string' || quizId.trim() === '') {
    throw new HttpsError('invalid-argument', 'The `quizId` is required and must be a non-empty string.');
  }

  try {
    const quizRef = admin.firestore().collection('quizzes').doc(quizId);
    const quizDoc = await quizRef.get();

    // 4. Existence Check
    if (!quizDoc.exists) {
      throw new HttpsError('not-found', `Quiz with ID ${quizId} not found.`);
    }

    const quizData = quizDoc.data();

    // 5. Authorization Check: Is the quiz 'global'?
    if (quizData && quizData.visibility !== 'global') {
      throw new HttpsError('permission-denied', `You can only delete global quizzes. Quiz ${quizId} is not global.`);
    }

    // 6. Perform Deletion
    await quizRef.delete();

    // ⭐ V2 logging uses the imported logger ⭐
    logger.info(`Admin ${request.auth.uid} successfully deleted global quiz ${quizId}.`);

    return { success: true, message: `Quiz ${quizId} successfully deleted.` };

  } catch (error: any) {
    if (error instanceof HttpsError) {
      throw error;
    }
    logger.error(`Error deleting quiz ${quizId} by admin ${request.auth.uid}:`, error); // ⭐ V2 logging
    throw new HttpsError('internal', `Failed to delete quiz: ${error.message}`);
  }
});