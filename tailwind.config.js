import preset from "@liquidai/tokens/tailwind";
import animate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  presets: [preset],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "./node_modules/@liquidai/react/dist/index.js",
  ],
  plugins: [animate],
};
