# UpSkillr — Frontend Application

UpSkillr is a modern, high-performance web platform designed for online education and skill learning. It features a polished visual aesthetic, seamless **Light Mode** and **Dark Mode** themes, responsive component layouts, and full accessibility compliance.

---

## 🚀 Technologies Used

- **Framework**: React 19
- **Build Tool**: Vite
- **Icons**: Lucide Icons
- **Styling**: Modular Vanilla CSS with CSS Custom Properties (Theme System Variables)
- **Typography**: Inter (Google Fonts)

---

## 📁 Project Structure

The frontend application follows a clean, modular, and scalable directory structure:

```
src/
├── assets/
│   ├── images/          # Image assets (hero images, banners)
│   ├── illustrations/   # Vector SVG illustrations
│   ├── icons/           # Custom SVG icons
│   └── logos/           # Partner & brand logos
│
├── components/
│   ├── common/          # Shared layout components
│   │   ├── Navbar/      # Top header navigation & theme toggle
│   │   └── Footer/      # Page footer & quick links
│   │
│   └── home/            # Homepage sections
│       ├── Hero/                # Hero section with layered background decorations
│       ├── Stats/               # Key metrics & statistics bar
│       ├── TrustedBy/           # Brand partner logo strip
│       ├── PopularCategories/   # Course categories grid
│       ├── LearnerInstructor/   # Dual-role feature cards
│       ├── WhyUpSkillr/         # Platform advantages & learner testimonials
│       ├── FAQ/                 # Interactive question accordion
│       └── CTA/                 # Action banner
│
├── context/
│   └── ThemeContext.jsx # Centralized Light/Dark theme provider & localStorage state
│
├── pages/
│   └── Home/
│       └── HomePage.jsx # Main landing page composition
│
├── App.jsx              # Main application root
├── main.jsx             # Entry point renderer
└── index.css            # Global CSS variables, reset, & accessibility styles
```

---

## 🎨 Design Tokens & Theme System

UpSkillr uses a centralized design system built with CSS custom properties.

### Light Mode (`:root`)
- **Primary Brand Green**: `#116830`
- **Background**: `#FFFFFF`
- **Surface Muted**: `#F7FAF8`
- **Primary Text**: `#101820`
- **Secondary Text**: `#4B5563`
- **Border**: `#E5EAE7`

### Dark Mode (`.dark`)
- **Primary Brand Green**: `#39D95F`
- **Background**: `#090F13`
- **Surface**: `#101B18`
- **Primary Text**: `#F5F7F6`
- **Secondary Text**: `#A7B3AD`
- **Border**: `#1D3329`

---

## 🛠️ Getting Started

### 1. Prerequisites
Ensure you have **Node.js** (v18 or higher) installed.

### 2. Installation
Navigate into the `Frontend` directory and install dependencies:

```bash
cd Frontend
npm install
```

### 3. Development Server
Start the local development server:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Build for Production
To generate an optimized production bundle:

```bash
npm run build
```

The production output will be generated in the `dist/` directory.

---

## ♿ Accessibility & Quality Standards

- **Focus Visible**: All interactive elements (buttons, inputs, links, accordion headers) feature visible focus indicators.
- **ARIA Attributes**: Accessible labels (`aria-label`, `aria-expanded`, `aria-hidden`) on icon-only controls and interactive widgets.
- **WCAG AA Compliance**: High-contrast typography in both Light and Dark themes.

---

## 📄 License
Copyright © 2026 **UpSkillr**. All rights reserved.
