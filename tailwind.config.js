/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1C1B17",
        paper: "#EDEAE3",
        forest: "#16342C",
        forestlight: "#264A40",
        amber: "#D98E04",
        rust: "#C1503B",
        line: "#D8D3C6",
        muted: "#8A8676",
      },
      fontFamily: {
        slab: ["'Zilla Slab'", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
