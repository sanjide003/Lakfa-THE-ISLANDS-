# Google Firebase Setup Guide for Lakfa ERP

Follow these step-by-step instructions to connect Lakfa ERP to your live Google Firebase database.

---

## Step 1: Create a Firebase Project
1.  Navigate to the [Google Firebase Console](https://console.firebase.google.com).
2.  Click **"Add Project"**.
3.  Name the project **"Lakfa ERP"** (or any preferred descriptor).
4.  Configure Google Analytics options based on preference and click **"Create Project"**.

---

## Step 2: Register your Web App
1.  Once inside the project dashboard, click the **Web icon (`</>`)** to add an application.
2.  Enter the App Nickname: **"Lakfa ERP Portal"**.
3.  Click **"Register App"**.
4.  You will be shown a `firebaseConfig` object similar to this:
    ```javascript
    const firebaseConfig = {
      apiKey: "AIzaSyD...",
      authDomain: "lakfa-erp.firebaseapp.com",
      projectId: "lakfa-erp",
      storageBucket: "lakfa-erp.appspot.com",
      messagingSenderId: "123456789...",
      appId: "1:12345:web:abcd..."
    };
    ```

---

## Step 3: Paste Configurations into Lakfa ERP
1.  Open the file `lakfa-erp/js/firebase-config.js` in your text editor.
2.  Replace the placeholder values in the `firebaseConfig` object with your actual keys from the Firebase Console:
    ```javascript
    export const firebaseConfig = {
      apiKey: "YOUR_ACTUAL_API_KEY",
      authDomain: "YOUR_ACTUAL_AUTH_DOMAIN",
      projectId: "YOUR_ACTUAL_PROJECT_ID",
      storageBucket: "YOUR_ACTUAL_STORAGE_BUCKET",
      messagingSenderId: "YOUR_ACTUAL_SENDER_ID",
      appId: "YOUR_ACTUAL_APP_ID"
    };
    ```

---

## Step 4: Enable Email/Password Authentication
1.  In the Firebase left-hand sidebar, select **"Build"** → **"Authentication"**.
2.  Click **"Get Started"**.
3.  Select the **"Sign-in method"** tab.
4.  Click **"Email/Password"** under native providers.
5.  Toggle **"Enable"** and click **"Save"**.

---

## Step 5: Provision Users in Authentication
Now, create login entries for your team and investors.
1.  Go to the **"Users"** tab inside the Authentication dashboard.
2.  Click **"Add User"**.
3.  **For Admin:**
    *   **Email:** `admin@lakfa.com`
    *   **Password:** Set a strong password (e.g. `LakfaAdmin2026`).
    *   Copy down the generated **User UID** (e.g. `uQg9SjX...`).
4.  **For Investor:**
    *   **Email:** `investor@lakfa.com`
    *   **Password:** Set a strong password (e.g. `LakfaInv2026`).
    *   Copy down the generated **User UID** (e.g. `pL8tKyR...`).

---

## Step 6: Create Firestore Users Collection
The system uses Firestore to verify what role each authenticated UID is assigned to.
1.  In the left sidebar, click **"Build"** → **"Firestore Database"**.
2.  Click **"Create Database"**.
3.  Choose your database location (e.g., `asia-south1` or `us-central`) and start in **Test Mode** (or Production Mode).
4.  Click **"Start Collection"**.
5.  Name the collection: `users`
6.  **Create the Admin Document:**
    *   **Document ID:** Paste the exact **User UID** of your admin user from Step 5.
    *   Add fields:
        *   `name` (string): `Admin User`
        *   `email` (string): `admin@lakfa.com`
        *   `role` (string): `admin`
        *   `status` (string): `active`
7.  **Create the Investor Document:**
    *   Click **"Add Document"** inside the `users` collection.
    *   **Document ID:** Paste the exact **User UID** of your investor user from Step 5.
    *   Add fields:
        *   `name` (string): `Investor User`
        *   `email` (string): `investor@lakfa.com`
        *   `role` (string): `investor`
        *   `investorId` (string): `INV001`
        *   `status` (string): `active`

---

## Step 7: Test live login
Once authentication accounts and Firestore records are created, refresh your Lakfa ERP login page. The app will connect directly to Google Firebase and direct your staff to their respective dashboards based on their role metadata.
