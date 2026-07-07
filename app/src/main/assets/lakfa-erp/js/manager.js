/* Lakfa ERP Manager Controller */
import { logoutUser } from "./role-guard.js";
import { formatCurrency, formatDate, generateId, showToast, dbLocal } from "./utils.js";

// Keys used in localStorage
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

// Default Demo Data to pre-populate empty database
const DEMO_DATA = {
  [KEYS.products]: [
    { id: "PRD-A101", name: "Lakfa Ghee Rice Powder", sku: "LGRP-500", category: "Spices", unit: "Pkt", mrp: 120, salePrice: 100, costPrice: 70, openingStock: 200, currentStock: 180, minimumStock: 50, status: "Active" },
    { id: "PRD-B102", name: "Lakfa Biryani Masala", sku: "LBM-250", category: "Masala", unit: "Pkt", mrp: 80, salePrice: 70, costPrice: 45, openingStock: 500, currentStock: 45, minimumStock: 100, status: "Active" },
    { id: "PRD-C103", name: "Lakfa Premium Basmati", sku: "LPBR-1KG", category: "Rice", unit: "Kg", mrp: 150, salePrice: 135, costPrice: 95, openingStock: 100, currentStock: 90, minimumStock: 20, status: "Active" }
  ],
  [KEYS.customers]: [
    { id: "CST-001", name: "Modern Hypermarket", phone: "9876543210", whatsapp: "9876543210", place: "Kochi", address: "M.G. Road, Kochi", pin: "682011", type: "Wholesale Customer", notes: "Regular buyer of Rice Powder" },
    { id: "CST-002", name: "Ramesh Kumar", phone: "9447123456", whatsapp: "9447123456", place: "Trivandrum", address: "Palayam, Trivandrum", pin: "695001", type: "Retail Customer", notes: "Prefers basmati rice" }
  ],
  [KEYS.suppliers]: [
    { id: "SPL-001", name: "Kerala Agro Farms", phone: "9001002003", place: "Palakkad", address: "Agro Complex, Palakkad", gst: "32AAAAA1111A1Z1", itemSupplied: "Raw Basmati Rice", terms: "15 Days Credit", notes: "Pristine quality grains" },
    { id: "SPL-002", name: "Universal Packaging Ltd", phone: "9002003004", place: "Coimbatore", address: "SIDCO Industrial Estate", gst: "33BBBBB2222B2Z2", itemSupplied: "Printed Pouches", terms: "Cash On Delivery", notes: "Delivers within 3 days" }
  ],
  [KEYS.purchases]: [
    { id: "PUR-001", date: "2026-07-01", supplier: "Kerala Agro Farms", invoice: "KAF-2234", itemName: "Raw Basmati Rice", qty: 1000, unit: "Kg", rate: 85, totalAmount: 85000, paymentMode: "Bank", paymentStatus: "Paid", notes: "Processed at Palakkad warehouse" }
  ],
  [KEYS.inventory]: [
    { id: "STK-001", name: "Raw Basmati Rice", category: "Raw Material", stockType: "Raw Material", openingStock: 500, stockIn: 1000, stockOut: 300, currentStock: 1200, unit: "Kg", minStock: 200, lastUpdated: "2026-07-05" },
    { id: "STK-002", name: "Premium Printed Pouches", category: "Packing Material", stockType: "Packing Material", openingStock: 5000, stockIn: 0, stockOut: 800, currentStock: 4200, unit: "Pcs", minStock: 1000, lastUpdated: "2026-07-06" }
  ],
  [KEYS.production]: [
    { id: "BATCH-101", batchNumber: "B-GHEERICE-01", date: "2026-07-02", productName: "Lakfa Ghee Rice Powder", rawMaterial: "Raw Basmati Rice - 200Kg", qtyProduced: 400, packingQty: "400 Pkts", wastage: "2.5 Kg", cost: 14000, staff: "Anoop & Team", notes: "Moisture content perfectly standard" }
  ],
  [KEYS.sales]: [
    { id: "SAL-001", date: "2026-07-06", customer: "Modern Hypermarket", product: "Lakfa Ghee Rice Powder", qty: 100, rate: 100, totalAmount: 10000, discount: 500, finalAmount: 9500, paymentMode: "UPI", paymentStatus: "Paid", notes: "Delivered via DTDC" }
  ],
  [KEYS.orders]: [
    { id: "ORD-001", date: "2026-07-07", source: "WhatsApp", customer: "Modern Hypermarket", phone: "9876543210", product: "Lakfa Ghee Rice Powder", qty: 50, amount: 5000, deliveryCharge: 150, totalPayable: 5150, paymentStatus: "Pending", orderStatus: "Confirmed", address: "M.G. Road, Kochi", notes: "Fast courier requested" },
    { id: "ORD-002", date: "2026-07-07", source: "Website", customer: "Ramesh Kumar", phone: "9447123456", product: "Lakfa Premium Basmati", qty: 5, amount: 675, deliveryCharge: 50, totalPayable: 725, paymentStatus: "Paid", orderStatus: "New", address: "Palayam, Trivandrum", notes: "Immediate dispatch" }
  ],
  [KEYS.delivery]: [
    { id: "DLV-001", orderId: "ORD-001", customer: "Modern Hypermarket", partner: "DTDC", trackingId: "DTD99887766", charge: 150, dispatchDate: "2026-07-07", status: "In Transit", deliveredDate: "", notes: "Expected delivery tomorrow" }
  ],
  [KEYS.expenses]: [
    { id: "EXP-001", date: "2026-07-05", category: "Raw Material", desc: "Purchase of Spices for Biryani Masala", amount: 15000, mode: "Bank", paidTo: "Palakkad Wholesale Spices", receipt: "REC-8890", notes: "Approved by manager" },
    { id: "EXP-002", date: "2026-07-06", category: "Courier", desc: "DTDC Courier Charges", amount: 450, mode: "Cash", paidTo: "DTDC Center", receipt: "REC-4512", notes: "Order dispatch" }
  ],
  [KEYS.income]: [
    { id: "INC-001", date: "2026-07-06", source: "Sales", desc: "Sale to Modern Hypermarket", amount: 9500, mode: "UPI", receivedFrom: "Modern Hypermarket", notes: "Received on GPay Business" },
    { id: "INC-002", date: "2026-07-01", source: "Investor Fund", desc: "Initial funding by Shajahan VP", amount: 500000, mode: "Bank", receivedFrom: "Shajahan VP", notes: "Capital investment" }
  ],
  [KEYS.cashBook]: [
    { id: "CB-001", date: "2026-07-01", type: "Cash In", desc: "Opening Balance", cashIn: 15000, cashOut: 0, balance: 15000, ref: "OB-01" },
    { id: "CB-002", date: "2026-07-06", type: "Cash Out", desc: "DTDC Courier Charges", cashIn: 0, cashOut: 450, balance: 14550, ref: "EXP-002" }
  ],
  [KEYS.bankBook]: [
    { id: "BB-001", date: "2026-07-01", bankName: "Federal Bank", type: "Amount In", desc: "Investor Funding - Shajahan VP", amountIn: 500000, amountOut: 0, balance: 500000, refNum: "TXN10029381" },
    { id: "BB-002", date: "2026-07-05", bankName: "Federal Bank", type: "Amount Out", desc: "Spices raw material purchase", amountIn: 0, amountOut: 15000, balance: 485000, refNum: "TXN10029399" }
  ],
  [KEYS.investors]: [
    { id: "INV-001", name: "Shajahan VP", phone: "9845012345", email: "shajahan@lakfa.com", address: "V.P. House, Malappuram", amount: 500000, share: 15, date: "2026-07-01", status: "Active", notes: "Founder investor" },
    { id: "INV-002", name: "Grace George", phone: "9495098765", email: "grace@lakfa.com", address: "Olive Villas, Kochi", amount: 300000, share: 10, date: "2026-07-03", status: "Active", notes: "Joint investor" }
  ],
  [KEYS.sharing]: [
    { id: "SHR-001", period: "July 2026", totalProfit: 45000, investor: "Shajahan VP", share: 15, amount: 6750, status: "Paid", date: "2026-07-05", notes: "Transferred via NEFT" }
  ]
};

