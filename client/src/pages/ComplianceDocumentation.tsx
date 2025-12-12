import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Shield, Database, Lock, FileText, CheckCircle, Server } from "lucide-react";

export default function ComplianceDocumentation() {
  const { data: dataResidency } = trpc.compliance.getDataResidency.useQuery();

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          Compliance & Security Documentation
        </h1>
        <p className="text-muted-foreground mt-1">
          Information about data handling, security, and compliance certifications
        </p>
      </div>

      {/* Overview */}
      <Card className="p-6">
        <h2 className="text-2xl font-semibold mb-4">Overview</h2>
        <p className="text-muted-foreground leading-relaxed">
          This Building Condition Assessment System is designed with security and compliance at its core. 
          The platform adheres to rigorous industry standards including FOIP (Freedom of Information and 
          Protection of Privacy Act), ISO 27001, and SOC 2 Type II certifications through the Manus hosting 
          infrastructure. All data handling practices are designed to ensure confidentiality, integrity, and 
          availability of your information.
        </p>
      </Card>

      {/* Certifications */}
      <Card className="p-6">
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <CheckCircle className="h-6 w-6 text-green-600" />
          Compliance Certifications
        </h2>
        <div className="space-y-4">
          <div className="border-l-4 border-green-500 pl-4 py-2">
            <h3 className="font-semibold text-lg">FOIP Compliance</h3>
            <p className="text-sm text-muted-foreground mt-1">
              <strong>Freedom of Information and Protection of Privacy Act</strong> - The system complies with 
              FOIP requirements for data sovereignty, user consent, data portability, and the right to deletion. 
              All personal information is handled in accordance with provincial privacy legislation.
            </p>
            <div className="mt-2 flex gap-2">
              <Badge variant="outline">Data Sovereignty</Badge>
              <Badge variant="outline">User Consent Tracking</Badge>
              <Badge variant="outline">Right to Access</Badge>
              <Badge variant="outline">Right to Deletion</Badge>
            </div>
          </div>

          <div className="border-l-4 border-blue-500 pl-4 py-2">
            <h3 className="font-semibold text-lg">ISO 27001</h3>
            <p className="text-sm text-muted-foreground mt-1">
              <strong>Information Security Management System</strong> - The hosting infrastructure maintains 
              ISO 27001 certification, ensuring systematic management of sensitive information through 
              comprehensive security controls, risk management, and continuous improvement processes.
            </p>
            <div className="mt-2 flex gap-2">
              <Badge variant="outline">Risk Management</Badge>
              <Badge variant="outline">Access Controls</Badge>
              <Badge variant="outline">Incident Response</Badge>
            </div>
          </div>

          <div className="border-l-4 border-purple-500 pl-4 py-2">
            <h3 className="font-semibold text-lg">SOC 2 Type II</h3>
            <p className="text-sm text-muted-foreground mt-1">
              <strong>Service Organization Control</strong> - The platform's hosting provider maintains SOC 2 
              Type II certification, demonstrating effective controls over security, availability, processing 
              integrity, confidentiality, and privacy of customer data over time.
            </p>
            <div className="mt-2 flex gap-2">
              <Badge variant="outline">Security</Badge>
              <Badge variant="outline">Availability</Badge>
              <Badge variant="outline">Confidentiality</Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Data Residency */}
      <Card className="p-6">
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <Database className="h-6 w-6 text-blue-600" />
          Data Residency & Storage
        </h2>
        <p className="text-muted-foreground mb-4">
          Transparency about where your data is stored and processed is fundamental to compliance. 
          Below are the current data residency settings for this system:
        </p>
        <div className="space-y-3">
          {dataResidency && Object.entries(dataResidency).map(([key, data]: [string, any]) => (
            <div key={key} className="bg-muted p-4 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium capitalize">{key.replace(/_/g, " ")}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{data.description}</p>
                  <p className="text-sm font-medium mt-2">{data.value}</p>
                </div>
                <Server className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-4" />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Security Measures */}
      <Card className="p-6">
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <Lock className="h-6 w-6 text-amber-600" />
          Security Measures
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h3 className="font-semibold">Data Protection</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>End-to-end encryption for data in transit (TLS 1.3)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Encryption at rest for all stored data</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Secure file storage with S3-compatible infrastructure</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Regular automated backups with geographic redundancy</span>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">Access Controls</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>OAuth 2.0 authentication via Manus platform</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Role-based access control (RBAC) for admin functions</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Session management with secure HTTP-only cookies</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Multi-company data isolation and access controls</span>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">Audit & Monitoring</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Comprehensive audit logging of all data operations</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>IP address and session tracking for security events</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Data classification and retention policy enforcement</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Real-time monitoring and alerting for suspicious activity</span>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">User Rights</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Right to access personal data (data portability)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Right to deletion (account and data removal)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Consent management and tracking system</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Transparent data processing and usage policies</span>
              </li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Data Handling Practices */}
      <Card className="p-6">
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-6 w-6 text-purple-600" />
          Data Handling Practices
        </h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Data Collection</h3>
            <p className="text-sm text-muted-foreground">
              The system collects only the minimum necessary information required to provide building condition 
              assessment services. This includes project details, assessment data, user account information, 
              and associated media files (photos, documents). All data collection is transparent and requires 
              user consent.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Data Usage</h3>
            <p className="text-sm text-muted-foreground">
              Collected data is used exclusively for providing and improving the building condition assessment 
              service. Data is not sold, shared with third parties for marketing purposes, or used for purposes 
              beyond the scope of the service agreement. Analytics data is anonymized and aggregated.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Data Retention</h3>
            <p className="text-sm text-muted-foreground">
              Project and assessment data is retained for the duration specified in your service agreement or 
              until deletion is requested. Audit logs are retained for 7 years to comply with regulatory 
              requirements. Deleted data is permanently removed from production systems within 30 days, with 
              backup copies removed within 90 days.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Data Sharing</h3>
            <p className="text-sm text-muted-foreground">
              Data may be shared only with explicit user consent through the project sharing features. 
              Administrative access is limited to authorized personnel for support and maintenance purposes. 
              Legal disclosure may occur only when required by law with proper documentation and notification 
              where permitted.
            </p>
          </div>
        </div>
      </Card>

      {/* Contact Information */}
      <Card className="p-6 bg-muted">
        <h2 className="text-xl font-semibold mb-3">Questions or Concerns?</h2>
        <p className="text-sm text-muted-foreground">
          If you have questions about compliance, data handling, or security practices, please contact your 
          system administrator or reach out to Manus support at{" "}
          <a href="https://help.manus.im" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
            help.manus.im
          </a>
        </p>
      </Card>
    </div>
  );
}
