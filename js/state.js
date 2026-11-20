// =========================================================================
// TETAPAN GAMBAR LATAR BELAKANG (AUTO TUKAR IKUT PC ATAU PHONE)
// =========================================================================
const BG_PC_URL = "pc.jpg";
const BG_PHONE_URL = "phone.jpg";
const CUSTOM_BG_OPACITY = 0.16;

export function applyCodeBackground() {
  const bgLayer = document.getElementById("customBgLayer");
  if (!bgLayer) return;
  const isMobile = window.innerWidth <= 768;
  const selectedBg = isMobile ? BG_PHONE_URL : BG_PC_URL;

  if (selectedBg) {
    bgLayer.style.backgroundImage = `url('${selectedBg}')`;
    bgLayer.style.opacity = CUSTOM_BG_OPACITY;
  }
}

export function initBackground() {
  applyCodeBackground();
  window.addEventListener("resize", applyCodeBackground);
}

// =========================================================================
// HELPER TARIKH & PARAMETER URL
// =========================================================================
export function getTodayISO() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDisplayDate(isoStr) {
  if (!isoStr || typeof isoStr !== "string") return "-";
  const parts = isoStr.split("-");
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function getQueryParam(key) {
  const params = new URLSearchParams(window.location.search);
  return params.get(key);
}

// =========================================================================
// DATA DEFAULT & KONSTAN
// =========================================================================
export const DEFAULT_CATEGORIES = [
  { name: "Makan & Minum", budget: 300 },
  { name: "Pengangkutan", budget: 50 },
  { name: "Keperluan & Dobi", budget: 50 },
  { name: "Saving", budget: 70 },
  { name: "Emergency", budget: 30 }
];

export const DEFAULT_SEMESTERS = [
  "Sem 1", "Sem 2", "Sem 3", "Sem 4", "Sem 5", "Sem 6", "Sem 7", "Sem 8"
];

export function getInitialStudentMonths() {
  return [
    { id: "sem1_jan_2026", semester: "Sem 1", month: "January", year: "2026" }
  ];
}

export const INITIALS = { anisa: "AN", alya: "AL", bacirah: "BC" };
export const USERS = ["anisa", "alya", "bacirah"];

export function extractCategoriesFromDoc(data) {
  if (data && Array.isArray(data.categories) && data.categories.length > 0) {
    return data.categories;
  }
  return JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
}

export function applyAvatarToElement(el, userId, avatarDataUrl) {
  if (!el) return;
  if (avatarDataUrl) {
    el.style.backgroundImage = `url('${avatarDataUrl}')`;
    el.textContent = "";
  } else {
    el.style.backgroundImage = "";
    el.textContent = INITIALS[userId] || "U";
  }
}
