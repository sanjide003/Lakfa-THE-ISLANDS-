/* Lakfa ERP Investor Controller */
import { logoutUser, isDemoMode } from "./role-guard.js";
import { formatCurrency, formatDate, dbLocal } from "./utils.js";
import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  // Handle logouts
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logoutUser);
  }

  // Load and load matching investor context
  if (isDemoMode()) {
    const demoUser = sessionStorage.getItem("lakfa_demo_user");
    if (demoUser) {
      const userObj = JSON.parse(demoUser);
      loadInvestorDashboard(userObj.email);
    }
  } else {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        loadInvestorDashboard(user.email);
      }
    });
  }
});

/**
 * Loads specific investor profiles matching user email and renders summary data
 * @param {string} email 
 */
function loadInvestorDashboard(email) {
  // 1. Fetch all investors and search for a matching record
  const investorsList = dbLocal.getAll("lakfa_investors");
  const sharingHistory = dbLocal.getAll("lakfa_sharing");

  let investorProfile = investorsList.find(inv => inv.email?.toLowerCase() === email?.toLowerCase());

  // Safe fallback if the investor record does not exist in localStorage yet
  if (!investorProfile) {
    console.warn(`No investor profile found for email: ${email}. Loading placeholder demo.`);
    investorProfile = {
      name: "Lakfa Investor Group",
      phone: "+91 9447012345",
      email: email,
      amount: 300000,
      share: 10.0,
      date: "2026-07-01",
      status: "Active",
      notes: "Auto-generated preview profile"
    };
  }

  // Set Profile Metadata on UI
  document.getElementById("investor-display-name").textContent = investorProfile.name;
  document.getElementById("card-company-status").textContent = investorProfile.status;
  
  const statusBadge = document.getElementById("card-company-status");
  if (statusBadge) {
    statusBadge.className = `badge ${investorProfile.status === 'Active' ? 'badge-success' : 'badge-danger'}`;
  }

  // 2. Fetch profit shares matching this investor's name
  const myShares = sharingHistory.filter(share => share.investor?.toLowerCase() === investorProfile.name?.toLowerCase());

  // Calculations for cards
  const totalInvestment = parseFloat(investorProfile.amount || 0);
  const sharePercentage = parseFloat(investorProfile.share || 0);

  const totalProfitReceived = myShares
    .filter(s => s.status === "Paid")
    .reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);

  const pendingProfit = myShares
    .filter(s => s.status === "Pending")
    .reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);

  const lastPayment = myShares
    .filter(s => s.status === "Paid" && s.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

  const lastPaymentDateStr = lastPayment ? formatDate(lastPayment.date) : "No payout yet";

  // Populate Dashboard Metric Cards
  document.getElementById("inv-total").textContent = formatCurrency(totalInvestment);
  document.getElementById("inv-share").textContent = `${sharePercentage.toFixed(1)}%`;
  document.getElementById("inv-received").textContent = formatCurrency(totalProfitReceived);
  document.getElementById("inv-pending").textContent = formatCurrency(pendingProfit);
  document.getElementById("inv-last-payout").textContent = lastPaymentDateStr;

  // Render Payout / Profit Share history
  renderPayoutTable(myShares);
}

/**
 * Render historical share payout lines inside investor table
 */
function renderPayoutTable(shares) {
  const tbody = document.getElementById("payout-table-body");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (shares.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="color: var(--text-muted); padding: 1.5rem;">No profit distribution history found.</td></tr>`;
    return;
  }

  shares.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${row.period}</strong></td>
      <td>${formatCurrency(row.totalProfit)}</td>
      <td>${row.share}%</td>
      <td style="font-weight: 600; color: var(--primary);">${formatCurrency(row.amount)}</td>
      <td><span class="badge ${row.status === 'Paid' ? 'badge-success' : 'badge-warning'}">${row.status}</span></td>
      <td>${row.date ? formatDate(row.date) : '-'}</td>
    `;
    tbody.appendChild(tr);
  });
}
