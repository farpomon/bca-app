import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_TITLE, getLoginUrl } from "@/const";
import { Building2, ClipboardCheck, FileText, TrendingUp, CheckCircle2, Shield, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function Home() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  // All hooks must be called before any conditional returns
  useEffect(() => {
    if (user && !loading) {
      setLocation("/projects");
    }
  }, [user, loading, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="glass border-b sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">{APP_TITLE}</span>
          </div>
          <Button asChild>
            <a href={getLoginUrl()}>Sign In</a>
          </Button>
        </div>
      </header>

      {/* Hero Section - Modern 2025 Design */}
      <section className="container py-16 md:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content (60%) */}
          <div className="space-y-8">
            <div className="inline-block">
              <span className="text-sm font-semibold uppercase tracking-wider text-accent">Building Condition Assessment Software</span>
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">
              Streamline Building Assessments
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Professional BCA platform following ASTM E2018 standards. Complete assessments faster with UNIFORMAT II classification, voice recording, and automated reporting.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="text-base h-12 px-8" asChild>
                <a href={getLoginUrl()}>Start Free Assessment</a>
              </Button>
              <Button size="lg" variant="outline" className="text-base h-12 px-8" asChild>
                <a href="#features">See How It Works</a>
              </Button>
            </div>
            {/* Social Proof */}
            <div className="flex items-center gap-6 pt-4">
              <div className="flex -space-x-2">
                <div className="w-10 h-10 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center text-sm font-semibold">A</div>
                <div className="w-10 h-10 rounded-full bg-secondary/20 border-2 border-background flex items-center justify-center text-sm font-semibold">B</div>
                <div className="w-10 h-10 rounded-full bg-accent/20 border-2 border-background flex items-center justify-center text-sm font-semibold">C</div>
              </div>
              <div className="text-sm">
                <div className="font-semibold">Trusted by inspectors</div>
                <div className="text-muted-foreground">Join professionals worldwide</div>
              </div>
            </div>
          </div>

          {/* Right: Visual (40%) */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border/50">
              {/* Product Screenshot Placeholder */}
              <div className="aspect-[4/3] bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 flex items-center justify-center">
                <div className="text-center space-y-4 p-8">
                  <Building2 className="h-24 w-24 text-primary mx-auto" />
                  <div className="space-y-2">
                    <div className="h-4 w-48 bg-primary/20 rounded mx-auto"></div>
                    <div className="h-4 w-32 bg-secondary/20 rounded mx-auto"></div>
                    <div className="h-4 w-40 bg-accent/20 rounded mx-auto"></div>
                  </div>
                </div>
              </div>
            </div>
            {/* Floating Stats */}
            <div className="absolute -bottom-6 -left-6 bg-card border border-border/50 rounded-xl shadow-lg p-4 hidden md:block">
              <div className="text-3xl font-bold text-primary">1,244</div>
              <div className="text-sm text-muted-foreground">Projects Completed</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container py-20 bg-muted/50">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything You Need for Professional BCAs
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Comprehensive tools for conducting building condition assessments
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="glass-card hover-lift smooth-transition">
              <CardHeader>
                <ClipboardCheck className="h-10 w-10 text-primary mb-2" />
                <CardTitle>UNIFORMAT II Classification</CardTitle>
                <CardDescription>
                  Organize assessments using the industry-standard UNIFORMAT II hierarchical structure
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-card hover-lift smooth-transition">
              <CardHeader>
                <FileText className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Professional Reports</CardTitle>
                <CardDescription>
                  Generate comprehensive BCA reports following ASTM E2018 standards
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-card hover-lift smooth-transition">
              <CardHeader>
                <TrendingUp className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Cost Estimation</CardTitle>
                <CardDescription>
                  Track deficiencies and estimate repair costs with detailed breakdowns
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-card hover-lift smooth-transition">
              <CardHeader>
                <CheckCircle2 className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Condition Tracking</CardTitle>
                <CardDescription>
                  Rate building components and track remaining useful life
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-card hover-lift smooth-transition">
              <CardHeader>
                <Shield className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Standards Compliant</CardTitle>
                <CardDescription>
                  Follow NRC protocols and ASTM E2018 methodology
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-card hover-lift smooth-transition">
              <CardHeader>
                <Clock className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Photo Documentation</CardTitle>
                <CardDescription>
                  Upload and organize photos for comprehensive visual documentation
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-20">
        <Card className="mx-auto max-w-3xl bg-primary text-primary-foreground">
          <CardContent className="p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Start Your Assessment?
            </h2>
            <p className="text-lg mb-8 opacity-90">
              Join professionals who trust our platform for building condition assessments
            </p>
            <Button size="lg" variant="secondary" asChild>
              <a href={getLoginUrl()}>Sign In Now</a>
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/50 py-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} {APP_TITLE}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
