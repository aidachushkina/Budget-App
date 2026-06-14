/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Restrained palette: warm paper background, ink text, single accent.
        paper: '#fafaf9',
        ink: {
          DEFAULT: '#1c1917',
          soft: '#44403c',
          faint: '#78716c',
        },
        line: '#e7e5e4',
        accent: {
          DEFAULT: '#0f766e',
          soft: '#ccfbf1',
        },
        spend: '#b91c1c',
        income: '#15803d',
      },
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
