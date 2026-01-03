import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Shield, FileCheck, Award, BookOpen, Users } from "lucide-react";
import { Link } from "wouter";
import { APP_TITLE } from "@/const";

export default function ASTMCompliant() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" size="sm">← Back to Home</Button>
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">{APP_TITLE}</h1>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4">
        <div className="container max-w-4xl">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900">ASTM E2018 Compliant</h1>
              <p className="text-xl text-slate-600 mt-2">Industry-standard property condition assessment guidelines</p>
            </div>
          </div>
        </div>
      </section>

      {/* Overview Section */}
      <section className="py-12 px-4 bg-white">
        <div className="container max-w-4xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">What is ASTM E2018?</h2>
          <p className="text-lg text-slate-700 leading-relaxed mb-4">
            ASTM E2018 is the Standard Guide for Property Condition Assessments developed by the American Society for Testing 
            and Materials (ASTM International). This widely recognized standard establishes best practices for conducting thorough, 
            consistent, and professional building condition assessments.
          </p>
          <p className="text-lg text-slate-700 leading-relaxed">
            Our platform is designed from the ground up to support ASTM E2018 compliance, ensuring your assessments meet the 
            rigorous standards expected by lenders, investors, property managers, and regulatory bodies.
          </p>
        </div>
      </section>

      {/* Key Standards */}
      <section className="py-12 px-4">
        <div className="container max-w-4xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">ASTM E2018 Requirements We Support</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mb-3">
                  <Shield className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle>Systematic Methodology</CardTitle>
                <CardDescription>
                  Structured assessment process covering all major building systems and components per ASTM guidelines
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center mb-3">
                  <FileCheck className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle>Documentation Standards</CardTitle>
                <CardDescription>
                  Comprehensive documentation requirements including observations, photos, and condition ratings
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mb-3">
                  <BookOpen className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle>Scope Definition</CardTitle>
                <CardDescription>
                  Clear definition of assessment scope, limitations, and assumptions as required by the standard
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center mb-3">
                  <Award className="w-6 h-6 text-orange-600" />
                </div>
                <CardTitle>Professional Qualifications</CardTitle>
                <CardDescription>
                  Support for assessor credentials, certifications, and professional experience documentation
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center mb-3">
                  <Users className="w-6 h-6 text-red-600" />
                </div>
                <CardTitle>Stakeholder Communication</CardTitle>
                <CardDescription>
                  Clear reporting formats suitable for owners, lenders, investors, and facility managers
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center mb-3">
                  <CheckCircle className="w-6 h-6 text-indigo-600" />
                </div>
                <CardTitle>Quality Assurance</CardTitle>
                <CardDescription>
                  Built-in validation checks to ensure completeness and consistency of assessment data
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Assessment Components */}
      <section className="py-12 px-4 bg-blue-50">
        <div className="container max-w-4xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">ASTM E2018 Assessment Components</h2>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Site Reconnaissance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 mb-3">
                  Visual, non-invasive inspection of readily accessible building systems and components
                </p>
                <ul className="space-y-1 text-sm text-slate-600">
                  <li>• Exterior envelope and site features</li>
                  <li>• Interior spaces and finishes</li>
                  <li>• Mechanical, electrical, and plumbing systems</li>
                  <li>• Structural components (where accessible)</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Document Review</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 mb-3">
                  Review of available property documentation and records
                </p>
                <ul className="space-y-1 text-sm text-slate-600">
                  <li>• Building plans and specifications</li>
                  <li>• Maintenance records and service contracts</li>
                  <li>• Previous assessment reports</li>
                  <li>• Permit and compliance documentation</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Interviews</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 mb-3">
                  Discussions with property personnel to understand history and operations
                </p>
                <ul className="space-y-1 text-sm text-slate-600">
                  <li>• Property managers and maintenance staff</li>
                  <li>• Building owners or representatives</li>
                  <li>• Tenant representatives (when applicable)</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Immediate Repairs</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Identification of deficiencies requiring immediate attention for safety, code compliance, or asset protection
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Capital Needs</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Assessment of deferred maintenance and projected capital expenditures over the study period (typically 10-12 years)
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits of Compliance */}
      <section className="py-12 px-4 bg-white">
        <div className="container max-w-4xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Why ASTM E2018 Compliance Matters</h2>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">1</div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Industry Recognition</h3>
                <p className="text-slate-600">
                  ASTM E2018 is the most widely recognized standard for property condition assessments in North America, 
                  accepted by major lending institutions, investors, and regulatory bodies
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">2</div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Risk Mitigation</h3>
                <p className="text-slate-600">
                  Following standardized procedures reduces liability and ensures comprehensive coverage of all critical building systems
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">3</div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Professional Credibility</h3>
                <p className="text-slate-600">
                  Demonstrate your commitment to quality and best practices by delivering ASTM-compliant assessments
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">4</div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Consistent Quality</h3>
                <p className="text-slate-600">
                  Standardized methodology ensures consistent assessment quality regardless of assessor or property type
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Limitations Section */}
      <section className="py-12 px-4 bg-slate-50">
        <div className="container max-w-4xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Standard Limitations</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-slate-700 mb-4">
                ASTM E2018 assessments are visual, non-invasive inspections. The standard explicitly excludes:
              </p>
              <ul className="space-y-2 text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="text-slate-400 mt-1">•</span>
                  <span>Environmental site assessments (Phase I/II ESAs)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400 mt-1">•</span>
                  <span>Destructive testing or invasive investigations</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400 mt-1">•</span>
                  <span>Code compliance reviews</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400 mt-1">•</span>
                  <span>Seismic or structural engineering analysis</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400 mt-1">•</span>
                  <span>ADA accessibility surveys</span>
                </li>
              </ul>
              <p className="text-slate-700 mt-4">
                Our platform clearly documents these limitations in all generated reports as required by the standard.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="container max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Conduct ASTM E2018 Compliant Assessments</h2>
          <p className="text-xl text-blue-100 mb-8">Meet industry standards with confidence</p>
          <Link href="/projects">
            <Button size="lg" variant="secondary" className="bg-white text-blue-600 hover:bg-blue-50">
              Start Compliant Assessment
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
