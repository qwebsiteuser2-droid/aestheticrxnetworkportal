import Link from 'next/link';
import type { Metadata } from 'next';

// SEO Metadata - Static page, pre-rendered at build time
export const metadata: Metadata = {
  title: 'Terms of Service | AestheticRxNetwork',
  description: 'Read the Terms of Service for AestheticRxNetwork. Understand your rights and responsibilities when using our B2B medical platform.',
  keywords: 'terms of service, user agreement, terms and conditions, AestheticRx, medical platform',
  openGraph: {
    title: 'Terms of Service | AestheticRxNetwork',
    description: 'Terms and conditions for using AestheticRxNetwork B2B medical platform.',
    type: 'website',
  },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Terms of Service</h1>
        
        <div className="prose prose-lg max-w-none">
          <p className="text-sm text-gray-600 mb-6">
            <strong>Last Updated:</strong> January 27, 2026
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-700 mb-4">
              By accessing and using AestheticRxNetwork (&quot;the Platform&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), you accept and agree to be bound by the terms and provision of this agreement. 
              If you do not agree to abide by the above, please do not use this service.
            </p>
            <p className="text-gray-700">
              These Terms of Service (&quot;Terms&quot;) govern your access to and use of our website, services, and applications. 
              By using our services, you agree to comply with and be bound by these Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
            <p className="text-gray-700 mb-4">
              AestheticRxNetwork is a platform that provides:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Product ordering and management services</li>
              <li>Research paper submission and publication</li>
              <li>Leaderboard and tier management system</li>
              <li>Advertisement placement and management</li>
              <li>User profile and account management</li>
              <li>Communication and notification services</li>
              <li><strong>Doctor appointment booking system</strong></li>
              <li><strong>Doctor online status and availability tracking</strong></li>
              <li><strong>Location-based doctor discovery</strong></li>
            </ul>
            <p className="text-gray-700">
              We reserve the right to modify, suspend, or discontinue any part of our services at any time, with or without notice.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Accounts and Registration</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">3.1 Account Creation</h3>
            <p className="text-gray-700 mb-4">
              To use certain features of our platform, you must register for an account. When you register, you agree to:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain and update your information to keep it accurate</li>
              <li>Maintain the security of your password and account</li>
              <li>Accept responsibility for all activities that occur under your account</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">3.2 Account Types</h3>
            <p className="text-gray-700 mb-4">
              Our platform supports different account types:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li><strong>Doctor Accounts:</strong> Require signup ID and admin approval</li>
              <li><strong>Regular User Accounts:</strong> Standard user accounts with full platform access</li>
              <li><strong>Employee Accounts:</strong> For delivery and operational personnel</li>
              <li><strong>Admin Accounts:</strong> Platform administrators with full system access</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">3.3 Account Suspension and Termination</h3>
            <p className="text-gray-700">
              We reserve the right to suspend or terminate your account at any time if you violate these Terms, engage in fraudulent activity, 
              or for any other reason we deem necessary to protect the platform and other users.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. User Conduct and Responsibilities</h2>
            <p className="text-gray-700 mb-4">
              You agree not to:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Use the platform for any illegal or unauthorized purpose</li>
              <li>Violate any laws in your jurisdiction</li>
              <li>Infringe upon the rights of others</li>
              <li>Upload or transmit viruses, malware, or harmful code</li>
              <li>Attempt to gain unauthorized access to any part of the platform</li>
              <li>Interfere with or disrupt the platform or servers</li>
              <li>Use automated systems to access the platform without permission</li>
              <li>Impersonate any person or entity</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Submit false, misleading, or fraudulent information</li>
              <li>Violate intellectual property rights</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Orders and Payments</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">5.1 Order Placement</h3>
            <p className="text-gray-700 mb-4">
              When you place an order through our platform:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>You agree to provide accurate order information</li>
              <li>You are responsible for ensuring delivery address accuracy</li>
              <li>All orders are subject to product availability</li>
              <li>We reserve the right to refuse or cancel any order</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">5.2 Payment Methods</h3>
            <p className="text-gray-700 mb-4">
              We accept the following payment methods:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li><strong>PayFast:</strong> Online payment processing</li>
              <li><strong>Cash on Delivery:</strong> Payment upon delivery</li>
            </ul>
            <p className="text-gray-700">
              All prices are displayed in the currency specified on the platform. You are responsible for all applicable taxes and fees.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">5.3 Refunds and Cancellations</h3>
            <p className="text-gray-700">
              Refund and cancellation policies vary by product and order type. Please contact us for specific refund requests. 
              We reserve the right to refuse refunds in cases of fraud or abuse.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Research Papers and Content</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">6.1 Submission Guidelines</h3>
            <p className="text-gray-700 mb-4">
              When submitting research papers or other content:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>You must own or have the right to submit the content</li>
              <li>Content must be original or properly attributed</li>
              <li>Content must comply with academic and ethical standards</li>
              <li>You grant us a license to display and distribute your content</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">6.2 Content Moderation</h3>
            <p className="text-gray-700">
              We reserve the right to review, edit, reject, or remove any content that violates these Terms or our content policies. 
              We are not obligated to publish or maintain any submitted content.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Intellectual Property</h2>
            <p className="text-gray-700 mb-4">
              The platform and its original content, features, and functionality are owned by AestheticRxNetwork and are protected by international 
              copyright, trademark, patent, trade secret, and other intellectual property laws.
            </p>
            <p className="text-gray-700">
              You retain ownership of content you submit, but grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, 
              modify, and distribute your content for the purpose of operating and promoting the platform.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Privacy and Data Protection</h2>
            <p className="text-gray-700 mb-4">
              Your use of our platform is also governed by our Privacy Policy. Please review our Privacy Policy to understand how we collect, 
              use, and protect your personal information.
            </p>
            <p className="text-gray-700">
              By using our services, you consent to the collection and use of information as described in our Privacy Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Location Data Collection</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">9.1 How We Collect Location</h3>
            <p className="text-gray-700 mb-4">
              We collect location information <strong>only during the signup process</strong>. We do NOT:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Request access to your browser&apos;s geolocation API</li>
              <li>Track your real-time location while using the platform</li>
              <li>Access your device&apos;s GPS or location services</li>
              <li>Monitor your location in the background</li>
            </ul>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">9.2 Location Information Provided at Signup</h3>
            <p className="text-gray-700 mb-4">
              When you register for an account, you may provide your location information voluntarily by:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Entering your clinic or business address manually</li>
              <li>Selecting your city, region, or area from a list</li>
              <li>Providing coordinates for your clinic location (for doctors)</li>
            </ul>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">9.3 Purpose of Location Data</h3>
            <p className="text-gray-700 mb-4">
              Your location information is used solely to:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Help users find doctors near their area</li>
              <li>Display relevant doctors based on proximity</li>
              <li>Provide delivery services to your specified address</li>
              <li>Improve local service recommendations</li>
            </ul>
            <p className="text-gray-700">
              You can update or remove your location information at any time through your profile settings.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Doctor Online Status and Availability</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">10.1 Online Status Feature</h3>
            <p className="text-gray-700 mb-4">
              Our platform displays the online status of registered doctors to help users identify available healthcare providers. 
              The online status indicates:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li><strong>🟢 Online:</strong> Doctor is currently connected to the platform and may be available for appointments</li>
              <li><strong>🟡 Away:</strong> Doctor has been inactive for a short period</li>
              <li><strong>⚫ Offline:</strong> Doctor is not currently connected to the platform</li>
            </ul>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">10.2 How Online Status Works</h3>
            <p className="text-gray-700 mb-4">
              The online status is automatically determined based on:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Active internet connection to our platform</li>
              <li>Recent activity on the website or application</li>
              <li>WebSocket connection status</li>
              <li>Last activity timestamp</li>
            </ul>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">10.3 Availability Status</h3>
            <p className="text-gray-700 mb-4">
              Doctors can also set their availability status manually to indicate:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li><strong>Available:</strong> Open for new appointment requests</li>
              <li><strong>Busy:</strong> Currently occupied but may respond later</li>
              <li><strong>Do Not Disturb:</strong> Not accepting new requests at this time</li>
            </ul>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">10.4 Important Disclaimers</h3>
            <p className="text-gray-700 mb-4">
              Please note:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Online status does not guarantee immediate response from doctors</li>
              <li>Doctors may be online but not immediately available for consultation</li>
              <li>For emergencies, please contact local emergency services directly</li>
              <li>Appointment requests are subject to doctor approval and availability</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Disclaimers and Limitations of Liability</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">11.1 Service Availability</h3>
            <p className="text-gray-700 mb-4">
              We strive to provide reliable service, but we do not guarantee that:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>The platform will be available at all times</li>
              <li>The platform will be error-free or uninterrupted</li>
              <li>Defects will be corrected immediately</li>
              <li>The platform is free from viruses or harmful components</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">11.2 Limitation of Liability</h3>
            <p className="text-gray-700">
              To the maximum extent permitted by law, AestheticRxNetwork shall not be liable for any indirect, incidental, special, consequential, 
              or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, 
              or other intangible losses resulting from your use of the platform.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Indemnification</h2>
            <p className="text-gray-700">
              You agree to indemnify, defend, and hold harmless AestheticRxNetwork, its officers, directors, employees, and agents from and against 
              any claims, liabilities, damages, losses, and expenses, including reasonable attorney&apos;s fees, arising out of or in any way connected 
              with your access to or use of the platform, your violation of these Terms, or your violation of any rights of another.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Termination</h2>
            <p className="text-gray-700 mb-4">
              We may terminate or suspend your account and access to the platform immediately, without prior notice or liability, for any reason, 
              including if you breach these Terms.
            </p>
            <p className="text-gray-700">
              Upon termination, your right to use the platform will immediately cease. All provisions of these Terms that by their nature should 
              survive termination shall survive, including ownership provisions, warranty disclaimers, indemnity, and limitations of liability.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Governing Law and Dispute Resolution</h2>
            <p className="text-gray-700 mb-4">
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which AestheticRxNetwork operates, 
              without regard to its conflict of law provisions.
            </p>
            <p className="text-gray-700">
              Any disputes arising out of or relating to these Terms or the platform shall be resolved through good faith negotiations. 
              If a dispute cannot be resolved through negotiation, it shall be subject to the exclusive jurisdiction of the courts in our jurisdiction.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. Changes to Terms</h2>
            <p className="text-gray-700">
              We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice 
              prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
            </p>
            <p className="text-gray-700">
              By continuing to access or use our platform after any revisions become effective, you agree to be bound by the revised terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">16. Contact Information</h2>
            <p className="text-gray-700 mb-4">
              If you have any questions about these Terms of Service, please contact us:
            </p>
            <ul className="list-none pl-0 mb-4 text-gray-700">
              <li><strong>Email:</strong> asadkhanbloch4949@gmail.com</li>
              <li><strong>WhatsApp:</strong> +92 326 795 1056</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">17. Severability</h2>
            <p className="text-gray-700">
              If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum 
              extent necessary, and the remaining provisions shall remain in full force and effect.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">18. Entire Agreement</h2>
            <p className="text-gray-700">
              These Terms, together with our Privacy Policy, constitute the entire agreement between you and AestheticRxNetwork regarding the use of the platform 
              and supersede all prior agreements and understandings.
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
