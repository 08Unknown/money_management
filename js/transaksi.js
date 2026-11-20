import {
  doc,
  getDocs,
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./sambungan.js";
import { getTodayISO } from "./state.js";

export function setupTransaksiHandlers(getState) {
  // TAMBAH REKOD (INSERT)
  window.addTransaction = async function(e) {
    e.preventDefault();
    const { currentUser, currentMonthId } = getState();
    if (!currentUser || !currentMonthId) return;

    const date = document.getElementById("txDate").value || getTodayISO();
    const category = document.getElementById("txCategory").value;
    const item = document.getElementById("txItem").value.trim();
    const price = parseFloat(document.getElementById("txPrice").value);
    const place = document.getElementById("txPlace").value.trim() || "-";

    await addDoc(collection(db, "users", currentUser, "months", currentMonthId, "transactions"), {
      date,
      category,
      item,
      price,
      place,
      createdAt: Date.now(),
      timestamp: serverTimestamp()
    });

    document.getElementById("transactionForm").reset();
    document.getElementById("txDate").value = date;
  };

  // BUKA MODAL EDIT
  window.openEditTxModal = function(txId) {
    const { currentTransactions, currentCategories } = getState();
    const tx = currentTransactions.find(t => t.id === txId);
    if (!tx) return;

    const catSelect = document.getElementById("editTxCategory");
    catSelect.innerHTML = currentCategories.map(c => `
      <option value="${c.name.replace(/"/g, '&quot;')}">${c.name}</option>
    `).join("");

    document.getElementById("editTxId").value = tx.id;
    document.getElementById("editTxDate").value = tx.date || getTodayISO();
    catSelect.value = tx.category;
    document.getElementById("editTxItem").value = tx.item;
    document.getElementById("editTxPrice").value = tx.price;
    document.getElementById("editTxPlace").value = tx.place === "-" ? "" : tx.place;

    document.getElementById("editTxModal").classList.remove("hidden");
  };

  window.closeEditTxModal = function() {
    document.getElementById("editTxModal").classList.add("hidden");
  };

  // KEMAS KINI REKOD (UPDATE)
  window.saveEditedTransaction = async function(e) {
    e.preventDefault();
    const { currentUser, currentMonthId } = getState();
    if (!currentUser || !currentMonthId) return;

    const txId = document.getElementById("editTxId").value;
    const date = document.getElementById("editTxDate").value || getTodayISO();
    const category = document.getElementById("editTxCategory").value;
    const item = document.getElementById("editTxItem").value.trim();
    const price = parseFloat(document.getElementById("editTxPrice").value);
    const place = document.getElementById("editTxPlace").value.trim() || "-";

    await updateDoc(doc(db, "users", currentUser, "months", currentMonthId, "transactions", txId), {
      date,
      category,
      item,
      price,
      place
    });

    closeEditTxModal();
  };

  // PADAM SATU REKOD (DELETE)
  window.deleteSingleFromEditModal = async function() {
    const { currentUser, currentMonthId } = getState();
    const txId = document.getElementById("editTxId").value;
    if (!txId || !confirm("Padam item perbelanjaan ini?")) return;
    await deleteDoc(doc(db, "users", currentUser, "months", currentMonthId, "transactions", txId));
    closeEditTxModal();
  };

  // PADAM SEMUA REKOD BULAN INI
  window.deleteAllTransactions = async function() {
    const { currentUser, currentMonthId, currentMonthLabel, currentTransactions } = getState();
    if (!currentUser || !currentMonthId) return;
    if (currentTransactions.length === 0) {
      alert("Tiada rekod untuk dipadam.");
      return;
    }
    const ok = confirm(
      `AMARAN: Semua (${currentTransactions.length}) rekod perbelanjaan bagi ${currentMonthLabel} akan dipadamkan. Teruskan?`
    );
    if (!ok) return;

    const snap = await getDocs(collection(db, "users", currentUser, "months", currentMonthId, "transactions"));
    for (const docSnap of snap.docs) {
      await deleteDoc(doc(db, "users", currentUser, "months", currentMonthId, "transactions", docSnap.id));
    }
  };
}
