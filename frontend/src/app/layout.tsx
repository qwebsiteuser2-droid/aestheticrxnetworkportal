import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AestheticRxNetwork - Connected Aesthetic Care',
  description: 'Professional B2B platform for aesthetic clinics and medical professionals, featuring product ordering, leaderboards, research papers, and comprehensive admin management.',
  keywords: ['aesthetic', 'clinics', 'B2B', 'medical', 'doctors', 'healthcare', 'platform', 'beauty', 'cosmetic'],
  authors: [{ name: 'AestheticRxNetwork Team' }],
  robots: 'index, follow',
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48 64x64' },
      { url: '/logo.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180' },
    ],
    shortcut: '/favicon.ico',
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'AestheticRxNetwork - Connected Aesthetic Care',
    description: 'Professional B2B platform for aesthetic clinics and medical professionals',
    type: 'website',
    locale: 'en_US',
    images: ['/logo.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AestheticRxNetwork - Connected Aesthetic Care',
    description: 'Professional B2B platform for aesthetic clinics and medical professionals',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className={`${inter.className} h-full bg-gray-50`} suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10B981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#EF4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
