import { trpc } from "@/lib/trpc";
import { ExternalLink } from "lucide-react";

interface BuildingCodeDisplayProps {
  buildingCodeId?: number | null;
}

export function BuildingCodeDisplay({ buildingCodeId }: BuildingCodeDisplayProps) {
  const { data: buildingCode, isLoading } = trpc.buildingCodes.get.useQuery(
    { id: buildingCodeId! },
    { enabled: !!buildingCodeId }
  );

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  if (!buildingCodeId || !buildingCode) {
    return <div className="text-sm text-muted-foreground">Not specified</div>;
  }

  return (
    <div className="flex items-center gap-2">
      <span>{buildingCode.title}</span>
      {buildingCode.documentUrl && (
        <a
          href={buildingCode.documentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-primary/80 transition-colors"
          title="View building code document"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
    </div>
  );
}
