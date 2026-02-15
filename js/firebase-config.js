/**
 * firebase-config.js
 * RDroid Apps – Firebase v12 Modular Initialization
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
  appId: "1:812782691840:web:721ccc1dee9dc09443dae5"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

console.log("✓ Firebase initialized successfully");


// ===============================
// Google Analytics Loader
// ===============================

const GA_ID = "G-4T90FQG02K";

const isTesting =
  location.hostname === "localhost" ||
  location.hostname === "127.0.0.1" ||
  location.search.includes("test=true");

if (isTesting) {
  console.log("🚫 Analytics disabled (testing mode)");
} else {
  console.log("✅ Analytics enabled (production)");

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    dataLayer.push(arguments);
  };

  gtag("js", new Date());
  gtag("config", GA_ID);
}
