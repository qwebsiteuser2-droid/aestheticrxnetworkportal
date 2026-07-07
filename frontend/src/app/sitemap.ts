import { MetadataRoute } from 'next';
import { PRODUCTION_SITE_URL } from '@/lib/siteUrl';

const BASE_URL = PRODUCTION_SITE_URL;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: BASE_URL,
      lastModified,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/terms-of-service`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/oauth-verification`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/leaderboard`,
      lastModified,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/research`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/doctors`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
  ];
}
