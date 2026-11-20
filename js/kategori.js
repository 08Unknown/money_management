import {
  doc,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./sambungan.js";

export function setupKategoriHandlers(getState, resetTabCallback) {
  let tempEditableCategories = [];

  window.openCategoryModal = function() {
    const { currentCategories, currentMonthLabel } = getState();
    document.getElementById("modalMonthLabel").textContent = currentMonthLabel;
    tempEditableCategories = currentCategories.map(c => ({ oldName: c.name, name: c.name, budget: c.budget }));
    renderEditableCategories();
    document.getElementById("categoryModal").classList.remove("hidden");
  };

  window.closeCategoryModal = function() {
    document.getElementById("categoryModal").classList.add("hidden");
  };

  function renderEditableCategories() {
    const container = document.getElementById("editableCategoriesList");
    container.innerHTML = tempEditableCategories.map((cat, idx) => `
      <div class="flex items-center gap-2 bg-slate-800/70 p-2.5 rounded-2xl border border-slate-700/70">
        <input type="text" value="${cat.name.replace(/"/g, '&quot;')}" onchange="updateTempCatName(${idx}, this.value)"
          class="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-semibold text-white" />
        <div class="flex items-center bg-slate-900 border border-slate-700 rounded-xl px-2.5">
          <span class="text-xs font-bold text-slate-400 mr-1">RM</span>
          <input type="number" step="0.01" value="${cat.budget}" onchange="updateTempCatBudget(${idx}, this.value)"
            class="w-20 py-2 text-sm font-bold text-right bg-transparent focus:outline-none text-white" />
        </div>
        <button type="button" onclick="removeCategoryRow(${idx})" title="Delete Category" class="p-2 rounded-xl text-rose-400 hover:bg-rose-500/10">🗑️</button>
      </div>
    `).join("");
  }

  window.updateTempCatName = function(idx, val) {
    const trimmed = val.trim();
    if (trimmed) tempEditableCategories[idx].name = trimmed;
  };

  window.updateTempCatBudget = function(idx, val) {
    tempEditableCategories[idx].budget = parseFloat(val) || 0;
  };

  window.removeCategoryRow = function(idx) {
    if (tempEditableCategories.length <= 1) {
      alert("At least 1 category must be kept.");
      return;
    }
    tempEditableCategories.splice(idx, 1);
    renderEditableCategories();
  };

  window.addNewCategoryRow = function() {
    const nameInput = document.getElementById("newCatName");
    const budgetInput = document.getElementById("newCatBudget");
    const name = nameInput.value.trim();
    const budget = parseFloat(budgetInput.value) || 0;
    if (!name) return alert("Please enter a category name.");
    if (tempEditableCategories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      return alert("This category already exists.");
    }
    tempEditableCategories.push({ oldName: null, name, budget });
    nameInput.value = "";
    budgetInput.value = "";
    renderEditableCategories();
  };

  window.saveCategoryChanges = async function() {
    const { currentUser, currentMonthId, currentTransactions } = getState();

    const cleaned = tempEditableCategories.map(c => ({ name: c.name.trim(), budget: Number(c.budget) || 0 }));
    for (const item of tempEditableCategories) {
      if (item.oldName && item.oldName !== item.name) {
        for (const tx of currentTransactions) {
          if (tx.category === item.oldName) {
            await updateDoc(doc(db, "users", currentUser, "months", currentMonthId, "transactions", tx.id), {
              category: item.name
            });
          }
        }
      }
    }

    await setDoc(doc(db, "users", currentUser, "months", currentMonthId), { categories: cleaned }, { merge: true });
    if (resetTabCallback) resetTabCallback();
    window.closeCategoryModal();
  };
}
