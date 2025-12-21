import { AlertTriangle, FileWarning, Shield } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface ComplianceDisclaimerProps {
  buildingCodeTitle?: string;
  buildingCodeJurisdiction?: string;
  checkedAt?: string;
  checkedBy?: string;
  className?: string;
}

/**
 * Legal disclaimer component for AI-generated building code compliance analysis
 * Displays prominent warnings about the preliminary nature of the analysis
 */
export function ComplianceDisclaimer({
  buildingCodeTitle,
  buildingCodeJurisdiction,
  checkedAt,
  checkedBy,
  className = "",
}: ComplianceDisclaimerProps) {
  return (
    <Card className={`border-amber-500 bg-amber-50 dark:bg-amber-950/20 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <CardTitle className="text-amber-900 dark:text-amber-100 text-xl">
              Important Legal Disclaimer
            </CardTitle>
            <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
              Please read this disclaimer carefully before relying on any compliance analysis results
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI-Generated Analysis Warning */}
        <Alert className="border-amber-400 bg-white dark:bg-gray-900">
          <FileWarning className="h-5 w-5 text-amber-600" />
          <AlertTitle className="text-amber-900 dark:text-amber-100 font-semibold">
            AI-Generated Preliminary Assessment
          </AlertTitle>
          <AlertDescription className="text-amber-800 dark:text-amber-200 space-y-2 mt-2">
            <p>
              This compliance analysis has been generated using artificial intelligence technology and represents a{" "}
              <strong>preliminary assessment only</strong>. The analysis is based on automated interpretation of building
              codes and assessment data, which may contain errors, omissions, or misinterpretations.
            </p>
            <p className="text-sm">
              <strong>Analysis Parameters:</strong>
            </p>
            <ul className="text-sm list-disc list-inside space-y-1 ml-2">
              {buildingCodeTitle && (
                <li>
                  <strong>Building Code:</strong> {buildingCodeTitle}
                </li>
              )}
              {buildingCodeJurisdiction && (
                <li>
                  <strong>Jurisdiction:</strong> {buildingCodeJurisdiction}
                </li>
              )}
              {checkedAt && (
                <li>
                  <strong>Analysis Date:</strong> {new Date(checkedAt).toLocaleString()}
                </li>
              )}
              {checkedBy && (
                <li>
                  <strong>Initiated By:</strong> {checkedBy}
                </li>
              )}
            </ul>
          </AlertDescription>
        </Alert>

        <Separator className="bg-amber-300" />

        {/* Professional Verification Required */}
        <Alert className="border-amber-400 bg-white dark:bg-gray-900">
          <Shield className="h-5 w-5 text-amber-600" />
          <AlertTitle className="text-amber-900 dark:text-amber-100 font-semibold">
            Licensed Professional Verification Required
          </AlertTitle>
          <AlertDescription className="text-amber-800 dark:text-amber-200 space-y-2 mt-2">
            <p>
              <strong className="text-red-600 dark:text-red-400">
                This analysis does NOT constitute a professional building code compliance certification.
              </strong>
            </p>
            <p>
              All compliance findings, recommendations, and conclusions presented in this report must be reviewed,
              verified, and certified by a licensed professional engineer, architect, or qualified building code
              consultant with appropriate jurisdiction-specific credentials before being used for:
            </p>
            <ul className="text-sm list-disc list-inside space-y-1 ml-2">
              <li>Regulatory submissions or permit applications</li>
              <li>Legal proceedings or dispute resolution</li>
              <li>Construction planning or remediation work</li>
              <li>Property transactions or due diligence</li>
              <li>Insurance claims or risk assessments</li>
              <li>Any decision with legal, financial, or safety implications</li>
            </ul>
          </AlertDescription>
        </Alert>

        <Separator className="bg-amber-300" />

        {/* Limitation of Liability */}
        <div className="text-xs text-amber-800 dark:text-amber-300 space-y-2 bg-white dark:bg-gray-900 p-4 rounded-lg border border-amber-300">
          <p className="font-semibold text-sm">LIMITATION OF LIABILITY:</p>
          <p>
            The developers, operators, and providers of this Building Condition Assessment system (collectively, "the
            System") expressly disclaim all warranties, express or implied, including but not limited to warranties of
            accuracy, completeness, merchantability, and fitness for a particular purpose.
          </p>
          <p>
            The System and its AI-generated compliance analysis are provided "AS IS" without warranty of any kind. The
            System shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages
            arising from or related to the use of, reliance upon, or inability to use this compliance analysis,
            including but not limited to:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Errors or inaccuracies in compliance determinations</li>
            <li>Missed or incorrectly identified code violations</li>
            <li>Misinterpretation of building codes or assessment data</li>
            <li>Regulatory penalties or enforcement actions</li>
            <li>Construction defects or safety hazards</li>
            <li>Financial losses or property damage</li>
            <li>Legal liability or litigation costs</li>
          </ul>
          <p className="font-semibold mt-3">
            BY USING THIS COMPLIANCE ANALYSIS FEATURE, YOU ACKNOWLEDGE AND AGREE THAT:
          </p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>You have read and understood this disclaimer in its entirety</li>
            <li>
              You will not rely solely on this AI-generated analysis for any compliance-related decisions
            </li>
            <li>
              You will obtain professional verification from licensed experts before taking any action based on these
              results
            </li>
            <li>
              You accept full responsibility for any consequences arising from the use of this preliminary assessment
            </li>
            <li>
              You release the System from all liability related to the accuracy or completeness of this analysis
            </li>
          </ol>
          <p className="mt-3 text-center font-semibold text-sm text-red-600 dark:text-red-400">
            USE OF THIS FEATURE CONSTITUTES ACCEPTANCE OF THESE TERMS
          </p>
        </div>

        {/* Version and Timestamp */}
        <div className="text-xs text-amber-700 dark:text-amber-400 text-center pt-2 border-t border-amber-300">
          <p>
            Compliance Analysis System v1.0 | Disclaimer Version 1.0 | Generated:{" "}
            {new Date().toLocaleString()}
          </p>
          <p className="mt-1">
            For questions about this disclaimer or professional verification requirements, consult with your legal
            counsel or jurisdiction's building authority.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
