/**
 * firebase-config.js
 * RDroid Apps – Firebase v12 Modular Initialization
 * 
 * This module exports the initialized Firebase app, authentication, and Firestore instances.
 * Uses ES6 imports for Firebase v12 modular SDK.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyC_vKbdt67CYM688qIxCeRkpGbiDd2zPps",
  authDomain: "webpage-ce86a.firebaseapp.com",
  projectId: "webpage-ce86a",
  storageBucket: "webpage-ce86a.appspot.com",
  messagingSenderId: "812782691840",
  appId: "1:812782691840:web:721ccc1dee9dc09443dae5",
  measurementId: "G-4T90FQG02K"
};

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Authentication
export const auth = getAuth(app);

// Initialize Firestore Database
export const db = getFirestore(app);

console.log("✓ Firebase v12 initialized successfully");
