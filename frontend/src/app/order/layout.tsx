import type { Metadata } from 'next';

// SEO Metadata for Order page
export const metadata: Metadata = {
  title: 'Order Products | AestheticRxNetwork',
  description: 'Browse and order medical products from AestheticRxNetwork. Wide selection of healthcare supplies with secure payment options.',
  keywords: 'medical products, healthcare supplies, order, shopping, medical equipment, AestheticRx',
  openGraph: {
    title: 'Order Products | AestheticRxNetwork',
    description: 'Browse and order medical products from our extensive catalog.',
    type: 'website',
  },
};

export default function OrderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

