import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Building2, Loader2 } from "lucide-react";

interface BuildingSectionSelectorProps {
  projectId: number;
  value: number | null;
  onChange: (value: number | null) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
}

export function BuildingSectionSelector({
  projectId,
  value,
  onChange,
  label = "Building Section (Optional)",
  placeholder = "Select section or leave blank for facility-wide",
  required = false,
}: BuildingSectionSelectorProps) {
  const { data: sections, isLoading } = trpc.buildingSections.list.useQuery({ projectId });

  // If no sections exist, don't show the selector
  if (!isLoading && (!sections || sections.length === 0)) {
    return null;
  }

  const getSectionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      original: "Original",
      extension: "Extension",
      addition: "Addition",
      renovation: "Renovation",
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="sectionId" className="flex items-center gap-2">
        <Building2 className="h-4 w-4" />
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {isLoading ? (
        <div className="flex items-center justify-center p-2 border rounded-md">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Select
          value={value?.toString() || "none"}
          onValueChange={(val) => onChange(val === "none" ? null : parseInt(val))}
        >
          <SelectTrigger id="sectionId">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              <span className="text-muted-foreground">No specific section (facility-wide)</span>
            </SelectItem>
            {sections?.map((section) => (
              <SelectItem key={section.id} value={section.id.toString()}>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{section.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({getSectionTypeLabel(section.sectionType)})
                  </span>
                  {section.installDate && (
                    <span className="text-xs text-muted-foreground">
                      • {new Date(section.installDate).getFullYear()}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <p className="text-xs text-muted-foreground">
        Assign this assessment to a specific building section/extension, or leave blank to apply facility-wide.
      </p>
    </div>
  );
}
