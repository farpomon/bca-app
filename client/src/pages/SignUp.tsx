import { useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { Building2, Mail, User, MapPin, Phone, FileText, CheckCircle2, ArrowLeft, Sparkles } from "lucide-react";
import { pageVariants } from "@/lib/animations";

export default function SignUp() {
  const [, setLocation] = useLocation();
  const [submitted, setSubmitted] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    companyName: "",
    city: "",
    phoneNumber: "",
    useCase: "",
  });

  const submitMutation = trpc.accessRequests.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Registration request submitted successfully!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit registration request");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.fullName || !formData.email || !formData.companyName || !formData.city) {
      toast.error("Please fill in all required fields");
      return;
    }

    // For now, we'll use email as openId since we don't have OAuth context yet
    // In production, this would come from OAuth callback
    submitMutation.mutate({
      openId: formData.email, // Temporary - will be replaced with actual OAuth openId
      fullName: formData.fullName,
      email: formData.email,
      companyName: formData.companyName,
      city: formData.city,
      phoneNumber: formData.phoneNumber || undefined,
      useCase: formData.useCase || undefined,
    });
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (submitted) {
    return (
      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center p-4"
      >
        <Card className="max-w-xl w-full p-10 md:p-12 text-center shadow-lg border-0">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="flex justify-center mb-6"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
              <CheckCircle2 className="w-12 h-12 text-white" />
            </div>
          </motion.div>
          
          <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Request Submitted!
          </h1>
          
          <p className="text-base text-slate-600 mb-8 leading-relaxed">
            Thank you for your interest in {APP_TITLE}. We'll review your request and get back to you within 24-48 hours.
          </p>
          
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 mb-8 text-left border border-blue-100">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              What's Next?
            </h3>
            <ul className="space-y-3 text-sm text-slate-700">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-xs mt-0.5">1</span>
                <span>Our team reviews your registration request</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-xs mt-0.5">2</span>
                <span>You'll receive an email notification once approved</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-xs mt-0.5">3</span>
                <span>Log in and start managing your building assessments</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => setLocation("/")}
              variant="outline"
              size="lg"
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
            <Button
              onClick={() => {
                window.location.href = getLoginUrl();
              }}
              size="lg"
              className="bg-gradient-to-r from-slate-900 to-slate-700 hover:from-slate-800 hover:to-slate-600"
            >
              Go to Login
            </Button>
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50"
    >
      {/* Header */}
      <header className="border-b bg-white/90 backdrop-blur-md sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={APP_LOGO} alt="Logo" className="h-10 w-auto" />
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                {APP_TITLE}
              </h1>
              <p className="text-xs text-slate-500">Building Condition Assessment System</p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="gap-2 hover:bg-slate-100"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">
                Create Your Account
              </h1>
              <p className="text-lg text-slate-600 max-w-xl mx-auto leading-relaxed">
                Request access to {APP_TITLE} and start managing your building assessments
              </p>
            </motion.div>
          </div>

          {/* Form Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="p-10 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="flex items-center gap-2 text-slate-700 font-medium">
                    <User className="w-4 h-4 text-slate-500" />
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => handleChange("fullName", e.target.value)}
                    required
                    className="h-12 border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                    placeholder="John Doe"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2 text-slate-700 font-medium">
                    <Mail className="w-4 h-4 text-slate-500" />
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    required
                    className="h-12 border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                    placeholder="john@company.com"
                  />
                </div>

                {/* Company Name */}
                <div className="space-y-2">
                  <Label htmlFor="companyName" className="flex items-center gap-2 text-slate-700 font-medium">
                    <Building2 className="w-4 h-4 text-slate-500" />
                    Company Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="companyName"
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => handleChange("companyName", e.target.value)}
                    required
                    className="h-12 border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                    placeholder="Acme Corporation"
                  />
                </div>

                {/* City */}
                <div className="space-y-2">
                  <Label htmlFor="city" className="flex items-center gap-2 text-slate-700 font-medium">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    City <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="city"
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                    required
                    className="h-12 border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                    placeholder="Toronto"
                  />
                </div>

                {/* Phone Number (Optional) */}
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber" className="flex items-center gap-2 text-slate-700 font-medium">
                    <Phone className="w-4 h-4 text-slate-500" />
                    Phone Number <span className="text-slate-500 text-sm font-normal">(Optional)</span>
                  </Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => handleChange("phoneNumber", e.target.value)}
                    className="h-12 border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                {/* Use Case (Optional) */}
                <div className="space-y-2">
                  <Label htmlFor="useCase" className="flex items-center gap-2 text-slate-700 font-medium">
                    <FileText className="w-4 h-4 text-slate-500" />
                    How will you use {APP_TITLE}? <span className="text-slate-500 text-sm font-normal">(Optional)</span>
                  </Label>
                  <Textarea
                    id="useCase"
                    value={formData.useCase}
                    onChange={(e) => handleChange("useCase", e.target.value)}
                    rows={4}
                    className="border-slate-200 focus:border-slate-400 focus:ring-slate-400 resize-none"
                    placeholder="Tell us about your building assessment needs and how you plan to use the system..."
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-6">
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-14 text-base font-semibold bg-gradient-to-r from-slate-900 to-slate-700 hover:from-slate-800 hover:to-slate-600 shadow-lg hover:shadow-xl transition-all duration-200"
                    disabled={submitMutation.isPending}
                  >
                    {submitMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Submitting...
                      </span>
                    ) : (
                      "Submit Registration Request"
                    )}
                  </Button>
                </div>

                {/* Login Link */}
                <div className="text-center text-sm text-slate-600 pt-4 border-t border-slate-100">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = getLoginUrl();
                    }}
                    className="text-slate-900 hover:underline font-semibold transition-colors"
                  >
                    Log in here
                  </button>
                </div>
              </form>
            </Card>
          </motion.div>

          {/* Footer Note */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-center text-sm text-slate-500 mt-8"
          >
            By submitting this form, you agree to our terms of service and privacy policy
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
}
