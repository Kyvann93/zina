/** @type {import('tailwindcss').Config} */
module.exports = {
  // Scan all templates and JS files so unused classes are purged
  content: [
    './templates/**/*.html',
    './static/js/**/*.js',
  ],
  corePlugins: {
    // Disable preflight (CSS reset) — we have our own base styles in ordering.css / admin.css
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#581b1f',
          light:   '#a0656b',
          dark:    '#3d1215',
        },
      },
      fontFamily: {
        sans:    ['Poppins', 'Inter', 'ui-sans-serif', 'system-ui'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
