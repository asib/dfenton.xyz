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
        'dark-mode-highlight': '#f0e891',
        'dark-mode-bg': '#1f1f1f',
        'light-mode-text': '#0c2231',
        'light-mode-bg': '#efe6ee',
        'light-mode-highlight': '#8a4f7d'
      }
    },
  },
  future: {
    hoverOnlyWhenSupported: true,
  },
  plugins: [],
}

