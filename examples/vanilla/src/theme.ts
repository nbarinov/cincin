const THEME_KEY = 'cincin:theme';

function mountThemeToggle(button: HTMLElement): void {
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

  const storedTheme = () => localStorage.getItem(THEME_KEY);
  const effectiveTheme = () =>
    storedTheme() ?? (systemDark.matches ? 'dark' : 'light');

  const applyTheme = () => {
    document.documentElement.style.colorScheme = storedTheme() ?? 'light dark';

    const dark = effectiveTheme() === 'dark';
    button.textContent = dark ? '☀️' : '🌙';
    button.setAttribute(
      'aria-label',
      dark ? 'Switch to light theme' : 'Switch to dark theme'
    );
  };

  button.addEventListener('click', () => {
    const next = effectiveTheme() === 'dark' ? 'light' : 'dark';

    if (next === (systemDark.matches ? 'dark' : 'light')) {
      localStorage.removeItem(THEME_KEY);
    } else {
      localStorage.setItem(THEME_KEY, next);
    }

    applyTheme();
  });
  systemDark.addEventListener('change', applyTheme);
  applyTheme();
}

export { mountThemeToggle };
