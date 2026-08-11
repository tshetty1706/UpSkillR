# UpSkillr — Frontend Application

The **UpSkillr Frontend** is a high-performance, visually rich web application built with **React 19** and **Vite**. It provides the user-facing interface for an online education platform — featuring a polished landing page, full **Light / Dark Mode** theming, responsive layouts, and a complete authentication flow with OTP email verification and OAuth support.

---

## 🚀 Technologies Used

| Technology | Version | Purpose |
|---|---|---|
| **React** | v19 | Component-based UI framework |
| **Vite** | v6.x | Lightning-fast build tool & dev server |
| **Vanilla CSS** | — | Modular styling with CSS custom properties |
| **Lucide Icons** | Latest | Consistent, tree-shakeable icon set |
| **Inter (Google Fonts)** | — | Modern, readable typography |

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
    │   ├── images/           # Raster images (hero, banners)
    │   ├── icons/            # Custom SVG icon files
    │   └── logos/            # Partner & brand logos
    │
    ├── components/
    │   ├── authentication/
    │   │   ├── login.jsx     # Sign In page (manual + Google/GitHub OAuth)
    │   │   └── signup.jsx    # Create Account page (OTP email verification flow)
    │   │
    │   ├── common/
    │   │   ├── Navbar/       # Top navigation bar & theme toggle
    │   │   └── Footer/       # Site footer with links
    │   │
    │   └── home/             # Landing page section components
    │       ├── Hero/                # Hero banner with animated decorations
    │       ├── Stats/               # Platform metrics bar
    │       ├── TrustedBy/           # Partner logo strip
    │       ├── PopularCategories/   # Course category grid
    │       ├── LearnerInstructor/   # Dual-role feature cards
    │       ├── WhyUpSkillr/         # Benefits & testimonials
    │       ├── FAQ/                 # Accordion FAQ section
    │       └── CTA/                 # Call-to-action banner
    │
    ├── context/
    │   └── ThemeContext.jsx  # Global Light/Dark theme provider (localStorage)
    │
    ├── pages/
    │   └── Home/
    │       └── HomePage.jsx  # Landing page composition
    │
    ├── App.jsx               # App root with client-side routing logic
    ├── main.jsx              # React DOM entry point
    └── index.css             # Global design tokens, CSS reset & auth styles
```

---

## 🎨 Design System & Theme Tokens

UpSkillr uses a centralized CSS custom properties system for consistent theming.

### Light Mode (`:root`)
| Token | Value | Usage |
|---|---|---|
| `--brand-primary` | `#116830` | Primary green (buttons, accents) |
| `--background` | `#FFFFFF` | Page background |
| `--surface` | `#F7FAF8` | Card & input backgrounds |
| `--text-primary` | `#101820` | Headings & body text |
| `--text-secondary` | `#4B5563` | Muted / helper text |
| `--border` | `#E5EAE7` | Dividers & input borders |

### Dark Mode (`.dark`)
| Token | Value | Usage |
|---|---|---|
| `--brand-primary` | `#39D95F` | Vibrant green accent |
| `--background` | `#090F13` | Deep dark background |
| `--surface` | `#101B18` | Card surfaces |
| `--text-primary` | `#F5F7F6` | Light text |
| `--text-secondary` | `#A7B3AD` | Muted text |
| `--border` | `#1D3329` | Subtle dark borders |

---

## 🔐 Authentication Flow

The authentication pages connect to the UpSkillr Backend API (`http://localhost:5000/api/auth`).

### Manual Sign Up (OTP-verified)
```
1. User fills form → POST /signup
   → Backend stores in memory, sends 6-digit OTP email
2. OTP entry screen appears
3. User enters OTP → POST /verify-otp
   → Backend creates user in MongoDB & returns JWT
```

### Sign In
```
POST /login → returns JWT token + user object
Token is stored in localStorage as upskillr_token
```

### OAuth (Google & GitHub)
```
GET /google?role=learner → Google consent → /google/callback → redirect to frontend
GET /github?role=learner → GitHub consent → /github/callback → redirect to frontend
```

---

## ⚙️ Responsive Breakpoints

| Breakpoint | Width | Behaviour |
|---|---|---|
| **Desktop** | ≥ 1024px | Two-column layouts, full nav |
| **Tablet** | 768px – 1023px | Adjusted grid, compact nav |
| **Mobile** | < 768px | Single-column stacked layout |

All pages comply with the project's **no horizontal scroll** rule and use `clamp()` for fluid typography.

---

## 🛠️ Getting Started

### 1. Prerequisites
- **Node.js** v18 or higher
- Backend server running on `http://localhost:5000` (see [Backend README](../Backend/README.md))

### 2. Clone the Repository
```bash
git clone https://github.com/tshetty1706/UpSkillR.git
cd UpSkillR/Frontend
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the **Vite dev server** with HMR at `http://localhost:5173` |
| `npm run build` | Build optimised production bundle → `dist/` |
| `npm run preview` | Locally preview the production build |
| `npm run lint` | Run **ESLint** to check for code issues |

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview the production build locally
npm run preview

# Lint the codebase
npm run lint
```

---

## ♿ Accessibility Standards

- **Focus Visible**: All interactive elements have visible `:focus-visible` ring styles
- **ARIA Attributes**: `aria-label`, `aria-expanded`, `aria-hidden` on icon-only controls
- **WCAG AA Compliance**: High-contrast text in both Light and Dark themes
- **Touch Targets**: Minimum `44px` height on all buttons and inputs
- **Keyboard Navigation**: Full keyboard support across nav, modals, and accordions

---

## 📄 License
Copyright © 2026 **UpSkillr**. All rights reserved.
