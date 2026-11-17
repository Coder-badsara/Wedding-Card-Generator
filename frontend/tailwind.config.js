/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#fdfbf7',
          100: '#fbf7ee',
          200: '#f5ebd3',
          300: '#eedfb8',
          400: '#e1c682',
          500: '#d4af37',
          600: '#bf9e32',
          700: '#9f832a',
          800: '#7f6921',
          900: '#68561b',
        },
        maroon: {
          50: '#fcf4f5',
          100: '#fae9eb',
          200: '#f4c7cd',
          300: '#eea5af',
          400: '#e16273',
          500: '#800020',
          600: '#73001d',
          700: '#600018',
          800: '#4d0013',
          900: '#3f0010',
        }
      }
    },
  },
  plugins: [],
}
