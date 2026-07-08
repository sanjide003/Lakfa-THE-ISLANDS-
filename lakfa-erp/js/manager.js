/* Lakfa ERP Manager Controller */
import { logoutUser } from "./role-guard.js";
import { formatCurrency, formatDate, getFirebaseErrorMessage, showToast } from "./utils.js";
import { COLLECTIONS, commitBatchOperations, createCollectionRecord, deleteCollectionRecord, getAllCollections, getDocument, saveDocument, updateCollectionRecord } from "./firebase-db.js";
import { initCompanyProfileForm, loadCompanyProfile } from "./company-profile.js";

// Keys mapped to Firestore collections
const KEYS = {
  products: "lakfa_products",
  customers: "lakfa_customers",
  suppliers: "lakfa_suppliers",
  purchases: "lakfa_purchases",
  inventory: "lakfa_inventory",
  production: "lakfa_production",
  sales: "lakfa_sales",
  orders: "lakfa_orders",
  delivery: "lakfa_delivery",
  expenses: "lakfa_expenses",
  income: "lakfa_income",
  cashBook: "lakfa_cashbook",
  bankBook: "lakfa_bankbook",
  investors: "lakfa_investors",
  sharing: "lakfa_sharing"
};

// Global state tracker for read-only Firestore data
let currentEditId = null;
let firestoreState = {};
let activeSectionId = "dashboard";
let appSettings = { modules: {} };
const APP_SETTINGS_COLLECTION = "settings";
const APP_SETTINGS_DOCUMENT = "appSettings";
const PRINTABLE_DOCUMENT_KEYS = new Set([KEYS.purchases, KEYS.sales, KEYS.delivery]);
const READ_ONLY_MESSAGE = "This module is read-only until its Firestore write workflow is enabled.";
const WRITABLE_FORM_IDS = new Set([
  "product-form", "customer-form", "supplier-form", "investors-form",
  "purchase-form", "inventory-form", "sales-form", "orders-form", "delivery-form",
  "expenses-form", "income-form", "cashbook-form", "bankbook-form", "production-form", "sharing-form"
]);
const WRITABLE_KEYS = new Set([
  KEYS.products, KEYS.customers, KEYS.suppliers, KEYS.investors,
  KEYS.purchases, KEYS.inventory, KEYS.sales, KEYS.orders, KEYS.delivery,
  KEYS.expenses, KEYS.income, KEYS.cashBook, KEYS.bankBook, KEYS.production, KEYS.sharing
]);

const COLLECTION_BY_KEY = {
  [KEYS.products]: COLLECTIONS.products,
  [KEYS.customers]: COLLECTIONS.customers,
  [KEYS.suppliers]: COLLECTIONS.suppliers,
  [KEYS.purchases]: COLLECTIONS.purchases,
  [KEYS.inventory]: COLLECTIONS.inventory,
  [KEYS.production]: COLLECTIONS.production,
  [KEYS.sales]: COLLECTIONS.sales,
  [KEYS.orders]: COLLECTIONS.orders,
  [KEYS.delivery]: COLLECTIONS.delivery,
  [KEYS.expenses]: COLLECTIONS.expenses,
  [KEYS.income]: COLLECTIONS.income,
  [KEYS.cashBook]: COLLECTIONS.cashBook,
  [KEYS.bankBook]: COLLECTIONS.bankBook,
  [KEYS.investors]: COLLECTIONS.investors,
  [KEYS.sharing]: COLLECTIONS.sharing
};

function getStoredRecords(key) {
  return firestoreState[key] || [];
}

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Keep manager workspace read-only until Firestore write flows are implemented
  setFormsReadOnly();
  await initCompanyProfileForm();

  // 2. Load Firestore data for all dashboard and table renderers
  await loadFirestoreData();

  // 3. Load app/module settings foundation
  await loadAppSettings();
  initModuleSettingsPanel();

  // 4. Enable Firestore writes for approved modules
  initWritableFormListeners();

  // 5. Set up event listeners for sidebar routing (tab switching + history)
  initSidebarRouting();

  // 6. Render and initialize active dashboard metrics
  updateDashboardMetrics();

  // 7. Handle Logout Button
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logoutUser);
  }

  // 8. Handle Sidebar Responsive Toggle
  initSidebarMobileToggle();
});

async function loadFirestoreData() {
  try {
    setGlobalLoading(true, "Loading Firebase ERP data...");
    firestoreState = await getAllCollections(COLLECTION_BY_KEY);
  } catch (err) {
    console.error("Error loading Firestore data", err);
    showToast(getFirebaseErrorMessage(err, "Unable to load Firebase ERP data."), "error");
    firestoreState = {};
  } finally {
    setGlobalLoading(false);
  }
}

function setGlobalLoading(isLoading, message = "Loading...") {
  document.querySelectorAll(".table-responsive tbody").forEach((tbody) => {
    if (isLoading) {
      tbody.innerHTML = `<tr><td colspan="20" class="text-center" style="color: var(--primary);">${message}</td></tr>`;
    }
  });
}

async function loadAppSettings() {
  try {
    appSettings = (await getDocument(APP_SETTINGS_COLLECTION, APP_SETTINGS_DOCUMENT)) || { modules: {} };
    appSettings.modules = appSettings.modules || {};
  } catch (err) {
    console.error("Unable to load app settings", err);
    showToast(getFirebaseErrorMessage(err, "Unable to load app settings."), "error");
    appSettings = { modules: {} };
  }
}

async function saveAppSettings() {
  await saveDocument(APP_SETTINGS_COLLECTION, APP_SETTINGS_DOCUMENT, appSettings);
}

function setFormsReadOnly() {
  document.querySelectorAll("form").forEach((form) => {
    if (form.dataset.firestoreWrite === "companyProfile" || WRITABLE_FORM_IDS.has(form.id)) {
      return;
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      showToast(READ_ONLY_MESSAGE, "info");
    });

    form.querySelectorAll("input, select, textarea, button").forEach((control) => {
      control.disabled = true;
      if (control.tagName === "BUTTON") {
        control.textContent = "Read Only";
      }
    });
  });
}

/**
 * Tab/Section navigation via sidebar links
 */
function initSidebarRouting() {
  const sidebarItems = document.querySelectorAll(".sidebar-item[data-section]");
  const sections = document.querySelectorAll(".app-section");
  const headerPageTitle = document.getElementById("header-page-title");

  const activateSection = (targetSection, pushHistory = true) => {
    const item = document.querySelector(`.sidebar-item[data-section="${targetSection}"]`);
    if (!item) return;

    // Close mobile sidebar if open
    const sidebar = document.getElementById("sidebar");
    const backdrop = document.getElementById("sidebar-backdrop");
    if (sidebar && sidebar.classList.contains("open")) {
      sidebar.classList.remove("open");
      if (backdrop) backdrop.classList.remove("open");
    }

    // Toggle active states on menu
    sidebarItems.forEach(si => si.classList.remove("active"));
    item.classList.add("active");

    // Toggle active states on pages
    sections.forEach(sec => sec.classList.remove("active"));
    const activeSec = document.getElementById(`section-${targetSection}`);
    if (activeSec) {
      activeSec.classList.add("active");

      // Update Title
      if (headerPageTitle) {
        headerPageTitle.textContent = item.textContent.trim();
      }

      if (pushHistory) {
        history.pushState({ section: targetSection }, "", `#${targetSection}`);
      }

      scrollActiveSectionToTop(activeSec);
      renderModule(targetSection);
    }
  };
  
  sidebarItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const targetSection = item.getAttribute("data-section");
      activateSection(targetSection, true);
    });
  });

  window.addEventListener("popstate", (event) => {
    const targetSection = event.state?.section || location.hash.replace("#", "") || "dashboard";
    activateSection(targetSection, false);
  });

  // Default initial render of active section, supporting direct hashes such as manager.html#sales
  const requestedSection = location.hash.replace("#", "");
  const activeItem = requestedSection
    ? document.querySelector(`.sidebar-item[data-section="${requestedSection}"]`)
    : document.querySelector(".sidebar-item.active");

  if (activeItem) {
    const defaultSec = activeItem.getAttribute("data-section");
    history.replaceState({ section: defaultSec }, "", `#${defaultSec}`);
    activateSection(defaultSec, false);
  }
}

function scrollActiveSectionToTop(activeSection) {
  const workspace = document.querySelector(".workspace");
  if (workspace) workspace.scrollTo({ top: 0, behavior: "auto" });
  if (document.scrollingElement) document.scrollingElement.scrollTo({ top: 0, behavior: "auto" });
  activeSection.scrollIntoView({ block: "start" });
}

/**
 * Responsive Hamburger Menu controls
 */
function initSidebarMobileToggle() {
  const menuToggle = document.getElementById("menu-toggle");
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("sidebar-backdrop");

  if (menuToggle && sidebar) {
    menuToggle.addEventListener("click", () => {
      sidebar.classList.add("open");
      if (backdrop) backdrop.classList.add("open");
    });
  }

  if (backdrop && sidebar) {
    backdrop.addEventListener("click", () => {
      sidebar.classList.remove("open");
      backdrop.classList.remove("open");
    });
  }
}

