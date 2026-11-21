# 🎓 University Money Management

A modern, responsive web application built for university students to track semester budgets, manage monthly allowances, record daily expenses, and generate printable financial statements in real time.

---

## ✨ Key Features

- **Multi-Profile Student Wallets:** Supports multiple student profiles with customizable, croppable profile avatars.
- **Semester & Monthly Organization:** Filter and manage financial records across different academic semesters and months.
- **Dynamic Budget & Category Tracking:** Customize spending categories, allocate monthly budgets, and monitor real-time balance and usage progress bars.
- **Full Transaction Management (CRUD):** Add, search, filter by category, edit, or delete daily expense records with instant balance recalculation.
- **Printable Financial Statement Report:** Automatically generates a structured monthly financial report grouped by category, optimized for A4 printing and PDF export (`Print / Save as PDF`).
- **Compact Glass-Morphism UI:** Designed with Tailwind CSS for a clean, single-screen dashboard experience without unnecessary scrolling.

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, Tailwind CSS, Vanilla JavaScript (ES6 Modules)
- **Backend & Real-Time Database:** Firebase Firestore (`onSnapshot` real-time sync)
- **Deployment & CI/CD:** GitHub Pages

---

## 📂 Modular Project Structure

The codebase is refactored into clean, single-responsibility modules for maintainability and scalability:

```text
money_management/
├── index.html          # Profile selection & avatar cropper view
├── semester.html       # Semester & monthly overview view
├── dashboard.html      # Main monthly budget & expense dashboard
├── report.html         # Printable A4 financial statement view
├── style.css           # Custom glass-morphism & layout styling
├── money_logo.png      # Application favicon/logo
└── js/
    ├── sambungan.js    # Firebase initialization & Firestore connection
    ├── state.js        # Shared state, constants, date & avatar utilities
    ├── profil.js       # Profile selection & HTML5 Canvas avatar cropper
    ├── semester.js     # Semester & month CRUD operations
    ├── paparan.js      # Dashboard UI rendering, tabs & real-time listeners
    ├── transaksi.js    # Expense transaction CRUD logic
    ├── kategori.js     # Category & budget allocation management
    └── report.js       # Financial statement aggregation & grouping logic
