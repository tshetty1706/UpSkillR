# PROJECT-WIDE RESPONSIVENESS & BROWSER COMPATIBILITY STANDARDS

This document defines mandatory, permanent project standards for the entire UpSkillr application. All components, pages, forms, and features must follow these rules.

---

## 1. Breakpoint & Container System
- **Max Container Width**: `1440px` (`margin: 0 auto;`)
- **Desktop**: `>= 1024px` (Padding: `32px`)
- **Tablet**: `768px – 1023px` (Padding: `24px`)
- **Mobile**: `< 768px` (Padding: `16px`)

---

## 2. Browser Compatibility
- Current versions of **Google Chrome**, **Microsoft Edge**, **Mozilla Firefox**, and **Apple Safari**.
- Standard HTML5, CSS3 (Flexbox, CSS Grid, `clamp()`), and React APIs.

---

## 3. Strict Responsiveness Constraints
- **NO Horizontal Scroll**: Elements must never cause horizontal scrolling or overflow at supported screen widths.
- **Fluid Typography**: Use `clamp()` for large headings (e.g., `font-size: clamp(2.25rem, 4vw, 3.25rem);`).
- **Responsive Images**: All images must use `max-width: 100%; height: auto; object-fit: cover;`.
- **Reflowing Layouts**: Grids and multi-column containers must reflow naturally into fewer columns on tablets and single column on mobile.
- **Touch Target Size**: Minimum interactive height of `44px` for buttons and controls.
- **Identical Layout Behavior in Light/Dark Mode**: Responsive layouts are identical across both themes; only color tokens change.
- **Accessibility**: Keyboard focus visible states (`:focus-visible`), readable contrast (WCAG AA), and `aria` attributes.
