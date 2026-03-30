/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#060c13',
        panel: '#0b1420',
        surface: '#101e2c',
        border: '#182840',
        text: '#b8ccd8',
        muted: '#3a5568',
        dim: '#6a8090',
        green: '#00e07a',
        red: '#ff3356',
        blue: '#1890ff',
        gold: '#f0ae18',
        cyan: '#00b8cc',
      },
      fontFamily: {
        mono: ['Consolas', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
}
