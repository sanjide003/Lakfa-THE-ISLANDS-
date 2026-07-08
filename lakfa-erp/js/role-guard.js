/* Lakfa ERP Role Guard & Auth Session Manager */
import { auth, db, firebaseConfig } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { showToast } from "./utils.js";

const getLoginUrl = () => new URL("../../index.html", import.meta.url).href;

// Helper to determine if Firebase config is still using the default placeholder
export function isDemoMode() {
  return !firebaseConfig || firebaseConfig.apiKey.startsWith("YOUR_");
}

/**
 * Protects a page by checking Auth state and Firestore user roles.
 * Redirects to index.html if the user is unauthorized.
 * @param {string} requiredRole - 'admin' or 'investor'
 */
export function protectPage(requiredRole) {
  // If in Demo Mode, fallback to sessionStorage check
  if (isDemoMode()) {
    const demoUser = sessionStorage.getItem("lakfa_demo_user");
    if (!demoUser) {
      console.warn("No active session. Redirecting to index.html");
      window.location.href = getLoginUrl();
      return;
    }
    try {
      const userObj = JSON.parse(demoUser);
      if (userObj.role !== requiredRole || userObj.status !== "active") {
        console.error("Unauthorized access attempt. Invalid role or inactive account.");
        window.location.href = getLoginUrl();
        return;
      }
      // Populate user info in Header
      document.addEventListener("DOMContentLoaded", () => {
        updateUIHeader(userObj.name, userObj.email, userObj.role);
      });
    } catch (e) {
      window.location.href = getLoginUrl();
    }
    return;
  }

  // Real Firebase Guard
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      console.log("No authenticated user. Redirecting to login page...");
      window.location.href = getLoginUrl();
      return;
    }

    try {
      // Fetch Firestore user doc
      const userDocRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userDocRef);

      if (!userSnap.exists()) {
        showToast("Your account role is not assigned. Please contact admin.", "error");
        setTimeout(() => logoutUser(), 3000);
        return;
      }

      const userData = userSnap.data();

      if (userData.status !== "active") {
        showToast("Your account is inactive. Please contact admin.", "error");
        setTimeout(() => logoutUser(), 3000);
        return;
      }

      if (userData.role !== requiredRole) {
        showToast("Access denied: unauthorized role.", "error");
        window.location.href = getLoginUrl();
        return;
      }

      // Successful validation - update header
      updateUIHeader(userData.name || user.email, user.email, userData.role);

    } catch (err) {
      console.error("Error verifying user role: ", err);
      showToast("Verification error: " + err.message, "error");
    }
  });
}

/**
 * Update UI headers dynamically with user name, email, and role badge
 */
function updateUIHeader(name, email, role) {
  const nameEl = document.getElementById("header-user-name");
  const emailEl = document.getElementById("header-user-email");
  const roleEl = document.getElementById("header-user-role");
  
  if (nameEl) nameEl.textContent = name;
  if (emailEl) emailEl.textContent = email;
  if (roleEl) {
    roleEl.textContent = role === "admin" ? "Admin / Manager" : "Investor";
    roleEl.className = `badge ${role === "admin" ? "badge-success" : "badge-info"}`;
  }
}

/**
 * Handle user logout across both Demo and Real Firebase configurations
 */
export async function logoutUser() {
  if (isDemoMode()) {
    sessionStorage.removeItem("lakfa_demo_user");
    window.location.href = getLoginUrl();
    return;
  }

  try {
    await signOut(auth);
    window.location.href = getLoginUrl();
  } catch (err) {
    console.error("Error signing out: ", err);
    showToast("Logout failed: " + err.message, "error");
  }
}

/**
 * Check and get current user role
 * @returns {string|null}
 */
export function getCurrentUserRole() {
  if (isDemoMode()) {
    const demoUser = sessionStorage.getItem("lakfa_demo_user");
    if (!demoUser) return null;
    return JSON.parse(demoUser).role;
  }
  
  const currentUser = auth.currentUser;
  if (!currentUser) return null;
  return null; // For async Firestore queries, use full login guard
}
