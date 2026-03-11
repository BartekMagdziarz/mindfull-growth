---
name: neomorphism-frontend
description: >
  Create beautiful, production-grade frontend interfaces in the neumorphic (neomorphic / soft UI) design style.
  Use this skill when the user asks to build web components, pages, artifacts, dashboards, apps, or UI elements
  in neumorphism, neomorphism, soft UI, or "soft design" style. Also use when the user references extruded,
  embossed, or "pushed/pressed" UI elements, or asks for tactile, 3D-like interfaces with soft shadows.
  Generates polished, accessible HTML/CSS/JS or React code with correct dual-shadow techniques, proper color
  math, and consistent light-source physics. Do NOT use for flat design, glassmorphism, brutalist, or other
  non-neumorphic design styles.
---

# Neomorphism Frontend Design Skill

Create distinctive, tactile, production-grade frontend interfaces using the neumorphic (soft UI) design language. Every element should feel like it's physically extruded from — or pressed into — the background surface.

## What Is Neumorphism

Neumorphism sits between skeuomorphism and flat design. Elements share the same color as their background and use **dual box-shadows** (one light, one dark) to create the illusion of soft 3D depth. Elements appear *connected* to the background — extruded outward or pressed inward — rather than floating above it like Material Design.

## Design Thinking

Before writing code, decide:

1. **Purpose & audience**: What does this interface do? Who uses it?
2. **Light or dark mode**: Light mode uses off-white/light-gray backgrounds (e.g. `#e0e5ec`). Dark mode uses deep grays (e.g. `#2d2d3a`). Never pure white or pure black — you need room for both lighter *and* darker shadows.
3. **Component inventory**: Which elements are raised (convex), pressed (concave/inset), or flat? Plan your elevation hierarchy.
4. **Accent strategy**: Neumorphism is monochromatic by nature. Pick ONE accent color for CTAs and interactive highlights to solve the low-contrast problem.

## Core Neumorphic CSS Principles

Before coding, consult `references/css-patterns.md` for copy-pasteable CSS variable systems and shadow formulas.

### The Shadow Formula

Every neumorphic element needs **two box-shadows** applied simultaneously — one light highlight and one dark shadow, on opposite sides:

```css
/* RAISED (convex) — element protrudes from background */
box-shadow:
  -6px -6px 14px rgba(255, 255, 255, 0.7),   /* light: top-left */
   6px  6px 14px rgba(0, 0, 0, 0.15);          /* dark: bottom-right */

/* PRESSED (concave/inset) — element sinks into background */
box-shadow:
  inset -3px -3px 7px rgba(255, 255, 255, 0.5),
  inset  3px  3px 7px rgba(0, 0, 0, 0.12);

/* FLAT — no shadows, same background, used for less important surfaces */
box-shadow: none;
```

### Mandatory Rules

1. **Element background = parent background.** This is non-negotiable. The entire illusion breaks if the element has a different background color than its container.
2. **Never use pure white or pure black backgrounds.** You need headroom in both directions for the highlight and shadow. Ideal light-mode base: `#e0e5ec`, `#dde1e7`, or `#ecf0f3`. Ideal dark-mode base: `#2d2d3a`, `#1e1e2e`, or `#303040`.
3. **Single, consistent light source.** All shadows must "fall" in the same direction across every element. Standard convention: light comes from top-left (highlight shadow offset is negative, dark shadow offset is positive).
4. **Border-radius is generous.** Neumorphism favors soft, rounded corners. Use 12px–50px depending on element size. Sharper corners break the soft aesthetic.
5. **Shadows are in pairs.** One positive-offset (dark), one negative-offset (light). Never use a single shadow.
6. **Avoid hard borders.** Use `border: none` or at most a very subtle 1px semi-transparent border for additional definition.
7. **Transitions for state changes.** Always animate between raised and pressed states using `transition: box-shadow 0.25s ease, transform 0.15s ease`.

### Color Math

For any base background color:
- **Light shadow**: Lighten the base by 15–25% (or use white at 50–70% opacity)
- **Dark shadow**: Darken the base by 15–25% (or use black at 10–20% opacity)

Use CSS custom properties for consistency:

```css
:root {
  --bg: #e0e5ec;
  --shadow-light: #ffffff;
  --shadow-dark: #a3b1c6;
  --shadow-light-opacity: 0.7;
  --shadow-dark-opacity: 0.5;
  --radius: 16px;
  --distance: 6px;
  --blur: 14px;
  --accent: #6c63ff;
  --text-primary: #2d3436;
  --text-secondary: #636e72;
}
```

### Surface Types

| Surface | Shadow | Use For |
|---------|--------|---------|
| **Convex (raised)** | Outer dual shadows | Cards, buttons (default), containers |
| **Concave (pressed)** | `inset` dual shadows | Input fields, active buttons, wells |
| **Flat** | No shadow, same bg | Inactive/disabled states, backgrounds |
| **Convex + gradient** | Outer shadows + subtle gradient matching light direction | Sliders, toggles, premium elements |

### Gradient Surfaces

For extra realism on convex elements, add a subtle linear gradient that follows the light source direction:

```css
/* Convex surface with gradient — light comes from top-left */
background: linear-gradient(145deg, #e6ebf2, #cacfd5);
box-shadow: -6px -6px 14px var(--shadow-light), 6px 6px 14px var(--shadow-dark);
```

For concave surfaces, reverse the gradient direction:
```css
/* Concave surface with gradient */
background: linear-gradient(145deg, #cacfd5, #e6ebf2);
box-shadow: inset -3px -3px 7px var(--shadow-light), inset 3px 3px 7px var(--shadow-dark);
```

