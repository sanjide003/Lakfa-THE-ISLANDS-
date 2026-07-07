# Lakfa ERP — Food Business Operations Ledger

Lakfa ERP is a simple, clean, and highly professional web-based Enterprise Resource Planning (ERP) application designed specifically for **Lakfa Foods** to streamline operations, track logistics, manage double-entry accounting cash books, and provide transparent view-only reports to venture capital investors.

This application is built as a static client-side Progressive Web App (PWA) that requires **no compilation, bundlers, or build environments**, making it 100% compatible for instant deployment on platforms like Vercel.

---

## 🛠️ Technology Stack
*   **Frontend UI:** Vanilla HTML5, CSS3 Custom Properties (modern Material-style light theme with green/teal branding), and ES6 JavaScript Modules.
*   **Database & Core Auth:** Firebase Web SDK (v10.8.0) imported dynamically via CDN.
*   **Offline Support:** PWA Cache Shell with Service Worker registration for offline resilience.
*   **Deployment:** Static JSON configurations ready for Vercel edge delivery.

---

## 📁 System Architecture
```text
lakfa-erp/
  ├── index.html            # Public authentication portal (Login)
  ├── manager.html          # Protected Admin / Manager workspace (21 ERP modules)
  ├── investor.html         # Protected Investor ledger (View-only financial stream)
  ├── manifest.json         # PWA Manifest properties
  ├── service-worker.js     # Resource caching thread
  ├── vercel.json           # Vercel CDN routing config
  ├── css/
  │   └── style.css         # Responsive CSS variables layout
  └── js/
      ├── firebase-config.js# SDK Config & exports
      ├── auth.js           # Auth handlers & Demo flow limits
      ├── role-guard.js     # Protected page redirects
      ├── manager.js        # Form validation, Storage CRUD, auto-calc
      ├── investor.js       # View-only investor calculations
      └── utils.js          # Shared date, currency, phone formatters
```

---

## 🔐 Access Roles
The system is protected by a strict **Role-Based Access Control (RBAC)** guard:

1.  **Admin / Manager (`role: "admin"`):** Full access to log raw material purchases, supervise production batches, dispatch orders, log operational expenses, balance ledger sheets, and allocate profit payouts to investors.
2.  **Investor (`role: "investor"`):** Secure, read-only view of their personal capital accounts, profit share allocations, company press releases, and general financial metrics.

---

## ⚠️ Security Warning

> [!CAUTION]
> **This first version is for testing/demo only.** Do not enter real customer, accounting, investor, or company data until Firebase Security Rules are properly configured.

### Planned Firestore Security Rules
Ensure these rules are applied in your Firebase Console under the **Firestore Rules** tab:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Read user role metadata
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Admin has full read/write, Investors can only read their matching records
    match /{document=**} {
      allow read, write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      allow read: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'investor';
    }
  }
}
```

---

## ⚡ Quick Evaluation & Testing (Demo Mode)
If the Firebase SDK is unconfigured, the application runs in a local-storage **Demo Mode**. You can log in using these preset credentials:

*   **Administrator Account:**
    *   **Email:** `admin@lakfa.com`
    *   **Password:** `admin123`
*   **Venture Investor Account:**
    *   **Email:** `investor@lakfa.com`
    *   **Password:** `investor123`

---

## 🚀 Deployment Instructions

### 1. Vercel Hosting
Deploying this project to Vercel takes less than a minute and requires no command line tools:
1.  Push the project repository to your **GitHub** account.
2.  Log in to the [Vercel Dashboard](https://vercel.com).
3.  Click **"Add New"** → **"Project"**.
4.  Import your repository.
5.  Set the Root Directory to `lakfa-erp`.
6.  Click **"Deploy"**. Vercel will automatically detect the static file layout and host it on a global edge CDN.

### 2. Installing PWA
1.  Open the deployed URL in Google Chrome, Edge, or Apple Safari.
2.  Click the **"Install App"** icon in the address bar (or select "Add to Home Screen" on iOS Safari).
3.  Lakfa ERP will run inside a standalone window with its own application frame, accessible offline.

---

## 🔮 Future Roadmap (Phase 2 Development)
*   **Live Cloud Storage:** Seamlessly replace `localStorage` engines with Google Firestore live synchronizations.
*   **Invoicing & GST Forms:** Automatically generate professional PDFs and compile GSTR-1 summaries.
*   **WhatsApp CRM:** Trigger automated dispatch alerts, delivery trackers, and confirmation messages directly to customer phone numbers.
