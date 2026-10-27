/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        grafite: '#12151A',
        aco: '#5A636C',
        concreto: '#EDEBE6',
        papel: '#FBFBFA',
        ambar: '#F2A900',
        linha: '#D8D4CB',
        ok: '#1F7A4D',
        alerta: '#B42318',
        info: '#2D6A9F',
      },
      fontFamily: {
        disp: ['"Archivo Narrow"', 'Arial Narrow', 'sans-serif'],
        body: ['Archivo', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(18, 21, 26, 0.05), 0 8px 24px rgba(18, 21, 26, 0.04)',
        lift: '0 10px 30px rgba(18, 21, 26, 0.12)',
        shell: '0 30px 80px rgba(0, 0, 0, 0.45)',
      },
      borderRadius: {
        card: '14px',
        sheet: '20px',
      },
      keyframes: {
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
      },
      animation: {
        'rise-in': 'rise-in 0.35s ease-out',
        'pulse-dot': 'pulse-dot 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
