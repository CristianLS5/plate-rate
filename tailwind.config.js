/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts,scss}'],
  theme: {
    extend: {
      colors: {
        construct: {
          navy: '#0f1729',
          'navy-deep': '#0b1220',
          vermillion: '#e85d2c',
          yellow: '#f5c518',
          teal: '#2ee6c8',
          violet: '#6b4fbb',
          'on-dark': '#f8fafc',
        },
      },
    },
  },
  plugins: [],
};