// Global state tracker for edit operations
let currentEditId = null;

document.addEventListener("DOMContentLoaded", () => {
  // 1. Initialize demo data if not exists
  initializeDemoData();

  // 2. Set up event listeners for sidebar routing (tab switching)
  initSidebarRouting();

  // 3. Render and initialize active dashboard metrics
  updateDashboardMetrics();

  // 4. Register Form Submission Listeners
  initFormListeners();

  // 5. Handle Logout Button
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logoutUser);
  }

  // 6. Handle Sidebar Responsive Toggle
  initSidebarMobileToggle();
});

/**
 * Initialize local storage with mock data if keys do not exist
 */
function initializeDemoData() {
  for (const [key, val] of Object.entries(DEMO_DATA)) {
    if (!localStorage.getItem(key)) {
      dbLocal.save(key, val);
    }
  }
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
  submitBtns.forEach(btn => btn.textContent = "Save Record");

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
  const sales = dbLocal.getAll(KEYS.sales);
  const expenses = dbLocal.getAll(KEYS.expenses);
  const cash = dbLocal.getAll(KEYS.cashBook);
  const bank = dbLocal.getAll(KEYS.bankBook);
  const orders = dbLocal.getAll(KEYS.orders);
  const products = dbLocal.getAll(KEYS.products);
  const production = dbLocal.getAll(KEYS.production);
  const investors = dbLocal.getAll(KEYS.investors);

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
 * Universal table renderer using structural arrays from localStorage
 */
function renderTable(key, tableBodyId) {
  const tbody = document.getElementById(tableBodyId);
  if (!tbody) return;

  const records = dbLocal.getAll(key);
  tbody.innerHTML = "";

  if (records.length === 0) {
    tbody.innerHTML = `<tr><td colspan="20" class="text-center" style="color: var(--text-muted);">No records found. Click 'Save' above to add data.</td></tr>`;
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

    // Append universal edit and delete buttons
    tr.innerHTML = `
      ${cellsHTML}
      <td class="text-right" style="white-space: nowrap;">
        <button class="btn-secondary btn-sm edit-btn" style="padding: 0.25rem 0.5rem; margin-right: 4px;">Edit</button>
        <button class="btn-danger btn-sm delete-btn" style="padding: 0.25rem 0.5rem;">Delete</button>
      </td>
    `;
    
    // Add edit click event
    tr.querySelector(".edit-btn").addEventListener("click", () => {
      loadRecordForEdit(key, row.id);
    });

    // Add delete click event
    tr.querySelector(".delete-btn").addEventListener("click", () => {
      if (confirm(`Are you sure you want to delete this record?`)) {
        deleteRecord(key, row.id);
        renderTable(key, tableBodyId);
        showToast("Record deleted successfully.", "info");
        updateDashboardMetrics();
      }
    });

    tbody.appendChild(tr);
  });
}

