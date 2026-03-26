import type { Metadata } from 'next';

// SEO Metadata for doctors/appointment pages
export const metadata: Metadata = {
  title: 'Find Doctors | BioAestheticAx Network',
  description: 'Browse and connect with verified healthcare professionals. View doctor profiles, check online status, and book appointments on BioAestheticAx Network.',
  keywords: 'doctors, healthcare, appointments, medical professionals, find doctors, book appointment, BioAestheticAx',
  openGraph: {
    title: 'Find Doctors | BioAestheticAx Network',
    description: 'Connect with verified healthcare professionals and book appointments.',
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

