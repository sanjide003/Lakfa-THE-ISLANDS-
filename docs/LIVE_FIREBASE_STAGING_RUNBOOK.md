# Live Firebase Staging Runbook

Use this runbook to execute Stage 3 against the deployed Vercel URL and the Firebase project `fest-21d67`.

## 1. Environment record

| Field | Value |
| --- | --- |
| QA date | |
| Tester | |
| Firebase project ID | `fest-21d67` |
| Vercel deployment URL | |
| Browser / device | |
| Admin test email | |
| Investor test email | |

## 2. Firebase Console setup verification

### Authentication users

- [ ] Admin user exists in Firebase Authentication.
- [ ] Investor user exists in Firebase Authentication.
- [ ] Both users can sign in with known staging credentials.

### `users/{uid}` role documents

Create/verify these Firestore documents using each Authentication UID:

```json
{
  "name": "Admin User",
  "email": "admin@example.com",
  "role": "admin",
  "status": "active"
}
```

```json
{
  "name": "Investor User",
  "email": "investor@example.com",
  "role": "investor",
  "status": "active",
  "investorId": "REPLACE_INVESTOR_DOCUMENT_ID"
}
```

- [ ] Missing role document blocks login with a clear message.
- [ ] `status: inactive` blocks access.
- [ ] Wrong role cannot open the other role page.

### Firestore rules

- [ ] Publish `docs/firestore.rules`.
- [ ] Admin can write ERP records.
- [ ] Investor can read allowed reports.
- [ ] Investor direct write attempt is denied.

## 3. Company profile with Firestore text images

- [ ] Open Admin → Company Profile.
- [ ] Save company name, GST, address, phone, email, website, business type/category, state, pincode, social links.
- [ ] Upload company logo image smaller than 2 MB.
- [ ] Upload signature logo image smaller than 2 MB.
- [ ] Firestore `settings/companyProfile.logoDataUrl` is populated.
- [ ] Firestore `settings/companyProfile.signatureDataUrl` is populated.
- [ ] Logo/signature preview reloads after refresh.
- [ ] Login page and manager/investor headers show company branding.
- [ ] Oversized image shows validation error and does not save.

## 4. Admin CRUD matrix execution

For each module, create one test record, refresh, edit it, refresh, delete it, and confirm table state:

- [ ] Products
- [ ] Customers
- [ ] Suppliers
- [ ] Investors
- [ ] Purchases
- [ ] Inventory
- [ ] Production
- [ ] Sales
- [ ] Orders
- [ ] Delivery
- [ ] Expenses
- [ ] Income
- [ ] Cashbook
- [ ] Bankbook
- [ ] Profit Sharing

Validation checks:

- [ ] Required fields block empty saves.
- [ ] Numeric fields save as numbers.
- [ ] Created records include `createdAt`, `createdBy`, `updatedAt`, `updatedBy`.
- [ ] Edited records update `updatedAt`, `updatedBy`.
- [ ] Delete removes the Firestore document and table row.

## 5. Stock and ledger reconciliation execution

- [ ] Create inventory item with exact name `QA Stock Item` and current stock `100`.
- [ ] Create paid purchase for `QA Stock Item`, qty `10`; stock becomes `110`.
- [ ] Edit purchase qty to `15`; stock reconciles to `115`.
- [ ] Delete purchase; stock returns to `100`.
- [ ] Create paid sale for `QA Stock Item`, qty `5`; stock becomes `95`.
- [ ] Edit sale qty to `8`; stock reconciles to `92`.
- [ ] Delete sale; stock returns to `100`.
- [ ] Create production batch for `QA Stock Item`, qty `20`; stock becomes `120`.
- [ ] Paid purchase/expense/profit sharing creates cash/bank outflow.
- [ ] Paid sale/order/income creates cash/bank inflow.
- [ ] Cashbook and bankbook rolling balances recalculate after edit/delete.

## 6. Investor read-only execution

- [ ] Investor login opens `investor.html`.
- [ ] Investor dashboard renders Firestore data.
- [ ] No edit/save/delete controls are visible.
- [ ] Investor browser console shows no blocking JS errors.
- [ ] Direct Firestore write attempt is denied by rules.
- [ ] Sign out returns to root login.

## 7. Invoice / GST / PDF foundation verification

| Check | Steps | Expected result | Status |
|---|---|---|---|
| Sales invoice print | Admin → Sales → choose a Firestore sales row → Print. | New printable document opens with company logo, name, GST, address, phone, email, website, customer, item, total, discount, net amount, and signature. | ☐ |
| Purchase invoice print | Admin → Purchase → choose a Firestore purchase row → Print. | Purchase document opens with supplier invoice number, supplier, item, quantity, rate, total amount, payment mode/status, company branding, and signature. | ☐ |
| Delivery note print | Admin → Delivery / Courier → choose a Firestore delivery row → Print. | Delivery note opens with order reference, customer, courier partner, tracking, dispatch/delivery dates, charge, company branding, and signature. | ☐ |
| Download action | Use Download on sales, purchase, and delivery rows. | Browser downloads a print-ready document file generated from current Firestore record data without writing browser storage. | ☐ |
| Company identity source | Update `settings/companyProfile`, refresh, then print again. | Printable documents use latest Firestore `companyName`, `gst`, `address`, `phone`, `email`, `website`, `logoDataUrl`, and `signatureDataUrl`. | ☐ |
| Investor restriction | Login as investor and inspect investor screens. | Investor can read data but cannot see admin print/download/edit/delete controls. | ☐ |

## 8. Vercel PWA cache verification

- [ ] `/` opens the login page.
- [ ] `/lakfa-erp/service-worker.js` returns `Cache-Control: public, max-age=0, must-revalidate`.
- [ ] Browser DevTools Application → Cache Storage shows `lakfa-erp-cache-v5`.
- [ ] Cached assets include `js/firebase-db.js`, `js/company-profile.js`, `js/manager.js`, `js/investor.js`, and `css/style.css`.
- [ ] Hard refresh loads latest company profile image behavior.
- [ ] PWA install prompt works in Chrome or Edge.

## 9. Bug report template

| Field | Value |
| --- | --- |
| Module | |
| User role | admin / investor |
| Steps to reproduce | |
| Expected result | |
| Actual result | |
| Firestore document path | |
| Browser console error | |
| Screenshot/evidence | |
| Severity | blocker / high / medium / low |
| Fix owner | |
| Retest result | |
