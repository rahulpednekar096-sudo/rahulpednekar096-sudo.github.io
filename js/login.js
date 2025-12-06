/**
 * login.js
 * RDroid Apps – Firebase v12 Modular Authentication & User Management System
 * 
 * Complete API for:
 * - Authentication (login, signup, logout, password reset)
 * - User Profile Management (fetch, update)
 * - Favorites Management (toggle, load)
 */

import { auth, db } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// ====================================
// USER PROFILE MANAGEMENT
// ====================================

/**
 * Fetch user profile from Firestore
 */
export async function fetchProfile(uid) {
  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return userSnap.data();
    }
    return null;
  } catch (error) {
    console.error("Error fetching profile:", error.message);
    throw new Error("Failed to fetch profile");
  }
}

/**
 * Update user profile name
 */
export async function updateProfile(uid, name) {
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      name: name,
      updatedAt: new Date()
    });
    console.log("✓ Profile updated:", name);
  } catch (error) {
    console.error("Error updating profile:", error.message);
    throw new Error("Failed to update profile");
  }
}

// ====================================
// AUTHENTICATION FUNCTIONS
// ====================================

/**
 * Login with email and password
 */
export async function doLogin(email, password) {
  try {
    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    console.log("✓ User logged in:", user.email);

    // Save session to localStorage
    localStorage.setItem("userEmail", user.email);
    localStorage.setItem("userId", user.uid);

    return user;
  } catch (error) {
    console.error("Login error:", error.message);
    
    // Firebase error messages
    if (error.code === "auth/user-not-found") {
      throw new Error("Account not found");
    } else if (error.code === "auth/wrong-password") {
      throw new Error("Incorrect password");
    } else if (error.code === "auth/invalid-email") {
      throw new Error("Invalid email address");
    }
    
    throw new Error(error.message || "Login failed");
  }
}

/**
 * Sign up with email, password, and name
 */
export async function doSignup(name, email, password) {
  try {
    if (!name || !email || !password) {
      throw new Error("All fields are required");
    }

    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    console.log("✓ Account created:", user.email);

    // Create user document in Firestore
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      name: name,
      email: email,
      createdAt: new Date(),
      updatedAt: new Date(),
      favorites: []
    });

    console.log("✓ User profile created in Firestore");

    return user;
  } catch (error) {
    console.error("Signup error:", error.message);

    // Firebase error messages
    if (error.code === "auth/email-already-in-use") {
      throw new Error("Email already in use");
    } else if (error.code === "auth/weak-password") {
      throw new Error("Password is too weak. Use at least 6 characters");
    } else if (error.code === "auth/invalid-email") {
      throw new Error("Invalid email address");
    }

    throw new Error(error.message || "Signup failed");
  }
}

/**
 * Send password reset email
 */
export async function sendReset(email) {
  try {
    if (!email) {
      throw new Error("Email is required");
    }

    await sendPasswordResetEmail(auth, email);
    console.log("✓ Password reset email sent to:", email);

    return true;
  } catch (error) {
    console.error("Password reset error:", error.message);

    if (error.code === "auth/user-not-found") {
      throw new Error("No account found with this email");
    }

    throw new Error(error.message || "Failed to send reset email");
  }
}

/**
 * Logout user
 */
export async function doLogout() {
  try {
    await signOut(auth);
    console.log("✓ User logged out");

    // Clear session
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userId");

    return true;
  } catch (error) {
    console.error("Logout error:", error.message);
    throw new Error("Failed to logout");
  }
}

// ====================================
// FAVORITES MANAGEMENT
// ====================================

/**
 * Toggle favorite app (add or remove)
 */
export async function toggleFavorite(uid, appId) {
  try {
    if (!uid || !appId) {
      throw new Error("User ID and App ID are required");
    }

    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error("User not found");
    }

    const favorites = userSnap.data().favorites || [];
    
    if (favorites.includes(appId)) {
      // Remove from favorites
      await updateDoc(userRef, {
        favorites: arrayRemove(appId)
      });
      console.log("✓ Removed from favorites:", appId);
      return false; // Not a favorite anymore
    } else {
      // Add to favorites
      await updateDoc(userRef, {
        favorites: arrayUnion(appId)
      });
      console.log("✓ Added to favorites:", appId);
      return true; // Is a favorite now
    }
  } catch (error) {
    console.error("Toggle favorite error:", error.message);
    throw new Error("Failed to toggle favorite");
  }
}

/**
 * Load user favorites
 */
export async function loadFavorites(uid) {
  try {
    if (!uid) {
      throw new Error("User ID is required");
    }

    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const favorites = userSnap.data().favorites || [];
      console.log("✓ Favorites loaded:", favorites);
      return favorites;
    }

    return [];
  } catch (error) {
    console.error("Load favorites error:", error.message);
    throw new Error("Failed to load favorites");
  }
}

/**
 * Check if app is favorite
 */
export async function isFavorite(uid, appId) {
  try {
    const favorites = await loadFavorites(uid);
    return favorites.includes(appId);
  } catch (error) {
    console.error("Error checking favorite status:", error.message);
    return false;
  }
}

// ====================================
// AUTH STATE LISTENER & SESSION
// ====================================

let currentUser = null;

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    console.log("✓ User authenticated:", user.email);

    // Save session
    localStorage.setItem("userEmail", user.email);
    localStorage.setItem("userId", user.uid);

    // Fetch and cache profile
    try {
      const profile = await fetchProfile(user.uid);
      if (profile) {
        localStorage.setItem("userProfile", JSON.stringify(profile));
      }
    } catch (error) {
      console.error("Error caching profile:", error.message);
    }
  } else {
    currentUser = null;
    console.log("✓ No user authenticated");

    // Clear session
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userId");
    localStorage.removeItem("userProfile");
  }
});

/**
 * Get current authenticated user
 */
export function getCurrentUser() {
  return currentUser;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
  return currentUser !== null;
}

/**
 * Get cached user profile
 */
export function getCachedProfile() {
  const cached = localStorage.getItem("userProfile");
  return cached ? JSON.parse(cached) : null;
}

// ====================================
// EXPOSE FUNCTIONS TO GLOBAL SCOPE
// (For inline HTML event handlers)
// ====================================

window.rdroidAuth = {
  // Auth functions
  doLogin,
  doSignup,
  doLogout,
  sendReset,

  // Profile functions
  fetchProfile,
  updateProfile,

  // Favorites functions
  toggleFavorite,
  loadFavorites,
  isFavorite,

  // Utility functions
  getCurrentUser,
  isAuthenticated,
  getCachedProfile
};

console.log("✓ Firebase Authentication module loaded (v12 modular)");