function initModuleSettingsPanel() {
  const settingsButton = document.getElementById("module-settings-btn");
  const modal = document.getElementById("module-settings-modal");
  const form = document.getElementById("module-settings-form");
  if (!settingsButton || !modal || !form) return;

  settingsButton.addEventListener("click", () => openModuleSettings(activeSectionId));
  modal.querySelectorAll("[data-settings-close]").forEach((closeEl) => {
    closeEl.addEventListener("click", closeModuleSettings);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const sectionKey = document.getElementById("settings-section-key")?.value || activeSectionId;
    appSettings.modules = appSettings.modules || {};
    appSettings.modules[sectionKey] = {
      numberingPrefix: getValue("settings-numbering-prefix"),
      requiredFields: getLines("settings-required-fields"),
      dropdownOptions: getLines("settings-dropdown-options"),
      visibleColumns: getLines("settings-visible-columns"),
      notes: getValue("settings-module-notes")
    };

    const saveButton = document.getElementById("module-settings-save-btn");
    if (saveButton) saveButton.disabled = true;
    try {
      await saveAppSettings();
      showToast("Module settings saved to Firebase.", "success");
      closeModuleSettings();
    } catch (err) {
      console.error("Unable to save module settings", err);
      showToast(getFirebaseErrorMessage(err, "Unable to save module settings."), "error");
    } finally {
      if (saveButton) saveButton.disabled = false;
    }
  });
}

