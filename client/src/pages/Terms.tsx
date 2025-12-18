import { APP_LOGO, APP_TITLE } from "@/const";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
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
        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: December 17, 2025</p>

        <div className="prose prose-slate max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Agreement to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using the Building Condition Assessment System (the "Service") provided by Maben Consulting ("we," "our," or "us"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use the Service. These Terms apply to all users of the Service, including administrators, project managers, editors, and viewers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              The Service is a cloud-based software platform designed for building condition assessment professionals. The Service provides tools for:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Creating and managing building assessment projects</li>
              <li>Documenting property conditions using UNIFORMAT II standards</li>
              <li>Capturing photos, documents, and voice recordings</li>
              <li>Generating assessment reports and cost estimates</li>
              <li>Collaborating with team members on projects</li>
              <li>Offline data collection with automatic synchronization</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. User Accounts and Registration</h2>
            <h3 className="text-xl font-semibold mb-3 mt-6">3.1 Account Creation</h3>
            <p className="text-muted-foreground leading-relaxed">
              To use the Service, you must create an account by providing accurate and complete information. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">3.2 Access Approval</h3>
            <p className="text-muted-foreground leading-relaxed">
              New user registrations require approval from our administrative team. We reserve the right to approve or reject any registration request at our sole discretion.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">3.3 Account Security</h3>
            <p className="text-muted-foreground leading-relaxed">
              You must immediately notify us of any unauthorized use of your account or any other breach of security. We recommend enabling multi-factor authentication (MFA) for enhanced account security.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">3.4 Account Termination</h3>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to suspend or terminate your account if you violate these Terms or engage in fraudulent, abusive, or illegal activities.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Subscription and Payment</h2>
            <h3 className="text-xl font-semibold mb-3 mt-6">4.1 Subscription Plans</h3>
            <p className="text-muted-foreground leading-relaxed">
              The Service is offered on a subscription basis. Pricing, features, and subscription tiers are available on our website and may be updated from time to time.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">4.2 Payment Terms</h3>
            <p className="text-muted-foreground leading-relaxed">
              Subscription fees are billed in advance on a monthly or annual basis. All fees are non-refundable except as required by law or as explicitly stated in these Terms.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">4.3 Free Trials</h3>
            <p className="text-muted-foreground leading-relaxed">
              We may offer free trial periods for new users. At the end of the trial period, your subscription will automatically convert to a paid plan unless you cancel before the trial ends.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">4.4 Cancellation</h3>
            <p className="text-muted-foreground leading-relaxed">
              You may cancel your subscription at any time. Cancellation will take effect at the end of your current billing period. You will retain access to the Service until the end of the paid period.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Acceptable Use Policy</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              You agree not to use the Service to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Violate any applicable laws, regulations, or third-party rights</li>
              <li>Upload malicious code, viruses, or harmful content</li>
              <li>Attempt to gain unauthorized access to the Service or other users' accounts</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Use automated systems (bots, scrapers) without our written permission</li>
              <li>Reverse engineer, decompile, or disassemble the Service</li>
              <li>Resell or redistribute the Service without authorization</li>
              <li>Upload content that infringes intellectual property rights</li>
              <li>Harass, abuse, or harm other users</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. User Content and Data</h2>
            <h3 className="text-xl font-semibold mb-3 mt-6">6.1 Ownership</h3>
            <p className="text-muted-foreground leading-relaxed">
              You retain all ownership rights to the content and data you upload to the Service ("User Content"). This includes assessment data, photos, documents, and reports.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">6.2 License to Us</h3>
            <p className="text-muted-foreground leading-relaxed">
              By uploading User Content, you grant us a limited, non-exclusive, royalty-free license to store, process, and display your content solely for the purpose of providing the Service to you.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">6.3 Data Accuracy</h3>
            <p className="text-muted-foreground leading-relaxed">
              You are responsible for the accuracy, quality, and legality of your User Content. We do not verify or validate the technical accuracy of assessment data entered into the Service.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">6.4 Data Backup</h3>
            <p className="text-muted-foreground leading-relaxed">
              While we maintain regular backups, you are responsible for maintaining your own backup copies of critical data. We are not liable for data loss except as required by law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Intellectual Property Rights</h2>
            <h3 className="text-xl font-semibold mb-3 mt-6">7.1 Our Rights</h3>
            <p className="text-muted-foreground leading-relaxed">
              The Service, including its software, design, features, and documentation, is owned by Maben Consulting and protected by copyright, trademark, and other intellectual property laws.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">7.2 Limited License</h3>
            <p className="text-muted-foreground leading-relaxed">
              We grant you a limited, non-exclusive, non-transferable license to access and use the Service for your internal business purposes, subject to these Terms.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">7.3 Trademarks</h3>
            <p className="text-muted-foreground leading-relaxed">
              "Maben Consulting" and related logos are trademarks of Maben Consulting. You may not use our trademarks without our prior written permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Data Privacy and Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your privacy is important to us. Our collection, use, and protection of your personal information is governed by our Privacy Policy, which is incorporated into these Terms by reference. Please review our <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a> to understand our data practices.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Service Availability and Modifications</h2>
            <h3 className="text-xl font-semibold mb-3 mt-6">9.1 Uptime</h3>
            <p className="text-muted-foreground leading-relaxed">
              We strive to maintain 99.9% uptime, but we do not guarantee uninterrupted access to the Service. Scheduled maintenance will be announced in advance when possible.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">9.2 Modifications</h3>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time. We will provide reasonable notice for material changes that negatively impact functionality.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">9.3 Updates</h3>
            <p className="text-muted-foreground leading-relaxed">
              We regularly release updates, new features, and bug fixes. Some updates may be applied automatically without notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED</li>
              <li>WE DO NOT WARRANT THAT THE SERVICE WILL BE ERROR-FREE, SECURE, OR UNINTERRUPTED</li>
              <li>WE ARE NOT LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES</li>
              <li>OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID FOR THE SERVICE IN THE 12 MONTHS PRECEDING THE CLAIM</li>
              <li>WE ARE NOT LIABLE FOR DATA LOSS, BUSINESS INTERRUPTION, OR LOST PROFITS</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Some jurisdictions do not allow the exclusion of certain warranties or limitations of liability, so some of the above limitations may not apply to you.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Indemnification</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree to indemnify, defend, and hold harmless Maben Consulting and its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from: (a) your use of the Service, (b) your User Content, (c) your violation of these Terms, or (d) your violation of any third-party rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Professional Use Disclaimer</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service is a tool to assist building assessment professionals. It does not replace professional judgment, expertise, or compliance with applicable building codes and standards. You are solely responsible for the accuracy and completeness of your assessments and reports. We do not provide professional engineering, architectural, or consulting services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service may integrate with third-party services (e.g., Google Maps, cloud storage, AI services). Your use of these third-party services is subject to their respective terms and conditions. We are not responsible for third-party services or their availability.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Dispute Resolution</h2>
            <h3 className="text-xl font-semibold mb-3 mt-6">14.1 Governing Law</h3>
            <p className="text-muted-foreground leading-relaxed">
              These Terms are governed by the laws of the Province of Ontario, Canada, without regard to conflict of law principles.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">14.2 Arbitration</h3>
            <p className="text-muted-foreground leading-relaxed">
              Any disputes arising from these Terms or the Service shall be resolved through binding arbitration in accordance with the rules of the ADR Institute of Canada, except where prohibited by law.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">14.3 Class Action Waiver</h3>
            <p className="text-muted-foreground leading-relaxed">
              You agree to resolve disputes on an individual basis and waive the right to participate in class actions or class arbitrations.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">15. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update these Terms from time to time. We will notify you of material changes by email or through the Service. Your continued use of the Service after changes constitutes acceptance of the updated Terms. If you do not agree to the changes, you must stop using the Service and cancel your subscription.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">16. Severability</h2>
            <p className="text-muted-foreground leading-relaxed">
              If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions will remain in full force and effect.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">17. Entire Agreement</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms, together with our Privacy Policy, constitute the entire agreement between you and Maben Consulting regarding the Service and supersede all prior agreements and understandings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">18. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about these Terms, please contact us:
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
