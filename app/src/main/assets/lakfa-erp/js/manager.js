/* Lakfa ERP Manager Controller */
import { logoutUser } from "./role-guard.js";
import { formatCurrency, formatDate, showToast } from "./utils.js";
import { COLLECTIONS, createCollectionRecord, deleteCollectionRecord, getAllCollections, updateCollectionRecord } from "./firebase-db.js";
import { initCompanyProfileForm } from "./company-profile.js";

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
const READ_ONLY_MESSAGE = "This module is read-only until its Firestore write workflow is enabled.";
const WRITABLE_FORM_IDS = new Set(["product-form", "customer-form", "supplier-form", "investors-form"]);
const WRITABLE_KEYS = new Set([KEYS.products, KEYS.customers, KEYS.suppliers, KEYS.investors]);

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

  // 3. Enable Firestore writes for approved master-data modules
  initWritableFormListeners();

  // 4. Set up event listeners for sidebar routing (tab switching)
  initSidebarRouting();

  // 5. Render and initialize active dashboard metrics
  updateDashboardMetrics();

  // 6. Handle Logout Button
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logoutUser);
  }

  // 7. Handle Sidebar Responsive Toggle
  initSidebarMobileToggle();
});

async function loadFirestoreData() {
  try {
    firestoreState = await getAllCollections(COLLECTION_BY_KEY);
  } catch (err) {
    console.error("Error loading Firestore data", err);
    showToast("Unable to load Firebase data. Please check Firestore permissions and network.", "error");
    firestoreState = {};
  }
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
  
  sidebarItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      
      const targetSection = item.getAttribute("data-section");
      
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

        // Initialize / Render specific modules
        renderModule(targetSection);
      }
    });
  });

  // Default initial render of active section
  const activeItem = document.querySelector(".sidebar-item.active");
  if (activeItem) {
    const defaultSec = activeItem.getAttribute("data-section");
    renderModule(defaultSec);
  }
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
    tbody.innerHTML = `<tr><td colspan="20" class="text-center" style="color: var(--text-muted);">No records found in Firebase yet.</td></tr>`;
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
      tr.innerHTML = `
        ${cellsHTML}
        <td class="text-right" style="white-space: nowrap;">
          <button class="btn-secondary btn-sm edit-btn" style="padding: 0.25rem 0.5rem; margin-right: 4px;">Edit</button>
          <button class="btn-danger btn-sm delete-btn" style="padding: 0.25rem 0.5rem;">Delete</button>
        </td>
      `;
      tr.querySelector(".edit-btn").addEventListener("click", () => loadRecordForEdit(key, row.id));
      tr.querySelector(".delete-btn").addEventListener("click", () => deleteRecord(key, row.id));
    } else {
      tr.innerHTML = `
        ${cellsHTML}
        <td class="text-right" style="white-space: nowrap; color: var(--text-muted);">Read only</td>
      `;
    }

    tbody.appendChild(tr);
  });
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
      <td class="text-right" style="color: var(--text-muted);">Read only</td>
    `;


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
      <td class="text-right" style="color: var(--text-muted);">Read only</td>
    `;


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
      if (currentEditId && activeSectionKey() === config.key) {
        await updateCollectionRecord(COLLECTION_BY_KEY[config.key], currentEditId, data);
        showToast("Record updated in Firebase.", "success");
      } else {
        await createCollectionRecord(COLLECTION_BY_KEY[config.key], data);
        showToast("Record created in Firebase.", "success");
      }
      currentEditId = null;
      form.reset();
      if (button) button.textContent = "Save Record";
      await refreshActiveData();
    } catch (err) {
      console.error("Firestore write failed", err);
      showToast("Firebase write failed. Please check permissions.", "error");
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
    await deleteCollectionRecord(COLLECTION_BY_KEY[key], id);
    showToast("Record deleted from Firebase.", "success");
    await refreshActiveData();
  } catch (err) {
    console.error("Firestore delete failed", err);
    showToast("Firebase delete failed. Please check permissions.", "error");
  }
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
    }
  };
  return formMap[key];
}

function activeSectionKey() {
  return {
    products: KEYS.products,
    customers: KEYS.customers,
    suppliers: KEYS.suppliers,
    investors: KEYS.investors
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
  const value = parseFloat(document.getElementById(id)?.value || "0");
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
