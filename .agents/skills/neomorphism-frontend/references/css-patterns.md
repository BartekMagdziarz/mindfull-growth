# Sky Mist CSS patterns

These patterns use the existing Mindful Growth design system. Import the
product styles and put `mg-design-v2` on the containing surface. Do not redefine
the token palette per component.

```css
.cloud-card {
  background: var(--mg-color-surface);
  color: var(--mg-color-ink);
  border-radius: var(--mg-radius-lg);
  box-shadow: var(--mg-shadow-raised-sm);
  padding: var(--mg-space-4);
}
/* Content nesting becomes lighter; it does not add another shadow. */
.cloud-card__field {
  background: var(--mg-color-mist);
  border-radius: var(--mg-radius-md);
  padding: var(--mg-space-3);
}
.cloud-card__input {
  background: var(--mg-color-paper);
  color: var(--mg-color-ink);
  border: 1px solid var(--mg-color-field-border);
  border-radius: var(--mg-radius-md);
}
.cloud-switch {
  background: var(--mg-color-surface);
  border-radius: var(--mg-radius-pill);
  box-shadow: var(--mg-shadow-inset-sm);
}
.cloud-switch [aria-pressed="true"] {
  background: var(--mg-color-paper);
  color: var(--mg-color-primary-strong);
  box-shadow: var(--mg-shadow-raised-sm);
}
.cloud-action {
  background: var(--mg-color-primary-fill);
  color: var(--mg-color-on-primary);
  border-radius: var(--mg-radius-pill);
}
.cloud-action:hover {
  background: var(--mg-color-primary-fill-hover);
}
```

Prefer the existing `mg-v2-*` classes and controls when their anatomy fits.
Keep keyboard focus visible with the shared focus treatment. Respect reduced
motion. Use the product's existing theme; do not introduce automatic dark-mode
recoloring or install font dependencies for a component.

For classical neumorphism outside Mindful Growth only, a raised surface can use
negative-offset light and positive-offset dark shadows; an inset control uses
the corresponding inset pair. Choose colors from that project's actual
background and keep one light direction. This fallback does not override Sky
Mist's brighter nested surfaces or its first-level-only card depth.
