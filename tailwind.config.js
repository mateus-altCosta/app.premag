/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        grafite: '#15181B',
        aco: '#4A5560',
        concreto: '#E8E6E1',
        papel: '#F7F6F3',
        ambar: '#F2A900',
      },
      fontFamily: {
        disp: ['"Archivo Narrow"', 'Arial Narrow', 'sans-serif'],
        body: ['Archivo', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
