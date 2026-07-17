import Link from 'next/link';
import { BrandTitle } from '@/components/BrandTitle';
import { absoluteUrl, PRODUCTION_SITE_URL } from '@/lib/siteUrl';

export function LegalPageShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="AestheticRxNetwork" className="w-10 h-10 object-contain rounded-lg" />
            <BrandTitle size="sm" />
          </Link>
          <nav className="flex items-center gap-4 text-sm" aria-label="Legal navigation">
            <Link href="/" className="text-gray-600 hover:text-gray-900">
              Home
            </Link>
            <Link href="/privacy" className="text-gray-600 hover:text-gray-900 font-medium">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-gray-600 hover:text-gray-900">
              Terms of Service
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8">
          <p className="text-xs text-gray-500 mb-4">
            Application homepage:{' '}
            <a href={PRODUCTION_SITE_URL} className="text-blue-600 underline">
              {PRODUCTION_SITE_URL}
            </a>
          </p>
          <h1 className="text-4xl font-bold text-gray-900 mb-8">{title}</h1>
          {children}
        </div>
      </main>

      <footer className="bg-gray-900 text-white py-8 mt-auto">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="flex flex-wrap items-center justify-center gap-4 mb-3 text-sm">
            <Link href="/privacy" className="text-gray-300 hover:text-white underline">
              Privacy Policy
            </Link>
            <span className="text-gray-600" aria-hidden>
              |
            </span>
            <Link href="/terms" className="text-gray-300 hover:text-white underline">
              Terms of Service
            </Link>
            <span className="text-gray-600" aria-hidden>
              |
            </span>
            <Link href="/oauth-verification" className="text-gray-300 hover:text-white underline">
              Google API Disclosure
            </Link>
          </div>
          <p className="text-gray-400 text-sm">
            © {new Date().getFullYear()} AESTHETICRXNETWORK (PRIVATE LIMITED) ·{' '}
            <a href={absoluteUrl('/privacy')} className="underline">
              {absoluteUrl('/privacy')}
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
