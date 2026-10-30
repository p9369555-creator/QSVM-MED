/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        radiology: {
          bg: '#050607',
          panel: '#0E1114',
          subpanel: '#14181E',
          border: '#1F242D',
          hover: '#272E3A',
          amber: '#F59E0B',
          amberDark: '#B45309',
          amberGlow: 'rgba(245, 158, 11, 0.25)',
          text: '#D1D5DB',
          muted: '#9CA3AF',
        },
        coral: {
          50: '#FFF1F2',
          100: '#FFE4E6',
          200: '#FECDD3',
          300: '#FDA4AF',
          400: '#FB7185',
          500: '#F02F34', // Bowie Coral Signature
          600: '#E11D48',
          700: '#BE123C',
          850: '#881337',
          900: '#4C0519',
        },
        sand: {
          50: '#FDFBF7',
          100: '#F9F5EE',
          200: '#F2E8DC',
          300: '#E7D3BB', // Signature Warm Sand
          400: '#D5BC9C',
          500: '#BA9C76',
          600: '#9B7E58',
          700: '#7A6242',
        },
        quantum: {
          cyan: '#38BDF8',
          violet: '#818CF8',
          neon: '#06B6D4',
          glow: 'rgba(240, 47, 52, 0.25)',
        },
        obsidian: {
          950: '#070A10',
          900: '#0C111C',
          850: '#111726',
          800: '#161F33',
          700: '#202C48',
          600: '#2F3F66',
        }
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'Outfit', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'quantum-glow': '0 0 25px -5px rgba(240, 47, 52, 0.35)',
        'cyan-glow': '0 0 25px -5px rgba(56, 189, 248, 0.3)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      }
    },
  },
  plugins: [],
}
