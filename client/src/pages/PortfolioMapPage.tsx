import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "wouter";
import PortfolioMap from "@/components/PortfolioMap";

export default function PortfolioMapPage() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Please log in to view the portfolio map.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/portfolio-analytics-enhanced">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Analytics
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Portfolio Map</h1>
            <p className="text-muted-foreground">
              Interactive map showing all buildings in your portfolio
            </p>
          </div>
        </div>

        {/* Map Component */}
        <PortfolioMap />
      </div>
    </div>
  );
}
