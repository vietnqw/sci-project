'use client';

import Link from 'next/link';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
          <p className="text-gray-600">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-lg p-8 space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-700 leading-relaxed">
              By accessing and using Science Competition Insights ("SCI", "we", "our", or "us"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              SCI provides a platform for discovering and exploring science competitions worldwide. Our services include:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Competition listings and information</li>
              <li>User accounts and profiles</li>
              <li>Search and filtering capabilities</li>
              <li>Competition submission and management</li>
              <li>Communication tools and notifications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Accounts</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">3.1 Account Creation</h3>
                <p className="text-gray-700 leading-relaxed">
                  To access certain features, you must create an account. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate, current, and complete.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">3.2 Account Security</h3>
                <p className="text-gray-700 leading-relaxed">
                  You are responsible for safeguarding your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">3.3 Account Termination</h3>
                <p className="text-gray-700 leading-relaxed">
                  We reserve the right to terminate or suspend your account at any time for violations of these terms or for any other reason at our sole discretion.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. User Conduct</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              You agree not to use the service to:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe upon the rights of others</li>
              <li>Upload or transmit malicious code or harmful content</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt the service</li>
              <li>Use the service for commercial purposes without permission</li>
              <li>Impersonate another person or entity</li>
              <li>Harass, abuse, or harm other users</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Content and Submissions</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">5.1 User Content</h3>
                <p className="text-gray-700 leading-relaxed">
                  You retain ownership of content you submit to our platform. By submitting content, you grant us a non-exclusive, worldwide, royalty-free license to use, display, and distribute your content in connection with our services.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">5.2 Content Standards</h3>
                <p className="text-gray-700 leading-relaxed">
                  All content must be accurate, appropriate, and comply with our community guidelines. We reserve the right to remove or modify content that violates these standards.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">5.3 Competition Information</h3>
                <p className="text-gray-700 leading-relaxed">
                  While we strive to provide accurate competition information, we cannot guarantee the completeness or accuracy of all details. Users should verify information directly with competition organizers.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Intellectual Property</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">6.1 Our Rights</h3>
                <p className="text-gray-700 leading-relaxed">
                  The service and its original content, features, and functionality are owned by SCI and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">6.2 Third-Party Content</h3>
                <p className="text-gray-700 leading-relaxed">
                  Our service may contain content from third parties. We do not claim ownership of such content and respect the intellectual property rights of others.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Privacy and Data Protection</h2>
            <p className="text-gray-700 leading-relaxed">
              Your privacy is important to us. Our collection and use of personal information is governed by our Privacy Policy, which is incorporated into these Terms of Service by reference.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Disclaimers and Limitations</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">8.1 Service Availability</h3>
                <p className="text-gray-700 leading-relaxed">
                  We strive to maintain service availability but cannot guarantee uninterrupted access. We may temporarily suspend the service for maintenance or updates.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">8.2 Information Accuracy</h3>
                <p className="text-gray-700 leading-relaxed">
                  While we work to provide accurate and up-to-date information, we cannot guarantee the accuracy, completeness, or timeliness of all content on our platform.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">8.3 Limitation of Liability</h3>
                <p className="text-gray-700 leading-relaxed">
                  To the maximum extent permitted by law, SCI shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the service.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Indemnification</h2>
            <p className="text-gray-700 leading-relaxed">
              You agree to indemnify and hold harmless SCI, its founders, employees, and affiliates from any claims, damages, losses, or expenses arising from your use of the service or violation of these terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Governing Law</h2>
            <p className="text-gray-700 leading-relaxed">
              These Terms of Service shall be governed by and construed in accordance with the laws of Vietnam, without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Dispute Resolution</h2>
            <p className="text-gray-700 leading-relaxed">
              Any disputes arising from these terms or your use of the service shall be resolved through good faith negotiations. If such negotiations fail, disputes may be resolved through appropriate legal proceedings in Vietnam.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Changes to Terms</h2>
            <p className="text-gray-700 leading-relaxed">
              We reserve the right to modify these terms at any time. We will notify users of material changes by posting the updated terms on our website. Your continued use of the service after such changes constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Severability</h2>
            <p className="text-gray-700 leading-relaxed">
              If any provision of these terms is found to be unenforceable or invalid, that provision will be limited or eliminated to the minimum extent necessary so that the terms will otherwise remain in full force and effect.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Contact Information</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              If you have any questions about these Terms of Service, please contact us:
            </p>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="text-gray-700">
                <strong>Email:</strong> <a href="mailto:2025sciproject@gmail.com" className="text-blue-600 hover:text-blue-800">2025sciproject@gmail.com</a>
              </p>
              <p className="text-gray-700">
                <strong>Phone:</strong> <a href="tel:0856000560" className="text-blue-600 hover:text-blue-800">0856000560</a> (Nguyễn Lương Tuệ Nhi - Founder)
              </p>
              <p className="text-gray-700">
                <strong>Facebook:</strong> <a href="https://www.facebook.com/profile.php?id=61575271022933" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">Follow us on Facebook</a>
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
