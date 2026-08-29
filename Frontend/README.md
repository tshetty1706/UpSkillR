# UpSkillr — Frontend Application

The **UpSkillr Frontend** is a modern, high-performance web application built with **React 19** and **Vite**. It powers the user-facing platform for learners and instructors — featuring responsive layouts, full **Light / Dark Mode** theming, client-side routing, interactive step-by-step forms, and full authentication integration (manual + OAuth).

---

## 📦 Installed Libraries & Package Guide

Below is the complete list of libraries installed in the Frontend application, along with individual and one-line download commands.

### Production Dependencies

| Library | Version | Purpose | Individual Install Command |
|---|---|---|---|
| **React** | `^19.2.8` | Core UI library | `npm install react` |
| **React DOM** | `^19.2.8` | React DOM rendering engine | `npm install react-dom` |
| **Lucide React** | `^1.31.0` | UI icon library | `npm install lucide-react` |
| **libphonenumber-js** | `^1.13.12` | International phone number parsing & validation | `npm install libphonenumber-js` |

### Development Dependencies

| Library | Version | Purpose | Individual Install Command |
|---|---|---|---|
| **Vite** | `^8.2.0` | Next-generation dev server & build tool | `npm install -D vite` |
| **@vitejs/plugin-react** | `^6.0.4` | Official Vite React plugin with Fast Refresh | `npm install -D @vitejs/plugin-react` |
| **ESLint** | `^10.8.0` | Code linting and style checking | `npm install -D eslint` |
| **@eslint/js** | `^10.0.1` | ESLint JavaScript config rules | `npm install -D @eslint/js` |
| **eslint-plugin-react-hooks** | `^7.1.1` | React Hooks linting rules | `npm install -D eslint-plugin-react-hooks` |
| **eslint-plugin-react-refresh** | `^0.5.3` | React Fast Refresh linting integration | `npm install -D eslint-plugin-react-refresh` |
| **globals** | `^17.7.0` | Global identifier definitions for ESLint | `npm install -D globals` |

---

## ⚡ Quick Download Commands

To install all required packages at once for a fresh clone:

```bash
# Navigate to the Frontend directory
cd Frontend

# Option A: Install all dependencies automatically from package.json (Recommended)
npm install

# Option B: Download production dependencies explicitly
npm install react react-dom lucide-react libphonenumber-js

# Option C: Download development dependencies explicitly
npm install -D vite @vitejs/plugin-react eslint @eslint/js eslint-plugin-react-hooks eslint-plugin-react-refresh globals
```

---

## 📁 Project Structure

```
Frontend/
├── public/
│   └── vite.svg              # Favicon
│
└── src/
    ├── assets/
    │   ├── illustrations/    # SVG vector illustrations (auth pages, hero)
    │   ├── images/           # Banner & hero images
    │   ├── icons/            # Custom SVG icon assets
    │   └── logos/            # Partner & brand logos
    │
    ├── components/
    │   ├── authentication/
    │   │   ├── login.jsx     # Sign In page (manual + OAuth)
    │   │   └── signup.jsx    # Signup page (OTP email verification flow)
    │   │
    │   ├── common/
    │   │   ├── LogoutModal/  # Reusable Logout Confirmation modal
    │   │   ├── Navbar/       # Top navigation bar & theme toggle
    │   │   ├── SearchableSelect/ # Filterable dropdown selector
    │   │   └── Footer/       # Site footer links
    │   │
    │   ├── instructor/
    │   │   ├── application/  # Instructor Multi-step Application Form & Review
    │   │   └── dashboard/    # Instructor Dashboard Workspace
    │   │
    │   └── home/             # Landing page components
    │
    ├── context/
    │   └── ThemeContext.jsx  # Global Light/Dark theme provider (localStorage)
    │
    ├── utils/
    │   └── countryData.js    # Sovereign country list with phone metadata
    │
    ├── App.jsx               # App root with client-side router
    ├── main.jsx              # Entry point
    └── index.css             # Global CSS design tokens & utilities
```

---

## 🎨 Design System & Color Tokens

UpSkillr uses CSS custom properties (`:root` and `.dark`) for unified theming across all screens.

### Color Tokens
- `--brand-primary`: `#116830` (Light) / `#10b981` (Dark)
- `--background`: `#FFFFFF` (Light) / `#090F13` (Dark)
- `--surface`: `#F7FAF8` (Light) / `#101B18` (Dark)
- `--text-primary`: `#101820` (Light) / `#F5F7F6` (Dark)
- `--border`: `#E5EAE7` (Light) / `#1D3329` (Dark)

---

## 🛠️ Running Locally

```bash
# Start development server
npm run dev

# Build production bundle
npm run build

# Preview production build locally
npm run preview

# Run ESLint
npm run lint
```

The application will launch on: [http://localhost:5173](http://localhost:5173)

---

## 📄 License
Copyright © 2026 **UpSkillr**. All rights reserved.
