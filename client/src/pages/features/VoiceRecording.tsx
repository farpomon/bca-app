import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, Zap, Clock, FileText, Shield, Smartphone } from "lucide-react";
import { Link } from "wouter";
import { APP_TITLE } from "@/const";

export default function VoiceRecording() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
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
            <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center">
              <Mic className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900">Voice Recording</h1>
              <p className="text-xl text-slate-600 mt-2">Capture observations hands-free with voice-to-text</p>
            </div>
          </div>
        </div>
      </section>

      {/* Overview Section */}
      <section className="py-12 px-4 bg-white">
        <div className="container max-w-4xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Work Smarter, Not Harder</h2>
          <p className="text-lg text-slate-700 leading-relaxed mb-4">
            Building condition assessments require detailed documentation while you're on-site, often in challenging environments. 
            Our voice recording feature transforms your spoken observations into accurate text instantly, allowing you to keep your 
            hands free for inspections, measurements, and photography.
          </p>
          <p className="text-lg text-slate-700 leading-relaxed">
            Powered by advanced speech recognition technology, the system understands technical terminology, building component names, 
            and industry-specific vocabulary, ensuring your assessments are captured accurately without manual typing.
          </p>
        </div>
      </section>

      {/* Key Features */}
      <section className="py-12 px-4">
        <div className="container max-w-4xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">Key Features</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mb-3">
                  <Zap className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle>Real-Time Transcription</CardTitle>
                <CardDescription>
                  See your words appear as you speak with instant voice-to-text conversion powered by AI
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mb-3">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle>Save Time</CardTitle>
                <CardDescription>
                  Document observations 3x faster than typing, allowing you to complete more assessments per day
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center mb-3">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle>Technical Vocabulary</CardTitle>
                <CardDescription>
                  Recognizes construction terms, UNIFORMAT codes, and building component names accurately
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center mb-3">
                  <Smartphone className="w-6 h-6 text-orange-600" />
                </div>
                <CardTitle>Mobile Optimized</CardTitle>
                <CardDescription>
                  Works seamlessly on smartphones and tablets for on-site assessments in any location
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center mb-3">
                  <Shield className="w-6 h-6 text-red-600" />
                </div>
                <CardTitle>Offline Capable</CardTitle>
                <CardDescription>
                  Record audio offline and transcribe automatically when connection is restored
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center mb-3">
                  <Mic className="w-6 h-6 text-indigo-600" />
                </div>
                <CardTitle>Multiple Languages</CardTitle>
                <CardDescription>
                  Support for English, French, and Spanish to accommodate diverse project teams
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 px-4 bg-purple-50">
        <div className="container max-w-4xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">How It Works</h2>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">1</div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Tap the Microphone Icon</h3>
                <p className="text-slate-600">Open any assessment form and tap the microphone button in the observation field</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">2</div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Speak Your Observations</h3>
                <p className="text-slate-600">Describe what you see naturally - the system will capture technical terms and building components accurately</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">3</div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Review and Edit</h3>
                <p className="text-slate-600">The transcribed text appears instantly - make any quick corrections if needed</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">4</div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Save and Continue</h3>
                <p className="text-slate-600">Your observations are saved automatically, ready for report generation</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-12 px-4 bg-white">
        <div className="container max-w-4xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Perfect For</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold text-slate-900 mb-2">Field Inspections</h3>
                <p className="text-sm text-slate-600">
                  Document findings while climbing ladders, inspecting roofs, or working in tight spaces
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold text-slate-900 mb-2">Walk-Through Surveys</h3>
                <p className="text-sm text-slate-600">
                  Capture observations quickly as you move through large facilities without stopping to type
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold text-slate-900 mb-2">Detailed Descriptions</h3>
                <p className="text-sm text-slate-600">
                  Record comprehensive deficiency descriptions with precise technical language
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Tips Section */}
      <section className="py-12 px-4 bg-slate-50">
        <div className="container max-w-4xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Pro Tips</h2>
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-slate-700">
                  <span className="font-semibold">Speak clearly and at a moderate pace</span> - The system works best with natural speech patterns
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-slate-700">
                  <span className="font-semibold">Use punctuation commands</span> - Say "period", "comma", or "new line" to format your text
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-slate-700">
                  <span className="font-semibold">Spell out codes</span> - For UNIFORMAT codes, say "B twenty ten" for B2010
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-slate-700">
                  <span className="font-semibold">Minimize background noise</span> - Find a quieter spot for best transcription accuracy
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-purple-600 to-purple-700">
        <div className="container max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Experience Hands-Free Documentation</h2>
          <p className="text-xl text-purple-100 mb-8">Start capturing observations faster with voice recording</p>
          <Link href="/projects">
            <Button size="lg" variant="secondary" className="bg-white text-purple-600 hover:bg-purple-50">
              Try Voice Recording Now
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
