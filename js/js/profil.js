import { doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./sambungan.js";
import { initBackground, INITIALS, USERS, applyAvatarToElement } from "./state.js";

initBackground();

const userAvatars = { anisa: null, alya: null, bacirah: null };

// Papar gambar profil semasa dari Firebase
USERS.forEach((u) => {
  onSnapshot(doc(db, "users", u), (uSnap) => {
    const data = uSnap.exists() ? uSnap.data() : {};
    userAvatars[u] = data.avatar || null;
    applyAvatarToElement(document.getElementById(`avatar-home-${u}`), u, userAvatars[u]);
  });
});

// Buka halaman semester untuk profil yang dipilih
window.selectUser = function(userId) {
  window.location.href = `semester.html?user=${encodeURIComponent(userId)}`;
};

// =========================================================================
// CROP GAMBAR PROFIL
// =========================================================================
let cropTargetUser = null;
let cropImg = null;
let cropScale = 1;
let cropOffsetX = 0;
let cropOffsetY = 0;
let isDraggingCrop = false;
let dragStartX = 0;
let dragStartY = 0;

window.openAvatarCropper = function(event, userId) {
  if (event) event.stopPropagation();
  cropTargetUser = userId;
  document.getElementById("cropUserName").textContent = userId;
  document.getElementById("avatarFileInput").value = "";
  cropImg = null;
  cropScale = 1;
  cropOffsetX = 0;
  cropOffsetY = 0;
  document.getElementById("cropZoomRange").value = 1;
  document.getElementById("zoomLabel").textContent = "1.0x";

  const canvas = document.getElementById("avatarCanvas");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (userAvatars[userId]) {
    const existing = new Image();
    existing.onload = function() {
      cropImg = existing;
      drawCropCanvas();
    };
    existing.src = userAvatars[userId];
  } else {
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#818cf8";
    ctx.font = "bold 48px Plus Jakarta Sans, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(INITIALS[userId], canvas.width / 2, canvas.height / 2);
  }

  document.getElementById("avatarCropModal").classList.remove("hidden");
};

window.closeAvatarCropper = function() {
  document.getElementById("avatarCropModal").classList.add("hidden");
};

window.handleAvatarFileSelect = function(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    const img = new Image();
    img.onload = function() {
      cropImg = img;
      const canvas = document.getElementById("avatarCanvas");
      cropScale = Math.max(canvas.width / img.width, canvas.height / img.height);
      cropOffsetX = 0;
      cropOffsetY = 0;
      document.getElementById("cropZoomRange").min = (cropScale * 0.5).toFixed(2);
      document.getElementById("cropZoomRange").max = (cropScale * 3).toFixed(2);
      document.getElementById("cropZoomRange").value = cropScale;
      document.getElementById("zoomLabel").textContent = "1.0x";
      drawCropCanvas();
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
};

window.updateCropZoom = function(val) {
  cropScale = parseFloat(val);
  document.getElementById("zoomLabel").textContent = Number(val).toFixed(1) + "x";
  drawCropCanvas();
};

function drawCropCanvas() {
  if (!cropImg) return;
  const canvas = document.getElementById("avatarCanvas");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const drawW = cropImg.width * cropScale;
  const drawH = cropImg.height * cropScale;
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
window.addEventListener("mouseup", () => { isDraggingCrop = false; });

cropBox.addEventListener("touchstart", (e) => {
  if (e.touches.length === 1) {
    isDraggingCrop = true;
    dragStartX = e.touches[0].clientX - cropOffsetX;
    dragStartY = e.touches[0].clientY - cropOffsetY;
  }
});
window.addEventListener("touchmove", (e) => {
  if (!isDraggingCrop || e.touches.length !== 1) return;
  cropOffsetX = e.touches[0].clientX - dragStartX;
  cropOffsetY = e.touches[0].clientY - dragStartY;
  drawCropCanvas();
});
window.addEventListener("touchend", () => { isDraggingCrop = false; });

window.saveCroppedAvatar = async function() {
  if (!cropTargetUser || !cropImg) {
    closeAvatarCropper();
    return;
  }
  const canvas = document.getElementById("avatarCanvas");
  const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.82);

  await setDoc(doc(db, "users", cropTargetUser), {
    avatar: compressedDataUrl
  }, { merge: true });

  closeAvatarCropper();
};

window.removeAvatar = async function() {
  if (!cropTargetUser) return;
  await setDoc(doc(db, "users", cropTargetUser), {
    avatar: null
  }, { merge: true });
  closeAvatarCropper();
};
