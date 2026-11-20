import { doc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./sambungan.js";

export function setupKategoriHandlers(getState, resetTabCallback) {
  let tempDraftCategories = [];

  window.openCategoryModal = function() {
    const { currentUser, currentMonthLabel, currentCategories } = getState();
    document.getElementById("modalMonthLabel").textContent = `${currentUser} • ${currentMonthLabel}`;
    tempDraftCategories = JSON.parse(JSON.stringify(currentCategories));
    renderEditableCategories();
    document.getElementById("categoryModal").classList.remove("hidden");
  };

  window.closeCategoryModal = function() {
    document.getElementById("categoryModal").classList.add("hidden");
  };

  function renderEditableCategories() {
    const container = document.getElementById("editableCategoriesList");
    container.innerHTML = tempDraftCategories.map((cat, idx) => `
      <div class="flex items-center gap-2 bg-slate-800/70 p-2.5 rounded-2xl border border-slate-700/70">
        <input type="text" value="${cat.name.replace(/"/g, '&quot;')}"
          onchange="updateDraftCatName(${idx}, this.value)"
          class="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-semibold text-white" />
        <div class="relative w-28">
          <span class="absolute left-2.5 top-2 text-xs font-bold text-slate-400">RM</span>
          <input type="number" step="0.01" value="${cat.budget}"
            onchange="updateDraftCatBudget(${idx}, this.value)"
            class="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-2.5 py-2 text-sm font-bold text-right text-white" />
        </div>
        <button type="button" onclick="removeDraftCategory(${idx})" class="p-2 rounded-xl text-rose-400 hover:bg-rose-500/10">🗑️</button>
      </div>
    `).join("");
  }

  window.updateDraftCatName = function(idx, val) {
    const trimmed = val.trim();
    if (trimmed) {
      tempDraftCategories[idx].oldName = tempDraftCategories[idx].oldName || tempDraftCategories[idx].name;
      tempDraftCategories[idx].name = trimmed;
    }
  };

  window.updateDraftCatBudget = function(idx, val) {
    tempDraftCategories[idx].budget = parseFloat(val) || 0;
  };

  window.removeDraftCategory = function(idx) {
    if (tempDraftCategories.length <= 1) {
      alert("Sekurang-kurangnya 1 kategori perlu dikekalkan.");
      return;
    }
    tempDraftCategories.splice(idx, 1);
    renderEditableCategories();
  };

  window.addNewCategoryRow = function() {
    const nameInput = document.getElementById("newCatName");
    const budgetInput = document.getElementById("newCatBudget");
    const name = nameInput.value.trim();
    const budget = parseFloat(budgetInput.value) || 0;
    if (!name) return alert("Sila masukkan nama kategori baharu.");
    if (tempDraftCategories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      return alert("Nama kategori ini sudah wujud!");
    }
    tempDraftCategories.push({ name, budget });
    nameInput.value = "";
    budgetInput.value = "";
    renderEditableCategories();
  };

  window.saveCategoryChanges = async function() {
    const { currentUser, currentMonthId, currentTransactions } = getState();
    if (!currentUser || !currentMonthId) return;

    for (const cat of tempDraftCategories) {
      if (cat.oldName && cat.oldName !== cat.name) {
        const matchingTxs = currentTransactions.filter(t => t.category === cat.oldName);
        for (const tx of matchingTxs) {
          await updateDoc(doc(db, "users", currentUser, "months", currentMonthId, "transactions", tx.id), {
            category: cat.name
          });
        }
      }
      delete cat.oldName;
    }

    await setDoc(doc(db, "users", currentUser, "months", currentMonthId), {
      categories: tempDraftCategories
    }, { merge: true });

    if (resetTabCallback) resetTabCallback();
    closeCategoryModal();
  };
}
