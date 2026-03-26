import Link from 'next/link';
import type { Metadata } from 'next';

// SEO Metadata - Static page, pre-rendered at build time
export const metadata: Metadata = {
  title: 'Privacy Policy | BioAestheticAx Network',
  description: 'Learn how BioAestheticAx Network collects, uses, and protects your personal information. Read our comprehensive privacy policy.',
  keywords: 'privacy policy, data protection, GDPR, personal information, BioAestheticAx',
  openGraph: {
    title: 'Privacy Policy | BioAestheticAx Network',
    description: 'Learn how BioAestheticAx Network protects your privacy and personal data.',
    type: 'website',
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
        
        <div className="prose prose-lg max-w-none">
          <p className="text-sm text-gray-600 mb-6">
            <strong>Last Updated:</strong> December 17, 2025
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-700 mb-4">
              Welcome to BioAestheticAx Network. We are committed to protecting your privacy and ensuring the security of your personal information. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
            </p>
            <p className="text-gray-700">
              By using our services, you agree to the collection and use of information in accordance with this policy. 
              If you do not agree with our policies and practices, please do not use our services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">2.1 Personal Information</h3>
            <p className="text-gray-700 mb-4">
              We collect information that you provide directly to us, including:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Name and contact information (email address, phone number, WhatsApp number)</li>
              <li>Professional information (doctor name, clinic name, signup ID)</li>
              <li>Account credentials (password, encrypted and securely stored)</li>
              <li>Profile information and preferences</li>
              <li>Order and transaction information</li>
              <li>Research paper submissions and contributions</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">2.2 Automatically Collected Information</h3>
            <p className="text-gray-700 mb-4">
              When you use our platform, we automatically collect certain information, including:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Device information (IP address, browser type, operating system)</li>
              <li>Usage data (pages visited, time spent, features used)</li>
              <li>Cookies and similar tracking technologies</li>
              <li>Log files and analytics data</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-700 mb-4">
              We use the collected information for various purposes:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>To provide, maintain, and improve our services</li>
              <li>To process your orders and transactions</li>
              <li>To send you important notifications and updates</li>
              <li>To send marketing and promotional communications (with your consent)</li>
              <li>To respond to your inquiries and provide customer support</li>
              <li>To monitor and analyze usage patterns and trends</li>
              <li>To detect, prevent, and address technical issues and security threats</li>
              <li>To comply with legal obligations and enforce our terms</li>
              <li>To personalize your experience and provide relevant content</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Data Sharing and Disclosure</h2>
            <p className="text-gray-700 mb-4">
              We do not sell your personal information. We may share your information in the following circumstances:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li><strong>Service Providers:</strong> With trusted third-party service providers who assist in operating our platform</li>
              <li><strong>Legal Requirements:</strong> When required by law, court order, or government regulation</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
              <li><strong>With Your Consent:</strong> When you explicitly authorize us to share your information</li>
              <li><strong>Organizational Access:</strong> With authorized personnel within our organization for operational purposes</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Security</h2>
            <p className="text-gray-700 mb-4">
              We implement appropriate technical and organizational security measures to protect your personal information, including:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Encryption of sensitive data in transit and at rest</li>
              <li>Secure authentication and access controls</li>
              <li>Regular security assessments and updates</li>
              <li>Limited access to personal information on a need-to-know basis</li>
            </ul>
            <p className="text-gray-700">
              However, no method of transmission over the internet or electronic storage is 100% secure. 
              While we strive to protect your information, we cannot guarantee absolute security.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Your Rights and Choices</h2>
            <p className="text-gray-700 mb-4">
              Under applicable data protection laws (including GDPR), you have the right to:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li><strong>Access:</strong> Request access to your personal information</li>
              <li><strong>Rectification:</strong> Request correction of inaccurate or incomplete data</li>
              <li><strong>Erasure:</strong> Request deletion of your personal information</li>
              <li><strong>Restriction:</strong> Request restriction of processing your data</li>
              <li><strong>Portability:</strong> Request transfer of your data to another service</li>
              <li><strong>Objection:</strong> Object to processing of your personal information</li>
              <li><strong>Withdraw Consent:</strong> Withdraw your consent at any time</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Contact Us</h2>
            <p className="text-gray-700 mb-4">
              If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
            </p>
            <ul className="list-none pl-0 mb-4 text-gray-700">
              <li><strong>Email:</strong> asadkhanbloch4949@gmail.com</li>
              <li><strong>WhatsApp:</strong> +92 326 795 1056</li>
            </ul>
            <p className="text-gray-700">
              We will respond to your inquiry within a reasonable timeframe.
            </p>
          </section>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <Link 
              href="/" 
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
