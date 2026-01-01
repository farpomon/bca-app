/**
 * DeleteConfirmationDialog - Reusable confirmation dialog for delete operations
 * Supports single and bulk delete with customizable messages
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Trash2 } from "lucide-react";

interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  itemCount?: number;
  itemType?: "photo" | "document" | "asset" | "project" | "item";
  isPermanent?: boolean;
  isLoading?: boolean;
}

export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  itemCount = 1,
  itemType = "item",
  isPermanent = false,
  isLoading = false,
}: DeleteConfirmationDialogProps) {
  const pluralType = itemCount > 1 ? `${itemType}s` : itemType;
  
  const defaultTitle = itemCount > 1 
    ? `Delete ${itemCount} ${pluralType}?`
    : `Delete ${itemType}?`;
    
  const defaultDescription = isPermanent
    ? `This action cannot be undone. ${itemCount > 1 ? `These ${itemCount} ${pluralType}` : `This ${itemType}`} will be permanently deleted.`
    : `${itemCount > 1 ? `These ${itemCount} ${pluralType}` : `This ${itemType}`} will be moved to Recently Deleted where ${itemCount > 1 ? "they" : "it"} can be restored within 30 days.`;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${isPermanent ? "bg-red-100" : "bg-amber-100"}`}>
              {isPermanent ? (
                <AlertTriangle className={`h-5 w-5 ${isPermanent ? "text-red-600" : "text-amber-600"}`} />
              ) : (
                <Trash2 className="h-5 w-5 text-amber-600" />
              )}
            </div>
            <AlertDialogTitle>{title || defaultTitle}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2">
            {description || defaultDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isLoading}
            className={isPermanent ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"}
          >
            {isLoading ? "Deleting..." : isPermanent ? "Delete Permanently" : "Move to Trash"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
