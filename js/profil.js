import { doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db, ensureFirebaseAuth } from "./sambungan.js";
import {
  initBackground,
  USERS,
  applyAvatarToElement,
  isUserUnlocked,
  unlockUserSession
} from "./state.js";

initBackground();

const userAvatars = { anisa: null, alya: null, bacirah: null };
const userPins = { anisa: null, alya: null, bacirah: null };

let pendingUser = null;
let pendingAction = null; // "openProfile" or "openAvatar"
let isSettingNewPin = false;

let cropTargetUser = null;
let cropImg = null;
let cropZoom = 1;
let cropOffsetX = 0;
let cropOffsetY = 0;
let isDraggingCrop = false;
let dragStartX = 0;
let dragStartY = 0;

async function initProfiles() {
  await ensureFirebaseAuth();

  USERS.forEach(user => {
    onSnapshot(doc(db, "users", user), (docSnap) => {
      const data = docSnap.exists() ? docSnap.data() : {};
      userAvatars[user] = data.avatar || null;
      userPins[user] = data.pin || null;
      applyAvatarToElement(document.getElementById(`avatar-home-${user}`), user, userAvatars[user]);
    });
  });
}

// =========================================================================
// PIN GATEWAY (VERIFY OR SET 4-DIGIT PIN IN FIREBASE)
// =========================================================================
async function requestProfileAccess(user, actionType) {
  if (isUserUnlocked(user)) {
    executeUnlockedAction(user, actionType);
    return;
  }

  await ensureFirebaseAuth();
  const snap = await getDoc(doc(db, "users", user));
  const savedPin = snap.exists() ? (snap.data().pin || null) : null;
  userPins[user] = savedPin;

  pendingUser = user;
  pendingAction = actionType;
  isSettingNewPin = !savedPin;

  const titleEl = document.getElementById("pinModalTitle");
  const subtitleEl = document.getElementById("pinModalSubtitle");
  const confirmGroup = document.getElementById("pinConfirmGroup");
  const submitBtn = document.getElementById("pinSubmitBtn");
  const errorEl = document.getElementById("pinErrorMsg");

  document.getElementById("pinCodeInput").value = "";
  document.getElementById("pinConfirmInput").value = "";
  errorEl.classList.add("hidden");

  if (isSettingNewPin) {
    titleEl.textContent = "Create 4-Digit PIN";
    subtitleEl.innerHTML = `First-time setup for <strong class="text-white capitalize">${user}</strong>. Set a 4-digit PIN to protect your records.`;
    confirmGroup.classList.remove("hidden");
    document.getElementById("pinConfirmInput").required = true;
    submitBtn.textContent = "Save PIN & Enter";
  } else {
    titleEl.textContent = "Enter Profile PIN";
    subtitleEl.innerHTML = `Enter the 4-digit PIN for <strong class="text-white capitalize">${user}</strong> to continue.`;
    confirmGroup.classList.add("hidden");
    document.getElementById("pinConfirmInput").required = false;
    submitBtn.textContent = "Unlock";
  }

  document.getElementById("pinModal").classList.remove("hidden");
  setTimeout(() => document.getElementById("pinCodeInput").focus(), 50);
}

window.closePinModal = function() {
  document.getElementById("pinModal").classList.add("hidden");
  pendingUser = null;
  pendingAction = null;
};

window.submitPinForm = async function(e) {
  e.preventDefault();
  if (!pendingUser) return;

  const pinVal = document.getElementById("pinCodeInput").value.trim();
  const confirmVal = document.getElementById("pinConfirmInput").value.trim();
  const errorEl = document.getElementById("pinErrorMsg");

  if (!/^\d{4}$/.test(pinVal)) {
    errorEl.textContent = "PIN must be exactly 4 digits (0–9).";
    errorEl.classList.remove("hidden");
    return;
  }

  if (isSettingNewPin) {
    if (pinVal !== confirmVal) {
      errorEl.textContent = "PINs do not match. Please try again.";
      errorEl.classList.remove("hidden");
      return;
    }

    await setDoc(doc(db, "users", pendingUser), { pin: pinVal }, { merge: true });
    userPins[pendingUser] = pinVal;
    unlockUserSession(pendingUser);

    const targetUser = pendingUser;
    const targetAction = pendingAction;
    window.closePinModal();
    executeUnlockedAction(targetUser, targetAction);
    return;
  }

  if (pinVal !== String(userPins[pendingUser])) {
    errorEl.textContent = "Incorrect PIN. Access denied.";
    errorEl.classList.remove("hidden");
    document.getElementById("pinCodeInput").value = "";
    document.getElementById("pinCodeInput").focus();
    return;
  }

  unlockUserSession(pendingUser);
  const targetUser = pendingUser;
  const targetAction = pendingAction;
  window.closePinModal();
  executeUnlockedAction(targetUser, targetAction);
};

