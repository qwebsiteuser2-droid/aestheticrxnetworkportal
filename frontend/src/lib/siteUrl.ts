/** Canonical production site URL for OAuth, sitemap, and legal pages.
 * For Google OAuth verification, set NEXT_PUBLIC_SITE_URL to a custom domain
 * you own and verify in Search Console — not *.vercel.app.
 */
export const PRODUCTION_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
  'https://aestheticrxnetwork.vercel.app';

export function absoluteUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${PRODUCTION_SITE_URL}${p}`;
}
