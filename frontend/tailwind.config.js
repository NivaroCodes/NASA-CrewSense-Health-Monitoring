/** @type {import('tailwindcss').Config} */
// Design tokens from the Frontend Specification, Phase 3.
// Components reference these names only; no raw hex values in components.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-base': '#0B0F19',
        'bg-surface': '#141B2D',
        'bg-surface-raised': '#1C2740',
        'border-subtle': '#223049',
        'text-primary': '#FFFFFF',
        'text-secondary': '#8A99AD',
        'accent-cyan': '#00F0FF',
        'accent-amber': '#FFB800',
        'accent-crimson': '#FF2A6D',
        'status-slate': '#5A6B82',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '8px',
        chip: '4px',
      },
      spacing: {
        // 4 px base scale is Tailwind's default; listed here for reference.
      },
    },
  },
  plugins: [],
};
