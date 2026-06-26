/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f0ff',
          100: '#e4e4ff',
          500: '#7F77DD',
          600: '#6b63cc',
          700: '#5a52b8',
        },
      },
    },
  },
  plugins: [],
}
