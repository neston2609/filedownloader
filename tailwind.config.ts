import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Retroconsole1981 palette
        bg:    '#f4f1e8',
        bg2:   '#ebe6d6',
        paper: '#fdfbf3',
        ink:   '#0d1117',
        ink2:  '#3d4654',
        mute:  '#6b7484',
        line:  '#d9d2bd',
        retro: {
          lime:  '#c4ec38',
          sky:   '#5bcaff',
          coral: '#ff6b4a',
          lemon: '#ffd23f',
          mint:  '#86d9a8',
          grape: '#b08cff',
        },
      },
      fontFamily: {
        sans:    ['Geist', 'system-ui', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        hard:    '4px 4px 0 0 #0d1117',
        'hard-sm': '3px 3px 0 0 #0d1117',
        'hard-lg': '8px 8px 0 0 #0d1117',
      },
      borderRadius: {
        retro: '22px',
      },
    },
  },
  plugins: [],
}
export default config
