import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, PieChart, LineChart, Target, DollarSign } from "lucide-react";
import { Link } from "wouter";
import { APP_TITLE } from "@/const";

export default function AnalyticsInsights() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
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
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center">
              <BarChart3 className="w-8 h-8 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900">Analytics & Insights</h1>
              <p className="text-xl text-slate-600 mt-2">Transform assessment data into actionable intelligence</p>
            </div>
          </div>
        </div>
      </section>

      {/* Overview Section */}
      <section className="py-12 px-4 bg-white">
        <div className="container max-w-4xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Data-Driven Decision Making</h2>
          <p className="text-lg text-slate-700 leading-relaxed mb-4">
            Building condition assessments generate valuable data that can reveal patterns, trends, and insights across your 
            entire property portfolio. Our analytics platform transforms raw assessment data into visual dashboards and 
            actionable intelligence, helping you make informed decisions about capital planning, maintenance priorities, and 
            resource allocation.
          </p>
          <p className="text-lg text-slate-700 leading-relaxed">
            Whether you're managing a single building or a large portfolio, our analytics tools provide the visibility you 
            need to optimize maintenance strategies, justify capital expenditures, and demonstrate value to stakeholders.
          </p>
        </div>
      </section>

      {/* Key Features */}
      <section className="py-12 px-4">
        <div className="container max-w-4xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">Powerful Analytics Features</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center mb-3">
                  <BarChart3 className="w-6 h-6 text-indigo-600" />
                </div>
                <CardTitle>Portfolio Overview</CardTitle>
                <CardDescription>
                  See condition ratings, deficiency counts, and cost estimates across all your properties at a glance
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mb-3">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle>Trend Analysis</CardTitle>
                <CardDescription>
                  Track how building conditions change over time to identify deterioration patterns and maintenance effectiveness
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mb-3">
                  <PieChart className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle>System Breakdown</CardTitle>
                <CardDescription>
                  Analyze condition and cost data by UNIFORMAT II classification to identify which systems need attention
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center mb-3">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle>Cost Forecasting</CardTitle>
                <CardDescription>
                  Project future capital needs based on component lifecycles and current condition assessments
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center mb-3">
                  <Target className="w-6 h-6 text-orange-600" />
                </div>
                <CardTitle>Priority Scoring</CardTitle>
                <CardDescription>
                  Automatically rank deficiencies and projects by urgency, cost, and impact to optimize resource allocation
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center mb-3">
                  <LineChart className="w-6 h-6 text-red-600" />
                </div>
                <CardTitle>Custom Reports</CardTitle>
                <CardDescription>
                  Create custom dashboards and reports tailored to your organization's specific KPIs and metrics
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Dashboard Views */}
      <section className="py-12 px-4 bg-indigo-50">
        <div className="container max-w-4xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Key Dashboard Views</h2>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Portfolio Health Score</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 mb-3">
                  Overall condition rating across all properties with breakdown by building system and component type
                </p>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Visualizations:</span>
                    <span className="text-slate-900">Gauge charts, heat maps, condition distribution graphs</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Capital Planning Dashboard</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 mb-3">
                  Multi-year capital expenditure forecasts with immediate, short-term, and long-term cost projections
                </p>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Visualizations:</span>
                    <span className="text-slate-900">Stacked bar charts, timeline views, budget allocation pie charts</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Deficiency Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 mb-3">
                  Track open deficiencies by priority level, building system, and age with resolution status tracking
                </p>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Visualizations:</span>
                    <span className="text-slate-900">Priority matrices, aging reports, resolution trend lines</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">System Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 mb-3">
                  Compare condition ratings across different building systems to identify which areas need investment
                </p>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Visualizations:</span>
                    <span className="text-slate-900">Radar charts, comparative bar graphs, system ranking tables</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Assessment Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 mb-3">
                  Monitor assessment completion rates, assessor productivity, and project timelines
                </p>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Visualizations:</span>
                    <span className="text-slate-900">Progress bars, timeline charts, activity heatmaps</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-12 px-4 bg-white">
        <div className="container max-w-4xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Real-World Applications</h2>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">1</div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Budget Justification</h3>
                <p className="text-slate-600">
                  Use data-driven insights to justify capital budget requests to boards, executives, or funding agencies with 
                  clear visualizations of needs and priorities
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">2</div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Portfolio Optimization</h3>
                <p className="text-slate-600">
                  Identify underperforming assets, compare properties, and make strategic decisions about acquisitions, 
                  dispositions, or major renovations
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">3</div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Maintenance Planning</h3>
                <p className="text-slate-600">
                  Develop evidence-based preventive maintenance programs by identifying which systems are deteriorating 
                  faster than expected
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">4</div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Stakeholder Reporting</h3>
                <p className="text-slate-600">
                  Generate executive summaries and board reports that communicate complex building condition data in 
                  clear, visual formats
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">5</div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Benchmarking</h3>
                <p className="text-slate-600">
                  Compare your properties against industry standards or internal benchmarks to identify outliers and 
                  improvement opportunities
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Data Export */}
      <section className="py-12 px-4 bg-slate-50">
        <div className="container max-w-4xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Export & Integration</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold text-slate-900 mb-2">Export Options</h3>
                <ul className="space-y-2 text-slate-600 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-600 mt-1">•</span>
                    <span>Export charts and graphs as PNG/PDF for presentations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-600 mt-1">•</span>
                    <span>Download raw data as Excel/CSV for custom analysis</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-600 mt-1">•</span>
                    <span>Generate scheduled reports via email</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold text-slate-900 mb-2">API Access</h3>
                <ul className="space-y-2 text-slate-600 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-600 mt-1">•</span>
                    <span>Connect to BI tools like Power BI or Tableau</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-600 mt-1">•</span>
                    <span>Integrate with CMMS and facility management systems</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-600 mt-1">•</span>
                    <span>Build custom dashboards with our REST API</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700">
        <div className="container max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Unlock the Power of Your Data</h2>
          <p className="text-xl text-indigo-100 mb-8">Start making data-driven decisions about your properties</p>
          <Link href="/projects">
            <Button size="lg" variant="secondary" className="bg-white text-indigo-600 hover:bg-indigo-50">
              Explore Analytics
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
