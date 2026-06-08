/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink:   "#0D0F1A",
        amber: {
          DEFAULT: "#F59E0B",
          50:  "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
          800: "#92400E",
          900: "#78350F",
        },
      },
      fontFamily: {
        display: ["Syne", "sans-serif"],
        body:    ["DM Sans", "sans-serif"],
        sans:    ["DM Sans", "sans-serif"],  // override default sans
      },
      borderRadius: {
        xl:  "1rem",
        "2xl": "1.5rem",
      },
      boxShadow: {
        card: "0 2px 16px 0 rgba(13,15,26,0.08)",
        pop:  "0 8px 32px 0 rgba(13,15,26,0.16)",
      },
    },
  },
  plugins: [],
};