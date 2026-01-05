import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { CustomReportBuilder } from "./CustomReportBuilder";

interface CustomReportDialogProps {
  projectId: number;
  projectName: string;
  trigger?: React.ReactNode;
}

export function CustomReportDialog({ projectId, projectName, trigger }: CustomReportDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Custom Report
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Custom Report Builder</DialogTitle>
          <DialogDescription>
            Create customized reports for {projectName}
          </DialogDescription>
        </DialogHeader>
        <CustomReportBuilder projectId={projectId} projectName={projectName} />
      </DialogContent>
    </Dialog>
  );
}

export default CustomReportDialog;
