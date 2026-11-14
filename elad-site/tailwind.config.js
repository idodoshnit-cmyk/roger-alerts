/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // The only four colors on the site, plus tints of them.
        navy: { DEFAULT: '#10243E', 700: '#1B3354', 600: '#3A4D66', 500: '#4F617A', 200: '#C9D2DE', 100: '#E3E8EF' },
        paper: '#F6F8FB',
        blue: { DEFAULT: '#2F80ED', 300: '#8DB8F5', 100: '#E4EEFC' },
        wa: { DEFAULT: '#25D366', 600: '#1FBF5B' },
      },
      fontFamily: {
        head: ['Heebo', 'system-ui', 'sans-serif'],
        body: ['Assistant', 'system-ui', 'sans-serif'],
      },
      maxWidth: { page: '72rem' },
    },
  },
  plugins: [],
};
