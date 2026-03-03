module.exports = {
  content: [
    "./index.html",
    "./pages/**/*.html",
    "./*.js",
    "./js/**/*.js",
    "./interaction/**/*.js",
    "./geometry/**/*.js",
    "../backend/**/*.tmpl",
    "../backend/**/*.gohtml",
    "../backend/**/*.html"
  ],
  theme: {
    extend: {
      fontFamily: {
        sora: ["Sora", "sans-serif"],
      },
      colors: {
        graphly: {
          bg: "#081C3A",
          surface: "#0F2A52",
          "surface-hover": "#143766",
          "accent-mint": "#34F5C5",
          "accent-mint-hover": "#2EE6A6",
          "accent-blue": "#4F8CFF",
          "accent-purple": "#8B5CF6",
          heading: "#F8FAFC",
          text: "#D6E1F0",
          "text-muted": "#9FB3C8",
          border: "#1E3A6B",
        },
      },
      boxShadow: {
        panel: "0 22px 52px -28px rgba(2, 10, 28, 0.78)",
        "mint-glow": "0 12px 34px -12px rgba(52, 245, 197, 0.35)",
        "mint-soft": "0 18px 44px -20px rgba(52, 245, 197, 0.22)",
      },
    },
  },
  plugins: [],
};
