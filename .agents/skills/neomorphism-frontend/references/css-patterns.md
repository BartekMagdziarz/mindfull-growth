# Neumorphic CSS Patterns Reference

Complete, copy-pasteable CSS patterns for all neumorphic components. Use these as the foundation for any neumorphic interface.

---

## 1. CSS Variable System (Light Mode)

```css
:root {
  /* === Base Surface === */
  --bg: #e0e5ec;
  --bg-secondary: #d1d9e6;

  /* === Shadow Colors === */
  --shadow-light: #ffffff;
  --shadow-dark: #a3b1c6;

  /* === Shadow Geometry === */
  --distance-sm: 3px;
  --distance-md: 6px;
  --distance-lg: 10px;
  --distance-xl: 15px;
  --blur-sm: 6px;
  --blur-md: 14px;
  --blur-lg: 20px;
  --blur-xl: 30px;

  /* === Border Radius === */
  --radius-sm: 10px;
  --radius-md: 16px;
  --radius-lg: 24px;
  --radius-xl: 50px;    /* pill shape */
  --radius-circle: 50%;

  /* === Typography === */
  --text-primary: #2d3436;
  --text-secondary: #636e72;
  --text-muted: #95a5a6;

  /* === Accent === */
  --accent: #6c63ff;
  --accent-light: #8b83ff;
  --accent-dark: #5248cc;
  --accent-glow: rgba(108, 99, 255, 0.3);

  /* === Transitions === */
  --transition-shadow: box-shadow 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --transition-transform: transform 0.15s ease;
  --transition-all: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
```

## 2. CSS Variable System (Dark Mode)

```css
[data-theme="dark"],
.dark {
  --bg: #2d2d3a;
  --bg-secondary: #252532;

  --shadow-light: rgba(255, 255, 255, 0.05);
  --shadow-dark: rgba(0, 0, 0, 0.5);

  --text-primary: #e0e0e0;
  --text-secondary: #a0a0b0;
  --text-muted: #6c6c7e;

  --accent: #7c6aff;
  --accent-light: #9b8dff;
  --accent-dark: #5c4acc;
  --accent-glow: rgba(124, 106, 255, 0.25);
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #2d2d3a;
    --bg-secondary: #252532;
    --shadow-light: rgba(255, 255, 255, 0.05);
    --shadow-dark: rgba(0, 0, 0, 0.5);
    --text-primary: #e0e0e0;
    --text-secondary: #a0a0b0;
    --text-muted: #6c6c7e;
    --accent: #7c6aff;
    --accent-light: #9b8dff;
    --accent-dark: #5c4acc;
    --accent-glow: rgba(124, 106, 255, 0.25);
  }
}
```

## 3. Utility Shadow Classes

```css
/* === RAISED (Convex) === */
.neu-raised-sm {
  background: var(--bg);
  border-radius: var(--radius-md);
  box-shadow:
    calc(-1 * var(--distance-sm)) calc(-1 * var(--distance-sm)) var(--blur-sm) var(--shadow-light),
    var(--distance-sm) var(--distance-sm) var(--blur-sm) var(--shadow-dark);
}

.neu-raised {
  background: var(--bg);
  border-radius: var(--radius-md);
  box-shadow:
    calc(-1 * var(--distance-md)) calc(-1 * var(--distance-md)) var(--blur-md) var(--shadow-light),
    var(--distance-md) var(--distance-md) var(--blur-md) var(--shadow-dark);
}

.neu-raised-lg {
  background: var(--bg);
  border-radius: var(--radius-lg);
  box-shadow:
    calc(-1 * var(--distance-lg)) calc(-1 * var(--distance-lg)) var(--blur-lg) var(--shadow-light),
    var(--distance-lg) var(--distance-lg) var(--blur-lg) var(--shadow-dark);
}

/* === PRESSED (Concave / Inset) === */
.neu-pressed-sm {
  background: var(--bg);
  border-radius: var(--radius-md);
  box-shadow:
    inset calc(-1 * var(--distance-sm)) calc(-1 * var(--distance-sm)) var(--blur-sm) var(--shadow-light),
    inset var(--distance-sm) var(--distance-sm) var(--blur-sm) var(--shadow-dark);
}

.neu-pressed {
  background: var(--bg);
  border-radius: var(--radius-md);
  box-shadow:
    inset calc(-1 * var(--distance-md)) calc(-1 * var(--distance-md)) var(--blur-md) var(--shadow-light),
    inset var(--distance-md) var(--distance-md) var(--blur-md) var(--shadow-dark);
}

/* === FLAT (No shadows) === */
.neu-flat {
  background: var(--bg);
  border-radius: var(--radius-md);
  box-shadow: none;
}
```

## 4. Buttons

