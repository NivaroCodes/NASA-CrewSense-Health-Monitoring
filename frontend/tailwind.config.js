/** @type {import('tailwindcss').Config} */
// Orbital Instrument design system. Components reference these token names only; no raw hex values in components.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-base': '#F4F3EF', // mineral white page background
        'bg-surface': '#FFFFFF', // cards and surfaces
        'bg-surface-raised': '#FAFAF8', // inset panels and table headers
        'border-subtle': '#E2E1DB',
        'text-primary': '#202321', // graphite
        'text-secondary': '#858780', // stone gray
        'accent-orange': '#D97745', // primary accent (burnt orange)
        'accent-teal': '#568C83', // secondary accent (muted teal), also focus and links
        'accent-red': '#C94F4F', // critical alerts only
        'status-muted': '#858780',
      },
      fontFamily: {
        mono: ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        sans: ['Geist', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '10px',
        chip: '6px',
      },
    },
  },
  plugins: [],
};
