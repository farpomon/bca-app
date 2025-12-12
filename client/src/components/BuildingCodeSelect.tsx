import { trpc } from "@/lib/trpc";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BuildingCodeSelectProps {
  value?: number;
  onChange: (value: number | undefined) => void;
}

export function BuildingCodeSelect({ value, onChange }: BuildingCodeSelectProps) {
  const { data: buildingCodes, isLoading } = trpc.buildingCodes.list.useQuery();

  if (isLoading) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Loading building codes..." />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select
      value={value?.toString() || "none"}
      onValueChange={(val) => onChange(val === "none" ? undefined : parseInt(val))}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select a building code" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">None</SelectItem>
        {buildingCodes?.map((code) => (
          <SelectItem key={code.id} value={code.id.toString()}>
            {code.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