function executeUnlockedAction(user, actionType) {
  if (actionType === "openAvatar") {
    launchAvatarCropperModal(user);
  } else {
    window.location.href = `semester.html?user=${encodeURIComponent(user)}`;
  }
}

window.selectUser = function(user) {
  requestProfileAccess(user, "openProfile");
};

// =========================================================================
// AVATAR CROPPER
// =========================================================================
window.openAvatarCropper = function(event, user) {
  if (event) event.stopPropagation();
  requestProfileAccess(user, "openAvatar");
};

function launchAvatarCropperModal(user) {
  cropTargetUser = user;
  document.getElementById("cropUserName").textContent = user;
  document.getElementById("avatarFileInput").value = "";
  cropZoom = 1;
  cropOffsetX = 0;
  cropOffsetY = 0;
  document.getElementById("cropZoomRange").value = 1;
  document.getElementById("zoomLabel").textContent = "1.0x";

  const existing = userAvatars[user];
  if (existing) {
    const img = new Image();
    img.onload = () => {
      cropImg = img;
      drawCropCanvas();
    };
    img.src = existing;
  } else {
    cropImg = null;
    drawCropCanvas();
  }
  document.getElementById("avatarCropModal").classList.remove("hidden");
}

window.closeAvatarCropper = function() {
  document.getElementById("avatarCropModal").classList.add("hidden");
  cropTargetUser = null;
};

window.handleAvatarFileSelect = function(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    const img = new Image();
    img.onload = function() {
      cropImg = img;
      cropZoom = 1;
      cropOffsetX = 0;
      cropOffsetY = 0;
      document.getElementById("cropZoomRange").value = 1;
      document.getElementById("zoomLabel").textContent = "1.0x";
      drawCropCanvas();
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
};

window.updateCropZoom = function(val) {
  cropZoom = parseFloat(val);
  document.getElementById("zoomLabel").textContent = `${cropZoom.toFixed(1)}x`;
  drawCropCanvas();
};

function drawCropCanvas() {
  const canvas = document.getElementById("avatarCanvas");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#1e293b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!cropImg) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 13px Plus Jakarta Sans, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Choose an image above", canvas.width / 2, canvas.height / 2);
    return;
  }

  const baseScale = Math.max(canvas.width / cropImg.width, canvas.height / cropImg.height);
  const drawW = cropImg.width * baseScale * cropZoom;
  const drawH = cropImg.height * baseScale * cropZoom;
  const x = (canvas.width - drawW) / 2 + cropOffsetX;
  const y = (canvas.height - drawH) / 2 + cropOffsetY;

  ctx.drawImage(cropImg, x, y, drawW, drawH);
}

const cropBox = document.getElementById("cropBox");
cropBox.addEventListener("mousedown", (e) => {
  isDraggingCrop = true;
  dragStartX = e.clientX - cropOffsetX;
  dragStartY = e.clientY - cropOffsetY;
});
window.addEventListener("mousemove", (e) => {
  if (!isDraggingCrop) return;
  cropOffsetX = e.clientX - dragStartX;
  cropOffsetY = e.clientY - dragStartY;
  drawCropCanvas();
});
window.addEventListener("mouseup", () => {
  isDraggingCrop = false;
});

cropBox.addEventListener("touchstart", (e) => {
  if (e.touches.length === 1) {
    isDraggingCrop = true;
    dragStartX = e.touches[0].clientX - cropOffsetX;
    dragStartY = e.touches[0].clientY - cropOffsetY;
  }
}, { passive: true });
window.addEventListener("touchmove", (e) => {
  if (!isDraggingCrop || e.touches.length !== 1) return;
  cropOffsetX = e.touches[0].clientX - dragStartX;
  cropOffsetY = e.touches[0].clientY - dragStartY;
  drawCropCanvas();
}, { passive: true });
window.addEventListener("touchend", () => {
  isDraggingCrop = false;
});

window.saveCroppedAvatar = async function() {
  if (!cropTargetUser) return;
  if (!cropImg) {
    alert("Please choose an image first.");
    return;
  }
  const canvas = document.getElementById("avatarCanvas");
  const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.82);

  await setDoc(doc(db, "users", cropTargetUser), { avatar: compressedDataUrl }, { merge: true });
  window.closeAvatarCropper();
};

window.removeAvatar = async function() {
  if (!cropTargetUser) return;
  await setDoc(doc(db, "users", cropTargetUser), { avatar: null }, { merge: true });
  window.closeAvatarCropper();
};

initProfiles();