## Component Patterns

Consult `references/css-patterns.md` for complete, production-ready CSS for these components:

### Buttons
- Default state: convex (raised)
- Hover state: slightly more pronounced shadows (increase distance by 1–2px)
- Active/pressed state: switch to inset shadows (concave)
- Always include `transition: box-shadow 0.25s ease, transform 0.1s ease`
- Add `transform: scale(0.98)` on active for tactile feedback

### Cards
- Use convex shadows with generous padding (24–32px)
- Round corners (16–24px radius)
- Can nest concave "wells" inside for inset content areas
- Combine convex outer card with concave inner sections for layered depth

### Input Fields
- Default state: concave (pressed inward) — this is the signature neumorphic input look
- Focus state: add a subtle colored inner glow or accent-colored border
- Always ensure text contrast is sufficient (use dark text on light backgrounds)

### Toggles & Switches
- Track: concave (inset shadow)
- Thumb/knob: convex (raised) with extra shadow intensity
- Animate thumb position with `transform: translateX()`

### Navigation
- Nav container: convex raised surface
- Active nav item: concave (pressed) to show selection
- Hover state: slightly more pronounced convex shadow

### Progress Bars / Sliders
- Track: concave inset well
- Fill/thumb: convex raised element, optionally with accent color gradient

## Accessibility — CRITICAL

Neumorphism has known accessibility weaknesses. You MUST address them:

1. **Contrast**: The monochromatic palette creates low contrast between elements and background. ALWAYS ensure:
   - Text meets WCAG AA contrast ratio (4.5:1 for body, 3:1 for large text)
   - Use a darker text color than you think you need (e.g. `#2d3436` not `#636e72` for body text)
   - Interactive elements have additional visual indicators beyond just shadows (icons, labels, accent colors)

2. **Clickable elements must be obvious**: Don't rely solely on shadow depth to indicate interactivity.
   - Add accent color highlights, underlines, or icons to CTAs
   - Buttons should have visible text labels, not just shadow differences
   - Provide `:focus-visible` outlines for keyboard navigation (use accent color)

3. **Active/pressed states must be distinct**: When a button is pressed, the inset shadow alone may not be sufficient feedback.
   - Add color change, text change, or icon change alongside the shadow transition
   - Include `transform: scale(0.98)` for tactile feedback

4. **Don't fight the style — enhance it**: Add a single accent color to break the monochrome and guide user attention to primary actions.

## Typography

- Use clean, modern sans-serif fonts that complement the soft aesthetic: **Nunito, Quicksand, Poppins, DM Sans, Outfit, Plus Jakarta Sans, Manrope**.
- Avoid overly geometric or sharp fonts (they clash with the softness).
- Avoid generic defaults (Inter, Roboto, Arial, system fonts).
- Use proper weight hierarchy: 300 light for secondary, 400/500 regular for body, 600/700 for headings.
- Letter-spacing: slightly open (0.01em–0.03em) for a refined, airy feel.
- Import from Google Fonts: `<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700&display=swap" rel="stylesheet">`

## Dark Mode Neumorphism

Dark mode neumorphism requires different shadow colors:

```css
:root[data-theme="dark"] {
  --bg: #2d2d3a;
  --shadow-light: rgba(255, 255, 255, 0.05);
  --shadow-dark: rgba(0, 0, 0, 0.5);
  --text-primary: #e0e0e0;
  --text-secondary: #a0a0a0;
  --accent: #7c6aff;
}
```

In dark mode:
- Light shadow becomes very subtle (barely visible white glow)
- Dark shadow becomes more prominent
- The overall effect is moodier and more dramatic
- Accent colors should be slightly brighter than in light mode

## Animation & Motion

- **State transitions**: Always animate shadow changes: `transition: box-shadow 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)`
- **Hover effects**: Subtly increase shadow distance/blur on hover for a "lifting" feel
- **Press effects**: Transition from outer to inset shadows on click/active
- **Page load**: Use staggered fade-in with subtle upward movement (`transform: translateY(10px) → 0`)
- **Avoid heavy motion**: Neumorphism is about calm, tactile subtlety. No flashy animations or bouncing effects. Easing curves should be smooth and natural.

## Implementation Notes

### HTML/CSS Artifacts
- Use CSS custom properties extensively for theming
- All shadow values should reference CSS variables for easy tuning
- Include both light and dark mode support where appropriate
- Use `@media (prefers-color-scheme: dark)` for automatic theme detection

### React Artifacts
- Use Tailwind utility classes for layout; use inline styles or `<style>` blocks for neumorphic shadows (since Tailwind doesn't include neumorphic shadow utilities)
- Create reusable shadow class names: `.neu-raised`, `.neu-pressed`, `.neu-flat`
- Manage theme state with `useState` and CSS custom properties
- Use `transition-all duration-300` from Tailwind for state changes

### Quality Checklist Before Delivery
- [ ] Element backgrounds match parent backgrounds
- [ ] All shadows use consistent light-source direction
- [ ] Shadows are always in pairs (light + dark)
- [ ] Border-radius is generous and consistent
- [ ] Interactive elements have clear hover/active/focus states
- [ ] Text contrast meets WCAG AA
- [ ] At least one accent color guides user attention
- [ ] Transitions animate shadow and transform changes
- [ ] Typography uses a distinctive, soft-aesthetic font (not defaults)
- [ ] No pure white or pure black backgrounds anywhere

Remember: Neumorphism done well feels like touching a real, sculpted surface. Every shadow tells the user "this element is part of this surface." Commit fully to the physical metaphor and execute with precision.
