import fallbackSnapshot from './fallback.generated.json';

export const SITE_LANGS = ['en', 'ar'] as const;
export type SiteLang = (typeof SITE_LANGS)[number];
export function isSiteLang(value: string): value is SiteLang {
  return SITE_LANGS.some((lang) => lang === value);
}
export async function getContentSnapshot() {
  return fallbackSnapshot;
}