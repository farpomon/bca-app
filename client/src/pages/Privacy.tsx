import { APP_LOGO, APP_TITLE } from "@/const";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img src={APP_LOGO} alt="Logo" className="h-8 w-8 sm:h-10 sm:w-10" />
              <span className="font-semibold text-base sm:text-lg whitespace-nowrap">{APP_TITLE}</span>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <a href="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </a>
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: December 17, 2024</p>

        <div className="prose prose-slate max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Maben Consulting ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Building Condition Assessment System (the "Service"). Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
            <h3 className="text-xl font-semibold mb-3 mt-6">2.1 Personal Information</h3>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We collect personal information that you voluntarily provide to us when you register for the Service, including:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Name and contact information (email address, phone number)</li>
              <li>Company name and business information</li>
              <li>User credentials (username and password)</li>
              <li>Professional details and role information</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">2.2 Assessment Data</h3>
            <p className="text-muted-foreground leading-relaxed mb-3">
              When you use our Service, we collect information related to building condition assessments, including:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Project details and property information</li>
              <li>Assessment observations and recommendations</li>
              <li>Photos and documents uploaded to the platform</li>
              <li>Cost estimates and financial data</li>
              <li>Voice recordings and transcriptions</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">2.3 Automatically Collected Information</h3>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We automatically collect certain information when you use the Service:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Log data (IP address, browser type, operating system)</li>
              <li>Device information and unique identifiers</li>
              <li>Usage data (features accessed, time spent, actions taken)</li>
              <li>Location data (GPS coordinates when uploading photos)</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We use the information we collect for the following purposes:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Providing, operating, and maintaining the Service</li>
              <li>Processing and storing your building assessment data</li>
              <li>Authenticating users and managing accounts</li>
              <li>Generating reports and analytics</li>
              <li>Improving and optimizing the Service</li>
              <li>Communicating with you about updates, security alerts, and support</li>
              <li>Detecting and preventing fraud, abuse, and security incidents</li>
              <li>Complying with legal obligations and enforcing our Terms of Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Data Storage and Security</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We implement industry-standard security measures to protect your information:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>Encryption:</strong> All data is encrypted in transit using TLS 1.3 and at rest using AES-256-GCM encryption</li>
              <li><strong>Access Controls:</strong> Role-based access control (RBAC) ensures users only access authorized data</li>
              <li><strong>Multi-Factor Authentication:</strong> Optional MFA for enhanced account security</li>
              <li><strong>Audit Logging:</strong> Comprehensive logging of all data access and modifications</li>
              <li><strong>Data Backups:</strong> Regular automated backups with 7-year retention for compliance</li>
              <li><strong>Secure Infrastructure:</strong> Data stored on secure cloud servers with redundancy and disaster recovery</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Data Sharing and Disclosure</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We do not sell, rent, or trade your personal information. We may share your information in the following circumstances:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>Within Your Organization:</strong> Data is shared with authorized users in your company based on assigned permissions</li>
              <li><strong>Service Providers:</strong> Third-party vendors who assist in operating the Service (cloud hosting, email delivery, analytics)</li>
              <li><strong>Legal Requirements:</strong> When required by law, court order, or government request</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
              <li><strong>With Your Consent:</strong> When you explicitly authorize us to share your information</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your information for as long as necessary to provide the Service and comply with legal obligations. Assessment data is retained for 7 years by default to meet municipal and regulatory requirements. You may request deletion of your data, subject to legal retention requirements.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Your Privacy Rights</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Depending on your location, you may have the following rights:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
              <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
              <li><strong>Deletion:</strong> Request deletion of your personal information (subject to retention requirements)</li>
              <li><strong>Data Portability:</strong> Request your data in a machine-readable format</li>
              <li><strong>Opt-Out:</strong> Opt out of marketing communications</li>
              <li><strong>Withdraw Consent:</strong> Withdraw consent for data processing where consent was the legal basis</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              To exercise these rights, please contact us at <a href="mailto:lfaria@mabenconsulting.ca" className="text-primary hover:underline">lfaria@mabenconsulting.ca</a>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Cookies and Tracking Technologies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use cookies and similar technologies to maintain user sessions, remember preferences, and analyze usage patterns. You can control cookies through your browser settings, but disabling cookies may limit functionality of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Our Service integrates with third-party services that have their own privacy policies:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Google Maps (for location services)</li>
              <li>Cloud storage providers (for file storage)</li>
              <li>Email delivery services (for notifications)</li>
              <li>AI services (for document parsing and voice transcription)</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              We recommend reviewing the privacy policies of these third-party services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. International Data Transfers</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place to protect your information in accordance with this Privacy Policy and applicable data protection laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our Service is not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Changes to This Privacy Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last updated" date. Your continued use of the Service after changes constitutes acceptance of the updated Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions or concerns about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="font-semibold">Maben Consulting</p>
              <p className="text-muted-foreground">Email: <a href="mailto:lfaria@mabenconsulting.ca" className="text-primary hover:underline">lfaria@mabenconsulting.ca</a></p>
            </div>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 bg-background border-t mt-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={APP_LOGO} alt="Logo" className="h-8 w-8" />
              <span className="text-sm text-muted-foreground">© 2025 Maben Consulting. All rights reserved.</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="/privacy" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="/terms" className="hover:text-foreground transition-colors">Terms</a>
              <a href="/contact" className="hover:text-foreground transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
