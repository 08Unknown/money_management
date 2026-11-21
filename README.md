# 🎓 University Money Management

![Platform](https://img.shields.io/badge/Platform-Web-indigo)
![Styling](https://img.shields.io/badge/Styling-Tailwind_CSS-blue)
![Architecture](https://img.shields.io/badge/JavaScript-ES6_Modules-yellow)
![Database](https://img.shields.io/badge/Database-Firebase_Firestore-amber)
![Hosting](https://img.shields.io/badge/Hosting-GitHub_Pages-green)

A modern, responsive web application built for university students to track semester budgets, manage monthly allowances, record daily expenses, and generate printable financial statements in real time.

---

## 🚀 Pautan Rasmi

* 🌐 **Demo Laman Web:** https://08unknown.github.io/MOD-ESports-Portal/

---

## ✨ Key Features

- 📱 **Compact Glass-Morphism UI:** Clean, single-screen dashboard layout designed with Tailwind CSS for seamless desktop and mobile viewing without unnecessary scrolling.
- 👥 **Multi-Profile Student Wallets:** Supports multiple student profiles with customizable, croppable avatars using HTML5 Canvas.
- 📅 **Semester & Monthly Organization:** Organize, filter, and manage allowances across different academic semesters and months.
- ⚡ **Real-Time Cloud Sync:** Instant data synchronization and live balance recalculation powered by Firebase Firestore (`onSnapshot`).
- 📊 **Dynamic Category & Transaction CRUD:** Customize spending categories, allocate budgets, search/filter records, and edit or delete expense entries effortlessly.
- 🖨️ **Printable Financial Statement Report:** Automatically generates structured monthly financial statements grouped by category, optimized for A4 printing and PDF export (`Print / Save as PDF`).

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, Vanilla JavaScript (ES6 Modules)
- **UI & Styling:** Tailwind CSS, Google Fonts (Plus Jakarta Sans)
- **Database:** Firebase Cloud Firestore
- **Hosting & CI/CD:** GitHub Pages

---

## 👤 Pengarang / Pembangun

* **Nama:** NUR ANISA SOFIA BINTI MOHD KHAIRI
* **Institusi:** UNIVERSITI PENDIDIKAN SULTAN IDRIS (UPSI)
* **Program:** DIPLOMA IN COMPUTER SCIENCE (YEAR 1)
* **Persatuan:** TIMBALAN YDP PERSATUAN SAINS KOMPUTER (TYDP PSK)
* **LinkedIn:** https://www.linkedin.com/in/anisa-sofia-2ab598449?utm_source=share_via&utm_content=profile&utm_medium=member_android

---

## 📂 Modular Project Structure

```text
money_management/
├── index.html          # Student profile selection & avatar cropper
├── semester.html       # Semester & monthly overview management
├── dashboard.html      # Main monthly budget & expense dashboard
├── report.html         # Printable A4 financial statement report
├── style.css           # Custom glass-morphism & layout styling
├── money_logo.png      # Application logo & favicon
└── js/
    ├── sambungan.js    # Firebase initialization & Firestore connection
    ├── state.js        # Shared state, constants, date & avatar utilities
    ├── profil.js       # Profile selection & HTML5 Canvas avatar cropper
    ├── semester.js     # Semester & month CRUD operations
    ├── paparan.js      # Dashboard UI rendering & real-time listeners
    ├── transaksi.js    # Expense transaction CRUD logic
    ├── kategori.js     # Category & budget allocation management
    └── report.js       # Financial statement aggregation & category grouping
