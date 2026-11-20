import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  deleteDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./sambungan.js";
import {
  initBackground,
  getQueryParam,
  USERS,
  DEFAULT_SEMESTERS,
  getInitialStudentMonths,
  extractCategoriesFromDoc,
  applyAvatarToElement
} from "./state.js";

initBackground();

const currentUser = getQueryParam("user");
if (!currentUser || !USERS.includes(currentUser)) {
  window.location.href = "index.html";
}

let currentUserSemesters = [...DEFAULT_SEMESTERS];
let currentUserMonths = [];
let tempDraftSemesters = [];

document.getElementById("monthViewUserTitle").textContent = currentUser;

async function initUserSemesterPage() {
  const userRef = doc(db, "users", currentUser);
  const snap = await getDoc(userRef);
  const updates = {};

  if (!snap.exists() || !Array.isArray(snap.data().uniMonths)) {
    updates.uniMonths = getInitialStudentMonths();
  }
  if (!snap.exists() || !Array.isArray(snap.data().semesterOptions) || snap.data().semesterOptions.length === 0) {
    updates.semesterOptions = [...DEFAULT_SEMESTERS];
  }
  if (Object.keys(updates).length > 0) {
    await setDoc(userRef, updates, { merge: true });
  }

  onSnapshot(userRef, (docSnap) => {
    const data = docSnap.exists() ? docSnap.data() : {};
    applyAvatarToElement(document.getElementById("avatar-month-view"), currentUser, data.avatar || null);

    currentUserMonths = Array.isArray(data.uniMonths) ? data.uniMonths : getInitialStudentMonths();
    currentUserSemesters = (Array.isArray(data.semesterOptions) && data.semesterOptions.length > 0)
      ? data.semesterOptions
      : [...DEFAULT_SEMESTERS];

    populateSemesterDropdown();
    updateSemFilterDropdown();
    renderMonthCards();
  });
}

function populateSemesterDropdown() {
  const select = document.getElementById("selectSemesterDropdown");
  if (!select) return;
  const prevVal = select.value;
  select.innerHTML = currentUserSemesters.map(sem =>
    `<option value="${sem.replace(/"/g, '&quot;')}">${sem}</option>`
  ).join("");
  if (currentUserSemesters.includes(prevVal)) {
    select.value = prevVal;
  }
}

function updateSemFilterDropdown() {
  const select = document.getElementById("semFilterSelect");
  const prevVal = select.value;
  const semesters = [...new Set([
    ...currentUserSemesters,
    ...currentUserMonths.map(m => String(m.semester || "").trim()).filter(Boolean)
  ])];

  select.innerHTML = `<option value="ALL">Semua Semester (${currentUserMonths.length})</option>` +
    semesters.map(s => `<option value="${s.replace(/"/g, '&quot;')}">${s}</option>`).join("");

  if (prevVal === "ALL" || semesters.includes(prevVal)) {
    select.value = prevVal;
  } else {
    select.value = "ALL";
  }
}

