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
        'sun-shadow': '-3rem 2rem 0.15rem rgba(from var(--light-mode-highlight) r g b / 0.5)',
        'sun-shadow-dark': '-3rem 2rem 0.15rem rgba(from var(--dark-mode-highlight) r g b / 0.16)'
      },
      keyframes: {
        flash: {
          '0%, 100%': { opacity: '0' },
          '50%': { opacity: '1' },
        },
        'dark-flash': {
          '0%, 100%': { opacity: '0' },
          '50%': { opacity: '0.7' },
        },
        'bounce-y': {
          '0%': {
            transform: 'translateY(0%)',
          },

          '4%': {
            transform: 'translateY(-1.54%)',
          },

          '8%': {
            transform: 'translateY(-0.66%)',
          },

          '18%': {
            transform: 'translateY(-6.25%)',
          },

          '26%': {
            transform: 'translateY(-1.63%)',
          },

          '46%': {
            transform: 'translateY(-24.98%)',
          },

          '64%': {
            transform: 'translateY(-1.99%)',
          },

          '76%': {
            transform: 'translateY(-56.44%)',
          },

          '88%': {
            transform: 'translateY(-89.11%)',
          },

          '100%': {
            transform: 'translateY(-100%)',
          }
        }
      }
    },
  },
  future: {
    hoverOnlyWhenSupported: true,
  },
  plugins: [],
}

