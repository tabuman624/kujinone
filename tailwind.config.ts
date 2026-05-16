import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            color: '#374151',
            lineHeight: '1.8',
            h2: {
              color: '#111827',
              fontWeight: '600',
              fontSize: '1.1rem',
              marginTop: '2rem',
              marginBottom: '0.75rem',
              paddingBottom: '0.5rem',
              borderBottom: '2px solid #e5e7eb',
            },
            h3: {
              color: '#1f2937',
              fontWeight: '600',
              fontSize: '1rem',
              marginTop: '1.5rem',
              marginBottom: '0.5rem',
            },
            p: {
              marginTop: '0.75rem',
              marginBottom: '0.75rem',
            },
            li: {
              marginTop: '0.25rem',
              marginBottom: '0.25rem',
            },
            strong: {
              color: '#111827',
            },
            a: {
              color: '#4f46e5',
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline',
              },
            },
            table: {
              fontSize: '0.875rem',
            },
            'thead th': {
              backgroundColor: '#f9fafb',
              color: '#374151',
              fontWeight: '600',
            },
            code: {
              backgroundColor: '#f3f4f6',
              padding: '0.2em 0.4em',
              borderRadius: '0.25rem',
              fontSize: '0.85em',
              color: '#1f2937',
            },
            'code::before': { content: 'none' },
            'code::after': { content: 'none' },
            pre: {
              backgroundColor: '#1f2937',
              color: '#f9fafb',
              borderRadius: '0.75rem',
              padding: '1rem 1.25rem',
              fontSize: '0.85rem',
              overflowX: 'auto',
            },
            blockquote: {
              borderLeftColor: '#6366f1',
              backgroundColor: '#f5f3ff',
              padding: '0.75rem 1rem',
              borderRadius: '0 0.5rem 0.5rem 0',
              color: '#4b5563',
            },
          },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}

export default config
