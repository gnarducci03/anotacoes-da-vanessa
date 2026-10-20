import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        app: "var(--bg-app)",
        surface: "var(--bg-surface)",
        elevated: "var(--bg-elevated)",
        dock: "var(--bg-toolbar-dock)",
        workspace: "var(--bg-canvas-workspace)",
        primary: "var(--text-primary)",
        secondary: "var(--text-secondary)",
        muted: "var(--text-muted)",
        accent: "var(--accent-primary)",
      },
    },
  },
  plugins: [],
};
export default config;