window.renderMonthCards = async function() {
  const selectedSem = document.getElementById("semFilterSelect").value;
  const grid = document.getElementById("monthsGrid");

  const visibleMonths = selectedSem === "ALL"
    ? currentUserMonths
    : currentUserMonths.filter(m => String(m.semester) === selectedSem);

  if (visibleMonths.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full glass-card bg-slate-900/80 border border-slate-800 rounded-3xl p-10 text-center">
        <p class="text-slate-400 text-sm mb-3">Tiada rekod semester & bulan dijumpai. Klik <strong>+ Tambah Bulan</strong> di atas.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = visibleMonths.map(m => {
    const semText = m.semester || "Sem 1";
    const fullLabel = `${semText} • ${m.month} ${m.year}`.trim();
    const safeLabel = fullLabel.replace(/'/g, "\\'");
    return `
      <div onclick="selectMonth('${m.id}', '${safeLabel}')" class="group relative glass-card bg-slate-900/80 hover:bg-slate-800/90 rounded-2xl border border-slate-800 hover:border-indigo-500/50 p-5 cursor-pointer transition-all hover:-translate-y-1 shadow-sm">
        <div class="flex items-center justify-between gap-2 mb-3">
          <span class="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-300 truncate">
            ${semText}
          </span>
          <div class="flex items-center gap-1.5 shrink-0">
            <button type="button" onclick="openMonthReport(event, '${m.id}', '${safeLabel}')" title="Lihat Report Bulanan" class="w-7 h-7 rounded-lg bg-slate-800 hover:bg-emerald-600 text-emerald-300 hover:text-white flex items-center justify-center text-xs transition border border-slate-700">
              📄
            </button>
            <button type="button" onclick="openEditMonthModal(event, '${m.id}')" title="Edit Semester / Bulan / Tahun" class="w-7 h-7 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white flex items-center justify-center text-xs transition border border-slate-700">
              ✏️
            </button>
          </div>
        </div>
        <h3 class="text-lg font-extrabold text-white leading-snug">${m.month} ${m.year}</h3>
        <p id="month-preview-${m.id}" class="text-xs text-slate-400 mt-1.5 font-medium">Klik untuk urus bajet</p>
      </div>
    `;
  }).join("");

  for (const m of visibleMonths) {
    const mSnap = await getDoc(doc(db, "users", currentUser, "months", m.id));
    if (mSnap.exists()) {
      const cats = extractCategoriesFromDoc(mSnap.data());
      const totB = cats.reduce((sum, c) => sum + Number(c.budget || 0), 0);
      const txSnap = await getDocs(collection(db, "users", currentUser, "months", m.id, "transactions"));
      let exp = 0;
      txSnap.forEach(d => exp += Number(d.data().price || 0));
      const bal = totB - exp;
      const balColorClass = bal < 0 ? "text-rose-400" : "text-emerald-400";
      const previewEl = document.getElementById(`month-preview-${m.id}`);
      if (previewEl) {
        previewEl.innerHTML = `Baki: <span class="${balColorClass} font-bold">RM ${bal.toFixed(2)}</span>`;
      }
    }
  }
};

window.selectMonth = function(monthId, monthLabel) {
  window.location.href = `dashboard.html?user=${encodeURIComponent(currentUser)}&month=${encodeURIComponent(monthId)}&label=${encodeURIComponent(monthLabel)}`;
};

window.openMonthReport = function(event, monthId, monthLabel) {
  if (event) event.stopPropagation();
  window.location.href = `report.html?user=${encodeURIComponent(currentUser)}&mode=month&month=${encodeURIComponent(monthId)}&label=${encodeURIComponent(monthLabel)}`;
};

window.openSemesterReport = function() {
  const selectedSem = document.getElementById("semFilterSelect").value;
  window.location.href = `report.html?user=${encodeURIComponent(currentUser)}&mode=semester&sem=${encodeURIComponent(selectedSem)}`;
};

// =========================================================================
// MODAL URUS SENARAI SEMESTER
// =========================================================================
window.openSemesterManagerModal = function() {
  tempDraftSemesters = currentUserSemesters.map(s => ({ oldName: s, name: s }));
  renderEditableSemesters();
  document.getElementById("semesterManagerModal").classList.remove("hidden");
};

window.closeSemesterManagerModal = function() {
  document.getElementById("semesterManagerModal").classList.add("hidden");
};

function renderEditableSemesters() {
  const container = document.getElementById("editableSemestersList");
  container.innerHTML = tempDraftSemesters.map((item, idx) => `
    <div class="flex items-center gap-2 bg-slate-800/70 p-2 rounded-2xl border border-slate-700/70">
      <input type="text" value="${item.name.replace(/"/g, '&quot;')}"
        onchange="updateDraftSemesterName(${idx}, this.value)"
        class="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-semibold text-white" />
      <button type="button" onclick="removeDraftSemester(${idx})" title="Padam Semester" class="p-2 rounded-xl text-rose-400 hover:bg-rose-500/10">🗑️</button>
    </div>
  `).join("");
}

window.updateDraftSemesterName = function(idx, val) {
  const trimmed = val.trim();
  if (trimmed) tempDraftSemesters[idx].name = trimmed;
};

window.removeDraftSemester = function(idx) {
  if (tempDraftSemesters.length <= 1) {
    alert("Sekurang-kurangnya 1 pilihan semester perlu dikekalkan.");
    return;
  }
  tempDraftSemesters.splice(idx, 1);
  renderEditableSemesters();
};

window.addSemesterOption = function() {
  const input = document.getElementById("newSemesterInput");
  const val = input.value.trim();
  if (!val) return alert("Sila masukkan nama semester baharu.");
  if (tempDraftSemesters.some(s => s.name.toLowerCase() === val.toLowerCase())) {
    return alert("Nama semester ini sudah ada dalam senarai.");
  }
  tempDraftSemesters.push({ oldName: null, name: val });
  input.value = "";
  renderEditableSemesters();
};

window.saveSemesterOptions = async function() {
  const updatedSemList = tempDraftSemesters.map(s => s.name);
  const updatedMonths = currentUserMonths.map(m => {
    const match = tempDraftSemesters.find(s => s.oldName && s.oldName === m.semester && s.oldName !== s.name);
    return match ? { ...m, semester: match.name } : m;
  });

  await setDoc(doc(db, "users", currentUser), {
    semesterOptions: updatedSemList,
    uniMonths: updatedMonths
  }, { merge: true });

  closeSemesterManagerModal();
};

// =========================================================================
// MODAL TAMBAH / EDIT / PADAM KAD BULAN
// =========================================================================
window.openAddMonthModal = function() {
  populateSemesterDropdown();
  document.getElementById("monthModalTitle").textContent = "Tambah Bulan Baharu";
  document.getElementById("editMonthId").value = "";
  if (currentUserSemesters.length > 0) {
    document.getElementById("selectSemesterDropdown").value = currentUserSemesters[0];
  }
  document.getElementById("selectMonthName").value = "January";
  document.getElementById("inputMonthYear").value = new Date().getFullYear();
  document.getElementById("deleteMonthBtn").classList.add("hidden");
  document.getElementById("monthFormModal").classList.remove("hidden");
};

window.openEditMonthModal = function(event, monthId) {
  if (event) event.stopPropagation();
  const target = currentUserMonths.find(m => m.id === monthId);
  if (!target) return;

  populateSemesterDropdown();
  const semSelect = document.getElementById("selectSemesterDropdown");
  if (target.semester && !currentUserSemesters.includes(target.semester)) {
    const opt = document.createElement("option");
    opt.value = target.semester;
    opt.textContent = target.semester;
    semSelect.appendChild(opt);
  }

  document.getElementById("monthModalTitle").textContent = "Edit Semester, Bulan & Tahun";
  document.getElementById("editMonthId").value = target.id;
  semSelect.value = target.semester || currentUserSemesters[0];
  document.getElementById("selectMonthName").value = target.month || "January";
  document.getElementById("inputMonthYear").value = target.year || "";
  document.getElementById("deleteMonthBtn").classList.remove("hidden");
  document.getElementById("monthFormModal").classList.remove("hidden");
};

window.closeMonthModal = function() {
  document.getElementById("monthFormModal").classList.add("hidden");
};

window.saveMonthItem = async function(e) {
  e.preventDefault();
  const editId = document.getElementById("editMonthId").value;
  const semester = document.getElementById("selectSemesterDropdown").value;
  const month = document.getElementById("selectMonthName").value;
  const year = document.getElementById("inputMonthYear").value.trim();
  if (!semester || !month || !year) return;

  const updatedList = [...currentUserMonths];
  if (editId) {
    const idx = updatedList.findIndex(m => m.id === editId);
    if (idx !== -1) updatedList[idx] = { ...updatedList[idx], semester, month, year };
  } else {
    const newId = `m_${Date.now()}`;
    updatedList.push({ id: newId, semester, month, year });
  }

  await setDoc(doc(db, "users", currentUser), { uniMonths: updatedList }, { merge: true });
  closeMonthModal();
};

window.deleteMonthFromModal = async function() {
  const editId = document.getElementById("editMonthId").value;
  if (!editId) return;

  if (currentUserMonths.length <= 1) {
    alert("Sekurang-kurangnya 1 rekod bulan perlu dikekalkan.");
    return;
  }

  if (!confirm("Padam kad semester & bulan ini? (Semua transaksi di dalamnya juga akan dipadam)")) return;

  const updatedList = currentUserMonths.filter(m => m.id !== editId);
  await setDoc(doc(db, "users", currentUser), { uniMonths: updatedList }, { merge: true });

  const txSnap = await getDocs(collection(db, "users", currentUser, "months", editId, "transactions"));
  for (const d of txSnap.docs) {
    await deleteDoc(doc(db, "users", currentUser, "months", editId, "transactions", d.id));
  }
  await deleteDoc(doc(db, "users", currentUser, "months", editId));

  closeMonthModal();
};

initUserSemesterPage();
