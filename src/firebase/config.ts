// src/firebase/config.ts

// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyA9YITPAchzNoXIdK04lUiXvHASHFRIqRU",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "sportsquiz-3bb45.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "sportsquiz-3bb45",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "sportsquiz-3bb45.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "286235337450",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:286235337450:web:c33f0209673beb644f2d93",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-JH7L38FEBV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app; // This is the crucial line: it's a default export