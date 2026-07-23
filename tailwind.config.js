/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: {
          950: '#080b14',
          900: '#0b1018',
          850: '#0f1521',
          800: '#141c2b',
          700: '#1c2738',
          600: '#28344a',
          500: '#3a4a66',
          400: '#5a6c8c',
          300: '#8492ad',
          200: '#b4becf',
          100: '#dde3ee',
          50: '#f2f5fa',
        },
        accent: {
          50: '#eef9ff',
          100: '#d6f0ff',
          200: '#aee5ff',
          300: '#74d4ff',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
        jade: {
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        amber2: {
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        rose2: {
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
        },
      },
      keyframes: {
        'flow-dash': {
          to: { 'stroke-dashoffset': '-24' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'soft-pulse': {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        'flow-dash': 'flow-dash 0.9s linear infinite',
        'fade-up': 'fade-up 0.45s cubic-bezier(0.22,1,0.36,1) both',
        'soft-pulse': 'soft-pulse 2.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
