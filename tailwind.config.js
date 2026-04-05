/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#08080D',
        s1: '#0E0E18',
        s2: '#141422',
        s3: '#1C1C2E',
        accent: '#7C6FF7',
        t1: '#EDEDFF',
        t2: '#9494B3',
        t3: '#52526B',
        emc: '#60A5FA',
        svn: '#F472B6',
        erg: '#A78BFA',
        vnf: '#FB923C',
        premier: '#34D399',
      },
      fontFamily: {
        syne: ['Syne', 'sans-serif'],
        dm: ['DM Sans', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
