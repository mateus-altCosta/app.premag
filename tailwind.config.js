/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        grafite: 'var(--grafite)',
        aco: 'var(--aco)',
        concreto: 'var(--concreto)',
        papel: 'var(--papel)',
        ambar: 'var(--ambar)',
        linha: 'var(--linha)',
        ok: 'var(--ok)',
        alerta: 'var(--alerta)',
        info: 'var(--info)',
        muted: 'var(--muted)',
        aviso: 'var(--aviso)',
      },
      fontFamily: {
        disp: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        body: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
