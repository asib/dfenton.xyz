/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'selector',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dark-mode-text': '#f4a460',
        'dark-mode-bg': '#1f1f1f',
        'light-mode-text': '#05182a',
        'light-mode-bg': '#ffffff'
      }
    },
  },
  plugins: [],
}

