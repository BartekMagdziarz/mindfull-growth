/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--color-background)',
        primary: 'var(--color-primary)',
        'primary-strong': 'var(--color-primary-strong)',
        'primary-soft': 'var(--color-primary-soft)',
        'on-primary': 'var(--color-on-primary)',
        surface: 'var(--color-surface)',
        'surface-variant': 'var(--color-surface-variant)',
        section: 'var(--color-section)',
        'section-strong': 'var(--color-section-strong)',
        'on-surface': 'var(--color-on-surface)',
        'on-surface-variant': 'var(--color-on-surface-variant)',
        outline: 'var(--color-outline)',
        chip: 'var(--color-chip)',
        'chip-border': 'var(--color-chip-border)',
        'chip-text': 'var(--color-chip-text)',
        focus: 'var(--color-focus-ring)',
        nav: 'var(--color-nav)',
        error: 'var(--color-error)',
        'on-error': 'var(--color-on-error)',
        'error-container': 'var(--color-error-container)',
        'on-error-container': 'var(--color-on-error-container)',
      },
      borderRadius: {
        'md': '0.5rem',
        'lg': '1rem',
      },
      boxShadow: {
        'elevation-1': '0px 1px 2px 0px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15)',
        'elevation-2': '0px 1px 2px 0px rgba(0, 0, 0, 0.3), 0px 2px 6px 2px rgba(0, 0, 0, 0.15)',
        'elevation-3': '0px 1px 3px 0px rgba(0, 0, 0, 0.3), 0px 4px 8px 3px rgba(0, 0, 0, 0.15)',
      },
    },
  },
  plugins: [],
}
