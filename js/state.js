import { ensureFirebaseAuth } from "./sambungan.js";

export const USERS = ["anisa", "alya", "bacirah"];
export const DEFAULT_SEMESTERS = ["Sem 1", "Sem 2", "Sem 3", "Sem 4", "Sem 5", "Sem 6", "Sem 7", "Sem 8"];

export const DEFAULT_CATEGORIES = [
  { name: "Makan & Minum", budget: 300 },
  { name: "Pengangkutan", budget: 50 },
  { name: "Keperluan & Dobi", budget: 50 },
  { name: "Saving", budget: 70 },
  { name: "Emergency", budget: 30 }
];

// =========================================================================
// KAWALAN SESI PIN & PENGESAHAN FIREBASE
// =========================================================================
export function isUserUnlocked(user) {
  if (!user) return false;
  return sessionStorage.getItem(`umm_unlocked_${user.toLowerCase()}`) === "true";
}

export function unlockUserSession(user) {
  if (!user) return;
  sessionStorage.setItem(`umm_unlocked_${user.toLowerCase()}`, "true");
}

export async function requireUserAccess(user) {
  if (!user || !USERS.includes(user) || !isUserUnlocked(user)) {
    window.location.href = "index.html";
    return false;
  }
  await ensureFirebaseAuth();
  return true;
}

// =========================================================================
// UTILITI PAPARAN & DATA
// =========================================================================
export function initBackground() {
  const bgLayer = document.getElementById("customBgLayer");
  if (bgLayer) {
    bgLayer.style.backgroundImage = `url("background.png")`;
    bgLayer.style.opacity = "0.24";
  }
}

export function getQueryParam(param) {
  return new URLSearchParams(window.location.search).get(param);
}

export function getTodayISO() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(isoStr) {
  if (!isoStr || !isoStr.includes("-")) return isoStr || "-";
  const parts = isoStr.split("-");
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function getInitialStudentMonths() {
  return [
    { id: "m_1", semester: "Sem 1", month: "January", year: "2026" }
  ];
}

export function extractCategoriesFromDoc(data) {
  if (!data || !Array.isArray(data.categories)) return [...DEFAULT_CATEGORIES];
  return data.categories.map(c => ({
    name: c.name || "Category",
    budget: Number(c.budget ?? c.bajet ?? 0)
  }));
}

export function applyAvatarToElement(el, user, avatarDataUrl) {
  if (!el) return;
  const initials = user === "anisa" ? "AN" : user === "alya" ? "AL" : "BC";
  if (avatarDataUrl) {
    el.style.backgroundImage = `url(${avatarDataUrl})`;
    el.textContent = "";
  } else {
    el.style.backgroundImage = "none";
    el.textContent = initials;
  }
}