```css
.neu-btn {
  background: var(--bg);
  border: none;
  border-radius: var(--radius-xl);
  padding: 14px 32px;
  font-family: 'Nunito', 'Quicksand', sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--text-primary);
  cursor: pointer;
  outline: none;
  transition: var(--transition-shadow), var(--transition-transform);

  box-shadow:
    -6px -6px 14px var(--shadow-light),
     6px  6px 14px var(--shadow-dark);
}

.neu-btn:hover {
  box-shadow:
    -8px -8px 18px var(--shadow-light),
     8px  8px 18px var(--shadow-dark);
}

.neu-btn:active {
  box-shadow:
    inset -3px -3px 7px var(--shadow-light),
    inset  3px  3px 7px var(--shadow-dark);
  transform: scale(0.98);
}

.neu-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

/* Primary button with accent color */
.neu-btn-primary {
  background: var(--accent);
  color: #ffffff;
  box-shadow:
    -4px -4px 10px var(--shadow-light),
     4px  4px 10px var(--shadow-dark),
     0 0 0 0 var(--accent-glow);
}

.neu-btn-primary:hover {
  background: var(--accent-light);
  box-shadow:
    -6px -6px 14px var(--shadow-light),
     6px  6px 14px var(--shadow-dark),
     0 0 20px var(--accent-glow);
}

.neu-btn-primary:active {
  background: var(--accent-dark);
  box-shadow:
    inset -3px -3px 7px rgba(255,255,255,0.15),
    inset  3px  3px 7px rgba(0,0,0,0.2);
  transform: scale(0.98);
}

/* Icon button (circular) */
.neu-btn-icon {
  width: 50px;
  height: 50px;
  padding: 0;
  border-radius: var(--radius-circle);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
```

## 5. Cards

```css
.neu-card {
  background: var(--bg);
  border-radius: var(--radius-lg);
  padding: 28px;
  box-shadow:
    -8px -8px 20px var(--shadow-light),
     8px  8px 20px var(--shadow-dark);
  transition: var(--transition-shadow);
}

.neu-card:hover {
  box-shadow:
    -10px -10px 25px var(--shadow-light),
     10px  10px 25px var(--shadow-dark);
}

/* Card with inset content well */
.neu-card-well {
  background: var(--bg);
  border-radius: var(--radius-md);
  padding: 16px;
  margin-top: 16px;
  box-shadow:
    inset -3px -3px 7px var(--shadow-light),
    inset  3px  3px 7px var(--shadow-dark);
}
```

## 6. Input Fields

```css
.neu-input {
  background: var(--bg);
  border: none;
  border-radius: var(--radius-md);
  padding: 14px 20px;
  font-family: 'Nunito', 'Quicksand', sans-serif;
  font-size: 0.95rem;
  color: var(--text-primary);
  width: 100%;
  outline: none;
  transition: var(--transition-shadow);

  /* Inputs are PRESSED (concave) by default */
  box-shadow:
    inset -3px -3px 7px var(--shadow-light),
    inset  3px  3px 7px var(--shadow-dark);
}

.neu-input::placeholder {
  color: var(--text-muted);
}

.neu-input:focus {
  box-shadow:
    inset -3px -3px 7px var(--shadow-light),
    inset  3px  3px 7px var(--shadow-dark),
    0 0 0 2px var(--accent-glow);
}

.neu-input:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

/* Textarea */
.neu-textarea {
  resize: vertical;
  min-height: 100px;
}

/* Select */
.neu-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M6 8L1 3h10z' fill='%23636e72'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 16px center;
  padding-right: 40px;
}
```

## 7. Toggle Switch

```css
.neu-toggle {
  position: relative;
  width: 60px;
  height: 32px;
  cursor: pointer;
}

.neu-toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.neu-toggle-track {
  position: absolute;
  inset: 0;
  background: var(--bg);
  border-radius: var(--radius-xl);
  transition: var(--transition-all);
  box-shadow:
    inset -2px -2px 5px var(--shadow-light),
    inset  2px  2px 5px var(--shadow-dark);
}

.neu-toggle-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 26px;
  height: 26px;
  background: var(--bg);
  border-radius: var(--radius-circle);
  transition: var(--transition-all);
  box-shadow:
    -3px -3px 6px var(--shadow-light),
     3px  3px 6px var(--shadow-dark);
}

.neu-toggle input:checked + .neu-toggle-track {
  background: var(--accent);
}

.neu-toggle input:checked + .neu-toggle-track .neu-toggle-thumb {
  transform: translateX(28px);
  box-shadow:
    -2px -2px 4px rgba(255,255,255,0.2),
     2px  2px 4px rgba(0,0,0,0.25);
}
```

## 8. Navigation Bar

```css
.neu-nav {
  background: var(--bg);
  border-radius: var(--radius-lg);
  padding: 8px;
  display: flex;
  gap: 4px;
  box-shadow:
    -6px -6px 14px var(--shadow-light),
     6px  6px 14px var(--shadow-dark);
}

.neu-nav-item {
  padding: 10px 20px;
  border-radius: var(--radius-md);
  font-family: 'Nunito', 'Quicksand', sans-serif;
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-secondary);
  cursor: pointer;
  border: none;
  background: transparent;
  transition: var(--transition-all);
}

.neu-nav-item:hover {
  color: var(--text-primary);
  background: var(--bg);
  box-shadow:
    -3px -3px 6px var(--shadow-light),
     3px  3px 6px var(--shadow-dark);
}

/* Active item is PRESSED to show selection */
.neu-nav-item.active {
  color: var(--accent);
  background: var(--bg);
  box-shadow:
    inset -3px -3px 6px var(--shadow-light),
    inset  3px  3px 6px var(--shadow-dark);
}
```

