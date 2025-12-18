import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, CheckCircle, FileText, Layers } from "lucide-react";
import { Link } from "wouter";
import { APP_TITLE } from "@/const";

export default function UniformatClassification() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
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
              <Building2 className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900">UNIFORMAT II Classification</h1>
              <p className="text-xl text-slate-600 mt-2">Industry-standard building component organization</p>
            </div>
          </div>
        </div>
      </section>

      {/* Overview Section */}
      <section className="py-12 px-4 bg-white">
        <div className="container max-w-4xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">What is UNIFORMAT II?</h2>
          <p className="text-lg text-slate-700 leading-relaxed mb-4">
            UNIFORMAT II is a standardized classification system developed by the American Society for Testing and Materials (ASTM) 
            for organizing building components and systems. It provides a consistent framework for cost estimation, facility management, 
            and building condition assessments across the construction industry.
          </p>
          <p className="text-lg text-slate-700 leading-relaxed">
            Our platform implements the complete UNIFORMAT II hierarchy, enabling you to conduct assessments that align with industry 
            best practices and ensure consistency across all your building evaluation projects.
          </p>
        </div>
      </section>

      {/* Key Benefits */}
      <section className="py-12 px-4">
        <div className="container max-w-4xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">Key Benefits</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center mb-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle>Standardized Assessments</CardTitle>
                <CardDescription>
                  Use the same classification system recognized across the construction and facility management industries
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mb-3">
                  <Layers className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle>Hierarchical Organization</CardTitle>
                <CardDescription>
                  Navigate through major groups, groups, and individual components with clear parent-child relationships
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center mb-3">
                  <FileText className="w-6 h-6 text-orange-600" />
                </div>
                <CardTitle>Comprehensive Coverage</CardTitle>
                <CardDescription>
                  Assess every aspect of a building from substructure to equipment and furnishings
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mb-3">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle>Industry Compatibility</CardTitle>
                <CardDescription>
                  Generate reports that integrate seamlessly with cost databases and facility management systems
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Classification Structure */}
      <section className="py-12 px-4 bg-slate-50">
        <div className="container max-w-4xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Classification Structure</h2>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Level 1: Major Group Elements</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 mb-3">Broad categories representing major building systems:</p>
                <ul className="space-y-2 text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="font-mono text-sm bg-slate-200 px-2 py-1 rounded">A</span>
                    <span>Substructure</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono text-sm bg-slate-200 px-2 py-1 rounded">B</span>
                    <span>Shell</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono text-sm bg-slate-200 px-2 py-1 rounded">C</span>
                    <span>Interiors</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono text-sm bg-slate-200 px-2 py-1 rounded">D</span>
                    <span>Services</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono text-sm bg-slate-200 px-2 py-1 rounded">E</span>
                    <span>Equipment & Furnishings</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Level 2: Group Elements</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 mb-3">Specific systems within each major group:</p>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="font-mono text-sm text-slate-700">Example: <span className="font-semibold">B20 Exterior Enclosure</span></p>
                  <p className="text-sm text-slate-600 mt-1">Under Major Group B (Shell)</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Level 3: Individual Elements</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 mb-3">Detailed components for assessment:</p>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="font-mono text-sm text-slate-700">Example: <span className="font-semibold">B2010 Exterior Walls</span></p>
                  <p className="text-sm text-slate-600 mt-1">Under Group B20 (Exterior Enclosure)</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 px-4 bg-white">
        <div className="container max-w-4xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">How It Works in Our Platform</h2>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">1</div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Select Your Component</h3>
                <p className="text-slate-600">Browse through the hierarchical structure or search for specific building components using UNIFORMAT II codes</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">2</div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Conduct Assessment</h3>
                <p className="text-slate-600">Record observations, condition ratings, and deficiencies for each component with guided templates</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">3</div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Generate Reports</h3>
                <p className="text-slate-600">Create professional reports organized by UNIFORMAT II classification for easy analysis and cost planning</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="container max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Start Standardized Assessments?</h2>
          <p className="text-xl text-blue-100 mb-8">Join professionals using UNIFORMAT II for consistent building evaluations</p>
          <Link href="/projects">
            <Button size="lg" variant="secondary" className="bg-white text-blue-600 hover:bg-blue-50">
              Start Your First Project
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