/**
 * Handle custom table loader for Cash Book (dynamic balance aggregation)
 */
function renderCashBookTable() {
  const tbody = document.getElementById("cashbook-table-body");
  if (!tbody) return;

  const records = dbLocal.getAll(KEYS.cashBook);
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
      <td class="text-right">
        <button class="btn-danger btn-sm delete-cb-btn" style="padding: 0.25rem 0.5rem;">Delete</button>
      </td>
    `;

    tr.querySelector(".delete-cb-btn").addEventListener("click", () => {
      if (confirm("Are you sure you want to delete this Cash Book transaction?")) {
        deleteTransactionRecord(KEYS.cashBook, row.id);
        renderCashBookTable();
        updateDashboardMetrics();
      }
    });

    tbody.appendChild(tr);
  });
}

/**
 * Handle custom table loader for Bank Book
 */
function renderBankBookTable() {
  const tbody = document.getElementById("bankbook-table-body");
  if (!tbody) return;

  const records = dbLocal.getAll(KEYS.bankBook);
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
      <td class="text-right">
        <button class="btn-danger btn-sm delete-bb-btn" style="padding: 0.25rem 0.5rem;">Delete</button>
      </td>
    `;

    tr.querySelector(".delete-bb-btn").addEventListener("click", () => {
      if (confirm("Are you sure you want to delete this Bank Book transaction?")) {
        deleteTransactionRecord(KEYS.bankBook, row.id);
        renderBankBookTable();
        updateDashboardMetrics();
      }
    });

    tbody.appendChild(tr);
  });
}

/**
 * Dynamic aggregates for simple Accounting summary card block
 */
