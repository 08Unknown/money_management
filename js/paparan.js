import {
  doc,
  setDoc,
  getDoc,
  collection,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./sambungan.js";
import {
  initBackground,
  getQueryParam,
  getTodayISO,
  formatDisplayDate,
  USERS,
  DEFAULT_CATEGORIES,
  extractCategoriesFromDoc,
  applyAvatarToElement
} from "./state.js";
import { setupTransaksiHandlers } from "./transaksi.js";
import { setupKategoriHandlers } from "./kategori.js";

initBackground();

const currentUser = getQueryParam("user");
const currentMonthId = getQueryParam("month");
const currentMonthLabel = getQueryParam("label") || "Rekod Bulanan";

if (!currentUser || !USERS.includes(currentUser) || !currentMonthId) {
  window.location.href = "index.html";
}

let currentTab = "ALL";
let currentCategories = [...DEFAULT_CATEGORIES];
let currentTransactions = [];

function getState() {
  return {
    currentUser,
    currentMonthId,
    currentMonthLabel,
    currentCategories,
    currentTransactions
  };
}

setupTransaksiHandlers(getState);
setupKategoriHandlers(getState, () => {
  currentTab = "ALL";
});

document.getElementById("userTitle").textContent = currentUser;
document.getElementById("activeMonthBadge").textContent = currentMonthLabel;
document.getElementById("backToMonthsBtn").href = `semester.html?user=${encodeURIComponent(currentUser)}`;
document.getElementById("txDate").value = getTodayISO();

// =========================================================================
// 3 BAR MENU SWITCHER (PADAT & SEBARIS)
// =========================================================================
window.switchMainMenu = function(menuKey) {
  const menus = ["summary", "record", "list"];

  menus.forEach(m => {
    const sec = document.getElementById(`section-${m}`);
    const btn = document.getElementById(`menuBtn-${m}`);
    if (m === menuKey) {
      sec.classList.remove("hidden");
      btn.className = "py-2 px-2 sm:px-4 rounded-xl text-[11px] sm:text-xs font-extrabold transition flex items-center justify-center gap-1.5 text-center leading-tight bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md";
    } else {
      sec.classList.add("hidden");
      btn.className = "py-2 px-2 sm:px-4 rounded-xl text-[11px] sm:text-xs font-extrabold transition flex items-center justify-center gap-1.5 text-center leading-tight text-slate-300 hover:bg-slate-800";
    }
  });
};

window.setTab = function(tabName) {
  currentTab = tabName;
  renderTabs();
  renderAllListTable();
};

function renderTabs() {
  const tabsContainer = document.getElementById("filterTabs");
  const allTabs = ["ALL", ...currentCategories.map(c => c.name)];
  tabsContainer.innerHTML = allTabs.map(tab => {
    const isActive = currentTab === tab;
    const label = tab === "ALL" ? "Semua" : tab;
    const activeClass = "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xs";
    const inactiveClass = "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700";
    return `<button onclick="setTab('${tab.replace(/'/g, "\\'")}')" class="px-3 py-1 rounded-lg text-xs font-bold transition ${isActive ? activeClass : inactiveClass}">${label}</button>`;
  }).join("");
}

function renderCategoryDropdown() {
  const select = document.getElementById("txCategory");
  const prevVal = select.value;
  select.innerHTML = currentCategories.map(c => `<option value="${c.name.replace(/"/g, '&quot;')}">${c.name}</option>`).join("");
  if (currentCategories.some(c => c.name === prevVal)) select.value = prevVal;
}

function renderDashboard() {
  renderCategoryDropdown();
  renderTabs();

  const expenseByCat = {};
  currentCategories.forEach(c => expenseByCat[c.name] = 0);

  let uncategorizedExpense = 0;
  currentTransactions.forEach(tx => {
    const price = Number(tx.price || 0);
    if (expenseByCat[tx.category] !== undefined) expenseByCat[tx.category] += price;
    else uncategorizedExpense += price;
  });

  let totalBudget = 0;
  let totalExpense = uncategorizedExpense;
  let summaryHTML = "";

  currentCategories.forEach(cat => {
    const bajet = Number(cat.budget || 0);
    const expense = Number(expenseByCat[cat.name] || 0);
    const baki = bajet - expense;
    totalBudget += bajet;
    totalExpense += expense;

    const pct = bajet > 0 ? Math.min(100, Math.round((expense / bajet) * 100)) : (expense > 0 ? 100 : 0);
    const barColor = baki < 0 ? "bg-rose-500" : pct > 80 ? "bg-amber-500" : "bg-gradient-to-r from-emerald-400 to-teal-500";
    const bakiColor = baki < 0 ? "text-rose-400 font-extrabold" : "text-emerald-400 font-extrabold";

    summaryHTML += `
      <tr class="hover:bg-slate-800/40 transition">
        <td class="py-2.5 px-5 font-bold text-slate-100">${cat.name}</td>
        <td class="py-2.5 px-5 text-right text-slate-400 font-medium">${bajet.toFixed(2)}</td>
        <td class="py-2.5 px-5 text-right text-white font-semibold">${expense.toFixed(2)}</td>
        <td class="py-2.5 px-5 text-right ${bakiColor}">${baki.toFixed(2)}</td>
        <td class="py-2.5 px-5">
          <div class="flex items-center gap-2">
            <div class="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div class="${barColor} h-1.5 rounded-full transition-all duration-500" style="width: ${pct}%"></div>
            </div>
            <span class="text-[11px] font-semibold text-slate-400 w-9 text-right">${pct}%</span>
          </div>
        </td>
      </tr>
    `;
  });

  const totalBalance = totalBudget - totalExpense;
  summaryHTML += `
    <tr class="bg-slate-800/80 font-extrabold text-white border-t-2 border-slate-700">
      <td class="py-2.5 px-5">JUMLAH KESELURUHAN</td>
      <td class="py-2.5 px-5 text-right">${totalBudget.toFixed(2)}</td>
      <td class="py-2.5 px-5 text-right text-rose-400">${totalExpense.toFixed(2)}</td>
      <td class="py-2.5 px-5 text-right ${totalBalance < 0 ? 'text-rose-400' : 'text-emerald-400'}">${totalBalance.toFixed(2)}</td>
      <td class="py-2.5 px-5 text-[11px] text-slate-400 font-semibold">Semua Kategori</td>
    </tr>
  `;

  document.getElementById("categorySummaryBody").innerHTML = summaryHTML;
  document.getElementById("totalBudgetDisplay").textContent = `RM ${totalBudget.toFixed(2)}`;
  document.getElementById("totalExpenseDisplay").textContent = `RM ${totalExpense.toFixed(2)}`;

  const balanceEl = document.getElementById("totalBalanceDisplay");
  const balanceIconEl = document.getElementById("totalBalanceIcon");
  balanceEl.textContent = `RM ${totalBalance.toFixed(2)}`;
  if (totalBalance < 0) {
    balanceEl.className = "text-lg sm:text-2xl font-extrabold text-rose-400";
    if (balanceIconEl) balanceIconEl.className = "w-7 h-7 rounded-xl bg-rose-500/15 text-rose-400 hidden sm:flex items-center justify-center text-sm";
  } else {
    balanceEl.className = "text-lg sm:text-2xl font-extrabold text-emerald-400";
    if (balanceIconEl) balanceIconEl.className = "w-7 h-7 rounded-xl bg-emerald-500/15 text-emerald-400 hidden sm:flex items-center justify-center text-sm";
  }

  renderRecordManageTable();
  renderAllListTable();
}

function renderRecordManageTable() {
  const tbody = document.getElementById("recordManageTableBody");
  if (currentTransactions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-10 text-center text-slate-400 text-xs sm:text-sm">
          Tiada rekod transaksi untuk ${currentMonthLabel}. Pilih tarikh & tambah rekod baharu di sebelah kiri!
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = currentTransactions.map(tx => `
    <tr class="hover:bg-slate-800/40 transition">
      <td class="py-2.5 px-4 text-xs font-bold text-slate-300 whitespace-nowrap">${formatDisplayDate(tx.date)}</td>
      <td class="py-2.5 px-4 font-semibold text-slate-100">${tx.item}</td>
      <td class="py-2.5 px-4">
        <span class="text-[11px] px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 font-bold whitespace-nowrap">
          ${tx.category}
        </span>
      </td>
      <td class="py-2.5 px-4 text-slate-400 text-xs uppercase font-medium">${tx.place || "-"}</td>
      <td class="py-2.5 px-4 text-right font-bold text-white">${Number(tx.price).toFixed(2)}</td>
      <td class="py-2.5 px-4 text-center">
        <button onclick="openEditTxModal('${tx.id}')" class="text-xs text-indigo-300 hover:text-white font-bold px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-600 transition whitespace-nowrap">
          ✏️ Edit
        </button>
      </td>
    </tr>
  `).join("");
}

window.renderAllListTable = function() {
  const searchQuery = (document.getElementById("searchTxInput")?.value || "").toLowerCase().trim();
  const filtered = currentTransactions.filter(tx => {
    const displayDate = formatDisplayDate(tx.date);
    const matchCat = currentTab === "ALL" || tx.category === currentTab;
    const matchSearch = !searchQuery ||
      displayDate.toLowerCase().includes(searchQuery) ||
      (tx.date || "").toLowerCase().includes(searchQuery) ||
      (tx.item || "").toLowerCase().includes(searchQuery) ||
      (tx.place || "").toLowerCase().includes(searchQuery) ||
      (tx.category || "").toLowerCase().includes(searchQuery);
    return matchCat && matchSearch;
  });

  document.getElementById("recordCount").textContent = `${filtered.length} rekod`;
  const tbody = document.getElementById("allListTableBody");

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-10 text-center text-slate-400 text-xs sm:text-sm">
          Tiada rekod perbelanjaan ditemui untuk paparan ini.
        </td>
      </tr>
    `;
    return;
  }

  const totalFiltered = filtered.reduce((sum, t) => sum + Number(t.price || 0), 0);

  tbody.innerHTML = filtered.map((tx, index) => `
    <tr class="hover:bg-slate-800/40 transition">
      <td class="py-2.5 px-4 text-slate-500 text-xs font-bold">${index + 1}</td>
      <td class="py-2.5 px-4 text-xs font-bold text-slate-300 whitespace-nowrap">${formatDisplayDate(tx.date)}</td>
      <td class="py-2.5 px-4 font-semibold text-slate-100">${tx.item}</td>
      <td class="py-2.5 px-4">
        <span class="text-[11px] px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 font-bold whitespace-nowrap">
          ${tx.category}
        </span>
      </td>
      <td class="py-2.5 px-4 text-slate-400 text-xs uppercase font-medium">${tx.place || "-"}</td>
      <td class="py-2.5 px-5 text-right font-bold text-white">${Number(tx.price).toFixed(2)}</td>
    </tr>
  `).join("") + `
    <tr class="bg-slate-800/80 font-extrabold text-white border-t border-slate-700">
      <td colspan="5" class="py-2.5 px-4 text-right text-xs uppercase tracking-wider text-slate-300">Jumlah Dipaparkan</td>
      <td class="py-2.5 px-5 text-right text-rose-400">RM ${totalFiltered.toFixed(2)}</td>
    </tr>
  `;
};

// =========================================================================
// MUAT DATA REALTIME DARI FIREBASE
// =========================================================================
async function initDashboard() {
  onSnapshot(doc(db, "users", currentUser), (uSnap) => {
    const data = uSnap.exists() ? uSnap.data() : {};
    applyAvatarToElement(document.getElementById("avatar-dash"), currentUser, data.avatar || null);
  });

  const monthDocRef = doc(db, "users", currentUser, "months", currentMonthId);
  const snap = await getDoc(monthDocRef);
  if (!snap.exists()) {
    await setDoc(monthDocRef, { categories: DEFAULT_CATEGORIES });
  }

  onSnapshot(monthDocRef, (docSnap) => {
    const data = docSnap.exists() ? docSnap.data() : {};
    currentCategories = extractCategoriesFromDoc(data);
    renderDashboard();
  });

  onSnapshot(collection(db, "users", currentUser, "months", currentMonthId, "transactions"), (querySnap) => {
    currentTransactions = [];
    querySnap.forEach((docItem) => {
      currentTransactions.push({ id: docItem.id, ...docItem.data() });
    });
    currentTransactions.sort((a, b) => {
      const dateA = a.date || "";
      const dateB = b.date || "";
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    renderDashboard();
  });
}

initDashboard();
