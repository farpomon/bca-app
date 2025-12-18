import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download, Palette, BarChart3, Clock, Share2 } from "lucide-react";
import { Link } from "wouter";
import { APP_TITLE } from "@/const";

export default function AutomatedReports() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
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
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center">
              <FileText className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900">Automated Reports</h1>
              <p className="text-xl text-slate-600 mt-2">Professional PDF reports generated instantly from your assessments</p>
            </div>
          </div>
        </div>
      </section>

      {/* Overview Section */}
      <section className="py-12 px-4 bg-white">
        <div className="container max-w-4xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">From Data to Deliverable in Seconds</h2>
          <p className="text-lg text-slate-700 leading-relaxed mb-4">
            Transform your building condition assessments into polished, professional reports with a single click. Our automated 
            report generation system takes your field observations, photos, and condition ratings and creates comprehensive PDF 
            documents that meet industry standards and client expectations.
          </p>
          <p className="text-lg text-slate-700 leading-relaxed">
            No more hours spent formatting documents, copying data, or arranging photos. The system handles all the heavy lifting, 
            allowing you to focus on analysis and recommendations rather than document production.
          </p>
        </div>
      </section>

      {/* Key Features */}
      <section className="py-12 px-4">
        <div className="container max-w-4xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">What's Included</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center mb-3">
                  <FileText className="w-6 h-6 text-emerald-600" />
                </div>
                <CardTitle>Professional Formatting</CardTitle>
                <CardDescription>
                  Clean, consistent layouts with proper headings, tables, and sections that follow industry best practices
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mb-3">
                  <Palette className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle>Branded Templates</CardTitle>
                <CardDescription>
                  Customize reports with your company logo, colors, and contact information for professional branding
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mb-3">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle>Visual Data</CardTitle>
                <CardDescription>
                  Automatic charts and graphs showing condition distributions, deficiency priorities, and cost summaries
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center mb-3">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
                <CardTitle>Instant Generation</CardTitle>
                <CardDescription>
                  Reports generate in seconds, not hours - deliver results to clients while still on-site if needed
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center mb-3">
                  <Download className="w-6 h-6 text-red-600" />
                </div>
                <CardTitle>Multiple Formats</CardTitle>
                <CardDescription>
                  Export as PDF for distribution, or generate Excel spreadsheets for detailed cost analysis
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center mb-3">
                  <Share2 className="w-6 h-6 text-indigo-600" />
                </div>
                <CardTitle>Easy Sharing</CardTitle>
                <CardDescription>
                  Share reports via email, download links, or integrate with your document management system
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Report Contents */}
      <section className="py-12 px-4 bg-emerald-50">
        <div className="container max-w-4xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Standard Report Sections</h2>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Executive Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  High-level overview of building condition, key findings, critical deficiencies, and recommended priorities
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Property Information</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Building details, location, construction type, age, size, and assessment scope
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Component Assessments</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Detailed findings organized by UNIFORMAT II classification with condition ratings, observations, and photos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Deficiency Register</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Complete list of identified deficiencies with severity ratings, repair recommendations, and cost estimates
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Photo Documentation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  All assessment photos with captions, locations, and references to related findings
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cost Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Repair and replacement cost estimates organized by priority level and building system
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Customization Options */}
      <section className="py-12 px-4 bg-white">
        <div className="container max-w-4xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Customization Options</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900">Report Content</h3>
              <ul className="space-y-2 text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-1">✓</span>
                  <span>Choose which sections to include</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-1">✓</span>
                  <span>Filter by building system or priority</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-1">✓</span>
                  <span>Add custom narrative sections</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-1">✓</span>
                  <span>Include or exclude photos</span>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900">Visual Style</h3>
              <ul className="space-y-2 text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-1">✓</span>
                  <span>Company logo and branding</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-1">✓</span>
                  <span>Custom color schemes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-1">✓</span>
                  <span>Header and footer templates</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-1">✓</span>
                  <span>Font and typography choices</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-12 px-4 bg-slate-50">
        <div className="container max-w-4xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Time and Cost Savings</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-4xl font-bold text-emerald-600 mb-2">90%</div>
                <p className="text-slate-600">Reduction in report preparation time</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-4xl font-bold text-emerald-600 mb-2">100%</div>
                <p className="text-slate-600">Consistency across all reports</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-4xl font-bold text-emerald-600 mb-2">Zero</div>
                <p className="text-slate-600">Manual formatting errors</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-emerald-600 to-emerald-700">
        <div className="container max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Generate Your First Professional Report</h2>
          <p className="text-xl text-emerald-100 mb-8">See how fast and easy professional reporting can be</p>
          <Link href="/projects">
            <Button size="lg" variant="secondary" className="bg-white text-emerald-600 hover:bg-emerald-50">
              Create a Report Now
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