function renderAccountingSummary() {
  const sales = dbLocal.getAll(KEYS.sales);
  const purchases = dbLocal.getAll(KEYS.purchases);
  const expenses = dbLocal.getAll(KEYS.expenses);
  const income = dbLocal.getAll(KEYS.income);
  const cash = dbLocal.getAll(KEYS.cashBook);
  const bank = dbLocal.getAll(KEYS.bankBook);

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
function loadRecordForEdit(key, id) {
  currentEditId = id;
  const record = dbLocal.getOne(key, id);
  if (!record) return;

  showToast(`Editing ${id}...`, "info");

  // Determine section and populate respective form fields
  if (key === KEYS.products) {
    document.getElementById("prod-name").value = record.name;
    document.getElementById("prod-sku").value = record.sku;
    document.getElementById("prod-category").value = record.category;
    document.getElementById("prod-unit").value = record.unit;
    document.getElementById("prod-mrp").value = record.mrp;
    document.getElementById("prod-saleprice").value = record.salePrice;
    document.getElementById("prod-costprice").value = record.costPrice;
    document.getElementById("prod-opening").value = record.openingStock;
    document.getElementById("prod-current").value = record.currentStock;
    document.getElementById("prod-minimum").value = record.minimumStock;
    document.getElementById("prod-status").value = record.status;
    document.getElementById("product-submit-btn").textContent = "Update Product";
  } else if (key === KEYS.customers) {
    document.getElementById("cust-name").value = record.name;
    document.getElementById("cust-phone").value = record.phone;
    document.getElementById("cust-whatsapp").value = record.whatsapp || record.phone;
    document.getElementById("cust-place").value = record.place;
    document.getElementById("cust-address").value = record.address;
    document.getElementById("cust-pin").value = record.pin;
    document.getElementById("cust-type").value = record.type;
    document.getElementById("cust-notes").value = record.notes || "";
    document.getElementById("customer-submit-btn").textContent = "Update Customer";
  } else if (key === KEYS.suppliers) {
    document.getElementById("supp-name").value = record.name;
    document.getElementById("supp-phone").value = record.phone;
    document.getElementById("supp-place").value = record.place;
    document.getElementById("supp-address").value = record.address;
    document.getElementById("supp-gst").value = record.gst || "";
    document.getElementById("supp-item").value = record.itemSupplied;
    document.getElementById("supp-terms").value = record.terms;
    document.getElementById("supp-notes").value = record.notes || "";
    document.getElementById("supplier-submit-btn").textContent = "Update Supplier";
  } else if (key === KEYS.purchases) {
    document.getElementById("pur-date").value = record.date;
    document.getElementById("pur-supplier").value = record.supplier;
    document.getElementById("pur-invoice").value = record.invoice;
    document.getElementById("pur-item").value = record.itemName;
    document.getElementById("pur-qty").value = record.qty;
    document.getElementById("pur-unit").value = record.unit;
    document.getElementById("pur-rate").value = record.rate;
    document.getElementById("pur-total").value = record.totalAmount;
    document.getElementById("pur-mode").value = record.paymentMode;
    document.getElementById("pur-status").value = record.paymentStatus;
    document.getElementById("pur-notes").value = record.notes || "";
    document.getElementById("purchase-submit-btn").textContent = "Update Purchase";
  } else if (key === KEYS.inventory) {
    document.getElementById("stk-name").value = record.name;
    document.getElementById("stk-category").value = record.category;
    document.getElementById("stk-type").value = record.stockType;
    document.getElementById("stk-opening").value = record.openingStock;
    document.getElementById("stk-in").value = record.stockIn;
    document.getElementById("stk-out").value = record.stockOut;
    document.getElementById("stk-current").value = record.currentStock;
    document.getElementById("stk-unit").value = record.unit;
    document.getElementById("stk-min").value = record.minStock;
    document.getElementById("stk-date").value = record.lastUpdated;
    document.getElementById("inventory-submit-btn").textContent = "Update Inventory";
  } else if (key === KEYS.production) {
    document.getElementById("prod-batch").value = record.batchNumber;
    document.getElementById("prod-date").value = record.date;
    document.getElementById("prod-pname").value = record.productName;
    document.getElementById("prod-raw").value = record.rawMaterial;
    document.getElementById("prod-qty").value = record.qtyProduced;
    document.getElementById("prod-pack").value = record.packingQty;
    document.getElementById("prod-waste").value = record.wastage;
    document.getElementById("prod-cost").value = record.cost;
    document.getElementById("prod-staff").value = record.staff;
    document.getElementById("prod-notes").value = record.notes || "";
    document.getElementById("production-submit-btn").textContent = "Update Batch";
  } else if (key === KEYS.sales) {
    document.getElementById("sale-date").value = record.date;
    document.getElementById("sale-customer").value = record.customer;
    document.getElementById("sale-product").value = record.product;
    document.getElementById("sale-qty").value = record.qty;
    document.getElementById("sale-rate").value = record.rate;
    document.getElementById("sale-total").value = record.totalAmount;
    document.getElementById("sale-discount").value = record.discount;
    document.getElementById("sale-final").value = record.finalAmount;
    document.getElementById("sale-mode").value = record.paymentMode;
    document.getElementById("sale-status").value = record.paymentStatus;
    document.getElementById("sale-notes").value = record.notes || "";
    document.getElementById("sales-submit-btn").textContent = "Update Sale";
  } else if (key === KEYS.orders) {
    document.getElementById("ord-date").value = record.date;
    document.getElementById("ord-source").value = record.source;
    document.getElementById("ord-customer").value = record.customerName;
    document.getElementById("ord-phone").value = record.phone;
    document.getElementById("ord-product").value = record.product;
    document.getElementById("ord-qty").value = record.qty;
    document.getElementById("ord-amount").value = record.amount;
    document.getElementById("ord-delivery").value = record.deliveryCharge;
    document.getElementById("ord-payable").value = record.totalPayable;
    document.getElementById("ord-pstatus").value = record.paymentStatus;
    document.getElementById("ord-ostatus").value = record.orderStatus;
    document.getElementById("ord-address").value = record.address;
    document.getElementById("ord-notes").value = record.notes || "";
    document.getElementById("orders-submit-btn").textContent = "Update Order";
  } else if (key === KEYS.delivery) {
    document.getElementById("dlv-order").value = record.orderId;
    document.getElementById("dlv-customer").value = record.customer;
    document.getElementById("dlv-partner").value = record.partner;
    document.getElementById("dlv-tracking").value = record.trackingId;
    document.getElementById("dlv-charge").value = record.charge;
    document.getElementById("dlv-dispatch").value = record.dispatchDate;
    document.getElementById("dlv-status").value = record.status;
    document.getElementById("dlv-delivered").value = record.deliveredDate;
    document.getElementById("dlv-notes").value = record.notes || "";
    document.getElementById("delivery-submit-btn").textContent = "Update Delivery";
  } else if (key === KEYS.expenses) {
    document.getElementById("exp-date").value = record.date;
    document.getElementById("exp-cat").value = record.category;
    document.getElementById("exp-desc").value = record.desc;
    document.getElementById("exp-amount").value = record.amount;
    document.getElementById("exp-mode").value = record.mode;
    document.getElementById("exp-paid").value = record.paidTo;
    document.getElementById("exp-receipt").value = record.receipt || "";
    document.getElementById("exp-notes").value = record.notes || "";
    document.getElementById("expenses-submit-btn").textContent = "Update Expense";
  } else if (key === KEYS.income) {
    document.getElementById("inc-date").value = record.date;
    document.getElementById("inc-source").value = record.source;
    document.getElementById("inc-desc").value = record.desc;
    document.getElementById("inc-amount").value = record.amount;
    document.getElementById("inc-mode").value = record.mode;
    document.getElementById("inc-received").value = record.receivedFrom;
    document.getElementById("inc-notes").value = record.notes || "";
    document.getElementById("income-submit-btn").textContent = "Update Income";
  } else if (key === KEYS.investors) {
    document.getElementById("inv-name").value = record.name;
    document.getElementById("inv-phone").value = record.phone;
    document.getElementById("inv-email").value = record.email;
    document.getElementById("inv-address").value = record.address;
    document.getElementById("inv-amount").value = record.amount;
    document.getElementById("inv-share").value = record.share;
    document.getElementById("inv-date").value = record.date;
    document.getElementById("inv-status").value = record.status;
    document.getElementById("inv-notes").value = record.notes || "";
    document.getElementById("investors-submit-btn").textContent = "Update Investor";
  } else if (key === KEYS.sharing) {
    document.getElementById("shr-period").value = record.period;
    document.getElementById("shr-profit").value = record.totalProfit;
    document.getElementById("shr-investor").value = record.investor;
    document.getElementById("shr-percentage").value = record.share;
    document.getElementById("shr-amount").value = record.amount;
    document.getElementById("shr-status").value = record.status;
    document.getElementById("shr-date").value = record.date;
    document.getElementById("shr-notes").value = record.notes || "";
    document.getElementById("sharing-submit-btn").textContent = "Update Profit Share";
  }
}

/**
 * Global form controllers mapping
 */
function initFormListeners() {
  
  // Helper for Auto-Calculating forms
  const purQty = document.getElementById("pur-qty");
  const purRate = document.getElementById("pur-rate");
  const purTotal = document.getElementById("pur-total");
  if (purQty && purRate && purTotal) {
    const calc = () => { purTotal.value = (parseFloat(purQty.value || 0) * parseFloat(purRate.value || 0)).toFixed(2); };
    purQty.addEventListener("input", calc);
    purRate.addEventListener("input", calc);
  }

  const saleQty = document.getElementById("sale-qty");
  const saleRate = document.getElementById("sale-rate");
  const saleTotal = document.getElementById("sale-total");
  const saleDisc = document.getElementById("sale-discount");
  const saleFinal = document.getElementById("sale-final");
  if (saleQty && saleRate && saleTotal && saleDisc && saleFinal) {
    const calc = () => {
      const tot = parseFloat(saleQty.value || 0) * parseFloat(saleRate.value || 0);
      saleTotal.value = tot.toFixed(2);
      saleFinal.value = (tot - parseFloat(saleDisc.value || 0)).toFixed(2);
    };
    saleQty.addEventListener("input", calc);
    saleRate.addEventListener("input", calc);
    saleDisc.addEventListener("input", calc);
  }

  const ordAmount = document.getElementById("ord-amount");
  const ordDelivery = document.getElementById("ord-delivery");
  const ordPayable = document.getElementById("ord-payable");
  if (ordAmount && ordDelivery && ordPayable) {
    const calc = () => { ordPayable.value = (parseFloat(ordAmount.value || 0) + parseFloat(ordDelivery.value || 0)).toFixed(2); };
    ordAmount.addEventListener("input", calc);
    ordDelivery.addEventListener("input", calc);
  }

  const shrProfit = document.getElementById("shr-profit");
  const shrShare = document.getElementById("shr-percentage");
  const shrAmount = document.getElementById("shr-amount");
  if (shrProfit && shrShare && shrAmount) {
    const calc = () => { shrAmount.value = (parseFloat(shrProfit.value || 0) * parseFloat(shrShare.value || 0) / 100).toFixed(2); };
    shrProfit.addEventListener("input", calc);
    shrShare.addEventListener("input", calc);
  }

  // Master form submit handlers
  setupFormSubmit("product-form", KEYS.products, "products-table-body", "PRD", () => {
    return {
      name: document.getElementById("prod-name").value.trim(),
      sku: document.getElementById("prod-sku").value.trim(),
      category: document.getElementById("prod-category").value,
      unit: document.getElementById("prod-unit").value,
      mrp: parseFloat(document.getElementById("prod-mrp").value || 0),
      salePrice: parseFloat(document.getElementById("prod-saleprice").value || 0),
      costPrice: parseFloat(document.getElementById("prod-costprice").value || 0),
      openingStock: parseInt(document.getElementById("prod-opening").value || 0),
      currentStock: parseInt(document.getElementById("prod-current").value || 0),
      minimumStock: parseInt(document.getElementById("prod-minimum").value || 0),
      status: document.getElementById("prod-status").value
    };
  });

  setupFormSubmit("customer-form", KEYS.customers, "customers-table-body", "CST", () => {
    return {
      name: document.getElementById("cust-name").value.trim(),
      phone: document.getElementById("cust-phone").value.trim(),
      whatsapp: document.getElementById("cust-whatsapp").value.trim() || document.getElementById("cust-phone").value.trim(),
      place: document.getElementById("cust-place").value.trim(),
      address: document.getElementById("cust-address").value.trim(),
      pin: document.getElementById("cust-pin").value.trim(),
      type: document.getElementById("cust-type").value,
      notes: document.getElementById("cust-notes").value.trim()
    };
  });

  setupFormSubmit("supplier-form", KEYS.suppliers, "suppliers-table-body", "SPL", () => {
    return {
      name: document.getElementById("supp-name").value.trim(),
      phone: document.getElementById("supp-phone").value.trim(),
      place: document.getElementById("supp-place").value.trim(),
      address: document.getElementById("supp-address").value.trim(),
      gst: document.getElementById("supp-gst").value.trim().toUpperCase(),
      itemSupplied: document.getElementById("supp-item").value.trim(),
      terms: document.getElementById("supp-terms").value,
      notes: document.getElementById("supp-notes").value.trim()
    };
  });

  setupFormSubmit("purchase-form", KEYS.purchases, "purchase-table-body", "PUR", () => {
    const date = document.getElementById("pur-date").value;
    const amount = parseFloat(document.getElementById("pur-total").value || 0);
    const supplier = document.getElementById("pur-supplier").value;
    const invoice = document.getElementById("pur-invoice").value.trim();
    const mode = document.getElementById("pur-mode").value;

    // Side effect: Log in Cash Book / Bank Book on form submit if Payment Status is 'Paid'
    if (document.getElementById("pur-status").value === "Paid") {
      logFinancialTransaction(date, mode, "Cash Out", "Amount Out", `Purchase inv: ${invoice} from ${supplier}`, amount, `PUR-${invoice}`);
    }

    return {
      date,
      supplier,
      invoice,
      itemName: document.getElementById("pur-item").value.trim(),
      qty: parseInt(document.getElementById("pur-qty").value || 0),
      unit: document.getElementById("pur-unit").value,
      rate: parseFloat(document.getElementById("pur-rate").value || 0),
      totalAmount: amount,
      paymentMode: mode,
      paymentStatus: document.getElementById("pur-status").value,
      notes: document.getElementById("pur-notes").value.trim()
    };
  });

  setupFormSubmit("inventory-form", KEYS.inventory, "inventory-table-body", "STK", () => {
    return {
      name: document.getElementById("stk-name").value.trim(),
      category: document.getElementById("stk-category").value,
      stockType: document.getElementById("stk-type").value,
      openingStock: parseInt(document.getElementById("stk-opening").value || 0),
      stockIn: parseInt(document.getElementById("stk-in").value || 0),
      stockOut: parseInt(document.getElementById("stk-out").value || 0),
      currentStock: parseInt(document.getElementById("stk-current").value || 0),
      unit: document.getElementById("stk-unit").value,
      minStock: parseInt(document.getElementById("stk-min").value || 0),
      lastUpdated: document.getElementById("stk-date").value
    };
  });

  setupFormSubmit("production-form", KEYS.production, "production-table-body", "BATCH", () => {
    return {
      batchNumber: document.getElementById("prod-batch").value.trim(),
      date: document.getElementById("prod-date").value,
      productName: document.getElementById("prod-pname").value.trim(),
      rawMaterial: document.getElementById("prod-raw").value.trim(),
      qtyProduced: parseInt(document.getElementById("prod-qty").value || 0),
      packingQty: document.getElementById("prod-pack").value.trim(),
      wastage: document.getElementById("prod-waste").value.trim(),
      cost: parseFloat(document.getElementById("prod-cost").value || 0),
      staff: document.getElementById("prod-staff").value.trim(),
      notes: document.getElementById("prod-notes").value.trim()
    };
  });

  setupFormSubmit("sales-form", KEYS.sales, "sales-table-body", "SAL", () => {
    const date = document.getElementById("sale-date").value;
    const finalAmount = parseFloat(document.getElementById("sale-final").value || 0);
    const customer = document.getElementById("sale-customer").value;
    const mode = document.getElementById("sale-mode").value;
    const status = document.getElementById("sale-status").value;

    if (status === "Paid") {
      logFinancialTransaction(date, mode, "Cash In", "Amount In", `Sale to ${customer}`, finalAmount, `SAL-AUTO`);
    }

    return {
      date,
      customer,
      product: document.getElementById("sale-product").value,
      qty: parseInt(document.getElementById("sale-qty").value || 0),
      rate: parseFloat(document.getElementById("sale-rate").value || 0),
      totalAmount: parseFloat(document.getElementById("sale-total").value || 0),
      discount: parseFloat(document.getElementById("sale-discount").value || 0),
      finalAmount,
      paymentMode: mode,
      paymentStatus: status,
      notes: document.getElementById("sale-notes").value.trim()
    };
  });

  setupFormSubmit("orders-form", KEYS.orders, "orders-table-body", "ORD", () => {
    return {
      date: document.getElementById("ord-date").value,
      source: document.getElementById("ord-source").value,
      customerName: document.getElementById("ord-customer").value.trim(),
      phone: document.getElementById("ord-phone").value.trim(),
      product: document.getElementById("ord-product").value,
      qty: parseInt(document.getElementById("ord-qty").value || 0),
      amount: parseFloat(document.getElementById("ord-amount").value || 0),
      deliveryCharge: parseFloat(document.getElementById("ord-delivery").value || 0),
      totalPayable: parseFloat(document.getElementById("ord-payable").value || 0),
      paymentStatus: document.getElementById("ord-pstatus").value,
      orderStatus: document.getElementById("ord-ostatus").value,
      address: document.getElementById("ord-address").value.trim(),
      notes: document.getElementById("ord-notes").value.trim()
    };
  });

  setupFormSubmit("delivery-form", KEYS.delivery, "delivery-table-body", "DLV", () => {
    return {
      orderId: document.getElementById("dlv-order").value.trim(),
      customer: document.getElementById("dlv-customer").value.trim(),
      partner: document.getElementById("dlv-partner").value,
      trackingId: document.getElementById("dlv-tracking").value.trim(),
      charge: parseFloat(document.getElementById("dlv-charge").value || 0),
      dispatchDate: document.getElementById("dlv-dispatch").value,
      status: document.getElementById("dlv-status").value,
      deliveredDate: document.getElementById("dlv-delivered").value,
      notes: document.getElementById("dlv-notes").value.trim()
    };
  });

  setupFormSubmit("expenses-form", KEYS.expenses, "expenses-table-body", "EXP", () => {
    const date = document.getElementById("exp-date").value;
    const amount = parseFloat(document.getElementById("exp-amount").value || 0);
    const category = document.getElementById("exp-cat").value;
    const mode = document.getElementById("exp-mode").value;
    const paidTo = document.getElementById("exp-paid").value.trim();

    logFinancialTransaction(date, mode, "Cash Out", "Amount Out", `Expense (${category}) to ${paidTo}`, amount, `EXP-MANUAL`);

    return {
      date,
      category,
      desc: document.getElementById("exp-desc").value.trim(),
      amount,
      mode,
      paidTo,
      receipt: document.getElementById("exp-receipt").value.trim(),
      notes: document.getElementById("exp-notes").value.trim()
    };
  });

  setupFormSubmit("income-form", KEYS.income, "income-table-body", "INC", () => {
    const date = document.getElementById("inc-date").value;
    const amount = parseFloat(document.getElementById("inc-amount").value || 0);
    const source = document.getElementById("inc-source").value;
    const mode = document.getElementById("inc-mode").value;
    const recFrom = document.getElementById("inc-received").value.trim();

    logFinancialTransaction(date, mode, "Cash In", "Amount In", `Income (${source}) from ${recFrom}`, amount, `INC-MANUAL`);

    return {
      date,
      source,
      desc: document.getElementById("inc-desc").value.trim(),
      amount,
      mode,
      receivedFrom: recFrom,
      notes: document.getElementById("inc-notes").value.trim()
    };
  });

  setupFormSubmit("investors-form", KEYS.investors, "investors-table-body", "INV", () => {
    const date = document.getElementById("inv-date").value;
    const amount = parseFloat(document.getElementById("inv-amount").value || 0);
    const name = document.getElementById("inv-name").value.trim();

    // Log funding transaction automatically
    logFinancialTransaction(date, "Bank", "Cash In", "Amount In", `Capital funding from Investor ${name}`, amount, `INV-CAP`);

    return {
      name,
      phone: document.getElementById("inv-phone").value.trim(),
      email: document.getElementById("inv-email").value.trim(),
      address: document.getElementById("inv-address").value.trim(),
      amount,
      share: parseFloat(document.getElementById("inv-share").value || 0),
      date,
      status: document.getElementById("inv-status").value,
      notes: document.getElementById("inv-notes").value.trim()
    };
  });

  setupFormSubmit("sharing-form", KEYS.sharing, "sharing-table-body", "SHR", () => {
    return {
      period: document.getElementById("shr-period").value.trim(),
      totalProfit: parseFloat(document.getElementById("shr-profit").value || 0),
      investor: document.getElementById("shr-investor").value.trim(),
      share: parseFloat(document.getElementById("shr-percentage").value || 0),
      amount: parseFloat(document.getElementById("shr-amount").value || 0),
      status: document.getElementById("shr-status").value,
      date: document.getElementById("shr-date").value,
      notes: document.getElementById("shr-notes").value.trim()
    };
  });

  // Custom cash/bank forms
  const cbForm = document.getElementById("cashbook-form");
  if (cbForm) {
    cbForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const date = document.getElementById("cb-date").value;
      const type = document.getElementById("cb-type").value;
      const desc = document.getElementById("cb-desc").value.trim();
      const amount = parseFloat(document.getElementById("cb-amount").value || 0);
      const ref = document.getElementById("cb-ref").value.trim();

      if (!date || !desc || amount <= 0) {
        showToast("Please fill all cash transaction fields.", "error");
        return;
      }

      // Add to cashbook
      const records = dbLocal.getAll(KEYS.cashBook);
      const currentBal = records.length > 0 ? parseFloat(records[records.length - 1].balance) : 0;
      const isCashIn = type === "Cash In";
      const newBal = isCashIn ? currentBal + amount : currentBal - amount;

      const newTx = {
        id: generateId("CB"),
        date,
        type,
        desc,
        cashIn: isCashIn ? amount : 0,
        cashOut: !isCashIn ? amount : 0,
        balance: newBal,
        ref
      };

      records.push(newTx);
      dbLocal.save(KEYS.cashBook, records);
      
      showToast("Cash Book entry added successfully!", "success");
      cbForm.reset();
      renderCashBookTable();
      updateDashboardMetrics();
    });
  }

  const bbForm = document.getElementById("bankbook-form");
  if (bbForm) {
    bbForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const date = document.getElementById("bb-date").value;
      const bankName = document.getElementById("bb-bank").value;
      const type = document.getElementById("bb-type").value;
      const desc = document.getElementById("bb-desc").value.trim();
      const amount = parseFloat(document.getElementById("bb-amount").value || 0);
      const refNum = document.getElementById("bb-ref").value.trim();

      if (!date || !desc || amount <= 0) {
        showToast("Please fill all bank transaction fields.", "error");
        return;
      }

      const records = dbLocal.getAll(KEYS.bankBook);
      const currentBal = records.length > 0 ? parseFloat(records[records.length - 1].balance) : 0;
      const isAmtIn = type === "Amount In";
      const newBal = isAmtIn ? currentBal + amount : currentBal - amount;

      const newTx = {
        id: generateId("BB"),
        date,
        bankName,
        type,
        desc,
        amountIn: isAmtIn ? amount : 0,
        amountOut: !isAmtIn ? amount : 0,
        balance: newBal,
        refNum
      };

      records.push(newTx);
      dbLocal.save(KEYS.bankBook, records);

      showToast("Bank Book entry added successfully!", "success");
      bbForm.reset();
      renderBankBookTable();
      updateDashboardMetrics();
    });
  }
}

