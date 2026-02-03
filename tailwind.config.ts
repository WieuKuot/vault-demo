import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        vault: {
          bg: "#f3f5f3",
          card: "#ffffff",
          ink: "#0f172a",
          accent: "#16a34a",
          accentDark: "#166534"
        }
      }
    }
  },
  plugins: []
} satisfies Config;
