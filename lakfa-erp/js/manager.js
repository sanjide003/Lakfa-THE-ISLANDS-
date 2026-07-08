/* Lakfa ERP Manager Controller */
import { logoutUser } from "./role-guard.js";
import { formatCurrency, formatDate, showToast } from "./utils.js";
import { COLLECTIONS, getAllCollections } from "./firebase-db.js";

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
const READ_ONLY_MESSAGE = "Step 1: Firebase read-only mode is active. Forms will be enabled after Firestore write flows are implemented.";

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

  // 2. Load Firestore data for all dashboard and table renderers
  await loadFirestoreData();

  // 3. Set up event listeners for sidebar routing (tab switching)
  initSidebarRouting();

  // 4. Render and initialize active dashboard metrics
  updateDashboardMetrics();

  // 5. Handle Logout Button
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logoutUser);
  }

  // 6. Handle Sidebar Responsive Toggle
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
  currentEditId = null; // Clear edit states
  
  // Dynamic form overrides and resets
  const forms = document.querySelectorAll(`form`);
  forms.forEach(f => f.reset());
  
  const submitBtns = document.querySelectorAll(".submit-btn");
  submitBtns.forEach(btn => btn.textContent = "Read Only");

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

    // Step 1 is intentionally read-only: writes/edit/delete will be added in the next phase.
    tr.innerHTML = `
      ${cellsHTML}
      <td class="text-right" style="white-space: nowrap; color: var(--text-muted);">Read only</td>
    `;

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
function loadRecordForEdit() {
  showToast(READ_ONLY_MESSAGE, "info");
}

function initFormListeners() {
  showToast(READ_ONLY_MESSAGE, "info");
}

function deleteTransactionRecord() {
  showToast(READ_ONLY_MESSAGE, "info");
}

function deleteRecord() {
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