/**
 * Universal Form Submissions controller
 */
function setupFormSubmit(formId, storageKey, tableBodyId, idPrefix, getFieldsCallback) {
  const form = document.getElementById(formId);
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    // Run custom field extractors
    const data = getFieldsCallback();

    // Check basic validation
    const firstValue = Object.values(data)[0];
    if (firstValue === "" || firstValue === null) {
      showToast("Please fill out the form fields correctly.", "error");
      return;
    }

    const records = dbLocal.getAll(storageKey);

    if (currentEditId) {
      // Edit/Update mode
      const index = records.findIndex(r => r.id === currentEditId);
      if (index !== -1) {
        records[index] = { ...records[index], ...data };
        dbLocal.save(storageKey, records);
        showToast("Record updated successfully!", "success");
        currentEditId = null;
        
        // Reset submit btn
        const subBtn = form.querySelector(".submit-btn");
        if (subBtn) subBtn.textContent = "Save Record";
      }
    } else {
      // Insertion mode
      const newRecord = {
        id: generateId(idPrefix),
        ...data
      };
      records.push(newRecord);
      dbLocal.save(storageKey, records);
      showToast("Record saved successfully!", "success");
    }

    // Reset and Redraw
    form.reset();
    renderTable(storageKey, tableBodyId);
    updateDashboardMetrics();
  });
}

