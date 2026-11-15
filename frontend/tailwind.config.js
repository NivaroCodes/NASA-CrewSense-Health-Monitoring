/** @type {import('tailwindcss').Config} */
// CrewSense calm design system (sage, amber, clay; Manrope; 18px cards; pill buttons). Components reference these token names only; no raw hex values in components.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-base': '#F4F1EA', // warm paper background
        'bg-surface': '#FFFFFF', // cards and surfaces
        'bg-surface-raised': '#FAF8F3', // inset panels and table headers
        'border-subtle': '#E6E1D6',
        'text-primary': '#24221E', // warm ink
        'text-secondary': '#7A766C', // warm gray
        'accent-orange': '#B8741A', // needs attention (warm amber)
        'accent-teal': '#3F7A62', // primary sage, also focus and links
        'accent-red': '#B5483D', // urgent only
        'status-muted': '#7A766C',
        'status-good': '#3F8A61', // doing well
      },
      fontFamily: {
        mono: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Manrope', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: { card: '0 1px 2px rgba(36,34,30,0.04), 0 4px 14px rgba(36,34,30,0.05)' },
      borderRadius: {
        card: '18px',
        chip: '999px',
      },
    },
  },
  plugins: [],
};
