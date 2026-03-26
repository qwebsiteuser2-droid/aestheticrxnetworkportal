import type { Metadata } from 'next';

// SEO Metadata for Hall of Pride page
export const metadata: Metadata = {
  title: 'Hall of Pride | BioAestheticAx Network',
  description: 'Celebrating exceptional achievements and contributions from healthcare professionals in the BioAestheticAx Network community.',
  keywords: 'hall of pride, achievements, awards, recognition, top doctors, BioAestheticAx',
  openGraph: {
    title: 'Hall of Pride | BioAestheticAx Network',
    description: 'Celebrating exceptional achievements from our medical community.',
    type: 'website',
  },
};

export default function HallOfPrideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

