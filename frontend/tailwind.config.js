/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#14151A',      // background - deep, near-black navy-ink
        surface: '#1E2027',  // cards / panels
        surface2: '#262832',
        groove: '#3A3D4A',   // hairlines / dividers, like a record's grooves
        label: '#E8A33D',    // vinyl-label amber - primary accent
        tape: '#4FA8A0',     // cassette-tape teal - secondary accent
        cream: '#F2EFE9',    // primary text
        dim: '#9A9CAE',      // secondary text
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Inter"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
