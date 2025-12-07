import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Download, Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ConsultantUpload() {
  const { user } = useAuth();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [dataType, setDataType] = useState<"assessments" | "deficiencies">("assessments");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: projects } = trpc.projects.list.useQuery();
  const { data: mySubmissions, refetch: refetchSubmissions } = trpc.consultant.mySubmissions.useQuery();
  const uploadMutation = trpc.consultant.uploadSpreadsheet.useMutation();

  const downloadAssessmentTemplate = trpc.consultant.downloadAssessmentTemplate.useQuery(undefined, {
    enabled: false,
  });
  const downloadDeficiencyTemplate = trpc.consultant.downloadDeficiencyTemplate.useQuery(undefined, {
    enabled: false,
  });

  const handleDownloadTemplate = async (type: "assessments" | "deficiencies") => {
    try {
      const result = type === "assessments"
        ? await downloadAssessmentTemplate.refetch().then(r => r.data)
        : await downloadDeficiencyTemplate.refetch().then(r => r.data);

      if (!result) {
        toast.error("Failed to download template");
        return;
      }

      // Convert base64 to blob and download
      const byteCharacters = atob(result.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: result.mimeType });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Template downloaded successfully");
    } catch (error) {
      toast.error("Failed to download template");
      console.error(error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
        toast.error("Please upload an Excel file (.xlsx or .xls)");
        return;
      }
      setUploadedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedProjectId) {
      toast.error("Please select a project");
      return;
    }

    if (!uploadedFile) {
      toast.error("Please select a file to upload");
      return;
    }

    setUploading(true);

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        const base64Data = base64.split(",")[1]; // Remove data:... prefix

        try {
          const result = await uploadMutation.mutateAsync({
            projectId: selectedProjectId,
            dataType,
            fileData: base64Data,
            fileName: uploadedFile.name,
          });

          toast.success(
            `Upload successful! ${result.validItems} valid items, ${result.invalidItems} errors, ${result.warnings} warnings`
          );

          // Reset form
          setUploadedFile(null);
          refetchSubmissions();
        } catch (error: any) {
          toast.error(error.message || "Upload failed");
        } finally {
          setUploading(false);
        }
      };

      reader.onerror = () => {
        toast.error("Failed to read file");
        setUploading(false);
      };

      reader.readAsDataURL(uploadedFile);
    } catch (error) {
      toast.error("Upload failed");
      setUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending_review: { label: "Pending Review", color: "bg-yellow-100 text-yellow-800", icon: AlertCircle },
      under_review: { label: "Under Review", color: "bg-blue-100 text-blue-800", icon: AlertCircle },
      approved: { label: "Approved", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
      rejected: { label: "Rejected", color: "bg-red-100 text-red-800", icon: XCircle },
      partially_approved: { label: "Partially Approved", color: "bg-orange-100 text-orange-800", icon: AlertCircle },
      finalized: { label: "Finalized", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending_review;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
      <div className="container max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Consultant Data Upload</h1>
          <p className="text-slate-600 mt-2">
            Upload condition assessment data and deficiencies for review by City personnel
          </p>
        </div>

        {/* Upload Section */}
        <div className="grid gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Download Template</CardTitle>
              <CardDescription>
                Download the Excel template for the type of data you want to upload
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => handleDownloadTemplate("assessments")}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Assessment Template
              </Button>
              <Button
                variant="outline"
                onClick={() => handleDownloadTemplate("deficiencies")}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Deficiency Template
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Step 2: Fill Template & Upload</CardTitle>
              <CardDescription>
                Complete the template with your data and upload it for review
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Select Project</label>
                <Select
                  value={selectedProjectId?.toString()}
                  onValueChange={(value) => setSelectedProjectId(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a project..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projects?.map((project) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Data Type</label>
                <Select value={dataType} onValueChange={(value: any) => setDataType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="assessments">Assessments</SelectItem>
                    <SelectItem value="deficiencies">Deficiencies</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Upload File</label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-slate-400 transition-colors">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    {uploadedFile ? (
                      <div className="flex items-center justify-center gap-2 text-slate-700">
                        <FileSpreadsheet className="h-8 w-8 text-green-600" />
                        <span className="font-medium">{uploadedFile.name}</span>
                      </div>
                    ) : (
                      <div>
                        <Upload className="h-12 w-12 mx-auto text-slate-400 mb-2" />
                        <p className="text-slate-600 font-medium">Click to upload or drag and drop</p>
                        <p className="text-slate-500 text-sm mt-1">Excel files (.xlsx, .xls)</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <Button
                onClick={handleUpload}
                disabled={!selectedProjectId || !uploadedFile || uploading}
                className="w-full"
                size="lg"
              >
                {uploading ? "Uploading..." : "Upload & Submit for Review"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Submissions History */}
        <Card>
          <CardHeader>
            <CardTitle>My Submissions</CardTitle>
            <CardDescription>Track the status of your uploaded data</CardDescription>
          </CardHeader>
          <CardContent>
            {!mySubmissions || mySubmissions.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No submissions yet</p>
            ) : (
              <div className="space-y-3">
                {mySubmissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className="h-5 w-5 text-slate-400" />
                        <div>
                          <p className="font-medium text-slate-900">{submission.fileName}</p>
                          <p className="text-sm text-slate-500">
                            {submission.submissionId} • {submission.totalItems} items •{" "}
                            {new Date(submission.submittedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm">
                        <p className="text-green-600 font-medium">{submission.validItems} valid</p>
                        {submission.invalidItems > 0 && (
                          <p className="text-red-600">{submission.invalidItems} errors</p>
                        )}
                      </div>
                      {getStatusBadge(submission.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
