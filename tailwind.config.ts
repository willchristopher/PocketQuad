import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        success: {
          light: '#10B981',
          dark: '#34D399',
          bg: '#ECFDF5',
          bgDark: '#064E3B',
        },
        warning: {
          light: '#F59E0B',
          dark: '#FBBF24',
          bg: '#FFFBEB',
          bgDark: '#78350F',
        },
        error: {
          light: '#EF4444',
          dark: '#F87171',
          bg: '#FEF2F2',
          bgDark: '#7F1D1D',
        },
        info: {
          light: '#3B82F6',
          dark: '#60A5FA',
          bg: '#EFF6FF',
          bgDark: '#1E3A8A',
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          light: '#525252',
          dark: '#A3A3A3',
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
          light: '#737373',
          dark: '#737373',
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          primary: '#10B981',
          secondary: '#3B82F6',
          warning: '#FBBF24',
          lime: '#84CC16',
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        surface: {
          light: '#F5F5F5',
          dark: '#1A1A1A',
        },
        surfaceElevated: {
          light: '#FFFFFF',
          dark: '#262626',
        },
        text: {
          primary: {
            light: '#0A0A0A',
            dark: '#FAFAFA',
          },
          secondary: {
            light: '#525252',
            dark: '#A3A3A3',
          },
          muted: {
            light: '#737373',
            dark: '#737373',
          },
        },
        calendar: {
          personal: '#6B7280',     
          campus: '#F59E0B',       
          officeHours: '#10B981',  
          deadline: '#EF4444',
          teaching: '#2563EB',
          meeting: '#3B82F6',
          event: '#F59E0B',     
        },
        status: {
          online: '#22C55E',
          away: '#FBBF24',
          busy: '#EF4444',
          offline: '#6B7280',
        },
      },
      fontFamily: {
        display: ['Nunito', 'system-ui', 'sans-serif'],
        body: ['Nunito', 'system-ui', 'sans-serif'],
        mono: ['Nunito', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-xl': ['3.5rem', { lineHeight: '1.1', fontWeight: '800' }],
        'display-lg': ['2.5rem', { lineHeight: '1.2', fontWeight: '700' }],
        'display-md': ['2rem', { lineHeight: '1.25', fontWeight: '700' }],
        'heading-lg': ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],
        'heading-md': ['1.25rem', { lineHeight: '1.4', fontWeight: '600' }],
        'heading-sm': ['1.125rem', { lineHeight: '1.4', fontWeight: '600' }],
        'body-lg': ['1.125rem', { lineHeight: '1.6', fontWeight: '400' }],
        'body-md': ['1rem', { lineHeight: '1.6', fontWeight: '400' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],
        'caption': ['0.75rem', { lineHeight: '1.4', fontWeight: '500' }],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        'bento': '1.25rem',  
        'card': '1rem',      
        'button': '0.625rem', 
      },
      boxShadow: {
        'bento': '0 0 0 1px rgba(0,0,0,0.05), 0 2px 8px rgba(0,0,0,0.08)',
        'bento-hover': '0 0 0 1px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.12)',
        'bento-dark': '0 0 0 1px rgba(255,255,255,0.05), 0 2px 8px rgba(0,0,0,0.4)',
        'bento-hover-dark': '0 0 0 1px rgba(255,255,255,0.1), 0 8px 24px rgba(0,0,0,0.5)',
        'accent': 'var(--shadow-accent)',
        'accent-lg': 'var(--shadow-accent-lg)',
        'surface': 'var(--shadow-surface)',
        'surface-lg': 'var(--shadow-surface-lg)',
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config;
