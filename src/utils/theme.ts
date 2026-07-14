// 主题管理器
export type Theme = 'light' | 'dark';

export const setTheme = (theme: Theme) => {
  const html = document.documentElement;
  html.classList.add(theme);
  html.classList.remove(theme === 'light' ? 'dark' : 'light');
  localStorage.setItem('theme', theme);
  window.dispatchEvent(new CustomEvent('themechange', { detail: theme }));
};

export const getPreferredTheme = (): Theme => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) return savedTheme as Theme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const applyTheme = (theme: Theme) => {
  const html = document.documentElement;
  html.classList.add(theme);
  html.classList.remove(theme === 'light' ? 'dark' : 'light');
};

export const initTheme = () => {
  applyTheme(getPreferredTheme());
};

export const toggleTheme = () => {
  const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  const nextTheme: Theme = currentTheme === 'light' ? 'dark' : 'light';
  setTheme(nextTheme);
  return nextTheme;
};
