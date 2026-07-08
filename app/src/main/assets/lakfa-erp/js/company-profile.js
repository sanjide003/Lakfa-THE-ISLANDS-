/* Lakfa ERP Company Profile Controller */
import { storage } from "./firebase-config.js";
import { getDocument, saveDocument } from "./firebase-db.js";
import { showToast } from "./utils.js";
import { getDownloadURL, ref, uploadBytes } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

const COMPANY_COLLECTION = "settings";
const COMPANY_DOCUMENT = "companyProfile";
const COMPANY_STORAGE_DIR = "company/profile";

const COMPANY_FIELDS = [
  "companyName",
  "gst",
  "address",
  "phone",
  "email",
  "website",
  "socialLinks",
  "businessType",
  "businessCategory",
  "state",
  "pincode",
  "logoUrl",
  "signatureLogoUrl"
];

export async function loadCompanyProfile() {
  return (await getDocument(COMPANY_COLLECTION, COMPANY_DOCUMENT)) || {};
}

export async function saveCompanyProfile(profile) {
  await saveDocument(COMPANY_COLLECTION, COMPANY_DOCUMENT, profile);
}

export function applyCompanyProfile(profile = {}) {
  const displayName = profile.companyName || "Lakfa ERP";
  const logoUrl = profile.logoUrl || "";

  document.querySelectorAll("[data-company-name]").forEach((el) => {
    el.textContent = displayName;
  });

  document.querySelectorAll("[data-company-email]").forEach((el) => {
    el.textContent = profile.email || "";
  });

  document.querySelectorAll("[data-company-phone]").forEach((el) => {
    el.textContent = profile.phone || "";
  });

  document.querySelectorAll("[data-company-logo]").forEach((img) => {
    if (logoUrl) {
      img.src = logoUrl;
      img.classList.remove("d-none");
      img.hidden = false;
    } else {
      img.removeAttribute("src");
      img.classList.add("d-none");
      img.hidden = true;
    }
  });

  document.title = `${displayName} - ERP`;
}

export async function applyCompanyProfileFromFirebase() {
  try {
    const profile = await loadCompanyProfile();
    applyCompanyProfile(profile);
    return profile;
  } catch (err) {
    console.error("Unable to load company profile", err);
    return {};
  }
}

export async function initCompanyProfileForm() {
  const form = document.getElementById("company-profile-form");
  if (!form) return;

  const profile = await applyCompanyProfileFromFirebase();
  populateCompanyProfileForm(form, profile);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector("button[type='submit']");
    if (submitButton) submitButton.disabled = true;

    try {
      const payload = getCompanyProfileFormData(form);
      const logoFile = form.querySelector("#company-logo-file")?.files?.[0];
      const signatureFile = form.querySelector("#company-signature-logo-file")?.files?.[0];

      if (logoFile) {
        payload.logoUrl = await uploadCompanyFile(logoFile, "logo");
      }

      if (signatureFile) {
        payload.signatureLogoUrl = await uploadCompanyFile(signatureFile, "signature");
      }

      await saveCompanyProfile(payload);
      applyCompanyProfile(payload);
      populateCompanyProfileForm(form, payload);
      showToast("Company profile saved to Firebase.", "success");
    } catch (err) {
      console.error("Unable to save company profile", err);
      showToast("Unable to save company profile. Please check Firebase permissions.", "error");
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}

function populateCompanyProfileForm(form, profile) {
  COMPANY_FIELDS.forEach((field) => {
    const input = form.querySelector(`[name="${field}"]`);
    if (input && input.type !== "file") {
      input.value = profile[field] || "";
    }
  });

  updatePreviewImage("company-logo-preview", profile.logoUrl);
  updatePreviewImage("company-signature-logo-preview", profile.signatureLogoUrl);
}

function getCompanyProfileFormData(form) {
  const data = {};
  COMPANY_FIELDS.forEach((field) => {
    const input = form.querySelector(`[name="${field}"]`);
    if (input && input.type !== "file") {
      data[field] = input.value.trim();
    }
  });
  return data;
}

async function uploadCompanyFile(file, kind) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storagePath = `${COMPANY_STORAGE_DIR}/${kind}-${Date.now()}-${safeName}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}

function updatePreviewImage(elementId, url) {
  const img = document.getElementById(elementId);
  if (!img) return;

  if (url) {
    img.src = url;
    img.hidden = false;
  } else {
    img.removeAttribute("src");
    img.hidden = true;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  applyCompanyProfileFromFirebase();
});
