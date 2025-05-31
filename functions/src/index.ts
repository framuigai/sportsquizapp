// functions/src/index.ts
import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from 'firebase-admin'; // ⭐ IMPORTANT: Import Firebase Admin SDK

// Initialize Firebase Admin SDK
// This is crucial for interacting with Firestore, Auth, etc.
if (!admin.apps.length) {
  admin.initializeApp();
}

// 👇 CHANGE HERE: Add .js to the relative import (for generateQuiz and submitQuiz)
import { generateQuiz } from "./generateQuiz.js"; // ✅ Import your Gemini function
import { submitQuiz } from "./submitQuiz.js";   // ⭐ NEW: Import your submitQuiz function

// Example function (if you still need it)
export const helloWorld = onRequest((request, response) => {
  logger.info("Hello logs!", { structuredData: true });
  response.send("Hello from Firebase!");
});

// ✅ Export all your Cloud Functions so Firebase deploys them
export { generateQuiz };
export { submitQuiz }; // ⭐ NEW: Export submitQuiz

/*
Explanation of changes:
1.  `import * as admin from 'firebase-admin';` and `admin.initializeApp();`:
    * These lines are absolutely critical for your Cloud Functions to interact with other Firebase services like Firestore. The `submitQuiz` function needs `admin.firestore()` to save quiz attempts. This initialization should happen once in your main entry point (`index.ts`).
2.  `import { submitQuiz } from "./submitQuiz.js";`:
    * This line imports the `submitQuiz` function from its separate file. This tells TypeScript (and the Firebase CLI) that `submitQuiz` is part of your project's functions.
    * We are using `.js` extension for explicit module resolution, especially when dealing with CommonJS output from TypeScript and Firebase's bundling process. While `tsc` often handles this implicitly, explicit `.js` can prevent subtle runtime issues.
3.  `export { submitQuiz };`:
    * This line explicitly exports `submitQuiz` from `index.ts`. **This is the primary reason your function wasn't being detected and deployed.** Firebase CLI scans this entry file (`index.ts` as specified in `package.json`'s `main` field) for exported functions. If it's not exported here, Firebase won't know to deploy it.

You will also need a `functions/src/submitQuiz.ts` file with the logic for `submitQuiz`, which we discussed in previous responses. Make sure that file exists and contains the `export const submitQuiz = functions.region('us-central1').https.onCall(...)` definition.
*/