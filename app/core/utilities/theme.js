/**
 * Theme manager – light / dark / system
 */

import { getById, put } from '../../storage/indexeddb/db.js';

const THEME_KEY = 'main';

/**
 * Apply theme to document
 * @param {'light'|'dark'|'system'} theme
 */
export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
  // Update meta theme-color for mobile browser chrome
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    meta.setAttribute('content', isDark ? '#0f172a' : '#2563eb');
  }
}

/**
 * Load theme from app_settings and apply
 */
export async function loadAndApplyTheme() {
  try {
    const settings = await getById('app_settings', THEME_KEY);
    const theme = settings?.theme || 'system';
    applyTheme(theme);
    return theme;
  } catch {
    applyTheme('system');
    return 'system';
  }
}

/**
 * Save and apply theme
 */
export async function setTheme(theme) {
  applyTheme(theme);
  try {
    const existing = await getById('app_settings', THEME_KEY);
    const updated = {
      ...(existing || { id: THEME_KEY }),
      theme,
      updatedAt: new Date().toISOString(),
      createdAt: existing?.createdAt || new Date().toISOString()
    };
    await put('app_settings', updated);
  } catch (e) {
    console.warn('[Theme] Failed to persist:', e);
  }
}

/**
 * Listen for system preference changes when theme is "system"
 */
export function watchSystemTheme() {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = async () => {
    try {
      const settings = await getById('app_settings', THEME_KEY);
      if (!settings || settings.theme === 'system') {
        applyTheme('system');
      }
    } catch {
      applyTheme('system');
    }
  };
  if (mq.addEventListener) mq.addEventListener('change', handler);
  else if (mq.addListener) mq.addListener(handler);
}
