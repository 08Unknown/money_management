import {
  doc,
  getDoc,
  getDocs,
  collection
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./sambungan.js";
import {
  initBackground,
  getQueryParam,
  getTodayISO,
  formatDisplayDate,
  USERS,
  extractCategoriesFromDoc,
  applyAvatarToElement
} from "./state.js";

initBackground();

const currentUser = getQueryParam("user");
const monthId = getQueryParam("month");
const monthLabel = getQueryParam("label") || "Monthly Report";

if (!currentUser || !USERS.includes(currentUser) || !monthId) {
  window.location.href = "index.html";
}

const backUrl = `semester.html?user=${encodeURIComponent(currentUser)}`;
document.getElementById("backToSemesterBtn").href = backUrl;
document.getElementById("reportStudentName").textContent = currentUser;
document.getElementById("reportGeneratedDate").textContent = formatDisplayDate(getTodayISO());
document.getElementById("reportTypeTag").textContent = "Monthly Financial Statement";
document.getElementById("reportPeriodTitle").textContent = monthLabel;

async function generateReport() {
  const userSnap = await getDoc(doc(db, "users", currentUser));
  const userData = userSnap.exists() ? userSnap.data() : {};
  applyAvatarToElement(document.getElementById("avatar-report"), currentUser, userData.avatar || null);

  let categoryMap = {};
  let allTransactions = [];

  const mSnap = await getDoc(doc(db, "users", currentUser, "months", monthId));
  const cats = extractCategoriesFromDoc(mSnap.exists() ? mSnap.data() : {});
  cats.forEach(c => {
    categoryMap[c.name] = { budget: Number(c.budget || 0), expense: 0 };
  });

  const txSnap = await getDocs(collection(db, "users", currentUser, "months", monthId, "transactions"));
  txSnap.forEach(d => {
    allTransactions.push(d.data());
  });

  let uncategorizedExpense = 0;
  allTransactions.forEach(tx => {
    const price = Number(tx.price || 0);
    if (categoryMap[tx.category]) {
      categoryMap[tx.category].expense += price;
    } else {
      uncategorizedExpense += price;
    }
  });

  if (uncategorizedExpense > 0) {
    categoryMap["Others"] = { budget: 0, expense: uncategorizedExpense };
  }

  let totalBudget = 0;
  let totalExpense = 0;
  let topCatName = "-";
  let topCatAmt = 0;

  const categoryEntries = Object.entries(categoryMap);
  categoryEntries.forEach(([name, vals]) => {
    totalBudget += vals.budget;
    totalExpense += vals.expense;
    if (vals.expense > topCatAmt) {
      topCatAmt = vals.expense;
      topCatName = name;
    }
  });

  const totalBalance = totalBudget - totalExpense;
  const totalPct = totalBudget > 0 ? Math.round((totalExpense / totalBudget) * 100) : 0;

  document.getElementById("repTotalBudget").textContent = `RM ${totalBudget.toFixed(2)}`;
  document.getElementById("repTotalExpense").textContent = `RM ${totalExpense.toFixed(2)}`;
  document.getElementById("repTopCategory").textContent = topCatName;
  document.getElementById("repTopCategoryAmt").textContent = `RM ${topCatAmt.toFixed(2)}`;
  document.getElementById("repUsagePct").textContent = `${totalPct}% Budget Used`;

  const balEl = document.getElementById("repTotalBalance");
  const statusEl = document.getElementById("reportStatusBadge");
  balEl.textContent = `RM ${totalBalance.toFixed(2)}`;

  if (totalBalance < 0) {
    balEl.className = "text-xl sm:text-2xl font-extrabold text-rose-400 mt-1.5";
    statusEl.textContent = "⚠️ Over Budget";
    statusEl.className = "text-base sm:text-lg font-extrabold text-rose-400 mt-0.5";
  } else {
    balEl.className = "text-xl sm:text-2xl font-extrabold text-emerald-400 mt-1.5";
    statusEl.textContent = "✅ Within Budget";
    statusEl.className = "text-base sm:text-lg font-extrabold text-emerald-400 mt-0.5";
  }

  // Render Table 1: Category Summary
  const catBody = document.getElementById("repCategoryBody");
  if (categoryEntries.length === 0) {
    catBody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-slate-400">No category data recorded.</td></tr>`;
  } else {
    catBody.innerHTML = categoryEntries.map(([name, vals]) => {
      const balance = vals.budget - vals.expense;
      const pct = vals.budget > 0 ? Math.round((vals.expense / vals.budget) * 100) : (vals.expense > 0 ? 100 : 0);
      const bakiColor = balance < 0 ? "text-rose-400 font-extrabold" : "text-emerald-400 font-extrabold";
      return `
        <tr>
          <td class="print-text-dark py-3.5 px-5 font-bold text-slate-100">${name}</td>
          <td class="print-text-muted py-3.5 px-5 text-right text-slate-400">${vals.budget.toFixed(2)}</td>
          <td class="print-text-dark py-3.5 px-5 text-right font-semibold text-white">${vals.expense.toFixed(2)}</td>
          <td class="py-3.5 px-5 text-right ${bakiColor}">${balance.toFixed(2)}</td>
          <td class="print-text-muted py-3.5 px-5 text-right text-slate-400 font-semibold">${pct}%</td>
        </tr>
      `;
    }).join("") + `
      <tr class="print-bg-light bg-slate-800/80 font-extrabold text-white border-t-2 border-slate-700">
        <td class="print-text-dark py-3.5 px-5">OVERALL TOTAL</td>
        <td class="print-text-dark py-3.5 px-5 text-right">${totalBudget.toFixed(2)}</td>
        <td class="py-3.5 px-5 text-right text-rose-400">${totalExpense.toFixed(2)}</td>
        <td class="py-3.5 px-5 text-right ${totalBalance < 0 ? 'text-rose-400' : 'text-emerald-400'}">${totalBalance.toFixed(2)}</td>
        <td class="print-text-dark py-3.5 px-5 text-right">${totalPct}%</td>
      </tr>
    `;
  }

  // Sort transactions by date
  allTransactions.sort((a, b) => {
    const dA = a.date || "";
    const dB = b.date || "";
    if (dA !== dB) return dA.localeCompare(dB);
    return (a.createdAt || 0) - (b.createdAt || 0);
  });

  // Render Table 2: Detailed Transaction List
  document.getElementById("repTxCount").textContent = `${allTransactions.length} transactions`;
  const txBody = document.getElementById("repTransactionBody");

  if (allTransactions.length === 0) {
    txBody.innerHTML = `<tr><td colspan="6" class="py-10 text-center text-slate-400">No expense records for this period.</td></tr>`;
  } else {
    txBody.innerHTML = allTransactions.map((tx, idx) => `
      <tr>
        <td class="print-text-muted py-3 px-4 text-xs font-bold text-slate-500">${idx + 1}</td>
        <td class="print-text-dark py-3 px-4 text-xs font-bold text-slate-300 whitespace-nowrap">${formatDisplayDate(tx.date)}</td>
        <td class="print-text-dark py-3 px-4 font-semibold text-slate-100">${tx.item}</td>
        <td class="print-text-muted py-3 px-4 text-xs font-bold text-indigo-300">${tx.category}</td>
        <td class="print-text-muted py-3 px-4 text-xs uppercase text-slate-400">${tx.place || "-"}</td>
        <td class="print-text-dark py-3 px-5 text-right font-bold text-white">${Number(tx.price).toFixed(2)}</td>
      </tr>
    `).join("") + `
      <tr class="print-bg-light bg-slate-800/80 font-extrabold text-white border-t border-slate-700">
        <td colspan="5" class="print-text-dark py-3.5 px-4 text-right text-xs uppercase tracking-wider text-slate-300">Total Expenses</td>
        <td class="py-3.5 px-5 text-right text-rose-400">RM ${totalExpense.toFixed(2)}</td>
      </tr>
    `;
  }
}

generateReport();
