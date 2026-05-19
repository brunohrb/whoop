/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'whoop-green': '#00D4A0',
        'whoop-yellow': '#F5C518',
        'whoop-red': '#FF4444',
        'whoop-blue': '#4FC3F7',
        'whoop-purple': '#9C59D1',
        'surface': '#1A1A1A',
        'surface-2': '#242424',
        'surface-3': '#2E2E2E',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      animation: {
        'spin-slow': 'spin 2s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
