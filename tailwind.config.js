/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        studio: {
          950: '#0b0d11',
          900: '#12151c',
          850: '#171b24',
          800: '#1f2430',
          700: '#2b3242',
          600: '#3d465c',
          500: '#56627e',
          400: '#7986a3',
          300: '#a3aec4',
          200: '#cfd7e6',
          100: '#edf1f7',
        },
        accent: {
          amber: '#f59e0b',
          emerald: '#10b981',
          rose: '#f43f5e',
          sky: '#0ea5e9',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      }
    },
  },
  plugins: [],
}
