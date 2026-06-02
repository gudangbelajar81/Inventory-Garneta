const THEME_KEY = "retail_inventory_custom_theme";

const defaultTheme = {
  primary: "#166534",
  accent: "#fb923c",
  page: "#f7fee7"
};

export function getTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  return saved ? { ...defaultTheme, ...JSON.parse(saved) } : defaultTheme;
}

export function saveTheme(theme) {
  const nextTheme = { ...defaultTheme, ...theme };
  localStorage.setItem(THEME_KEY, JSON.stringify(nextTheme));
  applyTheme(nextTheme);
  return nextTheme;
}

export function applyTheme(theme = getTheme()) {
  document.documentElement.style.setProperty("--theme-primary", theme.primary);
  document.documentElement.style.setProperty("--theme-accent", theme.accent);
  document.documentElement.style.setProperty("--theme-page", theme.page);
  document.body.dataset.sidebarTheme = "custom";
}
