// Tema claro/escuro. Padrão = segue o sistema; o botão salva uma escolha explícita.
// O primeiro paint é resolvido por um script inline no index.html (evita "flash").

export type ThemePref = 'light' | 'dark' | 'system'

const KEY = 'sbar-theme'
const DARK_COLOR = '#0b111c'
const LIGHT_COLOR = '#0f8168'

export function getThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

export function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function resolveDark(pref: ThemePref): boolean {
  return pref === 'dark' || (pref === 'system' && systemPrefersDark())
}

/** Aplica a preferência ao <html> (classe .dark, color-scheme e theme-color). */
export function applyTheme(pref: ThemePref): void {
  const dark = resolveDark(pref)
  const el = document.documentElement
  el.classList.toggle('dark', dark)
  el.style.colorScheme = dark ? 'dark' : 'light'
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', dark ? DARK_COLOR : LIGHT_COLOR)
}

export function setThemePref(pref: ThemePref): void {
  try {
    if (pref === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, pref)
  } catch {
    /* ignore */
  }
  applyTheme(pref)
}

/** Alterna entre claro e escuro com base no que está aparecendo agora. */
export function toggleTheme(): boolean {
  const nowDark = resolveDark(getThemePref())
  setThemePref(nowDark ? 'light' : 'dark')
  return !nowDark
}
