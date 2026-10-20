import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  future: {
    hoverOnlyWhenSupported: true,
  },
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1280px",
      },
    },
    extend: {
      colors: {
        blue: {
          50: "#f3f7fb",
          100: "#e5eef8",
          200: "#cbddef",
          300: "#a8c6e3",
          400: "#7da9d2",
          500: "#5889c1",
          600: "#3f70ad",
          700: "#335b90",
          800: "#2e4e76",
          900: "#2a4261",
          950: "#1b293d",
        },
        cyan: {
          50: "#f2f8f8",
          100: "#e1eeee",
          200: "#c5dddd",
          300: "#9fc6c7",
          400: "#73aaad",
          500: "#568e92",
          600: "#457479",
          700: "#3b5f63",
          800: "#344f52",
          900: "#2e4346",
          950: "#1a292b",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};

export default config;