/**
 * Automated double entry logging on transactions
 */
function logFinancialTransaction(date, mode, cashType, bankType, desc, amount, reference) {
  if (mode === "Cash") {
    const records = dbLocal.getAll(KEYS.cashBook);
    const lastBal = records.length > 0 ? parseFloat(records[records.length - 1].balance) : 0;
    const isCashIn = cashType === "Cash In";
    const newBal = isCashIn ? lastBal + amount : lastBal - amount;

    records.push({
      id: generateId("CB"),
      date,
      type: cashType,
      desc,
      cashIn: isCashIn ? amount : 0,
      cashOut: !isCashIn ? amount : 0,
      balance: newBal,
      ref: reference
    });
    dbLocal.save(KEYS.cashBook, records);
  } else if (["Bank", "UPI", "Card"].includes(mode)) {
    const records = dbLocal.getAll(KEYS.bankBook);
    const lastBal = records.length > 0 ? parseFloat(records[records.length - 1].balance) : 0;
    const isAmtIn = bankType === "Amount In";
    const newBal = isAmtIn ? lastBal + amount : lastBal - amount;

    records.push({
      id: generateId("BB"),
      date,
      bankName: "Federal Bank (Default)",
      type: bankType,
      desc,
      amountIn: isAmtIn ? amount : 0,
      amountOut: !isAmtIn ? amount : 0,
      balance: newBal,
      refNum: reference
    });
    dbLocal.save(KEYS.bankBook, records);
  }
}

/**
 * Delete a specific cashbook/bankbook line
 */
function deleteTransactionRecord(key, id) {
  const records = dbLocal.getAll(key);
  const index = records.findIndex(r => r.id === id);
  if (index === -1) return;

  records.splice(index, 1);
  
  // Recompute balances from start to ensure accounting integrity
  let rollingBalance = 0;
  const recomputed = records.map(tx => {
    let inAmt = 0;
    let outAmt = 0;
    
    if (key === KEYS.cashBook) {
      inAmt = parseFloat(tx.cashIn || 0);
      outAmt = parseFloat(tx.cashOut || 0);
      rollingBalance = rollingBalance + inAmt - outAmt;
    } else {
      inAmt = parseFloat(tx.amountIn || 0);
      outAmt = parseFloat(tx.amountOut || 0);
      rollingBalance = rollingBalance + inAmt - outAmt;
    }
    
    tx.balance = rollingBalance;
    return tx;
  });

  dbLocal.save(key, recomputed);
  showToast("Transaction removed. Balances recomputed.", "info");
}

function deleteRecord(key, id) {
  const records = dbLocal.getAll(key);
  const filtered = records.filter(r => r.id !== id);
  dbLocal.save(key, filtered);
}

/**
 * Products Module local search filter
 */
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
