/** @type {import('tailwindcss').Config} */

/**
 * Build a triplet of Tailwind tokens (`<name>`, `<name>-soft`, `<name>-on`)
 * that point at matching CSS variables in `src/styles/tokens.css`.
 *
 * Lets us declare e.g. the IFS-manager / firefighter / exile roles in a
 * single line each, instead of repeating the `rgb(var(--…) / <alpha-value>)`
 * boilerplate for every variant.
 */
function role(name) {
  return {
    [name]: `rgb(var(--${name}) / <alpha-value>)`,
    [`${name}-soft`]: `rgb(var(--${name}-soft) / <alpha-value>)`,
    [`${name}-on`]: `rgb(var(--${name}-on) / <alpha-value>)`,
  }
}

/** Same idea but for the 9-stop `sky` / `rose` Tailwind families. */
function scale(name) {
  const stops = [50, 100, 200, 300, 400, 500, 600, 700, 800]
  return Object.fromEntries(
    stops.map((s) => [s, `rgb(var(--${name}-${s}) / <alpha-value>)`]),
  )
}

export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--color-background) / <alpha-value>)',
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        'primary-strong': 'rgb(var(--color-primary-strong) / <alpha-value>)',
        'primary-soft': 'rgb(var(--color-primary-soft) / <alpha-value>)',
        'on-primary': 'rgb(var(--color-on-primary) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        'surface-variant': 'rgb(var(--color-surface-variant) / <alpha-value>)',
        'surface-container': 'rgb(var(--color-surface-container) / <alpha-value>)',
        section: 'rgb(var(--color-section) / <alpha-value>)',
        'section-strong': 'rgb(var(--color-section-strong) / <alpha-value>)',
        'on-surface': 'rgb(var(--color-on-surface) / <alpha-value>)',
        'on-surface-variant': 'rgb(var(--color-on-surface-variant) / <alpha-value>)',
        outline: 'rgb(var(--color-outline) / <alpha-value>)',
        chip: 'rgb(var(--color-chip) / <alpha-value>)',
        'chip-border': 'rgb(var(--color-chip-border) / <alpha-value>)',
        'chip-text': 'rgb(var(--color-chip-text) / <alpha-value>)',
        focus: 'rgb(var(--color-focus-ring) / <alpha-value>)',
        nav: 'var(--color-nav)',
        error: 'rgb(var(--color-error) / <alpha-value>)',
        'on-error': 'rgb(var(--color-on-error) / <alpha-value>)',
        'error-container': 'rgb(var(--color-error-container) / <alpha-value>)',
        'on-error-container': 'rgb(var(--color-on-error-container) / <alpha-value>)',
        success: 'rgb(var(--color-success) / <alpha-value>)',
        warning: 'rgb(var(--color-warning) / <alpha-value>)',
        info: 'rgb(var(--color-info) / <alpha-value>)',
        'tertiary-container': 'rgb(var(--color-tertiary-container) / <alpha-value>)',
        'on-tertiary-container': 'rgb(var(--color-on-tertiary-container) / <alpha-value>)',
        'on-section': 'rgb(var(--color-on-section) / <alpha-value>)',
        'on-primary-soft': 'rgb(var(--color-on-primary-soft) / <alpha-value>)',
        'neu-base': 'rgb(var(--neo-surface-base) / <alpha-value>)',
        'neu-top': 'rgb(var(--neo-surface-top) / <alpha-value>)',
        'neu-bottom': 'rgb(var(--neo-surface-bottom) / <alpha-value>)',
        'neu-text': 'rgb(var(--neo-text) / <alpha-value>)',
        'neu-muted': 'rgb(var(--neo-muted) / <alpha-value>)',
        'neu-border': 'rgb(var(--neo-border) / <alpha-value>)',
        'neu-accent-text': 'rgb(var(--neo-accent-text) / <alpha-value>)',

        // --- Override Tailwind's default sky/rose families with our scales.
        // After this, `bg-sky-100` resolves to the same value as `rgb(var(--sky-100))`.
        sky: scale('sky'),
        rose: scale('rose'),

        // --- Semantic role tokens (see src/styles/tokens.css) ----------------
        ...role('ifs-manager'),
        ...role('ifs-firefighter'),
        ...role('ifs-exile'),

        ...role('status-good'),
        ...role('status-warn'),
        ...role('status-bad'),

        ...role('insight-fear'),
        ...role('insight-need'),
        ...role('insight-intention'),
        ...role('insight-memory'),
        ...role('insight-belief'),

        ...role('activity-pleasure'),
        ...role('activity-mastery'),
        ...role('activity-social'),
        ...role('activity-physical'),
        ...role('activity-values'),

        'exercise-discovery': 'rgb(var(--exercise-discovery) / <alpha-value>)',
        'exercise-discovery-soft': 'rgb(var(--exercise-discovery-soft) / <alpha-value>)',
        'exercise-discovery-on': 'rgb(var(--exercise-discovery-on) / <alpha-value>)',
        'exercise-cbt': 'rgb(var(--exercise-cbt) / <alpha-value>)',
        'exercise-cbt-soft': 'rgb(var(--exercise-cbt-soft) / <alpha-value>)',
        'exercise-cbt-on': 'rgb(var(--exercise-cbt-on) / <alpha-value>)',
        'exercise-logo': 'rgb(var(--exercise-logo) / <alpha-value>)',
        'exercise-logo-soft': 'rgb(var(--exercise-logo-soft) / <alpha-value>)',
        'exercise-logo-on': 'rgb(var(--exercise-logo-on) / <alpha-value>)',
        'exercise-ifs': 'rgb(var(--exercise-ifs) / <alpha-value>)',
        'exercise-ifs-soft': 'rgb(var(--exercise-ifs-soft) / <alpha-value>)',
        'exercise-ifs-on': 'rgb(var(--exercise-ifs-on) / <alpha-value>)',

        'rel-polarized': 'rgb(var(--rel-polarized) / <alpha-value>)',
        'rel-allied': 'rgb(var(--rel-allied) / <alpha-value>)',
        'rel-protects': 'rgb(var(--rel-protects) / <alpha-value>)',

        'overlay-scrim': 'rgb(var(--overlay-scrim) / <alpha-value>)',
      },
      borderRadius: {
        'md': '0.5rem',
        'lg': '1rem',
      },
      boxShadow: {
        'neu-raised-sm': '-4px -4px 8px rgb(var(--neo-shadow-light) / 0.8), 4px 4px 8px rgb(var(--neo-shadow-dark) / 0.33)',
        'neu-raised': '-7px -7px 14px rgb(var(--neo-shadow-light) / 0.8), 7px 7px 14px rgb(var(--neo-shadow-dark) / 0.33)',
        'neu-raised-lg': '-9px -9px 18px rgb(var(--neo-shadow-light) / 0.8), 9px 9px 18px rgb(var(--neo-shadow-dark) / 0.33)',
        'neu-pressed-sm': 'inset -2px -2px 5px rgb(var(--neo-shadow-light) / 0.8), inset 2px 2px 5px rgb(var(--neo-shadow-dark) / 0.33)',
        'neu-pressed': 'inset -3px -3px 6px rgb(var(--neo-shadow-light) / 0.8), inset 3px 3px 6px rgb(var(--neo-shadow-dark) / 0.33)',
        'neu-hover': '-3px -3px 6px rgb(var(--neo-shadow-light) / 0.8), 3px 3px 6px rgb(var(--neo-shadow-dark) / 0.33)',
        'neu-flat': '-2px -2px 4px rgb(var(--neo-shadow-light) / 0.8), 2px 2px 4px rgb(var(--neo-shadow-dark) / 0.33)',
      },
    },
  },
  plugins: [],
}
