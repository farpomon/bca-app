import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WifiOff, Database, RefreshCw, Shield, Zap, MapPin } from "lucide-react";
import { Link } from "wouter";
import { APP_TITLE } from "@/const";

export default function OfflineMode() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
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
            <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center">
              <WifiOff className="w-8 h-8 text-amber-600" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900">Offline Mode</h1>
              <p className="text-xl text-slate-600 mt-2">Work anywhere, sync when you're back online</p>
            </div>
          </div>
        </div>
      </section>

      {/* Overview Section */}
      <section className="py-12 px-4 bg-white">
        <div className="container max-w-4xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Never Let Connectivity Stop Your Work</h2>
          <p className="text-lg text-slate-700 leading-relaxed mb-4">
            Building assessments often take place in challenging environments—basements, mechanical rooms, remote properties, 
            or areas with poor cellular coverage. Our offline mode ensures you can continue working seamlessly regardless of 
            internet connectivity, with all your data automatically synchronized when you're back online.
          </p>
          <p className="text-lg text-slate-700 leading-relaxed">
            The system intelligently manages local storage, queues your changes, and handles synchronization in the background, 
            so you can focus on the assessment without worrying about data loss or connectivity issues.
          </p>
        </div>
      </section>

      {/* Key Features */}
      <section className="py-12 px-4">
        <div className="container max-w-4xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">How Offline Mode Works</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center mb-3">
                  <Database className="w-6 h-6 text-amber-600" />
                </div>
                <CardTitle>Local Storage</CardTitle>
                <CardDescription>
                  All assessment data, photos, and observations are stored securely on your device until connection is restored
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mb-3">
                  <RefreshCw className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle>Automatic Sync</CardTitle>
                <CardDescription>
                  Changes are automatically synchronized to the cloud when internet connection returns—no manual intervention needed
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center mb-3">
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle>Conflict Resolution</CardTitle>
                <CardDescription>
                  Smart conflict handling ensures data integrity when multiple team members work on the same project
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mb-3">
                  <Zap className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle>Instant Feedback</CardTitle>
                <CardDescription>
                  Clear indicators show connection status, pending uploads, and sync progress at all times
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center mb-3">
                  <MapPin className="w-6 h-6 text-red-600" />
                </div>
                <CardTitle>Photo Management</CardTitle>
                <CardDescription>
                  Capture and store high-resolution photos offline with automatic compression and upload when online
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center mb-3">
                  <Database className="w-6 h-6 text-indigo-600" />
                </div>
                <CardTitle>Cached Data</CardTitle>
                <CardDescription>
                  Access project information, building components, and previous assessments even without internet
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* What You Can Do Offline */}
      <section className="py-12 px-4 bg-amber-50">
        <div className="container max-w-4xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">What You Can Do Offline</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  Create New Assessments
                </h3>
                <p className="text-sm text-slate-600">
                  Start and complete full building component assessments with all fields, ratings, and observations
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  Capture Photos
                </h3>
                <p className="text-sm text-slate-600">
                  Take photos with your device camera and attach them to assessments for automatic upload later
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  Record Voice Notes
                </h3>
                <p className="text-sm text-slate-600">
                  Use voice-to-text for observations—audio is stored locally and transcribed when back online
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  Edit Existing Data
                </h3>
                <p className="text-sm text-slate-600">
                  Modify previously created assessments and deficiencies with changes queued for sync
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  View Project Data
                </h3>
                <p className="text-sm text-slate-600">
                  Access cached project information, building details, and component lists
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  Log Deficiencies
                </h3>
                <p className="text-sm text-slate-600">
                  Document deficiencies with full details including severity, location, and repair recommendations
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 px-4 bg-white">
        <div className="container max-w-4xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Seamless Workflow</h2>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold">1</div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Connection Lost</h3>
                <p className="text-slate-600">
                  System automatically detects when internet connection is unavailable and displays offline indicator
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold">2</div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Work Continues</h3>
                <p className="text-slate-600">
                  All features remain functional—create assessments, capture photos, and record observations as usual
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold">3</div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Data Queued</h3>
                <p className="text-slate-600">
                  Changes are saved locally and added to sync queue—you can see pending items count in the status bar
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold">4</div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Connection Restored</h3>
                <p className="text-slate-600">
                  System detects internet availability and begins automatic background synchronization
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold">5</div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Sync Complete</h3>
                <p className="text-slate-600">
                  All queued data is uploaded to the cloud, and you receive confirmation—work seamlessly continues
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Details */}
      <section className="py-12 px-4 bg-slate-50">
        <div className="container max-w-4xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Technical Features</h2>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Smart Storage Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Automatic cache management ensures optimal device storage usage while maintaining access to essential data. 
                  Photos are compressed intelligently to balance quality and storage space.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Retry Logic</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  If synchronization fails due to temporary network issues, the system automatically retries with exponential 
                  backoff to ensure data is eventually uploaded without draining battery.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Conflict Resolution</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  When conflicts occur (e.g., same assessment edited offline by multiple users), the system uses server-wins 
                  strategy by default, with clear notifications about any conflicts detected.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Battery Optimization</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Sync operations are optimized to minimize battery drain, with options to defer large uploads until device 
                  is charging or connected to Wi-Fi.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Best Practices */}
      <section className="py-12 px-4 bg-white">
        <div className="container max-w-4xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Best Practices</h2>
          <div className="space-y-3">
            <Card>
              <CardContent className="pt-6">
                <p className="text-slate-700">
                  <span className="font-semibold">Sync before going offline:</span> When possible, ensure recent project data is cached by opening projects while online
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-slate-700">
                  <span className="font-semibold">Monitor storage:</span> Keep an eye on device storage—the app will warn you if space is running low
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-slate-700">
                  <span className="font-semibold">Manual sync option:</span> Use the manual sync button to force immediate upload when connection is restored
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-slate-700">
                  <span className="font-semibold">Check sync status:</span> Before leaving a site, verify all data has been synchronized successfully
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-amber-600 to-amber-700">
        <div className="container max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Work Without Limits</h2>
          <p className="text-xl text-amber-100 mb-8">Never let poor connectivity slow down your assessments</p>
          <Link href="/projects">
            <Button size="lg" variant="secondary" className="bg-white text-amber-600 hover:bg-amber-50">
              Try Offline Mode
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
