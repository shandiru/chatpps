/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Georgia', 'serif'],
        mono: ['Courier New', 'monospace'],
      },
      colors: {
        cream: '#f5f0e8',
        parchment: '#ede8dc',
        ink: '#1a1a18',
        inklight: '#3d3d38',
        sepia: '#8b7355',
        gold: '#c9a84c',
        rust: '#8b3a2a',
        sage: '#5a7a5a',
        border: '#c8bfa8',
      }
    }
  },
  plugins: []
}
