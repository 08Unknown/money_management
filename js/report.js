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
  applyAvatarToElement,
  requireUserAccess
} from "./state.js";

initBackground();

const currentUser = getQueryParam("user");
const monthId = getQueryParam("month");
const monthLabel = getQueryParam("label") || "Monthly Report";

const backUrl = `semester.html?user=${encodeURIComponent(currentUser || "")}`;
document.getElementById("backToSemesterBtn").href = backUrl;
document.getElementById("reportStudentName").textContent = currentUser || "";
document.getElementById("reportGeneratedDate").textContent = formatDisplayDate(getTodayISO());
document.getElementById("reportTypeTag").textContent = "Monthly Financial Statement";
document.getElementById("reportPeriodTitle").textContent = monthLabel;

async function generateReport() {
  if (!monthId || !(await requireUserAccess(currentUser))) {
    window.location.href = "index.html";
    return;
  }

  const userSnap = await getDoc(doc(db, "users", currentUser));
  const userData = userSnap.exists() ? userSnap.data() : {};
  applyAvatarToElement(document.getElementById("avatar-report"), currentUser, userData.avatar || null);

  let categoryMap = {};
  let allTransactions = [];

  const mSnap = await getDoc(doc(db, "users", currentUser, "months", monthId));
  const cats = extractCategoriesFromDoc(mSnap.exists() ? mSnap.data() : {});
  cats.forEach(c => {
    categoryMap[c.name] = { budget: Number(c.budget || 0), expense: 0, items: [] };
  });

  const txSnap = await getDocs(collection(db, "users", currentUser, "months", monthId, "transactions"));
  txSnap.forEach(d => {
    allTransactions.push(d.data());
  });

  // Sort transactions chronologically within each category
  allTransactions.sort((a, b) => {
    const dA = a.date || "";
    const dB = b.date || "";
    if (dA !== dB) return dA.localeCompare(dB);
    return (a.createdAt || 0) - (b.createdAt || 0);
  });

  // Group items into their respective categories
  allTransactions.forEach(tx => {
    const price = Number(tx.price || 0);
    if (categoryMap[tx.category]) {
      categoryMap[tx.category].expense += price;
      categoryMap[tx.category].items.push(tx);
    } else {
      if (!categoryMap["Others"]) {
        categoryMap["Others"] = { budget: 0, expense: 0, items: [] };
      }
      categoryMap["Others"].expense += price;
      categoryMap["Others"].items.push(tx);
    }
  });

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

  // Render Section 2: Grouped Transaction Tables by Category
  document.getElementById("repTxCount").textContent = `${allTransactions.length} transactions`;
  const groupedContainer = document.getElementById("repGroupedTransactions");

  if (allTransactions.length === 0) {
    groupedContainer.innerHTML = `
      <div class="rounded-2xl border border-slate-800 py-10 text-center text-sm text-slate-400">
        No expense records for this period.
      </div>
    `;
    return;
  }

  groupedContainer.innerHTML = categoryEntries.map(([catName, vals]) => {
    const items = vals.items;
    const rowsHTML = items.length === 0
      ? `<tr><td colspan="5" class="print-text-muted py-4 px-5 text-xs text-slate-400 italic">No expenses recorded under ${catName}.</td></tr>`
      : items.map((tx, idx) => `
          <tr>
            <td class="print-text-muted py-2.5 px-4 text-xs font-bold text-slate-500">${idx + 1}</td>
            <td class="print-text-dark py-2.5 px-4 text-xs font-bold text-slate-300 whitespace-nowrap">${formatDisplayDate(tx.date)}</td>
            <td class="print-text-dark py-2.5 px-4 font-semibold text-slate-100">${tx.item}</td>
            <td class="print-text-muted py-2.5 px-4 text-xs uppercase text-slate-400">${tx.place || "-"}</td>
            <td class="print-text-dark py-2.5 px-5 text-right font-bold text-white">${Number(tx.price).toFixed(2)}</td>
          </tr>
        `).join("");

    return `
      <div class="overflow-hidden rounded-2xl border border-slate-800 break-inside-avoid">
        <div class="print-bg-light bg-slate-800/90 px-5 py-2.5 border-b border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-xs font-extrabold px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300">${catName}</span>
            <span class="print-text-muted text-xs text-slate-400 font-semibold">(${items.length} ${items.length === 1 ? 'item' : 'items'})</span>
          </div>
          <span class="text-xs font-extrabold text-rose-400">Subtotal: RM ${vals.expense.toFixed(2)}</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead class="print-bg-light bg-slate-800/40 text-slate-400 text-xs font-bold border-b border-slate-800">
              <tr>
                <th class="print-text-dark py-2.5 px-4 w-12">No.</th>
                <th class="print-text-dark py-2.5 px-4 w-32">Date</th>
                <th class="print-text-dark py-2.5 px-4">Item / Description</th>
                <th class="print-text-dark py-2.5 px-4">Place / Note</th>
                <th class="print-text-dark py-2.5 px-5 text-right w-32">Price (RM)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800">
              ${rowsHTML}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }).join("");
}

generateReport();
