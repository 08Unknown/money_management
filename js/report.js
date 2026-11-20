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
const mode = getQueryParam("mode") || "month"; // 'month' atau 'semester'
const monthId = getQueryParam("month");
const monthLabel = getQueryParam("label") || "";
const semesterName = getQueryParam("sem") || "";

if (!currentUser || !USERS.includes(currentUser)) {
  window.location.href = "index.html";
}

document.getElementById("backToSemesterBtn").href = `semester.html?user=${encodeURIComponent(currentUser)}`;
document.getElementById("reportStudentName").textContent = currentUser;
document.getElementById("reportGeneratedDate").textContent = formatDisplayDate(getTodayISO());

async function generateReport() {
  // Muat avatar pengguna
  const userSnap = await getDoc(doc(db, "users", currentUser));
  const userData = userSnap.exists() ? userSnap.data() : {};
  applyAvatarToElement(document.getElementById("avatar-report"), currentUser, userData.avatar || null);

  let categoryMap = {}; // { namaKategori: { budget: 0, expense: 0 } }
  let allTransactions = [];

  if (mode === "semester") {
    // ================= LAPORAN GABUNGAN SATU SEMESTER =================
    document.getElementById("reportTypeTag").textContent = "Laporan Gabungan Semester";
    document.getElementById("reportPeriodTitle").textContent = semesterName === "ALL"
      ? "Semua Semester"
      : `Laporan ${semesterName}`;
    document.getElementById("colMonthHeader").style.display = "";

    const uniMonths = Array.isArray(userData.uniMonths) ? userData.uniMonths : [];
    const targetMonths = semesterName === "ALL"
      ? uniMonths
      : uniMonths.filter(m => String(m.semester) === semesterName);

    for (const m of targetMonths) {
      const mSnap = await getDoc(doc(db, "users", currentUser, "months", m.id));
      const cats = extractCategoriesFromDoc(mSnap.exists() ? mSnap.data() : {});
      cats.forEach(c => {
        if (!categoryMap[c.name]) categoryMap[c.name] = { budget: 0, expense: 0 };
        categoryMap[c.name].budget += Number(c.budget || 0);
      });

      const txSnap = await getDocs(collection(db, "users", currentUser, "months", m.id, "transactions"));
      txSnap.forEach(d => {
        const tx = d.data();
        allTransactions.push({
          ...tx,
          monthTag: `${m.month} ${m.year}`
        });
      });
    }
  } else {
    // ================= LAPORAN BULANAN =================
    if (!monthId) {
      window.location.href = `semester.html?user=${encodeURIComponent(currentUser)}`;
      return;
    }

    document.getElementById("reportTypeTag").textContent = "Laporan Kewangan Bulanan";
    document.getElementById("reportPeriodTitle").textContent = monthLabel || "Laporan Bulanan";

    const mSnap = await getDoc(doc(db, "users", currentUser, "months", monthId));
    const cats = extractCategoriesFromDoc(mSnap.exists() ? mSnap.data() : {});
    cats.forEach(c => {
      categoryMap[c.name] = { budget: Number(c.budget || 0), expense: 0 };
    });

    const txSnap = await getDocs(collection(db, "users", currentUser, "months", monthId, "transactions"));
    txSnap.forEach(d => {
      allTransactions.push(d.data());
    });
  }

  // Kira jumlah perbelanjaan setiap kategori
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
    categoryMap["Lain-lain"] = { budget: 0, expense: uncategorizedExpense };
  }

  // Kira metrik keseluruhan
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

  // Papar pada 4 Kad Metrik
  document.getElementById("repTotalBudget").textContent = `RM ${totalBudget.toFixed(2)}`;
  document.getElementById("repTotalExpense").textContent = `RM ${totalExpense.toFixed(2)}`;
  document.getElementById("repTopCategory").textContent = topCatName;
  document.getElementById("repTopCategoryAmt").textContent = `RM ${topCatAmt.toFixed(2)}`;
  document.getElementById("repUsagePct").textContent = `${totalPct}% Bajet Digunakan`;

  const balEl = document.getElementById("repTotalBalance");
  const statusEl = document.getElementById("reportStatusBadge");
  balEl.textContent = `RM ${totalBalance.toFixed(2)}`;

  if (totalBalance < 0) {
    balEl.className = "text-xl sm:text-2xl font-extrabold text-rose-400 mt-1.5";
    statusEl.textContent = "⚠️ Melebihi Bajet";
    statusEl.className = "text-base sm:text-lg font-extrabold text-rose-400 mt-0.5";
  } else {
    balEl.className = "text-xl sm:text-2xl font-extrabold text-emerald-400 mt-1.5";
    statusEl.textContent = "✅ Bajet Terkawal";
    statusEl.className = "text-base sm:text-lg font-extrabold text-emerald-400 mt-0.5";
  }

  // Render Jadual 1: Ringkasan Kategori
  const catBody = document.getElementById("repCategoryBody");
  if (categoryEntries.length === 0) {
    catBody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-slate-400">Tiada data kategori direkodkan.</td></tr>`;
  } else {
    catBody.innerHTML = categoryEntries.map(([name, vals]) => {
      const baki = vals.budget - vals.expense;
      const pct = vals.budget > 0 ? Math.round((vals.expense / vals.budget) * 100) : (vals.expense > 0 ? 100 : 0);
      const bakiColor = baki < 0 ? "text-rose-400 font-extrabold" : "text-emerald-400 font-extrabold";
      return `
        <tr>
          <td class="print-text-dark py-3.5 px-6 font-bold text-slate-100">${name}</td>
          <td class="print-text-muted py-3.5 px-6 text-right text-slate-400">${vals.budget.toFixed(2)}</td>
          <td class="print-text-dark py-3.5 px-6 text-right font-semibold text-white">${vals.expense.toFixed(2)}</td>
          <td class="py-3.5 px-6 text-right ${bakiColor}">${baki.toFixed(2)}</td>
          <td class="print-text-muted py-3.5 px-6 text-right text-slate-400 font-semibold">${pct}%</td>
        </tr>
      `;
    }).join("") + `
      <tr class="print-bg-light bg-slate-800/80 font-extrabold text-white border-t-2 border-slate-700">
        <td class="print-text-dark py-3.5 px-6">JUMLAH KESELURUHAN</td>
        <td class="print-text-dark py-3.5 px-6 text-right">${totalBudget.toFixed(2)}</td>
        <td class="py-3.5 px-6 text-right text-rose-400">${totalExpense.toFixed(2)}</td>
        <td class="py-3.5 px-6 text-right ${totalBalance < 0 ? 'text-rose-400' : 'text-emerald-400'}">${totalBalance.toFixed(2)}</td>
        <td class="print-text-dark py-3.5 px-6 text-right">${totalPct}%</td>
      </tr>
    `;
  }

  // Susun transaksi ikut tarikh (awal ke akhir bulan untuk penyata)
  allTransactions.sort((a, b) => {
    const dA = a.date || "";
    const dB = b.date || "";
    if (dA !== dB) return dA.localeCompare(dB);
    return (a.createdAt || 0) - (b.createdAt || 0);
  });

  // Render Jadual 2: Senarai Transaksi
  document.getElementById("repTxCount").textContent = `${allTransactions.length} transaksi`;
  const txBody = document.getElementById("repTransactionBody");
  const colSpan = mode === "semester" ? 7 : 6;

  if (allTransactions.length === 0) {
    txBody.innerHTML = `<tr><td colspan="${colSpan}" class="py-10 text-center text-slate-400">Tiada rekod perbelanjaan untuk tempoh ini.</td></tr>`;
  } else {
    txBody.innerHTML = allTransactions.map((tx, idx) => `
      <tr>
        <td class="print-text-muted py-3 px-4 text-xs font-bold text-slate-500">${idx + 1}</td>
        <td class="print-text-dark py-3 px-4 text-xs font-bold text-slate-300 whitespace-nowrap">${formatDisplayDate(tx.date)}</td>
        ${mode === "semester" ? `<td class="print-text-muted py-3 px-4 text-xs text-slate-400 whitespace-nowrap">${tx.monthTag || "-"}</td>` : ""}
        <td class="print-text-dark py-3 px-4 font-semibold text-slate-100">${tx.item}</td>
        <td class="print-text-muted py-3 px-4 text-xs font-bold text-indigo-300">${tx.category}</td>
        <td class="print-text-muted py-3 px-4 text-xs uppercase text-slate-400">${tx.place || "-"}</td>
        <td class="print-text-dark py-3 px-6 text-right font-bold text-white">${Number(tx.price).toFixed(2)}</td>
      </tr>
    `).join("") + `
      <tr class="print-bg-light bg-slate-800/80 font-extrabold text-white border-t border-slate-700">
        <td colspan="${colSpan - 1}" class="print-text-dark py-3.5 px-4 text-right text-xs uppercase tracking-wider text-slate-300">Jumlah Perbelanjaan</td>
        <td class="py-3.5 px-6 text-right text-rose-400">RM ${totalExpense.toFixed(2)}</td>
      </tr>
    `;
  }
}

generateReport();
