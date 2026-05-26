/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#2D7A5F',
          light: '#E8F5F0',
        }
      }
    },
  },
  plugins: [],
}
