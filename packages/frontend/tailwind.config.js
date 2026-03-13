/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            borderRadius: {
                'card': '12px',
                'input': '8px',
                'button': '8px',
                'badge': '6px',
            },
            colors: {
                primary: {
                    light: '#E8F6EE',
                    DEFAULT: '#38A752',
                },
                danger: {
                    light: '#FFE3DD',
                    DEFAULT: '#EF4444',
                },
                warning: {
                    DEFAULT: '#F59E0B',
                },
                info: {
                    light: '#E0F2FE',
                    DEFAULT: '#3B82F6',
                },
                purple: {
                    light: '#EDE5FF',
                    DEFAULT: '#8B5CF6',
                },
                surface: '#FFFFFF',
                background: '#F9FAFB',
                text: {
                    primary: '#111827',
                    secondary: '#6B7280',
                },
                border: '#E5E7EB',
            },
            fontFamily: {
                sans: ['Inter', 'Roboto', 'system-ui', 'sans-serif'],
            },
            boxShadow: {
                card: '0 1px 3px rgba(0, 0, 0, 0.08)',
                dropdown: '0 4px 6px rgba(0, 0, 0, 0.1)',
            },
        },
    },
    plugins: [],
}
