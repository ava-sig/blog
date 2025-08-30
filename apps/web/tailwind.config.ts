import type { Config } from 'tailwindcss'
import typography from '@tailwindcss/typography'

export default {
  darkMode: 'class',
  content: [
    './app.vue',
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.{vue,js,ts}',
    './pages/**/*.{vue,js,ts}',
    './composables/**/*.{js,ts}',
  ],
  theme: {
    extend: {
      colors: {
        base: {
          bg: '#0b0b0f',
          panel: '#0f0f14',
          border: '#232329',
          text: '#e5e7eb',
          sub: '#a1a1aa'
        }
      },
      transitionDuration: {
        fast: '120ms',
        normal: '180ms',
        slow: '260ms',
      },
      transitionTimingFunction: {
        entrance: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        exit: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(0,0,0,0.2)',
        lift: '0 8px 24px rgba(0,0,0,0.25)'
      },
      borderRadius: {
        xl: '12px'
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        'fade-up': 'fade-up 180ms cubic-bezier(0.22, 1, 0.36, 1)'
      }
    }
  },
  plugins: [typography],
} satisfies Config
