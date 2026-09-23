/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./screens/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
          800: '#166534',
          900: '#14532D',
        },
        secondary: {
          50: '#FEFBF3',
          100: '#FEF7E6',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
        },
        earth: {
          50: '#F8F5F0',
          100: '#F0EBE0',
          300: '#C5B8A0',
          500: '#A3A3A3',
          700: '#6B7280',
          800: '#374151',
          900: '#1F2937',
        }
      },
      fontFamily: {
        'sans': ['System'],
        'hindi': ['NotoSansDevanagari', 'System'],
      }
    },
  },
  plugins: [],
}