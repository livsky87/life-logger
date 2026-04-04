/** @type {import('tailwindcss').Config} */
const config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      gridTemplateColumns: {
        // 25 columns: 1 label + 24 hours
        "timeline": "220px repeat(24, minmax(48px, 1fr))",
      },
    },
  },
  plugins: [],
};

export default config;
