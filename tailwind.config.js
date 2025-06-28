/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fdf8f3',
          100: '#faf0e6',
          200: '#f4dcc6',
          300: '#edc49f',
          400: '#e4a574',
          500: '#D2691E', // Warm peach/coral from your palette
          600: '#c55a1a',
          700: '#a64a16',
          800: '#873c13',
          900: '#6d3010',
        },
        secondary: {
          50: '#f9f7f4',
          100: '#f3efe8',
          200: '#e6ddd0',
          300: '#d4c5b0',
          400: '#bfa688',
          500: '#A0826D', // Warm brown from your palette
          600: '#8f7460',
          700: '#766050',
          800: '#5f4d42',
          900: '#4d3f36',
        },
        accent: {
          50: '#fef7f3',
          100: '#fdeee6',
          200: '#fad5c4',
          300: '#f6b89b',
          400: '#f19066',
          500: '#E85A4F', // Coral red from your palette
          600: '#d94a3e',
          700: '#b53d33',
          800: '#94342e',
          900: '#7a2e2a',
        },
        neutral: {
          50: '#fafaf9',
          100: '#f4f4f3',
          200: '#e5e5e4',
          300: '#d1d1cf',
          400: '#b0b0ad',
          500: '#8a8a86',
          600: '#6f6f6b',
          700: '#5a5a56',
          800: '#4a4a47',
          900: '#3f3f3c',
        },
        charcoal: {
          50: '#f6f6f5',
          100: '#e7e7e6',
          200: '#d1d1cf',
          300: '#b0b0ad',
          400: '#888885',
          500: '#6c6c69',
          600: '#5a5a57',
          700: '#4a4a47',
          800: '#404040', // Dark charcoal from your palette
          900: '#2d2d2b',
        },
        cream: {
          50: '#fefefe',
          100: '#fefcfa',
          200: '#fcf8f3',
          300: '#f9f2ea',
          400: '#f4e8d9',
          500: '#F5E6D3', // Light cream from your palette
          600: '#e8d4bb',
          700: '#d4bb9a',
          800: '#b89d7a',
          900: '#9a8264',
        },
        success: {
          500: '#22C55E',
        },
        warning: {
          500: '#F59E0B',
        },
        error: {
          500: '#EF4444',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      spacing: {
        '18': '4.5rem',
        '68': '17rem',
        '84': '21rem',
        '96': '24rem',
        '128': '32rem',
      },
    },
  },
  plugins: [],
};