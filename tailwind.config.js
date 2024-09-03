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
        // Also in index.css
        'dark-mode-text': '#f4a460',
        'dark-mode-highlight': '#f0e891',
        'dark-mode-bg': '#1f1f1f',
        'light-mode-text': '#0c2231',
        'light-mode-bg': '#efe6ee',
        'light-mode-highlight': '#8a4f7d'
      },
      transitionTimingFunction: {
      'bounce': 'cubic-bezier(.47, 1.64, .41, .8)',
      },
      dropShadow: {
        'sun-shadow': '-3rem 2rem 1px rgba(from var(--dark-mode-highlight) r g b / 0.01)'
      }
    },
  },
  future: {
    hoverOnlyWhenSupported: true,
  },
  plugins: [],
}