## 9. Progress Bar

```css
.neu-progress {
  background: var(--bg);
  border-radius: var(--radius-xl);
  height: 14px;
  padding: 3px;
  box-shadow:
    inset -2px -2px 5px var(--shadow-light),
    inset  2px  2px 5px var(--shadow-dark);
}

.neu-progress-fill {
  height: 100%;
  border-radius: var(--radius-xl);
  background: linear-gradient(90deg, var(--accent), var(--accent-light));
  box-shadow:
    -2px -2px 4px var(--shadow-light),
     2px  2px 4px var(--shadow-dark);
  transition: width 0.5s ease;
}
```

## 10. Avatar / Icon Container

```css
.neu-avatar {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-circle);
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-shadow:
    -4px -4px 10px var(--shadow-light),
     4px  4px 10px var(--shadow-dark);
}

.neu-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: var(--radius-circle);
}
```

## 11. Slider / Range

```css
.neu-slider {
  -webkit-appearance: none;
  width: 100%;
  height: 10px;
  background: var(--bg);
  border-radius: var(--radius-xl);
  outline: none;
  box-shadow:
    inset -2px -2px 5px var(--shadow-light),
    inset  2px  2px 5px var(--shadow-dark);
}

.neu-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 26px;
  height: 26px;
  border-radius: var(--radius-circle);
  background: var(--bg);
  cursor: pointer;
  border: none;
  box-shadow:
    -3px -3px 6px var(--shadow-light),
     3px  3px 6px var(--shadow-dark);
  transition: var(--transition-shadow);
}

.neu-slider::-webkit-slider-thumb:hover {
  box-shadow:
    -4px -4px 8px var(--shadow-light),
     4px  4px 8px var(--shadow-dark),
     0 0 12px var(--accent-glow);
}
```

## 12. Color Palette Suggestions

### Light Mode Palettes

| Name | Base | Light Shadow | Dark Shadow | Accent |
|------|------|-------------|------------|--------|
| **Classic Gray** | `#e0e5ec` | `#ffffff` | `#a3b1c6` | `#6c63ff` |
| **Warm Cream** | `#e8e0d4` | `#fffaf2` | `#b8ab98` | `#e07c4c` |
| **Cool Blue** | `#dce3ed` | `#f5faff` | `#a8b5c9` | `#3b82f6` |
| **Sage Green** | `#dde5df` | `#f5faf6` | `#a8b5aa` | `#059669` |
| **Lavender** | `#e2dde8` | `#f8f4fc` | `#ada3bb` | `#8b5cf6` |
| **Blush Pink** | `#e8dde0` | `#fcf5f7` | `#bba8ad` | `#ec4899` |

### Dark Mode Palettes

| Name | Base | Light Shadow | Dark Shadow | Accent |
|------|------|-------------|------------|--------|
| **Midnight** | `#2d2d3a` | `rgba(255,255,255,0.05)` | `rgba(0,0,0,0.5)` | `#7c6aff` |
| **Charcoal** | `#303030` | `rgba(255,255,255,0.07)` | `rgba(0,0,0,0.6)` | `#60a5fa` |
| **Deep Ocean** | `#1e2a3a` | `rgba(255,255,255,0.04)` | `rgba(0,0,0,0.5)` | `#38bdf8` |
| **Forest Night** | `#1e2e24` | `rgba(255,255,255,0.04)` | `rgba(0,0,0,0.5)` | `#34d399` |

## 13. Page-Level Reset & Base

```css
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700&display=swap');

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Nunito', sans-serif;
  background: var(--bg);
  color: var(--text-primary);
  min-height: 100vh;
  line-height: 1.6;
  letter-spacing: 0.01em;
  -webkit-font-smoothing: antialiased;
}
```

## 14. Staggered Page Load Animation

```css
@keyframes neu-fade-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.neu-animate {
  animation: neu-fade-in 0.5s ease forwards;
  opacity: 0;
}

/* Stagger children */
.neu-stagger > *:nth-child(1) { animation-delay: 0.05s; }
.neu-stagger > *:nth-child(2) { animation-delay: 0.1s; }
.neu-stagger > *:nth-child(3) { animation-delay: 0.15s; }
.neu-stagger > *:nth-child(4) { animation-delay: 0.2s; }
.neu-stagger > *:nth-child(5) { animation-delay: 0.25s; }
.neu-stagger > *:nth-child(6) { animation-delay: 0.3s; }
.neu-stagger > *:nth-child(7) { animation-delay: 0.35s; }
.neu-stagger > *:nth-child(8) { animation-delay: 0.4s; }
```
