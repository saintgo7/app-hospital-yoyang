import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // 고령자 친화적 폰트 크기
      fontSize: {
        'accessible-sm': ['16px', { lineHeight: '1.5' }],
        'accessible-base': ['18px', { lineHeight: '1.6' }],
        'accessible-lg': ['20px', { lineHeight: '1.6' }],
        'accessible-xl': ['24px', { lineHeight: '1.5' }],
        'accessible-2xl': ['28px', { lineHeight: '1.4' }],
        'accessible-3xl': ['32px', { lineHeight: '1.3' }],
      },
      // 터치 친화적 간격
      spacing: {
        'touch-min': '48px',
        'touch-comfortable': '56px',
      },
      // 브랜드 색상
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        caregiver: {
          light: '#ecfdf5',
          DEFAULT: '#10b981',
          dark: '#059669',
        },
        guardian: {
          light: '#fef3c7',
          DEFAULT: '#f59e0b',
          dark: '#d97706',
        },
      },
      // 둥근 모서리
      borderRadius: {
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
    },
  },
  plugins: [],
}

export default config
