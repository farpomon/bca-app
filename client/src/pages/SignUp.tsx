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
        className="min-h-screen bg-white flex items-center justify-center p-4"
      >
        <Card className="max-w-md w-full p-8 text-center shadow-sm border">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="flex justify-center mb-6"
          >
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9 text-white" />
            </div>
          </motion.div>
          
          <h1 className="text-2xl font-semibold mb-3 text-slate-900">
            Request Submitted
          </h1>
          
          <p className="text-sm text-slate-600 mb-6">
            We'll review your request and get back to you within 24-48 hours.
          </p>
          
          <div className="bg-slate-50 rounded-lg p-5 mb-6 text-left border">
            <h3 className="font-medium text-slate-900 mb-3 text-sm">
              What's Next?
            </h3>
            <ul className="space-y-2.5 text-sm text-slate-600">
              <li className="flex items-start gap-2.5">
                <span className="flex-shrink-0 w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center text-slate-700 font-medium text-xs mt-0.5">1</span>
                <span>Our team reviews your request</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex-shrink-0 w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center text-slate-700 font-medium text-xs mt-0.5">2</span>
                <span>You'll receive an email once approved</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex-shrink-0 w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center text-slate-700 font-medium text-xs mt-0.5">3</span>
                <span>Log in and start managing assessments</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-2.5">
            <Button
              onClick={() => {
                window.location.href = getLoginUrl();
              }}
              size="lg"
              className="w-full"
            >
              Go to Login
            </Button>
            <Button
              onClick={() => setLocation("/")}
              variant="ghost"
              size="lg"
              className="w-full"
            >
              Back to Home
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
      className="min-h-screen bg-white"
    >
      {/* Simplified Header - Mobile Optimized */}
      <header className="border-b bg-white sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={APP_LOGO} alt="Logo" style={{ height: '32px', maxWidth: '120px', width: 'auto' }} className="object-contain" />
            <span className="text-base font-semibold text-slate-900">
              {APP_TITLE}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            className="gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 sm:py-12">
        <div className="max-w-md mx-auto">
          {/* Simplified Hero */}
          <div className="mb-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <h1 className="text-2xl sm:text-3xl font-semibold mb-2 text-slate-900">
                Create Your Account
              </h1>
              <p className="text-sm text-slate-600">
                Request access to {APP_TITLE} and start managing your building assessments
              </p>
            </motion.div>
          </div>

          {/* Simplified Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Full Name */}
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-sm font-medium text-slate-700">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => handleChange("fullName", e.target.value)}
                  required
                  className="h-11"
                  placeholder="John Doe"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  required
                  className="h-11"
                  placeholder="john@company.com"
                />
              </div>

              {/* Company Name */}
              <div className="space-y-1.5">
                <Label htmlFor="companyName" className="text-sm font-medium text-slate-700">
                  Company Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="companyName"
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => handleChange("companyName", e.target.value)}
                  required
                  className="h-11"
                  placeholder="Acme Corporation"
                />
              </div>

              {/* City */}
              <div className="space-y-1.5">
                <Label htmlFor="city" className="text-sm font-medium text-slate-700">
                  City <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="city"
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  required
                  className="h-11"
                  placeholder="Toronto"
                />
              </div>

              {/* Phone Number (Optional) */}
              <div className="space-y-1.5">
                <Label htmlFor="phoneNumber" className="text-sm font-medium text-slate-700">
                  Phone Number <span className="text-slate-500 text-xs font-normal">(Optional)</span>
                </Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => handleChange("phoneNumber", e.target.value)}
                  className="h-11"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              {/* Use Case (Optional) */}
              <div className="space-y-1.5">
                <Label htmlFor="useCase" className="text-sm font-medium text-slate-700">
                  How will you use this system? <span className="text-slate-500 text-xs font-normal">(Optional)</span>
                </Label>
                <Textarea
                  id="useCase"
                  value={formData.useCase}
                  onChange={(e) => handleChange("useCase", e.target.value)}
                  className="min-h-[90px] resize-none"
                  placeholder="Tell us about your building assessment needs..."
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                size="lg"
                className="w-full mt-2"
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending ? "Submitting..." : "Request Access"}
              </Button>

              {/* Login Link */}
              <p className="text-center text-sm text-slate-600 pt-2">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = getLoginUrl();
                  }}
                  className="text-slate-900 font-medium hover:underline"
                >
                  Log in
                </button>
              </p>
            </form>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
