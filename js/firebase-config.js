/**
 * firebase-config.js
 * RDroid Apps – Firebase v12 Modular Initialization
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import {
  getAnalytics,
  setAnalyticsCollectionEnabled
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";

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

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

let analytics = null;

try {
  analytics = getAnalytics(app);

  const isTesting =
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1" ||
    location.search.includes("test=true");

  if (isTesting) {
    setAnalyticsCollectionEnabled(analytics, false);
    console.log("🚫 Firebase Analytics disabled (testing)");
  } else {
    console.log("✅ Firebase Analytics enabled (production)");
  }
} catch (e) {
  console.warn("⚠️ Analytics not supported in this environment");
}

console.log("✓ Firebase v12 initialized successfully");
