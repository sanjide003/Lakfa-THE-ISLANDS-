import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const read = (path) => readFileSync(path, 'utf8');
const fail = (message) => {
  console.error(`QA audit failed: ${message}`);
  process.exitCode = 1;
};

const firebaseDb = read('lakfa-erp/js/firebase-db.js');
const rules = read('docs/firestore.rules');

const managerController = read('lakfa-erp/js/manager.js');
['PRINTABLE_DOCUMENT_KEYS', 'buildPrintableDocumentHtml', 'printDocument', 'downloadDocumentHtml', 'logoDataUrl', 'signatureDataUrl'].forEach((needle) => {
  if (!managerController.includes(needle)) {
    fail(`Manager invoice/PDF foundation is missing ${needle}`);
  }
});

const companyProfile = read('lakfa-erp/js/company-profile.js');
if (!companyProfile.includes('logoDataUrl') || !companyProfile.includes('signatureDataUrl')) {
  fail('Company profile must persist logoDataUrl and signatureDataUrl in Firestore');
}
if (companyProfile.includes('firebase-storage') || companyProfile.includes('uploadBytes')) {
  fail('Company profile must not upload images to Firebase Storage');
}
const collectionMatches = [...firebaseDb.matchAll(/\b(\w+):\s*"([^"]+)"/g)];
const collections = collectionMatches.map(([, key, name]) => ({ key, name }));

for (const { key, name } of collections) {
  if (!rules.includes(`match /${name}/`) && !['settings'].includes(key)) {
    fail(`Firestore rules do not explicitly cover collection '${name}'`);
  }
}

const webSw = read('lakfa-erp/service-worker.js');
const appSw = read('app/src/main/assets/lakfa-erp/service-worker.js');
if (webSw !== appSw) fail('Web and Android service worker files are not synced');

const requiredCacheAssets = [
  'js/firebase-config.js',
  'js/firebase-db.js',
  'js/company-profile.js',
  'js/auth.js',
  'js/role-guard.js',
  'js/manager.js',
  'js/investor.js',
  'js/utils.js'
];
for (const asset of requiredCacheAssets) {
  if (!webSw.includes(`"${asset}"`)) fail(`Service worker cache is missing ${asset}`);
}

if (existsSync('app/src/main/assets/lakfa-erp/vercel.json')) {
  fail('Android asset folder must not contain vercel.json');
}

try {
  execSync('diff -qr lakfa-erp app/src/main/assets/lakfa-erp --exclude=vercel.json', { stdio: 'pipe' });
} catch (error) {
  fail(`Android asset sync check failed:\n${error.stdout?.toString() || error.message}`);
}

const forbiddenPattern = 'local' + 'Storage|' + 'de' + 'mo|' + 'dum' + 'my';
try {
  execSync(`rg -n "${forbiddenPattern}" lakfa-erp app/src/main/assets/lakfa-erp index.html docs`, { stdio: 'pipe' });
  fail('Forbidden local/browser fallback wording found in runtime or docs');
} catch (error) {
  if (error.status !== 1) {
    fail(`Forbidden-word scan failed unexpectedly: ${error.message}`);
  }
}

if (!process.exitCode) {
  console.log('QA audit passed: collections, rules, service worker, Vercel assets, Android sync, and Firebase-only checks are aligned.');
}
