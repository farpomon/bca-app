import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Undo2, Clock } from "lucide-react";

interface UndoNotificationProps {
  operationId: number;
  operationType: string;
  affectedCount: number;
  onUndo?: () => void;
}

export function UndoNotification({
  operationId,
  operationType,
  affectedCount,
  onUndo,
}: UndoNotificationProps) {
  const [timeRemaining, setTimeRemaining] = useState(30 * 60); // 30 minutes in seconds
  const undoMutation = trpc.undo.undo.useMutation();

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleUndo = async () => {
    try {
      const result = await undoMutation.mutateAsync({ operationId });
      if (result.success) {
        toast.success(`Undone! Restored ${result.restoredCount} record(s)`);
        onUndo?.();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Failed to undo operation");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (timeRemaining === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <p className="text-sm font-medium">
          {operationType} completed ({affectedCount} items)
        </p>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Undo available for {formatTime(timeRemaining)}
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={handleUndo}
        disabled={undoMutation.isPending}
        className="gap-1"
      >
        <Undo2 className="h-3 w-3" />
        Undo
      </Button>
    </div>
  );
}

/**
 * Show undo toast notification after bulk operation
 */
export function showUndoToast(
  operationId: number,
  operationType: string,
  affectedCount: number,
  onUndo?: () => void
) {
  toast(
    <UndoNotification
      operationId={operationId}
      operationType={operationType}
      affectedCount={affectedCount}
      onUndo={onUndo}
    />,
    {
      duration: 30 * 60 * 1000, // 30 minutes
      closeButton: true,
    }
  );
}
