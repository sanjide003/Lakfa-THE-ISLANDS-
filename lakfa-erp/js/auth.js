/* Lakfa ERP Authentication Controller */
import { auth, db } from "./firebase-config.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { isDemoMode } from "./role-guard.js";
import { showToast } from "./utils.js";

const getAppPageUrl = (pageName) => new URL(`../${pageName}`, import.meta.url).href;

// Standard Demo Users for offline/unconfigured testing
const DEMO_USERS = {
  "admin@lakfa.com": {
    uid: "demo_admin_uid",
    name: "Lakfa Foods Admin",
    email: "admin@lakfa.com",
    role: "admin",
    status: "active"
  },
  "investor@lakfa.com": {
    uid: "demo_investor_uid",
    name: "Lakfa Investor Group",
    email: "investor@lakfa.com",
    role: "investor",
    status: "active",
    investorId: "INV001"
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  const errorAlert = document.getElementById("error-alert");
  const errorText = document.getElementById("error-text");
  const loadingIndicator = document.getElementById("loading-indicator");
  const loginBtn = document.getElementById("login-btn");
  const demoBanner = document.getElementById("demo-banner");

  // Show demo banner if Firebase is not yet configured
  if (isDemoMode() && demoBanner) {
    demoBanner.classList.remove("d-none");
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;

      // Reset feedback messages
      if (errorAlert) errorAlert.classList.add("d-none");
      if (loadingIndicator) loadingIndicator.classList.remove("d-none");
      if (loginBtn) loginBtn.disabled = true;

      // Validate input fields
      if (!email || !password) {
        showError("Please fill in all fields.");
        return;
      }

      // 1. Check Demo Mode First
      if (isDemoMode()) {
        setTimeout(() => { // Simulate network delay
          const matchedUser = DEMO_USERS[email.toLowerCase()];
          if (matchedUser) {
            // Password verification check
            const correctPassword = matchedUser.role === "admin" ? "admin123" : "investor123";
            if (password === correctPassword) {
              if (matchedUser.status !== "active") {
                showError("Your account is inactive. Please contact admin.");
                return;
              }
              
              // Store session
              sessionStorage.setItem("lakfa_demo_user", JSON.stringify(matchedUser));
              showToast("Demo login successful!", "success");
              
              // Redirect based on role
              if (matchedUser.role === "admin") {
                window.location.href = getAppPageUrl("manager.html");
              } else if (matchedUser.role === "investor") {
                window.location.href = getAppPageUrl("investor.html");
              } else {
                showError("Invalid user role. Please contact admin.");
              }
            } else {
              showError("Incorrect password. Hint: Use admin123 or investor123");
            }
          } else {
            showError("User not found in demo accounts. Use admin@lakfa.com or investor@lakfa.com");
          }
        }, 800);
        return;
      }

      // 2. Real Firebase Authentication Flow
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Fetch User details and role from Firestore
        const userDocRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userDocRef);

        if (!userSnap.exists()) {
          showError("Your account role is not assigned. Please contact admin.");
          return;
        }

        const userData = userSnap.data();

        // Validate account status
        if (userData.status !== "active") {
          showError("Your account is inactive. Please contact admin.");
          return;
        }

        // Redirect based on role mapping
        if (userData.role === "admin") {
          showToast("Welcome, Admin!", "success");
          window.location.href = getAppPageUrl("manager.html");
        } else if (userData.role === "investor") {
          showToast("Welcome, Investor!", "success");
          window.location.href = getAppPageUrl("investor.html");
        } else {
          showError("Invalid user role. Please contact admin.");
        }

      } catch (err) {
        console.error("Firebase Login Error: ", err);
        let errorMsg = "Login failed. Please check your credentials.";
        if (err.code === "auth/invalid-credential") {
          errorMsg = "Incorrect email or password. Please try again.";
        } else if (err.code === "auth/user-not-found") {
          errorMsg = "Account not found. Please contact admin.";
        } else if (err.code === "auth/wrong-password") {
          errorMsg = "Incorrect password. Please try again.";
        } else {
          errorMsg = err.message;
        }
        showError(errorMsg);
      }
    });
  }

  function showError(msg) {
    if (loadingIndicator) loadingIndicator.classList.add("d-none");
    if (loginBtn) loginBtn.disabled = false;
    if (errorText) errorText.textContent = msg;
    if (errorAlert) errorAlert.classList.remove("d-none");
  }
});
