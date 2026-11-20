import {
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  collection
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./sambungan.js";
import { getTodayISO } from "./state.js";

export function setupTransaksiHandlers(getState) {
  window.addTransaction = async function(e) {
    e.preventDefault();
    const { currentUser, currentMonthId } = getState();

    const dateVal = document.getElementById("txDate").value || getTodayISO();
    const category = document.getElementById("txCategory").value;
    const item = document.getElementById("txItem").value.trim();
    const price = parseFloat(document.getElementById("txPrice").value);
    const place = document.getElementById("txPlace").value.trim();

    if (!item || isNaN(price) || price <= 0) return;

    await addDoc(collection(db, "users", currentUser, "months", currentMonthId, "transactions"), {
      date: dateVal,
      category,
      item,
      price,
      place,
      createdAt: Date.now()
    });

    document.getElementById("txItem").value = "";
    document.getElementById("txPrice").value = "";
    document.getElementById("txPlace").value = "";
  };

  window.openEditTxModal = function(txId) {
    const { currentCategories, currentTransactions } = getState();
    const tx = currentTransactions.find(t => t.id === txId);
    if (!tx) return;

    const select = document.getElementById("editTxCategory");
    select.innerHTML = currentCategories.map(c => `<option value="${c.name.replace(/"/g, '&quot;')}">${c.name}</option>`).join("");
    if (!currentCategories.some(c => c.name === tx.category)) {
      const opt = document.createElement("option");
      opt.value = tx.category;
      opt.textContent = tx.category;
      select.appendChild(opt);
    }

    document.getElementById("editTxId").value = tx.id;
    document.getElementById("editTxDate").value = tx.date || getTodayISO();
    select.value = tx.category;
    document.getElementById("editTxItem").value = tx.item;
    document.getElementById("editTxPrice").value = tx.price;
    document.getElementById("editTxPlace").value = tx.place || "";
    document.getElementById("editTxModal").classList.remove("hidden");
  };

  window.closeEditTxModal = function() {
    document.getElementById("editTxModal").classList.add("hidden");
  };

  window.saveEditedTransaction = async function(e) {
    e.preventDefault();
    const { currentUser, currentMonthId } = getState();

    const txId = document.getElementById("editTxId").value;
    const dateVal = document.getElementById("editTxDate").value;
    const category = document.getElementById("editTxCategory").value;
    const item = document.getElementById("editTxItem").value.trim();
    const price = parseFloat(document.getElementById("editTxPrice").value);
    const place = document.getElementById("editTxPlace").value.trim();

    if (!txId || !item || isNaN(price) || price <= 0) return;

    await updateDoc(doc(db, "users", currentUser, "months", currentMonthId, "transactions", txId), {
      date: dateVal,
      category,
      item,
      price,
      place
    });

    window.closeEditTxModal();
  };

  window.deleteSingleFromEditModal = async function() {
    const { currentUser, currentMonthId } = getState();
    const txId = document.getElementById("editTxId").value;
    if (!txId) return;
    if (!confirm("Delete this expense item?")) return;

    await deleteDoc(doc(db, "users", currentUser, "months", currentMonthId, "transactions", txId));
    window.closeEditTxModal();
  };

  window.deleteAllTransactions = async function() {
    const { currentUser, currentMonthId, currentMonthLabel, currentTransactions } = getState();
    if (currentTransactions.length === 0) return alert("There are no records to delete.");
    if (!confirm(`Delete ALL (${currentTransactions.length}) expense records for ${currentMonthLabel}?`)) return;

    for (const tx of currentTransactions) {
      await deleteDoc(doc(db, "users", currentUser, "months", currentMonthId, "transactions", tx.id));
    }
  };
}
