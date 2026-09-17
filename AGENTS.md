# PROJECT-WIDE RESPONSIVENESS & BROWSER COMPATIBILITY STANDARDS

This document defines mandatory, permanent project standards for the entire UpSkillr application. All components, pages, forms, and features must follow these rules.

---

## 1. Breakpoint & Container System
- **Max Container Width**: `1440px` (`margin: 0 auto;`)
- **Desktop**: `>= 1024px` (Padding: `32px`)
- **Tablet**: `768px – 1023px` (Padding: `24px`)
- **Mobile**: `< 768px` (Padding: `16px`)

---

## 2. Browser & Responsive Compatibility Standard

Every developer, contributor, or AI working on this application MUST follow these compatibility rules for all new and modified code.

### Compatibility Requirement
The UpSkillr application must:
* Function correctly on current versions of major desktop browsers.
* Remain fully usable at tablet screen sizes.
* Preserve existing functionality and visual consistency across supported viewport sizes.
* Never introduce layouts that work only on the developer's screen size.

### Supported Browsers
Ensure compatibility with current stable versions of:
* **Google Chrome**
* **Mozilla Firefox**
* **Microsoft Edge**
* **Apple Safari**

Do not use browser-specific APIs, CSS features, or JavaScript behavior without checking appropriate browser support or providing a safe fallback. Avoid unnecessary vendor-specific implementations.

### Responsive Requirement
Every page and component must be designed responsively. At minimum, validate:
* **Desktop**: Large desktop and Standard desktop
* **Tablet**: Landscape and Portrait

The application must remain usable at tablet widths without:
* Horizontal scrolling (no unintended `overflow-x` scrolling)
* Overlapping elements
* Clipped content
* Inaccessible buttons
* Broken navigation
* Unreadable text
* Cards overflowing their containers
* Images being distorted
* Forms extending beyond the viewport
* Tables becoming unusable

### Responsive Implementation Principles
**Prefer**:
* CSS Grid
* Flexbox
* Responsive units (e.g., `rem`, `em`, `%`, `vw`, `vh`)
* `max-width` and `min-width`
* `minmax()` and `clamp()`
* Responsive breakpoints
* Fluid spacing
* Responsive typography (e.g., using `clamp()`)

**Avoid unnecessary**:
* Fixed widths
* Fixed heights
* Absolute positioning for layout
* Viewport-specific hacks
* `overflow-x: hidden` as a workaround for layout overflow

Do not solve responsive problems by simply hiding content. If content cannot fit, redesign its layout appropriately for the smaller viewport while preserving its functionality.

### Component-Level Responsibility
Every new component must be responsive by design. Before considering a component complete, verify:
* [ ] Content fits within its container
* [ ] Text wraps correctly
* [ ] Buttons remain accessible
* [ ] Inputs remain usable
* [ ] Images maintain aspect ratio (`object-fit: cover` or `contain`)
* [ ] Cards adapt to available width
* [ ] Navigation remains usable
* [ ] No unintended horizontal scrolling
* [ ] No overlapping elements
* [ ] No layout breaking at tablet widths

### Do Not Rely on Desktop-Only Assumptions
Never assume:
* 1920px screen
* 1440px screen
* Mouse-only interaction
* Large available width

Components should work with varying viewport widths and normal browser zoom.

### Existing Design Must Be Preserved
Responsiveness must **not become an excuse to redesign the application**. When modifying an existing component:
1. Preserve its current visual identity.
2. Preserve its existing functionality.
3. Preserve the UpSkillr design system.
4. Make only the responsive/layout changes required.
5. Do not introduce unrelated visual changes.

### Accessibility and Usability
Responsive behavior must also preserve usability:
* Adequate clickable/tappable areas (minimum interactive height of `44px` for buttons/controls)
* Readable text (adequate contrast, WCAG AA)
* Visible focus states (`:focus-visible`)
* Keyboard accessibility
* Usable forms
* Accessible navigation

Do not rely exclusively on hover interactions.

### Validation Before Completing ANY Task
Every developer/AI working on UpSkillr must perform a compatibility check after implementing a feature or modifying a UI. At minimum verify:
* Desktop → Chrome
* Desktop → Firefox
* Desktop → Edge
* Desktop → Safari (where available)
* Tablet → Portrait
* Tablet → Landscape
* Themes → Both Light Mode and Dark Mode (where applicable)

### Regression Protection
Before completing work, verify that responsive changes have not broken existing pages or shared components. A component that works on desktop but breaks another page at tablet width is **not considered complete**.

### Mandatory Rule for Future Work
> **Every new feature, page, and component in UpSkillr must be compatible with current major desktop browsers and usable at tablet screen sizes. Contributors must verify responsive behavior before considering their work complete. Existing functionality, design system, and unrelated components must not be broken in the process.**
