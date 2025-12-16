import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_TITLE, APP_LOGO, getLoginUrl } from "@/const";
import { Building2, ClipboardCheck, FileText, TrendingUp, CheckCircle2, Shield, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";
import HeroImage from "@/components/HeroImage";

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
          <div className="flex items-center gap-3">
            <img src={APP_LOGO} alt="Maben Consulting" className="h-10 w-auto" />
            <span className="font-bold text-xl">{APP_TITLE}</span>
          </div>
          <Button asChild>
            <a href={getLoginUrl()}>Sign In</a>
          </Button>
        </div>
      </header>

      {/* Hero Section with Rotating Background Image */}
      <HeroImage height="600px">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center space-y-8 text-white">
            <div className="inline-block">
              <span className="text-sm font-semibold uppercase tracking-wider bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm">Building Condition Assessment Software</span>
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight drop-shadow-lg">
              Streamline Building Assessments
            </h1>
            <p className="text-xl leading-relaxed drop-shadow-md">
              Professional BCA platform following ASTM E2018 standards. Complete assessments faster with UNIFORMAT II classification, voice recording, and automated reporting.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-base h-12 px-8 bg-white text-primary hover:bg-white/90" asChild>
                <a href={getLoginUrl()}>Start Free Assessment</a>
              </Button>
              <Button size="lg" variant="outline" className="text-base h-12 px-8 border-white text-white hover:bg-white/20" asChild>
                <a href="#features">See How It Works</a>
              </Button>
            </div>
          </div>
        </div>
      </HeroImage>

      {/* Value Proposition Section */}
      <section className="container py-16">
        <div className="grid md:grid-cols-3 gap-8 text-center">
          <div className="space-y-3">
            <div className="text-4xl font-bold text-primary">1,244+</div>
            <div className="text-muted-foreground">Projects Completed</div>
          </div>
          <div className="space-y-3">
            <div className="text-4xl font-bold text-primary">ASTM E2018</div>
            <div className="text-muted-foreground">Standards Compliant</div>
          </div>
          <div className="space-y-3">
            <div className="text-4xl font-bold text-primary">UNIFORMAT II</div>
            <div className="text-muted-foreground">Classification System</div>
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
