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
      {/* Header - Optimized for mobile */}
      <header className="glass border-b sticky top-0 z-50 bg-white/95 backdrop-blur-sm">
        <div className="container">
          <div className="flex h-20 md:h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <img src={APP_LOGO} alt="Maben Consulting" className="h-8 md:h-10 w-auto flex-shrink-0" />
              <span className="font-bold text-base md:text-xl truncate">{APP_TITLE}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button size="sm" variant="outline" className="md:size-default" asChild>
                <a href="/signup">Sign Up</a>
              </Button>
              <Button size="sm" className="md:size-default" asChild>
                <a href={getLoginUrl()}>Sign In</a>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Mobile: Image first, text below | Desktop: Text overlay on image */}
      <div className="md:hidden">
        {/* Mobile Layout: Image first, then text */}
        <HeroImage height="400px" showOverlay={false}>
          <div></div>
        </HeroImage>
        <div className="bg-gradient-to-b from-primary to-primary/90 text-white py-12 px-4">
          <div className="container max-w-4xl mx-auto text-center space-y-6">
            <div className="inline-block">
              <span className="text-xs font-semibold uppercase tracking-wider bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-sm">
                Building Condition Assessment Software
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight text-white">
              Streamline Building Assessments
            </h1>
            <p className="text-base sm:text-lg leading-relaxed">
              Professional BCA platform following ASTM E2018 standards. Complete assessments faster with UNIFORMAT II classification, voice recording, and automated reporting.
            </p>
            <div className="flex flex-col gap-3 pt-2">
              <Button 
                size="lg" 
                className="text-base h-12 px-6 bg-white text-primary hover:bg-white/90 font-semibold w-full" 
                asChild
              >
                <a href={getLoginUrl()}>Start Free Assessment</a>
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-base h-12 px-6 border-2 border-white text-white hover:bg-white/20 font-semibold w-full" 
                asChild
              >
                <a href="#features">See How It Works</a>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop/Tablet Layout: Text overlay on image */}
      <div className="hidden md:block">
        <HeroImage height="700px">
          <div className="container px-4 md:px-6">
            <div className="max-w-4xl mx-auto text-center space-y-6 md:space-y-8 text-white">
              <div className="inline-block">
                <span className="text-xs md:text-sm font-semibold uppercase tracking-wider bg-white/20 px-3 md:px-4 py-1.5 md:py-2 rounded-full backdrop-blur-sm">
                  Building Condition Assessment Software
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-tight drop-shadow-lg">
                Streamline Building Assessments
              </h1>
              <p className="text-lg md:text-xl leading-relaxed drop-shadow-md px-4 md:px-8">
                Professional BCA platform following ASTM E2018 standards. Complete assessments faster with UNIFORMAT II classification, voice recording, and automated reporting.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center pt-2">
                <Button 
                  size="lg" 
                  className="text-base h-12 md:h-14 px-6 md:px-8 bg-white text-primary hover:bg-white/90 font-semibold" 
                  asChild
                >
                  <a href={getLoginUrl()}>Start Free Assessment</a>
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="text-base h-12 md:h-14 px-6 md:px-8 border-2 border-white text-white hover:bg-white/20 font-semibold" 
                  asChild
                >
                  <a href="#features">See How It Works</a>
                </Button>
              </div>
            </div>
          </div>
        </HeroImage>
      </div>

      {/* Value Proposition Section - Optimized for laptop and mobile */}
      <section className="container py-12 md:py-16 lg:py-20 px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 text-center max-w-4xl mx-auto">
          <div className="space-y-3 md:space-y-4">
            <div className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary">ASTM E2018</div>
            <div className="text-base md:text-lg text-muted-foreground">Standards Compliant</div>
          </div>
          <div className="space-y-3 md:space-y-4">
            <div className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary">UNIFORMAT II</div>
            <div className="text-base md:text-lg text-muted-foreground">Classification System</div>
          </div>
        </div>
      </section>

      {/* Features Section - Mobile optimized */}
      <section id="features" className="py-16 md:py-20 bg-muted/50">
        <div className="container px-4 md:px-6">
          <div className="mx-auto max-w-5xl">
            <div className="text-center mb-10 md:mb-12 px-4">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">
                Everything You Need for Professional BCAs
              </h2>
              <p className="mt-3 md:mt-4 text-base md:text-lg text-muted-foreground">
                Comprehensive tools for conducting building condition assessments
              </p>
            </div>

            <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="glass-card hover-lift smooth-transition">
                <CardHeader className="p-5 md:p-6">
                  <ClipboardCheck className="h-8 w-8 md:h-10 md:w-10 text-primary mb-2" />
                  <CardTitle className="text-lg md:text-xl">UNIFORMAT II Classification</CardTitle>
                  <CardDescription className="text-sm md:text-base">
                    Organize assessments using the industry-standard UNIFORMAT II hierarchical structure
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="glass-card hover-lift smooth-transition">
                <CardHeader className="p-5 md:p-6">
                  <FileText className="h-8 w-8 md:h-10 md:w-10 text-primary mb-2" />
                  <CardTitle className="text-lg md:text-xl">Professional Reports</CardTitle>
                  <CardDescription className="text-sm md:text-base">
                    Generate comprehensive BCA reports following ASTM E2018 standards
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="glass-card hover-lift smooth-transition">
                <CardHeader className="p-5 md:p-6">
                  <TrendingUp className="h-8 w-8 md:h-10 md:w-10 text-primary mb-2" />
                  <CardTitle className="text-lg md:text-xl">Cost Estimation</CardTitle>
                  <CardDescription className="text-sm md:text-base">
                    Track deficiencies and estimate repair costs with detailed breakdowns
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="glass-card hover-lift smooth-transition">
                <CardHeader className="p-5 md:p-6">
                  <CheckCircle2 className="h-8 w-8 md:h-10 md:w-10 text-primary mb-2" />
                  <CardTitle className="text-lg md:text-xl">Condition Tracking</CardTitle>
                  <CardDescription className="text-sm md:text-base">
                    Rate building components and track remaining useful life
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="glass-card hover-lift smooth-transition">
                <CardHeader className="p-5 md:p-6">
                  <Shield className="h-8 w-8 md:h-10 md:w-10 text-primary mb-2" />
                  <CardTitle className="text-lg md:text-xl">Standards Compliant</CardTitle>
                  <CardDescription className="text-sm md:text-base">
                    Follow NRC protocols and ASTM E2018 methodology
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="glass-card hover-lift smooth-transition">
                <CardHeader className="p-5 md:p-6">
                  <Clock className="h-8 w-8 md:h-10 md:w-10 text-primary mb-2" />
                  <CardTitle className="text-lg md:text-xl">Photo Documentation</CardTitle>
                  <CardDescription className="text-sm md:text-base">
                    Upload and organize photos for comprehensive visual documentation
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Mobile optimized */}
      <section className="container py-16 md:py-20 px-4 md:px-6">
        <Card className="mx-auto max-w-3xl bg-primary text-primary-foreground">
          <CardContent className="p-8 md:p-12 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4">
              Ready to Start Your Assessment?
            </h2>
            <p className="text-base md:text-lg mb-6 md:mb-8 opacity-90">
              Join professionals who trust our platform for building condition assessments
            </p>
            <Button size="lg" variant="secondary" className="h-12 md:h-14 px-6 md:px-8 w-full sm:w-auto" asChild>
              <a href={getLoginUrl()}>Sign In Now</a>
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/50 py-6 md:py-8">
        <div className="container px-4 md:px-6 text-center text-xs md:text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} {APP_TITLE}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
