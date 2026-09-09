import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Looking for skincare & aesthetic doctors nearby | AestheticRxNetwork',
  description:
    'Looking for skincare & aesthetic doctors nearby. Browse verified professionals, check availability, and book appointments on AestheticRxNetwork.',
  keywords:
    'skincare doctors, aesthetic doctors, find doctors nearby, aesthetic clinic, AestheticRxNetwork',
  openGraph: {
    title: 'Looking for skincare & aesthetic doctors nearby | AestheticRxNetwork',
    description: 'Connect with skincare and aesthetic doctors near you.',
    type: 'website',
  },
};

export default function DoctorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
