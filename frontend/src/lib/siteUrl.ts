/** Canonical production site URL for OAuth, sitemap, and legal pages. */
export const PRODUCTION_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
  'https://aestheticrxnetworkportal.vercel.app';

export function absoluteUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${PRODUCTION_SITE_URL}${p}`;
}
