import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPageShell } from '@/components/layout/LegalPageShell';
import { absoluteUrl, PRODUCTION_SITE_URL } from '@/lib/siteUrl';

export const metadata: Metadata = {
  title: 'Google API & OAuth Disclosure | AestheticRx Network',
  description:
    'How AestheticRx Network uses Google Sign-In, Gmail API, and Google Drive API. For OAuth app verification reviewers.',
  alternates: {
    canonical: absoluteUrl('/oauth-verification'),
  },
};

export default function OAuthVerificationPage() {
  return (
    <LegalPageShell title="Google API & OAuth Disclosure">
      <div className="prose prose-lg max-w-none text-gray-700 space-y-6">
        <p>
          This page summarizes how <strong>AestheticRx Network</strong> uses Google APIs. Full details are in
          our{' '}
          <Link href="/privacy" className="text-blue-600 underline">
            Privacy Policy
          </Link>{' '}
          (Section 14 — Google API Services).
        </p>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900">Application identity</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>App name:</strong> AestheticRx Network
            </li>
            <li>
              <strong>Homepage:</strong>{' '}
              <a href={PRODUCTION_SITE_URL} className="text-blue-600 underline">
                {PRODUCTION_SITE_URL}
              </a>
            </li>
            <li>
              <strong>Privacy policy:</strong>{' '}
              <a href={absoluteUrl('/privacy')} className="text-blue-600 underline">
                {absoluteUrl('/privacy')}
              </a>
            </li>
            <li>
              <strong>Terms of service:</strong>{' '}
              <a href={absoluteUrl('/terms')} className="text-blue-600 underline">
                {absoluteUrl('/terms')}
              </a>
            </li>
            <li>
              <strong>Support contact:</strong> muhammadqasimshabbir3@gmail.com
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900">OAuth scopes in use</h2>
          <table className="w-full text-sm border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2 border-b">Scope</th>
                <th className="text-left p-2 border-b">Purpose</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2 border-b font-mono text-xs">openid, email, profile</td>
                <td className="p-2 border-b">Google Sign-In for account authentication only</td>
              </tr>
              <tr>
                <td className="p-2 border-b font-mono text-xs">gmail.send</td>
                <td className="p-2 border-b">
                  Send transactional email only (order confirmations, OTP, account notifications). We do not
                  read inbox mail.
                </td>
              </tr>
              <tr>
                <td className="p-2 border-b font-mono text-xs">drive.file</td>
                <td className="p-2 border-b">
                  Store admin-generated data export files created by this app only
                </td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3 text-sm">
            We do <strong>not</strong> request the restricted scope{' '}
            <code className="text-xs">https://mail.google.com/</code>.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900">Limited Use commitment</h2>
          <p>
            Use of data received from Google APIs complies with the{' '}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              Google API Services User Data Policy
            </a>
            , including Limited Use requirements. Data is not sold, used for ads, or used to train general AI
            models.
          </p>
        </section>

        <p>
          <Link href="/" className="text-blue-600 font-medium">
            ← Return to homepage
          </Link>
        </p>
      </div>
    </LegalPageShell>
  );
}
