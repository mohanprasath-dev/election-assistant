import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        saffron: {
          50: "#fff8f0",
          100: "#fff0db",
          200: "#ffddb3",
          300: "#ffc680",
          400: "#ffab4d",
          500: "#FF9933",
          600: "#e68a2e",
          700: "#cc7a29",
          800: "#b36b24",
          900: "#995c1f",
        },
        indian: {
          green: "#138808",
          navy: "#1a237e",
        },
        civic: {
          50: "#f8f9ff",
          100: "#eef0ff",
          200: "#dde1ff",
          300: "#bcc3ff",
          400: "#9aa4ff",
          500: "#7986ff",
          600: "#5c6bc0",
          700: "#3f51b5",
          800: "#303f9f",
          900: "#1a237e",
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
        heading: ['"Fraunces"', "Georgia", "serif"],
      },
      animation: {
        "bounce-dot": "bounceDot 1.4s infinite ease-in-out both",
        "fade-in": "fadeIn 0.3s ease-out forwards",
        "slide-up": "slideUp 0.4s ease-out forwards",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
        "progress-line": "progressLine 0.6s ease-out forwards",
      },
      keyframes: {
        bounceDot: {
          "0%, 80%, 100%": { transform: "scale(0)" },
          "40%": { transform: "scale(1)" },
        },
        fadeIn: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        progressLine: {
          from: { width: "0%" },
          to: { width: "100%" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
