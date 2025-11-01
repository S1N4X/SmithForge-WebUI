/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        gray: {
          750: '#293548', // Very slightly lighter than gray-800
          850: '#1a202e', // Very slightly darker than gray-800
        },
      },
    },
  },
  plugins: [],
}
