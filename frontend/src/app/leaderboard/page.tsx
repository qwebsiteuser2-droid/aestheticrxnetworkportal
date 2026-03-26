import { LeaderboardPage } from '@/components/pages/LeaderboardPage';
import { MainLayout } from '@/components/layout/MainLayout';
import type { Metadata } from 'next';

// SEO Metadata for leaderboard page
export const metadata: Metadata = {
  title: 'Leaderboard & Rankings | AestheticRxNetwork',
  description: 'View the top performing doctors and clinics on AestheticRxNetwork. Track tier progress, achievements, and compete for top rankings.',
  keywords: 'leaderboard, rankings, top doctors, tier system, achievements, AestheticRx',
  openGraph: {
    title: 'Leaderboard & Rankings | AestheticRxNetwork',
    description: 'See the top performing doctors and clinics in the AestheticRxNetwork.',
    type: 'website',
  },
};

// ISR - Revalidate page data every 5 minutes for fresh rankings
export const revalidate = 300;

export default function Leaderboard() {
  return (
    <MainLayout>
      <LeaderboardPage />
    </MainLayout>
  );
}
