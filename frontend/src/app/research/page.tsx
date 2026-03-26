import { ResearchPage } from '@/components/pages/ResearchPage';
import { MainLayout } from '@/components/layout/MainLayout';
import type { Metadata } from 'next';

// SEO Metadata for research papers page
export const metadata: Metadata = {
  title: 'Research Papers | AestheticRxNetwork',
  description: 'Browse and discover medical research papers from healthcare professionals. Upload, share, and collaborate on research in the AestheticRxNetwork.',
  keywords: 'medical research, research papers, healthcare, doctors, medical publications, AestheticRx',
  openGraph: {
    title: 'Research Papers | AestheticRxNetwork',
    description: 'Discover medical research papers from healthcare professionals worldwide.',
    type: 'website',
  },
};

// ISR - Revalidate page data every 5 minutes for fresh content
export const revalidate = 300;

export default function Research() {
  return (
    <MainLayout>
      <ResearchPage />
    </MainLayout>
  );
}
