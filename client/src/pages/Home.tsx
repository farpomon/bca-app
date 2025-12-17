import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_TITLE, APP_LOGO, getLoginUrl } from "@/const";
import { Building2, ClipboardCheck, FileText, TrendingUp, CheckCircle2, Shield, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function Home() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

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
      <header className="border-b sticky top-0 z-50 bg-white/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-2">
            {/* Logo */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink">
              <img src={APP_LOGO} alt="Logo" className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0" />
              <div className="hidden sm:flex flex-col leading-none">
                <span className="font-bold text-base">MABEN</span>
                <span className="font-bold text-base">CONSULTING</span>
              </div>
            </div>
            
            {/* Auth Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                <a href="#features">Features</a>
              </Button>
              <Button variant="default" size="sm" asChild>
                <a href="/signup">Request Access</a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={getLoginUrl()}>Sign In</a>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1920&q=80')",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-primary/95 via-primary/90 to-primary/95"></div>
        </div>

        {/* Content */}
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32">
          <div className="max-w-3xl">
            {/* Badge */}
            <div className="inline-block mb-6">
              <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider bg-white/20 text-white px-4 py-2 rounded-full backdrop-blur-sm">
                Building Condition Assessment Software
              </span>
            </div>

            {/* Heading */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-6 leading-tight">
              Streamline Building Assessments
            </h1>

            {/* Description */}
            <p className="text-base sm:text-lg lg:text-xl text-white/90 mb-8 leading-relaxed max-w-2xl">
              Professional BCA platform following ASTM E2018 standards. Complete assessments faster with UNIFORMAT II classification, voice recording, and automated reporting.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                className="bg-white text-primary hover:bg-white/90 font-semibold text-base h-12 px-8" 
                asChild
              >
                <a href="/signup">Request Access</a>
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-2 border-white text-white hover:bg-white/10 font-semibold text-base h-12 px-8" 
                asChild
              >
                <a href="#features">See How It Works</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-12 max-w-4xl mx-auto text-center">
            <div className="space-y-2">
              <div className="text-4xl sm:text-5xl lg:text-6xl font-bold text-primary">ASTM E2018</div>
              <div className="text-base sm:text-lg text-muted-foreground">Standards Compliant</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl sm:text-5xl lg:text-6xl font-bold text-primary">UNIFORMAT II</div>
              <div className="text-base sm:text-lg text-muted-foreground">Classification System</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 sm:py-20 lg:py-24 bg-muted/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
                Everything You Need for Professional Building Assessments
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
                Comprehensive tools designed for building condition assessment professionals
              </p>
            </div>

            {/* Feature Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {/* Feature 1 */}
              <Card className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg sm:text-xl">UNIFORMAT II Classification</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm sm:text-base">
                    Standardized building component classification system for consistent assessments
                  </CardDescription>
                </CardContent>
              </Card>

              {/* Feature 2 */}
              <Card className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <ClipboardCheck className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg sm:text-xl">Voice Recording</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm sm:text-base">
                    Capture observations hands-free with voice-to-text transcription
                  </CardDescription>
                </CardContent>
              </Card>

              {/* Feature 3 */}
              <Card className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg sm:text-xl">Automated Reports</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm sm:text-base">
                    Generate professional PDF reports automatically from your assessments
                  </CardDescription>
                </CardContent>
              </Card>

              {/* Feature 4 */}
              <Card className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg sm:text-xl">ASTM E2018 Compliant</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm sm:text-base">
                    Follow industry-standard property condition assessment guidelines
                  </CardDescription>
                </CardContent>
              </Card>

              {/* Feature 5 */}
              <Card className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Clock className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg sm:text-xl">Offline Mode</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm sm:text-base">
                    Work without internet connection and sync when you're back online
                  </CardDescription>
                </CardContent>
              </Card>

              {/* Feature 6 */}
              <Card className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg sm:text-xl">Analytics & Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm sm:text-base">
                    Track project progress and generate insights from your assessment data
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 lg:py-24 bg-primary text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6">
              Ready to Streamline Your Assessments?
            </h2>
            <p className="text-base sm:text-lg text-white/90 mb-8">
              Join building assessment professionals who trust our platform for their projects
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-white text-primary hover:bg-white/90 font-semibold text-base h-12 px-8" 
                asChild
              >
                <a href="/signup">Request Access</a>
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="border-2 border-white text-white hover:bg-white/10 font-semibold text-base h-12 px-8" 
                asChild
              >
                <a href={getLoginUrl()}>Sign In</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 sm:py-12 bg-background border-t">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={APP_LOGO} alt="Logo" className="h-8 w-8" />
              <span className="text-sm text-muted-foreground">© 2024 Maben Consulting. All rights reserved.</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