function openModuleSettings(sectionKey) {
  const modal = document.getElementById("module-settings-modal");
  if (!modal) return;

  const sectionTitle = document.getElementById("header-page-title")?.textContent?.trim() || "Current Tab";
  const settings = appSettings.modules?.[sectionKey] || getDefaultModuleSettings(sectionKey);
  setValue("settings-section-key", sectionKey);
  setValue("settings-numbering-prefix", settings.numberingPrefix);
  setTextareaLines("settings-required-fields", settings.requiredFields);
  setTextareaLines("settings-dropdown-options", settings.dropdownOptions);
  setTextareaLines("settings-visible-columns", settings.visibleColumns);
  setValue("settings-module-notes", settings.notes);

  const title = document.getElementById("module-settings-title");
  const subtitle = document.getElementById("module-settings-subtitle");
  if (title) title.textContent = `${sectionTitle} Settings`;
  if (subtitle) subtitle.textContent = `Saved in settings/appSettings.modules.${sectionKey}`;

  modal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeModuleSettings() {
  const modal = document.getElementById("module-settings-modal");
  if (modal) modal.hidden = true;
  document.body.style.overflow = "";
}

function getDefaultModuleSettings(sectionKey) {
  const readableKey = sectionKey.replace(/-/g, " ").toUpperCase();
  return {
    numberingPrefix: readableKey.slice(0, 3),
    requiredFields: [],
    dropdownOptions: [],
    visibleColumns: [],
    notes: ""
  };
}

function getLines(id) {
  return (document.getElementById(id)?.value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function setTextareaLines(id, lines = []) {
  const input = document.getElementById(id);
  if (input) input.value = Array.isArray(lines) ? lines.join("\n") : "";
}

/**
 * Switch and load tables/data for the loaded module
 */
function renderModule(sectionId) {
  activeSectionId = sectionId;
  currentEditId = null; // Clear edit states
  
  // Dynamic form overrides and resets
  const forms = document.querySelectorAll(`form`);
  forms.forEach(f => f.reset());
  
  const submitBtns = document.querySelectorAll(".submit-btn");
  submitBtns.forEach(btn => {
    if (WRITABLE_FORM_IDS.has(btn.closest("form")?.id)) {
      btn.textContent = "Save Record";
    } else {
      btn.textContent = "Read Only";
    }
  });

  // Load specific renderers
  switch (sectionId) {
    case "dashboard":
      updateDashboardMetrics();
      break;
    case "products":
      renderTable(KEYS.products, "products-table-body");
      setupProductSearch();
      break;
    case "customers":
      renderTable(KEYS.customers, "customers-table-body");
      setupCustomerSearch();
      break;
    case "suppliers":
      renderTable(KEYS.suppliers, "suppliers-table-body");
      break;
    case "purchase":
      renderTable(KEYS.purchases, "purchase-table-body");
      break;
    case "inventory":
      renderTable(KEYS.inventory, "inventory-table-body");
      break;
    case "production":
      renderTable(KEYS.production, "production-table-body");
      break;
    case "sales":
      renderTable(KEYS.sales, "sales-table-body");
      break;
    case "orders":
      renderTable(KEYS.orders, "orders-table-body");
      break;
    case "delivery":
      renderTable(KEYS.delivery, "delivery-table-body");
      break;
    case "expenses":
      renderTable(KEYS.expenses, "expenses-table-body");
      break;
    case "income":
      renderTable(KEYS.income, "income-table-body");
      break;
    case "cashbook":
      renderCashBookTable();
      break;
    case "bankbook":
      renderBankBookTable();
      break;
    case "accounting":
      renderAccountingSummary();
      break;
    case "investors":
      renderTable(KEYS.investors, "investors-table-body");
      break;
    case "investment-sharing":
      renderTable(KEYS.sharing, "sharing-table-body");
      break;
  }
}

/**
 * Recalculate metrics card displays from local db
 */
function updateDashboardMetrics() {
  const sales = getStoredRecords(KEYS.sales);
  const expenses = getStoredRecords(KEYS.expenses);
  const cash = getStoredRecords(KEYS.cashBook);
  const bank = getStoredRecords(KEYS.bankBook);
  const orders = getStoredRecords(KEYS.orders);
  const products = getStoredRecords(KEYS.products);
  const production = getStoredRecords(KEYS.production);
  const investors = getStoredRecords(KEYS.investors);

  // 1. Today's date in YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];

  // 2. Sum sales and expenses for today
  const todaySalesVal = sales
    .filter(s => s.date === todayStr)
    .reduce((sum, s) => sum + parseFloat(s.finalAmount || 0), 0);

  const todayExpensesVal = expenses
    .filter(e => e.date === todayStr)
    .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

  // 3. Compute final Cash and Bank balances (from last transaction row or aggregate)
  const cashBal = cash.length > 0 ? parseFloat(cash[cash.length - 1].balance || 0) : 0;
  const bankBal = bank.length > 0 ? parseFloat(bank[bank.length - 1].balance || 0) : 0;

  // 4. Pending orders count
  const pendingOrds = orders.filter(o => o.orderStatus !== "Delivered" && o.orderStatus !== "Cancelled").length;

  // 5. Stock Alerts (Current stock is less than or equal to minimum stock)
  const stockAlerts = products.filter(p => parseFloat(p.currentStock || 0) <= parseFloat(p.minimumStock || 0)).length;

  // 6. Production batches
  const prodBatchesCount = production.length;

  // 7. Investors capital summary
  const investorCap = investors.reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0);

  // Update DOM elements
  document.getElementById("dash-sales").textContent = formatCurrency(todaySalesVal);
  document.getElementById("dash-expenses").textContent = formatCurrency(todayExpensesVal);
  document.getElementById("dash-cash").textContent = formatCurrency(cashBal);
  document.getElementById("dash-bank").textContent = formatCurrency(bankBal);
  document.getElementById("dash-orders").textContent = pendingOrds;
  document.getElementById("dash-alerts").textContent = stockAlerts;
  document.getElementById("dash-production").textContent = prodBatchesCount;
  document.getElementById("dash-investor").textContent = formatCurrency(investorCap);
}

/**
 * Universal table renderer using Firestore-backed in-memory arrays
 */
function renderTable(key, tableBodyId) {
  const tbody = document.getElementById(tableBodyId);
  if (!tbody) return;

  const records = getStoredRecords(key);
  tbody.innerHTML = "";

  if (records.length === 0) {
    tbody.innerHTML = `<tr><td colspan="20" class="text-center" style="color: var(--text-muted);">No Firebase records found for this module yet. Admin users can create the first record from the form.</td></tr>`;
    return;
  }

  records.forEach((row, index) => {
    const tr = document.createElement("tr");
    tr.dataset.id = row.id;

    // Custom row styling cells according to collection keys
    let cellsHTML = "";

    if (key === KEYS.products) {
      cellsHTML = `
        <td><strong>${row.name}</strong><br><small style="color: var(--text-muted);">${row.id}</small></td>
        <td>${row.sku}</td>
        <td>${row.category}</td>
        <td>${row.unit}</td>
        <td>${formatCurrency(row.mrp)}</td>
        <td>${formatCurrency(row.salePrice)}</td>
        <td>${formatCurrency(row.costPrice)}</td>
        <td>${row.currentStock} / ${row.minimumStock}</td>
        <td><span class="badge ${row.status === 'Active' ? 'badge-success' : 'badge-danger'}">${row.status}</span></td>
      `;
    } else if (key === KEYS.customers) {
      cellsHTML = `
        <td><strong>${row.name}</strong><br><small style="color: var(--text-muted);">${row.id}</small></td>
        <td>${row.phone}<br><small style="color: #25d366;">WA: ${row.whatsapp || row.phone}</small></td>
        <td>${row.place}</td>
        <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${row.address}</td>
        <td>${row.pin}</td>
        <td><span class="badge badge-info">${row.type}</span></td>
      `;
    } else if (key === KEYS.suppliers) {
      cellsHTML = `
        <td><strong>${row.name}</strong><br><small style="color: var(--text-muted);">${row.id}</small></td>
        <td>${row.phone}</td>
        <td>${row.place}</td>
        <td>${row.gst || 'No GST'}</td>
        <td>${row.itemSupplied}</td>
        <td>${row.terms}</td>
      `;
    } else if (key === KEYS.purchases) {
      cellsHTML = `
        <td>${formatDate(row.date)}</td>
        <td><strong>${row.supplier}</strong><br><small>${row.invoice}</small></td>
        <td>${row.itemName}</td>
        <td>${row.qty} ${row.unit}</td>
        <td>${formatCurrency(row.rate)}</td>
        <td><strong>${formatCurrency(row.totalAmount)}</strong></td>
        <td><span class="badge badge-info">${row.paymentMode}</span></td>
        <td><span class="badge ${row.paymentStatus === 'Paid' ? 'badge-success' : row.paymentStatus === 'Pending' ? 'badge-danger' : 'badge-warning'}">${row.paymentStatus}</span></td>
      `;
    } else if (key === KEYS.inventory) {
      cellsHTML = `
        <td><strong>${row.name}</strong><br><small>${row.id}</small></td>
        <td><span class="badge badge-info">${row.stockType}</span></td>
        <td>${row.openingStock}</td>
        <td style="color: var(--success);">+${row.stockIn}</td>
        <td style="color: var(--danger);">${row.stockOut > 0 ? '-' + row.stockOut : '0'}</td>
        <td><strong>${row.currentStock}</strong> ${row.unit}</td>
        <td>${row.minStock}</td>
        <td>${formatDate(row.lastUpdated)}</td>
      `;
    } else if (key === KEYS.production) {
      cellsHTML = `
        <td><strong>${row.batchNumber}</strong><br><small>${formatDate(row.date)}</small></td>
        <td>${row.productName}</td>
        <td>${row.rawMaterial}</td>
        <td>${row.qtyProduced}</td>
        <td>${row.packingQty}</td>
        <td style="color: var(--danger);">${row.wastage}</td>
        <td>${formatCurrency(row.cost)}</td>
        <td>${row.staff}</td>
      `;
    } else if (key === KEYS.sales) {
      cellsHTML = `
        <td>${formatDate(row.date)}</td>
        <td><strong>${row.customer}</strong></td>
        <td>${row.product}</td>
        <td>${row.qty} × ${formatCurrency(row.rate)}</td>
        <td>${formatCurrency(row.totalAmount)}</td>
        <td style="color: var(--danger);">${formatCurrency(row.discount)}</td>
        <td><strong>${formatCurrency(row.finalAmount)}</strong></td>
        <td><span class="badge ${row.paymentStatus === 'Paid' ? 'badge-success' : 'badge-danger'}">${row.paymentStatus}</span></td>
      `;
    } else if (key === KEYS.orders) {
      cellsHTML = `
        <td>${formatDate(row.date)}<br><span class="badge badge-info">${row.source}</span></td>
        <td><strong>${row.customerName}</strong><br>${row.phone}</td>
        <td>${row.product} (${row.qty})</td>
        <td>${formatCurrency(row.totalPayable)}</td>
        <td><span class="badge ${row.paymentStatus === 'Paid' ? 'badge-success' : 'badge-warning'}">${row.paymentStatus}</span></td>
        <td><span class="badge ${
          row.orderStatus === 'Delivered' ? 'badge-success' : 
          row.orderStatus === 'Cancelled' ? 'badge-danger' : 
          'badge-warning'
        }">${row.orderStatus}</span></td>
      `;
    } else if (key === KEYS.delivery) {
      cellsHTML = `
        <td><strong>${row.orderId}</strong></td>
        <td>${row.customer}</td>
        <td>${row.partner} (${row.trackingId || 'N/A'})</td>
        <td>${formatCurrency(row.charge)}</td>
        <td>${formatDate(row.dispatchDate)}</td>
        <td><span class="badge ${
          row.status === 'Delivered' ? 'badge-success' : 
          row.status === 'Cancelled' ? 'badge-danger' : 
          'badge-info'
        }">${row.status}</span></td>
        <td>${row.deliveredDate ? formatDate(row.deliveredDate) : '-'}</td>
      `;
    } else if (key === KEYS.expenses) {
      cellsHTML = `
        <td>${formatDate(row.date)}</td>
        <td><span class="badge badge-danger">${row.category}</span></td>
        <td>${row.desc}</td>
        <td><strong>${formatCurrency(row.amount)}</strong></td>
        <td>${row.mode}</td>
        <td>${row.paidTo}</td>
        <td>${row.receipt || '-'}</td>
      `;
    } else if (key === KEYS.income) {
      cellsHTML = `
        <td>${formatDate(row.date)}</td>
        <td><span class="badge badge-success">${row.source}</span></td>
        <td>${row.desc}</td>
        <td><strong>${formatCurrency(row.amount)}</strong></td>
        <td>${row.mode}</td>
        <td>${row.receivedFrom}</td>
      `;
    } else if (key === KEYS.investors) {
      cellsHTML = `
        <td><strong>${row.name}</strong><br><small>${row.id}</small></td>
        <td>${row.phone}<br><small>${row.email}</small></td>
        <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${row.address}</td>
        <td><strong>${formatCurrency(row.amount)}</strong></td>
        <td><strong>${row.share}%</strong></td>
        <td>${formatDate(row.date)}</td>
        <td><span class="badge ${row.status === 'Active' ? 'badge-success' : 'badge-danger'}">${row.status}</span></td>
      `;
    } else if (key === KEYS.sharing) {
      cellsHTML = `
        <td><strong>${row.period}</strong></td>
        <td>${formatCurrency(row.totalProfit)}</td>
        <td><strong>${row.investor}</strong></td>
        <td>${row.share}%</td>
        <td><strong>${formatCurrency(row.amount)}</strong></td>
        <td><span class="badge ${row.status === 'Paid' ? 'badge-success' : 'badge-warning'}">${row.status}</span></td>
        <td>${row.date ? formatDate(row.date) : '-'}</td>
      `;
    }

    if (isWritableKey(key)) {
      const documentButtons = PRINTABLE_DOCUMENT_KEYS.has(key)
        ? `<button class="btn-secondary btn-sm print-doc-btn" style="padding: 0.25rem 0.5rem; margin-right: 4px;">Print</button>
           <button class="btn-secondary btn-sm download-doc-btn" style="padding: 0.25rem 0.5rem; margin-right: 4px;">Download</button>`
        : "";
      tr.innerHTML = `
        ${cellsHTML}
        <td class="text-right" style="white-space: nowrap;">
          ${documentButtons}
          <button class="btn-secondary btn-sm edit-btn" style="padding: 0.25rem 0.5rem; margin-right: 4px;">Edit</button>
          <button class="btn-danger btn-sm delete-btn" style="padding: 0.25rem 0.5rem;">Delete</button>
        </td>
      `;
      tr.querySelector(".edit-btn").addEventListener("click", () => loadRecordForEdit(key, row.id));
      tr.querySelector(".delete-btn").addEventListener("click", () => deleteRecord(key, row.id));
      tr.querySelector(".print-doc-btn")?.addEventListener("click", () => printDocument(key, row.id));
      tr.querySelector(".download-doc-btn")?.addEventListener("click", () => downloadDocumentHtml(key, row.id));
    } else {
      tr.innerHTML = `
        ${cellsHTML}
        <td class="text-right" style="white-space: nowrap; color: var(--text-muted);">Read only</td>
      `;
    }

    tbody.appendChild(tr);
  });
}

async function getCompanyProfileForDocument() {
  try {
    return await loadCompanyProfile();
  } catch (err) {
    console.error("Unable to load company profile for printable document", err);
    showToast(getFirebaseErrorMessage(err, "Unable to load company profile for printable document."), "error");
    return {};
  }
}

function getPrintableDocumentMeta(key) {
  if (key === KEYS.sales) {
    return { title: "Sales Invoice", numberLabel: "Invoice No", recordNumber: (record) => record.invoice || record.id, partyLabel: "Bill To", amountLabel: "Net Receivable", amountField: "finalAmount" };
  }

  if (key === KEYS.purchases) {
    return { title: "Purchase Invoice", numberLabel: "Supplier Invoice", recordNumber: (record) => record.invoice || record.id, partyLabel: "Supplier", amountLabel: "Total Amount", amountField: "totalAmount" };
  }

  return { title: "Delivery Note", numberLabel: "Delivery Ref", recordNumber: (record) => record.orderId || record.id, partyLabel: "Ship To", amountLabel: "Shipping Charge", amountField: "charge" };
}

function getPrintableLineItems(key, record) {
  if (key === KEYS.sales) {
    return [{ item: record.product, qty: record.qty, rate: record.rate, total: record.finalAmount }];
  }

  if (key === KEYS.purchases) {
    return [{ item: record.itemName || record.item, qty: record.qty, rate: record.rate, total: record.totalAmount }];
  }

  return [{ item: `Courier: ${record.partner || "-"}`, qty: 1, rate: record.charge, total: record.charge }];
}

function getPartyDetails(key, record) {
  if (key === KEYS.sales) return [record.customer, record.notes].filter(Boolean).join("<br>");
  if (key === KEYS.purchases) return [record.supplier, record.paymentMode ? `Payment: ${record.paymentMode}` : ""].filter(Boolean).join("<br>");
  return [record.customer, record.trackingId ? `Tracking: ${record.trackingId}` : "", record.status ? `Status: ${record.status}` : ""].filter(Boolean).join("<br>");
}

function buildPrintableDocumentHtml(key, record, profile = {}) {
  const meta = getPrintableDocumentMeta(key);
  const lineItems = getPrintableLineItems(key, record);
  const documentNumber = meta.recordNumber(record);
  const logo = profile.logoDataUrl ? `<img src="${profile.logoDataUrl}" alt="Company logo" class="print-logo">` : "";
  const signature = profile.signatureDataUrl ? `<img src="${profile.signatureDataUrl}" alt="Signature" class="print-signature-img">` : "";
  const website = profile.website ? `<div>${escapeHtml(profile.website)}</div>` : "";
  const email = profile.email ? `<div>${escapeHtml(profile.email)}</div>` : "";
  const phone = profile.phone ? `<div>${escapeHtml(profile.phone)}</div>` : "";
  const gst = profile.gst ? `<div><strong>GST:</strong> ${escapeHtml(profile.gst)}</div>` : "";
  const companyAddress = [profile.address, profile.state, profile.pincode].filter(Boolean).map(escapeHtml).join(", ");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(meta.title)} - ${escapeHtml(documentNumber || record.id || "document")}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; padding: 24px; }
    .print-sheet { max-width: 820px; margin: 0 auto; border: 1px solid #d1d5db; padding: 28px; }
    .print-header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #0f766e; padding-bottom: 16px; }
    .print-logo { max-width: 120px; max-height: 90px; object-fit: contain; }
    h1 { margin: 0; color: #0f766e; font-size: 24px; }
    h2 { margin: 16px 0 8px; font-size: 18px; }
    .muted { color: #64748b; font-size: 13px; line-height: 1.5; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 20px 0; }
    .box { border: 1px solid #e2e8f0; padding: 12px; min-height: 72px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
    th { background: #f8fafc; }
    .text-right { text-align: right; }
    .total-row td { font-weight: 700; background: #f8fafc; }
    .print-footer { display: flex; justify-content: space-between; gap: 24px; margin-top: 36px; align-items: flex-end; }
    .print-signature-img { max-width: 150px; max-height: 70px; object-fit: contain; display: block; margin-bottom: 8px; }
    @media print { body { padding: 0; } .print-sheet { border: 0; } }
  </style>
</head>
<body>
  <main class="print-sheet">
    <section class="print-header">
      <div>
        ${logo}
        <h1>${escapeHtml(profile.companyName || "Lakfa ERP")}</h1>
        <div class="muted">${companyAddress || "Company address"}</div>
        <div class="muted">${phone}${email}${website}${gst}</div>
      </div>
      <div class="text-right">
        <h1>${escapeHtml(meta.title)}</h1>
        <div class="muted"><strong>${escapeHtml(meta.numberLabel)}:</strong> ${escapeHtml(documentNumber || record.id || "-")}</div>
        <div class="muted"><strong>Date:</strong> ${escapeHtml(formatDate(record.date || record.dispatchDate || new Date().toISOString()))}</div>
      </div>
    </section>

    <section class="meta-grid">
      <div class="box">
        <h2>${escapeHtml(meta.partyLabel)}</h2>
        <div class="muted">${getPartyDetails(key, record) || "-"}</div>
      </div>
      <div class="box">
        <h2>Payment / Status</h2>
        <div class="muted">${escapeHtml(record.paymentStatus || record.status || "-")}</div>
        <div class="muted">${escapeHtml(record.paymentMode || record.partner || "")}</div>
      </div>
    </section>

    <table>
      <thead><tr><th>Item / Description</th><th class="text-right">Qty</th><th class="text-right">Rate</th><th class="text-right">Amount</th></tr></thead>
      <tbody>
        ${lineItems.map((item) => `<tr><td>${escapeHtml(item.item || "-")}</td><td class="text-right">${escapeHtml(item.qty ?? "-")}</td><td class="text-right">${formatCurrency(item.rate || 0)}</td><td class="text-right">${formatCurrency(item.total || 0)}</td></tr>`).join("")}
        ${key === KEYS.sales ? `<tr><td colspan="3" class="text-right">Discount</td><td class="text-right">${formatCurrency(record.discount || 0)}</td></tr>` : ""}
        <tr class="total-row"><td colspan="3" class="text-right">${escapeHtml(meta.amountLabel)}</td><td class="text-right">${formatCurrency(record[meta.amountField] || 0)}</td></tr>
      </tbody>
    </table>

    <section class="print-footer">
      <div class="muted">Generated from Firestore record ${escapeHtml(record.id || "-")}.</div>
      <div class="text-right">${signature}<strong>Authorized Signatory</strong></div>
    </section>
  </main>
</body>
</html>`;
}

async function printDocument(key, id) {
  const record = getStoredRecords(key).find((item) => item.id === id);
  if (!record) {
    showToast("Unable to find this Firestore record for printing.", "error");
    return;
  }

  const profile = await getCompanyProfileForDocument();
  const html = buildPrintableDocumentHtml(key, record, profile);
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) {
    showToast("Popup blocked. Please allow popups to print this document.", "error");
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

async function downloadDocumentHtml(key, id) {
  const record = getStoredRecords(key).find((item) => item.id === id);
  if (!record) {
    showToast("Unable to find this Firestore record for download.", "error");
    return;
  }

  const profile = await getCompanyProfileForDocument();
  const html = buildPrintableDocumentHtml(key, record, profile);
  const meta = getPrintableDocumentMeta(key);
  const fileName = `${meta.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${(meta.recordNumber(record) || record.id || "document").toString().replace(/[^a-z0-9-]+/gi, "-")}.html`;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(link.href);
  link.remove();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Handle custom table loader for Cash Book (dynamic balance aggregation)
 */
function renderCashBookTable() {
  const tbody = document.getElementById("cashbook-table-body");
  if (!tbody) return;

  const records = getStoredRecords(KEYS.cashBook);
  tbody.innerHTML = "";

  if (records.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center">No cash entries recorded.</td></tr>`;
    return;
  }

  records.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${formatDate(row.date)}</td>
      <td><span class="badge ${row.type === 'Cash In' ? 'badge-success' : 'badge-danger'}">${row.type}</span></td>
      <td>${row.desc}</td>
      <td style="color: var(--success); font-weight: 500;">${row.cashIn > 0 ? '+' + formatCurrency(row.cashIn) : '-'}</td>
      <td style="color: var(--danger); font-weight: 500;">${row.cashOut > 0 ? '-' + formatCurrency(row.cashOut) : '-'}</td>
      <td><strong>${formatCurrency(row.balance)}</strong></td>
      <td>${row.ref || '-'}</td>
      <td class="text-right" style="white-space: nowrap;">
        <button class="btn-secondary btn-sm edit-btn" style="padding: 0.25rem 0.5rem; margin-right: 4px;">Edit</button>
        <button class="btn-danger btn-sm delete-btn" style="padding: 0.25rem 0.5rem;">Delete</button>
      </td>
    `;
    tr.querySelector(".edit-btn").addEventListener("click", () => loadRecordForEdit(KEYS.cashBook, row.id));
    tr.querySelector(".delete-btn").addEventListener("click", () => deleteRecord(KEYS.cashBook, row.id));

    tbody.appendChild(tr);
  });
}

/**
 * Handle custom table loader for Bank Book
 */
function renderBankBookTable() {
  const tbody = document.getElementById("bankbook-table-body");
  if (!tbody) return;

  const records = getStoredRecords(KEYS.bankBook);
  tbody.innerHTML = "";

  if (records.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center">No bank entries recorded.</td></tr>`;
    return;
  }

  records.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${formatDate(row.date)}</td>
      <td><strong>${row.bankName}</strong></td>
      <td><span class="badge ${row.type === 'Amount In' ? 'badge-success' : 'badge-danger'}">${row.type}</span></td>
      <td>${row.desc}</td>
      <td style="color: var(--success);">${row.amountIn > 0 ? '+' + formatCurrency(row.amountIn) : '-'}</td>
      <td style="color: var(--danger);">${row.amountOut > 0 ? '-' + formatCurrency(row.amountOut) : '-'}</td>
      <td><strong>${formatCurrency(row.balance)}</strong></td>
      <td>${row.refNum || '-'}</td>
      <td class="text-right" style="white-space: nowrap;">
        <button class="btn-secondary btn-sm edit-btn" style="padding: 0.25rem 0.5rem; margin-right: 4px;">Edit</button>
        <button class="btn-danger btn-sm delete-btn" style="padding: 0.25rem 0.5rem;">Delete</button>
      </td>
    `;
    tr.querySelector(".edit-btn").addEventListener("click", () => loadRecordForEdit(KEYS.bankBook, row.id));
    tr.querySelector(".delete-btn").addEventListener("click", () => deleteRecord(KEYS.bankBook, row.id));

    tbody.appendChild(tr);
  });
}

/**
 * Dynamic aggregates for simple Accounting summary card block
 */
function renderAccountingSummary() {
  const sales = getStoredRecords(KEYS.sales);
  const purchases = getStoredRecords(KEYS.purchases);
  const expenses = getStoredRecords(KEYS.expenses);
  const income = getStoredRecords(KEYS.income);
  const cash = getStoredRecords(KEYS.cashBook);
  const bank = getStoredRecords(KEYS.bankBook);

  const totIncome = income.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
  const totExpense = expenses.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
  const totSales = sales.reduce((sum, item) => sum + parseFloat(item.finalAmount || 0), 0);
  const totPurchase = purchases.reduce((sum, item) => sum + parseFloat(item.totalAmount || 0), 0);
  
  const cashBal = cash.length > 0 ? parseFloat(cash[cash.length - 1].balance || 0) : 0;
  const bankBal = bank.length > 0 ? parseFloat(bank[bank.length - 1].balance || 0) : 0;

  // Simple Profit Estimate: Income - Expenses (or Sales - Cost of Goods Sold / Purchases - Expenses)
  // For the simple mockup version, we'll use: Total Income - Total Expense
  const profitEstimate = totIncome - totExpense;
  
  // Pending sales and purchase payments
  const pendingSales = sales.filter(s => s.paymentStatus !== "Paid").reduce((sum, s) => sum + parseFloat(s.finalAmount || 0), 0);
  const pendingPurchases = purchases.filter(p => p.paymentStatus !== "Paid").reduce((sum, p) => sum + parseFloat(p.totalAmount || 0), 0);

  document.getElementById("acc-tot-income").textContent = formatCurrency(totIncome);
  document.getElementById("acc-tot-expense").textContent = formatCurrency(totExpense);
  document.getElementById("acc-tot-sales").textContent = formatCurrency(totSales);
  document.getElementById("acc-tot-purchase").textContent = formatCurrency(totPurchase);
  document.getElementById("acc-cash-bal").textContent = formatCurrency(cashBal);
  document.getElementById("acc-bank-bal").textContent = formatCurrency(bankBal);
  
  const profitEl = document.getElementById("acc-profit");
  profitEl.textContent = formatCurrency(profitEstimate);
  profitEl.style.color = profitEstimate >= 0 ? "var(--success)" : "var(--danger)";

  document.getElementById("acc-pending-in").textContent = formatCurrency(pendingSales);
  document.getElementById("acc-pending-out").textContent = formatCurrency(pendingPurchases);
}

/**
 * Handle form editing states
 */
function isWritableKey(key) {
  return WRITABLE_KEYS.has(key);
}

function initWritableFormListeners() {
  setupFirestoreForm({
    formId: "product-form",
    key: KEYS.products,
    submitButtonId: "product-submit-btn",
    validate: (data) => data.name && data.sku && data.unit,
    getData: () => ({
      name: getValue("prod-name"),
      sku: getValue("prod-sku"),
      category: getValue("prod-category"),
      unit: getValue("prod-unit"),
      mrp: getNumber("prod-mrp"),
      salePrice: getNumber("prod-saleprice"),
      costPrice: getNumber("prod-costprice"),
      openingStock: getNumber("prod-opening"),
      currentStock: getNumber("prod-current"),
      minimumStock: getNumber("prod-minimum"),
      status: getValue("prod-status")
    }),
    populate: (record) => {
      setValue("prod-name", record.name);
      setValue("prod-sku", record.sku);
      setValue("prod-category", record.category);
      setValue("prod-unit", record.unit);
      setValue("prod-mrp", record.mrp);
      setValue("prod-saleprice", record.salePrice);
      setValue("prod-costprice", record.costPrice);
      setValue("prod-opening", record.openingStock);
      setValue("prod-current", record.currentStock);
      setValue("prod-minimum", record.minimumStock);
      setValue("prod-status", record.status);
    }
  });

  setupFirestoreForm({
    formId: "customer-form",
    key: KEYS.customers,
    submitButtonId: "customer-submit-btn",
    validate: (data) => data.name && data.phone && data.place,
    getData: () => ({
      name: getValue("cust-name"),
      phone: getValue("cust-phone"),
      whatsapp: getValue("cust-whatsapp"),
      place: getValue("cust-place"),
      pin: getValue("cust-pin"),
      address: getValue("cust-address"),
      type: getValue("cust-type"),
      notes: getValue("cust-notes")
    }),
    populate: (record) => {
      setValue("cust-name", record.name);
      setValue("cust-phone", record.phone);
      setValue("cust-whatsapp", record.whatsapp);
      setValue("cust-place", record.place);
      setValue("cust-pin", record.pin);
      setValue("cust-address", record.address);
      setValue("cust-type", record.type);
      setValue("cust-notes", record.notes);
    }
  });

  setupFirestoreForm({
    formId: "supplier-form",
    key: KEYS.suppliers,
    submitButtonId: "supplier-submit-btn",
    validate: (data) => data.name && data.phone && data.place,
    getData: () => ({
      name: getValue("supp-name"),
      phone: getValue("supp-phone"),
      place: getValue("supp-place"),
      address: getValue("supp-address"),
      gst: getValue("supp-gst"),
      itemSupplied: getValue("supp-item"),
      terms: getValue("supp-terms"),
      notes: getValue("supp-notes")
    }),
    populate: (record) => {
      setValue("supp-name", record.name);
      setValue("supp-phone", record.phone);
      setValue("supp-place", record.place);
      setValue("supp-address", record.address);
      setValue("supp-gst", record.gst);
      setValue("supp-item", record.itemSupplied);
      setValue("supp-terms", record.terms);
      setValue("supp-notes", record.notes);
    }
  });

  setupFirestoreForm({
    formId: "investors-form",
    key: KEYS.investors,
    submitButtonId: "investors-submit-btn",
    validate: (data) => data.name && data.email && data.amount > 0,
    getData: () => ({
      name: getValue("inv-name"),
      phone: getValue("inv-phone"),
      email: getValue("inv-email"),
      address: getValue("inv-address"),
      amount: getNumber("inv-amount"),
      share: getNumber("inv-share"),
      date: getValue("inv-date"),
      status: getValue("inv-status"),
      notes: getValue("inv-notes")
    }),
    populate: (record) => {
      setValue("inv-name", record.name);
      setValue("inv-phone", record.phone);
      setValue("inv-email", record.email);
      setValue("inv-address", record.address);
      setValue("inv-amount", record.amount);
      setValue("inv-share", record.share);
      setValue("inv-date", record.date);
      setValue("inv-status", record.status);
      setValue("inv-notes", record.notes);
    }
  });

  setupFirestoreForm({
    formId: "purchase-form",
    key: KEYS.purchases,
    submitButtonId: "purchase-submit-btn",
    validate: (data) => data.date && data.invoice && data.supplier && data.item && data.qty > 0 && data.rate >= 0,
    getData: () => {
      const qty = getNumber("pur-qty");
      const rate = getNumber("pur-rate");
      return {
        date: getValue("pur-date"),
        invoice: getValue("pur-invoice"),
        supplier: getValue("pur-supplier"),
        item: getValue("pur-item"),
        qty,
        unit: getValue("pur-unit"),
        rate,
        totalAmount: qty * rate,
        paymentMode: getValue("pur-mode"),
        paymentStatus: getValue("pur-status"),
        notes: getValue("pur-notes")
      };
    },
    populate: populatePurchase,
    afterSave: async (data, meta) => {
      await reconcileStockAndLedger(data, { ...meta, moduleName: "Purchase", stockName: data.item, stockDelta: data.qty, amount: data.totalAmount, direction: "out", reference: data.invoice });
    }
  });

  setupFirestoreForm({
    formId: "inventory-form",
    key: KEYS.inventory,
    submitButtonId: "inventory-submit-btn",
    validate: (data) => data.name && data.category && data.unit && data.currentStock >= 0,
    getData: () => ({
      name: getValue("stk-name"),
      category: getValue("stk-category"),
      type: getValue("stk-type"),
      openingStock: getNumber("stk-opening"),
      stockIn: getNumber("stk-in"),
      stockOut: getNumber("stk-out"),
      currentStock: getNumber("stk-current"),
      unit: getValue("stk-unit"),
      minAlert: getNumber("stk-min"),
      lastUpdated: getValue("stk-date")
    }),
    populate: populateInventory
  });

  setupFirestoreForm({
    formId: "sales-form",
    key: KEYS.sales,
    submitButtonId: "sales-submit-btn",
    validate: (data) => data.date && data.customer && data.product && data.qty > 0 && data.rate >= 0,
    getData: () => {
      const qty = getNumber("sale-qty");
      const rate = getNumber("sale-rate");
      const totalAmount = qty * rate;
      const discount = getNumber("sale-discount");
      return {
        date: getValue("sale-date"),
        customer: getValue("sale-customer"),
        product: getValue("sale-product"),
        qty,
        rate,
        totalAmount,
        discount,
        finalAmount: Math.max(totalAmount - discount, 0),
        paymentMode: getValue("sale-mode"),
        paymentStatus: getValue("sale-status"),
        notes: getValue("sale-notes")
      };
    },
    populate: populateSales,
    afterSave: async (data, meta) => {
      await reconcileStockAndLedger(data, { ...meta, moduleName: "Sales", stockName: data.product, stockDelta: -data.qty, amount: data.finalAmount, direction: "in", reference: data.customer });
    }
  });

  setupFirestoreForm({
    formId: "orders-form",
    key: KEYS.orders,
    submitButtonId: "orders-submit-btn",
    validate: (data) => data.date && data.customer && data.phone && data.product && data.qty > 0 && data.totalPayable >= 0,
    getData: () => {
      const amount = getNumber("ord-amount");
      const deliveryCharge = getNumber("ord-delivery");
      return {
        date: getValue("ord-date"),
        source: getValue("ord-source"),
        customer: getValue("ord-customer"),
        phone: getValue("ord-phone"),
        product: getValue("ord-product"),
        qty: getNumber("ord-qty"),
        amount,
        deliveryCharge,
        totalPayable: amount + deliveryCharge,
        paymentStatus: getValue("ord-pstatus"),
        orderStatus: getValue("ord-ostatus"),
        address: getValue("ord-address"),
        notes: getValue("ord-notes")
      };
    },
    populate: populateOrders,
    afterSave: async (data, meta) => {
      await reconcileLedgerOnly(data, { ...meta, moduleName: "Order", amount: data.totalPayable, direction: "in", reference: data.customer });
    }
  });

  setupFirestoreForm({
    formId: "delivery-form",
    key: KEYS.delivery,
    submitButtonId: "delivery-submit-btn",
    validate: (data) => data.orderId && data.customer && data.charge >= 0 && data.dispatchDate,
    getData: () => ({
      orderId: getValue("dlv-order"),
      customer: getValue("dlv-customer"),
      partner: getValue("dlv-partner"),
      trackingId: getValue("dlv-tracking"),
      charge: getNumber("dlv-charge"),
      dispatchDate: getValue("dlv-dispatch"),
      status: getValue("dlv-status"),
      deliveredDate: getValue("dlv-delivered"),
      notes: getValue("dlv-notes")
    }),
    populate: populateDelivery
  });

  setupFirestoreForm({
    formId: "expenses-form",
    key: KEYS.expenses,
    submitButtonId: "expenses-submit-btn",
    validate: (data) => data.date && data.desc && data.amount > 0 && data.paidTo,
    getData: () => ({
      date: getValue("exp-date"),
      category: getValue("exp-cat"),
      desc: getValue("exp-desc"),
      amount: getNumber("exp-amount"),
      mode: getValue("exp-mode"),
      paidTo: getValue("exp-paid"),
      receipt: getValue("exp-receipt"),
      notes: getValue("exp-notes")
    }),
    populate: populateExpenses,
    afterSave: async (data, meta) => {
      await reconcileLedgerOnly(data, { ...meta, moduleName: "Expense", amount: data.amount, direction: "out", reference: data.receipt || data.paidTo });
    }
  });

  setupFirestoreForm({
    formId: "income-form",
    key: KEYS.income,
    submitButtonId: "income-submit-btn",
    validate: (data) => data.date && data.desc && data.amount > 0 && data.receivedFrom,
    getData: () => ({
      date: getValue("inc-date"),
      source: getValue("inc-source"),
      desc: getValue("inc-desc"),
      amount: getNumber("inc-amount"),
      mode: getValue("inc-mode"),
      receivedFrom: getValue("inc-received"),
      notes: getValue("inc-notes")
    }),
    populate: populateIncome,
    afterSave: async (data, meta) => {
      await reconcileLedgerOnly(data, { ...meta, moduleName: "Income", amount: data.amount, direction: "in", reference: data.receivedFrom });
    }
  });

  setupFirestoreForm({
    formId: "cashbook-form",
    key: KEYS.cashBook,
    submitButtonId: "cashbook-submit-btn",
    validate: (data) => data.date && data.desc && (data.cashIn > 0 || data.cashOut > 0),
    getData: () => {
      const type = getValue("cb-type");
      const amount = getNumber("cb-amount");
      return {
        date: getValue("cb-date"),
        type,
        desc: getValue("cb-desc"),
        cashIn: type === "Cash In" ? amount : 0,
        cashOut: type === "Cash Out" ? amount : 0,
        balance: getProjectedCashBalance(type === "Cash In" ? amount : -amount),
        ref: getValue("cb-ref")
      };
    },
    populate: populateCashBook,
    afterSave: async (data, meta) => {
      await reconcileLedgerBalances(KEYS.cashBook, data, meta);
    }
  });

  setupFirestoreForm({
    formId: "bankbook-form",
    key: KEYS.bankBook,
    submitButtonId: "bankbook-submit-btn",
    validate: (data) => data.date && data.bankName && data.desc && data.refNum && (data.amountIn > 0 || data.amountOut > 0),
    getData: () => {
      const type = getValue("bb-type");
      const amount = getNumber("bb-amount");
      return {
        date: getValue("bb-date"),
        bankName: getValue("bb-bank"),
        type,
        desc: getValue("bb-desc"),
        amountIn: type === "Amount In" ? amount : 0,
        amountOut: type === "Amount Out" ? amount : 0,
        balance: getProjectedBankBalance(type === "Amount In" ? amount : -amount),
        refNum: getValue("bb-ref")
      };
    },
    populate: populateBankBook,
    afterSave: async (data, meta) => {
      await reconcileLedgerBalances(KEYS.bankBook, data, meta);
    }
  });

  setupFirestoreForm({
    formId: "production-form",
    key: KEYS.production,
    submitButtonId: "production-submit-btn",
    validate: (data) => data.batch && data.date && data.productName && data.quantityProduced > 0 && data.batchCost >= 0,
    getData: () => ({
      batch: getValue("prod-batch"),
      date: getValue("prod-date"),
      productName: getValue("prod-pname"),
      rawMaterial: getValue("prod-raw"),
      quantityProduced: getNumber("prod-qty"),
      packingQty: getValue("prod-pack"),
      wastage: getValue("prod-waste"),
      batchCost: getNumber("prod-cost"),
      staff: getValue("prod-staff"),
      notes: getValue("prod-notes")
    }),
    populate: populateProduction,
    afterSave: async (data, meta) => {
      await reconcileProductionStock(data, meta);
    },
    beforeDelete: async (record) => {
      await reconcileProductionStock(null, { isDelete: true, previous: record });
    }
  });

  setupFirestoreForm({
    formId: "sharing-form",
    key: KEYS.sharing,
    submitButtonId: "sharing-submit-btn",
    validate: (data) => data.period && data.investor && data.share > 0 && data.totalProfit >= 0,
    getData: () => {
      const totalProfit = getNumber("shr-profit");
      const share = getNumber("shr-percentage");
      return {
        period: getValue("shr-period"),
        totalProfit,
        investor: getValue("shr-investor"),
        share,
        amount: (totalProfit * share) / 100,
        status: getValue("shr-status"),
        date: getValue("shr-date"),
        notes: getValue("shr-notes")
      };
    },
    populate: populateSharing,
    afterSave: async (data, meta) => {
      await reconcileProfitSharingLedger(data, meta);
    },
    beforeDelete: async (record) => {
      await reconcileProfitSharingLedger(null, { isDelete: true, previous: record });
    }
  });
}

function setupFirestoreForm(config) {
  const form = document.getElementById(config.formId);
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = config.getData();
    if (!config.validate(data)) {
      showToast("Please fill all required fields correctly.", "error");
      return;
    }

    const button = document.getElementById(config.submitButtonId);
    if (button) button.disabled = true;

    try {
      let savedId = currentEditId;
      const isUpdate = Boolean(currentEditId && activeSectionKey() === config.key);
      const previous = isUpdate ? getStoredRecords(config.key).find((item) => item.id === currentEditId) : null;
      if (isUpdate) {
        await updateCollectionRecord(COLLECTION_BY_KEY[config.key], currentEditId, data);
        showToast("Record updated in Firebase.", "success");
      } else {
        savedId = await createCollectionRecord(COLLECTION_BY_KEY[config.key], data);
        showToast("Record created in Firebase.", "success");
      }
      if (config.afterSave) {
        await config.afterSave(data, { id: savedId, isUpdate, previous });
      }
      currentEditId = null;
      form.reset();
      if (button) button.textContent = "Save Record";
      await refreshActiveData();
    } catch (err) {
      console.error("Firestore write failed", err);
      showToast(getFirebaseErrorMessage(err, "Firebase write failed."), "error");
    } finally {
      if (button) button.disabled = false;
    }
  });
}

function loadRecordForEdit(key, id) {
  if (!isWritableKey(key)) {
    showToast(READ_ONLY_MESSAGE, "info");
    return;
  }

  const record = getStoredRecords(key).find((item) => item.id === id);
  const config = getFormConfigForKey(key);
  if (!record || !config) return;

  currentEditId = id;
  config.populate(record);
  const button = document.getElementById(config.submitButtonId);
  if (button) button.textContent = "Update Record";
  showToast("Record loaded for editing.", "info");
}

async function deleteRecord(key, id) {
  if (!isWritableKey(key)) {
    showToast(READ_ONLY_MESSAGE, "info");
    return;
  }

  if (!confirm("Delete this Firebase record?")) return;

  try {
    const config = getFormConfigForKey(key);
    const record = getStoredRecords(key).find((item) => item.id === id);
    if (config?.beforeDelete && record) {
      await config.beforeDelete(record);
    }
    await deleteCollectionRecord(COLLECTION_BY_KEY[key], id);
    showToast("Record deleted from Firebase.", "success");
    await refreshActiveData();
  } catch (err) {
    console.error("Firestore delete failed", err);
    showToast(getFirebaseErrorMessage(err, "Firebase delete failed."), "error");
  }
}

async function adjustInventoryStock(itemName, quantityDelta, sourceType, sourceRef) {
  if (!itemName || !quantityDelta) return;

  const inventoryRecord = getStoredRecords(KEYS.inventory).find((item) =>
    (item.name || "").toLowerCase() === itemName.toLowerCase()
  );

  if (!inventoryRecord?.id) return;

  const currentStock = getNumberFromValue(inventoryRecord.currentStock);
  const stockIn = Math.max(quantityDelta, 0);
  const stockOut = Math.max(-quantityDelta, 0);
  await updateCollectionRecord(COLLECTIONS.inventory, inventoryRecord.id, {
    currentStock: Math.max(currentStock + quantityDelta, 0),
    stockIn: getNumberFromValue(inventoryRecord.stockIn) + stockIn,
    stockOut: getNumberFromValue(inventoryRecord.stockOut) + stockOut,
    lastUpdated: new Date().toISOString().slice(0, 10),
    lastStockSource: sourceType,
    lastStockRef: sourceRef || ""
  });
}

async function createLedgerEntryFromPayment(data, moduleName, amount, direction, reference) {
  if (!amount || data.paymentStatus === "Pending") return;

  const paymentMode = data.paymentMode || data.mode || "Cash";
  const desc = `${moduleName}: ${data.desc || data.item || data.product || data.customer || reference || "Record"}`;
  const isIn = direction === "in";

  if (paymentMode === "Cash") {
    await createCollectionRecord(COLLECTIONS.cashBook, {
      date: data.date || new Date().toISOString().slice(0, 10),
      type: isIn ? "Cash In" : "Cash Out",
      desc,
      cashIn: isIn ? amount : 0,
      cashOut: isIn ? 0 : amount,
      balance: getProjectedCashBalance(isIn ? amount : -amount),
      ref: reference || moduleName,
      sourceModule: moduleName
    });
    return;
  }

  if (["Bank", "UPI", "Card"].includes(paymentMode)) {
    await createCollectionRecord(COLLECTIONS.bankBook, {
      date: data.date || new Date().toISOString().slice(0, 10),
      bankName: paymentMode,
      type: isIn ? "Amount In" : "Amount Out",
      desc,
      amountIn: isIn ? amount : 0,
      amountOut: isIn ? 0 : amount,
      balance: getProjectedBankBalance(isIn ? amount : -amount),
      refNum: reference || moduleName,
      sourceModule: moduleName
    });
  }
}

async function reconcileStockAndLedger(data, meta) {
  const operations = [];
  addStockReversalOperations(operations, meta.previous, meta.moduleName);
  if (data) addStockApplyOperations(operations, meta.stockName, meta.stockDelta, meta.moduleName, meta.reference);
  addLinkedLedgerDeleteOperations(operations, meta.id);
  if (data) addLinkedLedgerCreateOperation(operations, data, meta);
  if (operations.length) await commitBatchOperations(operations);
}

async function reconcileLedgerOnly(data, meta) {
  const operations = [];
  addLinkedLedgerDeleteOperations(operations, meta.id);
  if (data) addLinkedLedgerCreateOperation(operations, data, meta);
  if (operations.length) await commitBatchOperations(operations);
}

async function reconcileProductionStock(data, meta) {
  const operations = [];
  addStockReversalOperations(operations, meta.previous, "Production");
  if (!meta.isDelete && data) {
    addStockApplyOperations(operations, data.productName, data.quantityProduced, "Production", data.batch);
  }
  if (operations.length) await commitBatchOperations(operations);
}

async function reconcileProfitSharingLedger(data, meta) {
  const operations = [];
  addLinkedLedgerDeleteOperations(operations, meta.id || meta.previous?.id);
  if (!meta.isDelete && data) {
    addLinkedLedgerCreateOperation(operations, data, {
      ...meta,
      moduleName: "Profit Sharing",
      amount: data.amount,
      direction: "out",
      reference: `${data.period} - ${data.investor}`
    });
  }
  if (operations.length) await commitBatchOperations(operations);
}

function addStockReversalOperations(operations, previous, moduleName) {
  if (!previous) return;

  const stockName = previous.item || previous.product || previous.productName;
  const delta = getStockDelta(previous, moduleName);
  if (!stockName || !delta) return;
  addStockApplyOperations(operations, stockName, -delta, `${moduleName} reversal`, previous.invoice || previous.customer || previous.batch);
}

function getStockDelta(record, moduleName) {
  if (moduleName === "Purchase") return getNumberFromValue(record.qty);
  if (moduleName === "Sales") return -getNumberFromValue(record.qty);
  if (moduleName === "Production") return getNumberFromValue(record.quantityProduced);
  return 0;
}

function addStockApplyOperations(operations, itemName, quantityDelta, sourceType, sourceRef) {
  if (!itemName || !quantityDelta) return;

  const inventoryRecord = getStoredRecords(KEYS.inventory).find((item) =>
    (item.name || "").toLowerCase() === itemName.toLowerCase()
  );
  if (!inventoryRecord?.id) return;

  const currentStock = getNumberFromValue(inventoryRecord.currentStock);
  const stockIn = Math.max(quantityDelta, 0);
  const stockOut = Math.max(-quantityDelta, 0);
  const existingOperation = operations.find((operation) =>
    operation.type === "update"
    && operation.collectionName === COLLECTIONS.inventory
    && operation.id === inventoryRecord.id
  );

  if (existingOperation) {
    existingOperation.payload.currentStock = Math.max(getNumberFromValue(existingOperation.payload.currentStock) + quantityDelta, 0);
    existingOperation.payload.stockIn = Math.max(getNumberFromValue(existingOperation.payload.stockIn) + stockIn, 0);
    existingOperation.payload.stockOut = Math.max(getNumberFromValue(existingOperation.payload.stockOut) + stockOut, 0);
    existingOperation.payload.lastStockSource = sourceType;
    existingOperation.payload.lastStockRef = sourceRef || "";
    return;
  }

  operations.push({
    type: "update",
    collectionName: COLLECTIONS.inventory,
    id: inventoryRecord.id,
    payload: {
      currentStock: Math.max(currentStock + quantityDelta, 0),
      stockIn: Math.max(getNumberFromValue(inventoryRecord.stockIn) + stockIn, 0),
      stockOut: Math.max(getNumberFromValue(inventoryRecord.stockOut) + stockOut, 0),
      lastUpdated: new Date().toISOString().slice(0, 10),
      lastStockSource: sourceType,
      lastStockRef: sourceRef || ""
    }
  });
}

function addLinkedLedgerDeleteOperations(operations, sourceId) {
  if (!sourceId) return;
  [KEYS.cashBook, KEYS.bankBook].forEach((key) => {
    getStoredRecords(key)
      .filter((record) => record.sourceId === sourceId)
      .forEach((record) => {
        operations.push({
          type: "delete",
          collectionName: COLLECTION_BY_KEY[key],
          id: record.id
        });
      });
  });
}

function addLinkedLedgerCreateOperation(operations, data, meta) {
  if (!meta.amount || data.paymentStatus === "Pending" || data.status === "Pending") return;

  const paymentMode = data.paymentMode || data.mode || "Cash";
  const isIn = meta.direction === "in";
  const desc = `${meta.moduleName}: ${data.desc || data.item || data.product || data.customer || data.investor || meta.reference || "Record"}`;
  const common = {
    date: data.date || new Date().toISOString().slice(0, 10),
    desc,
    sourceModule: meta.moduleName,
    sourceId: meta.id || "",
    sourceRef: meta.reference || ""
  };

  if (paymentMode === "Cash") {
    operations.push({
      type: "set",
      collectionName: COLLECTIONS.cashBook,
      payload: {
        ...common,
        type: isIn ? "Cash In" : "Cash Out",
        cashIn: isIn ? meta.amount : 0,
        cashOut: isIn ? 0 : meta.amount,
        balance: getProjectedCashBalance(isIn ? meta.amount : -meta.amount),
        ref: meta.reference || meta.moduleName
      }
    });
    return;
  }

  if (["Bank", "UPI", "Card"].includes(paymentMode)) {
    operations.push({
      type: "set",
      collectionName: COLLECTIONS.bankBook,
      payload: {
        ...common,
        bankName: paymentMode,
        type: isIn ? "Amount In" : "Amount Out",
        amountIn: isIn ? meta.amount : 0,
        amountOut: isIn ? 0 : meta.amount,
        balance: getProjectedBankBalance(isIn ? meta.amount : -meta.amount),
        refNum: meta.reference || meta.moduleName
      }
    });
  }
}

async function reconcileLedgerBalances(key, data, meta) {
  const records = [...getStoredRecords(key)];
  const amountFieldIn = key === KEYS.cashBook ? "cashIn" : "amountIn";
  const amountFieldOut = key === KEYS.cashBook ? "cashOut" : "amountOut";
  const balanceField = "balance";
  const changedIndex = records.findIndex((record) => record.id === meta.id);
  if (changedIndex === -1) return;

  records[changedIndex] = { ...records[changedIndex], ...data };
  let runningBalance = changedIndex > 0 ? getNumberFromValue(records[changedIndex - 1][balanceField]) : 0;
  const operations = records.slice(changedIndex).map((record) => {
    runningBalance += getNumberFromValue(record[amountFieldIn]) - getNumberFromValue(record[amountFieldOut]);
    return {
      type: "update",
      collectionName: COLLECTION_BY_KEY[key],
      id: record.id,
      payload: { balance: runningBalance }
    };
  });

  if (operations.length) await commitBatchOperations(operations);
}

async function reconcileLedgerBalancesAfterDelete(key, deletedRecord) {
  const records = getStoredRecords(key).filter((record) => record.id !== deletedRecord.id);
  const amountFieldIn = key === KEYS.cashBook ? "cashIn" : "amountIn";
  const amountFieldOut = key === KEYS.cashBook ? "cashOut" : "amountOut";
  let runningBalance = 0;
  const operations = records.map((record) => {
    runningBalance += getNumberFromValue(record[amountFieldIn]) - getNumberFromValue(record[amountFieldOut]);
    return {
      type: "update",
      collectionName: COLLECTION_BY_KEY[key],
      id: record.id,
      payload: { balance: runningBalance }
    };
  });
  if (operations.length) await commitBatchOperations(operations);
}

function getProjectedCashBalance(delta) {
  const records = getStoredRecords(KEYS.cashBook);
  const current = records.length ? getNumberFromValue(records[records.length - 1].balance) : 0;
  const existing = currentEditId ? records.find((record) => record.id === currentEditId) : null;
  const oldDelta = existing ? getNumberFromValue(existing.cashIn) - getNumberFromValue(existing.cashOut) : 0;
  return current - oldDelta + delta;
}

function getProjectedBankBalance(delta) {
  const records = getStoredRecords(KEYS.bankBook);
  const current = records.length ? getNumberFromValue(records[records.length - 1].balance) : 0;
  const existing = currentEditId ? records.find((record) => record.id === currentEditId) : null;
  const oldDelta = existing ? getNumberFromValue(existing.amountIn) - getNumberFromValue(existing.amountOut) : 0;
  return current - oldDelta + delta;
}

function getFormConfigForKey(key) {
  const formMap = {
    [KEYS.products]: {
      submitButtonId: "product-submit-btn",
      populate: (record) => {
        setValue("prod-name", record.name);
        setValue("prod-sku", record.sku);
        setValue("prod-category", record.category);
        setValue("prod-unit", record.unit);
        setValue("prod-mrp", record.mrp);
        setValue("prod-saleprice", record.salePrice);
        setValue("prod-costprice", record.costPrice);
        setValue("prod-opening", record.openingStock);
        setValue("prod-current", record.currentStock);
        setValue("prod-minimum", record.minimumStock);
        setValue("prod-status", record.status);
      }
    },
    [KEYS.customers]: {
      submitButtonId: "customer-submit-btn",
      populate: (record) => {
        setValue("cust-name", record.name);
        setValue("cust-phone", record.phone);
        setValue("cust-whatsapp", record.whatsapp);
        setValue("cust-place", record.place);
        setValue("cust-pin", record.pin);
        setValue("cust-address", record.address);
        setValue("cust-type", record.type);
        setValue("cust-notes", record.notes);
      }
    },
    [KEYS.suppliers]: {
      submitButtonId: "supplier-submit-btn",
      populate: (record) => {
        setValue("supp-name", record.name);
        setValue("supp-phone", record.phone);
        setValue("supp-place", record.place);
        setValue("supp-address", record.address);
        setValue("supp-gst", record.gst);
        setValue("supp-item", record.itemSupplied);
        setValue("supp-terms", record.terms);
        setValue("supp-notes", record.notes);
      }
    },
    [KEYS.investors]: {
      submitButtonId: "investors-submit-btn",
      populate: (record) => {
        setValue("inv-name", record.name);
        setValue("inv-phone", record.phone);
        setValue("inv-email", record.email);
        setValue("inv-address", record.address);
        setValue("inv-amount", record.amount);
        setValue("inv-share", record.share);
        setValue("inv-date", record.date);
        setValue("inv-status", record.status);
        setValue("inv-notes", record.notes);
      }
    },
    [KEYS.purchases]: {
      submitButtonId: "purchase-submit-btn",
      populate: populatePurchase,
      beforeDelete: (record) => reconcileStockAndLedger(null, { id: record.id, previous: record, moduleName: "Purchase" })
    },
    [KEYS.inventory]: { submitButtonId: "inventory-submit-btn", populate: populateInventory },
    [KEYS.sales]: {
      submitButtonId: "sales-submit-btn",
      populate: populateSales,
      beforeDelete: (record) => reconcileStockAndLedger(null, { id: record.id, previous: record, moduleName: "Sales" })
    },
    [KEYS.orders]: {
      submitButtonId: "orders-submit-btn",
      populate: populateOrders,
      beforeDelete: (record) => reconcileLedgerOnly(null, { id: record.id })
    },
    [KEYS.delivery]: { submitButtonId: "delivery-submit-btn", populate: populateDelivery },
    [KEYS.expenses]: {
      submitButtonId: "expenses-submit-btn",
      populate: populateExpenses,
      beforeDelete: (record) => reconcileLedgerOnly(null, { id: record.id })
    },
    [KEYS.income]: {
      submitButtonId: "income-submit-btn",
      populate: populateIncome,
      beforeDelete: (record) => reconcileLedgerOnly(null, { id: record.id })
    },
    [KEYS.cashBook]: {
      submitButtonId: "cashbook-submit-btn",
      populate: populateCashBook,
      beforeDelete: (record) => reconcileLedgerBalancesAfterDelete(KEYS.cashBook, record)
    },
    [KEYS.bankBook]: {
      submitButtonId: "bankbook-submit-btn",
      populate: populateBankBook,
      beforeDelete: (record) => reconcileLedgerBalancesAfterDelete(KEYS.bankBook, record)
    },
    [KEYS.production]: {
      submitButtonId: "production-submit-btn",
      populate: populateProduction,
      beforeDelete: (record) => reconcileProductionStock(null, { isDelete: true, previous: record })
    },
    [KEYS.sharing]: {
      submitButtonId: "sharing-submit-btn",
      populate: populateSharing,
      beforeDelete: (record) => reconcileProfitSharingLedger(null, { isDelete: true, previous: record })
    }
  };
  return formMap[key];
}

function populatePurchase(record) {
  setValue("pur-date", record.date);
  setValue("pur-invoice", record.invoice);
  setValue("pur-supplier", record.supplier);
  setValue("pur-item", record.item);
  setValue("pur-qty", record.qty);
  setValue("pur-unit", record.unit);
  setValue("pur-rate", record.rate);
  setValue("pur-total", record.totalAmount);
  setValue("pur-mode", record.paymentMode);
  setValue("pur-status", record.paymentStatus);
  setValue("pur-notes", record.notes);
}

function populateInventory(record) {
  setValue("stk-name", record.name);
  setValue("stk-category", record.category);
  setValue("stk-type", record.type);
  setValue("stk-opening", record.openingStock);
  setValue("stk-in", record.stockIn);
  setValue("stk-out", record.stockOut);
  setValue("stk-current", record.currentStock);
  setValue("stk-unit", record.unit);
  setValue("stk-min", record.minAlert);
  setValue("stk-date", record.lastUpdated);
}

function populateSales(record) {
  setValue("sale-date", record.date);
  setValue("sale-customer", record.customer);
  setValue("sale-product", record.product);
  setValue("sale-qty", record.qty);
  setValue("sale-rate", record.rate);
  setValue("sale-total", record.totalAmount);
  setValue("sale-discount", record.discount);
  setValue("sale-final", record.finalAmount);
  setValue("sale-mode", record.paymentMode);
  setValue("sale-status", record.paymentStatus);
  setValue("sale-notes", record.notes);
}

function populateOrders(record) {
  setValue("ord-date", record.date);
  setValue("ord-source", record.source);
  setValue("ord-customer", record.customer);
  setValue("ord-phone", record.phone);
  setValue("ord-product", record.product);
  setValue("ord-qty", record.qty);
  setValue("ord-amount", record.amount);
  setValue("ord-delivery", record.deliveryCharge);
  setValue("ord-payable", record.totalPayable);
  setValue("ord-pstatus", record.paymentStatus);
  setValue("ord-ostatus", record.orderStatus);
  setValue("ord-address", record.address);
  setValue("ord-notes", record.notes);
}

function populateDelivery(record) {
  setValue("dlv-order", record.orderId);
  setValue("dlv-customer", record.customer);
  setValue("dlv-partner", record.partner);
  setValue("dlv-tracking", record.trackingId);
  setValue("dlv-charge", record.charge);
  setValue("dlv-dispatch", record.dispatchDate);
  setValue("dlv-status", record.status);
  setValue("dlv-delivered", record.deliveredDate);
  setValue("dlv-notes", record.notes);
}

function populateExpenses(record) {
  setValue("exp-date", record.date);
  setValue("exp-cat", record.category);
  setValue("exp-desc", record.desc);
  setValue("exp-amount", record.amount);
  setValue("exp-mode", record.mode);
  setValue("exp-paid", record.paidTo);
  setValue("exp-receipt", record.receipt);
  setValue("exp-notes", record.notes);
}

function populateIncome(record) {
  setValue("inc-date", record.date);
  setValue("inc-source", record.source);
  setValue("inc-desc", record.desc);
  setValue("inc-amount", record.amount);
  setValue("inc-mode", record.mode);
  setValue("inc-received", record.receivedFrom);
  setValue("inc-notes", record.notes);
}

function populateCashBook(record) {
  setValue("cb-date", record.date);
  setValue("cb-type", record.type);
  setValue("cb-desc", record.desc);
  setValue("cb-amount", record.cashIn > 0 ? record.cashIn : record.cashOut);
  setValue("cb-ref", record.ref);
}

function populateBankBook(record) {
  setValue("bb-date", record.date);
  setValue("bb-bank", record.bankName);
  setValue("bb-type", record.type);
  setValue("bb-desc", record.desc);
  setValue("bb-amount", record.amountIn > 0 ? record.amountIn : record.amountOut);
  setValue("bb-ref", record.refNum);
}

function populateProduction(record) {
  setValue("prod-batch", record.batch);
  setValue("prod-date", record.date);
  setValue("prod-pname", record.productName);
  setValue("prod-raw", record.rawMaterial);
  setValue("prod-qty", record.quantityProduced);
  setValue("prod-pack", record.packingQty);
  setValue("prod-waste", record.wastage);
  setValue("prod-cost", record.batchCost);
  setValue("prod-staff", record.staff);
  setValue("prod-notes", record.notes);
}

function populateSharing(record) {
  setValue("shr-period", record.period);
  setValue("shr-profit", record.totalProfit);
  setValue("shr-investor", record.investor);
  setValue("shr-percentage", record.share);
  setValue("shr-amount", record.amount);
  setValue("shr-status", record.status);
  setValue("shr-date", record.date);
  setValue("shr-notes", record.notes);
}

function activeSectionKey() {
  return {
    products: KEYS.products,
    customers: KEYS.customers,
    suppliers: KEYS.suppliers,
    investors: KEYS.investors,
    purchase: KEYS.purchases,
    inventory: KEYS.inventory,
    sales: KEYS.sales,
    orders: KEYS.orders,
    delivery: KEYS.delivery,
    expenses: KEYS.expenses,
    income: KEYS.income,
    cashbook: KEYS.cashBook,
    bankbook: KEYS.bankBook,
    production: KEYS.production,
    "investment-sharing": KEYS.sharing
  }[activeSectionId];
}

async function refreshActiveData() {
  await loadFirestoreData();
  renderModule(activeSectionId);
  updateDashboardMetrics();
}

function getValue(id) {
  return document.getElementById(id)?.value.trim() || "";
}

function getNumber(id) {
  return getNumberFromValue(document.getElementById(id)?.value);
}

function getNumberFromValue(rawValue) {
  const value = parseFloat(rawValue || "0");
  return Number.isFinite(value) ? value : 0;
}

function setValue(id, value) {
  const input = document.getElementById(id);
  if (input) input.value = value ?? "";
}

function initFormListeners() {
  showToast(READ_ONLY_MESSAGE, "info");
}

function deleteTransactionRecord() {
  showToast(READ_ONLY_MESSAGE, "info");
}

function setupProductSearch() {
  const searchInput = document.getElementById("search-products");
  if (!searchInput) return;

  searchInput.addEventListener("input", () => {
    const val = searchInput.value.toLowerCase().trim();
    const rows = document.querySelectorAll("#products-table-body tr");
    rows.forEach(row => {
      const name = row.cells[0]?.textContent.toLowerCase() || "";
      const sku = row.cells[1]?.textContent.toLowerCase() || "";
      const cat = row.cells[2]?.textContent.toLowerCase() || "";
      
      if (name.includes(val) || sku.includes(val) || cat.includes(val)) {
        row.style.display = "";
      } else {
        row.style.display = "none";
      }
    });
  });
}

/**
 * Customers Module local search filter
 */
function setupCustomerSearch() {
  const searchInput = document.getElementById("search-customers");
  if (!searchInput) return;

  searchInput.addEventListener("input", () => {
    const val = searchInput.value.toLowerCase().trim();
    const rows = document.querySelectorAll("#customers-table-body tr");
    rows.forEach(row => {
      const name = row.cells[0]?.textContent.toLowerCase() || "";
      const phone = row.cells[1]?.textContent.toLowerCase() || "";
      const place = row.cells[2]?.textContent.toLowerCase() || "";
      
      if (name.includes(val) || phone.includes(val) || place.includes(val)) {
        row.style.display = "";
      } else {
        row.style.display = "none";
      }
    });
  });
}
