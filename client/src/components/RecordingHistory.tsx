import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Trash2, 
  Search, 
  X, 
  Check,
  Clock,
  FileText
} from "lucide-react";
import {
  getRecordings,
  deleteRecording,
  clearAllRecordings,
  searchRecordings,
  formatRecordingTimestamp,
  formatDuration,
  type VoiceRecording,
} from "@/lib/voiceRecordingHistory";
import { toast } from "sonner";
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

interface RecordingHistoryProps {
  onSelectRecording: (text: string) => void;
  context?: string;
}

export function RecordingHistory({ onSelectRecording, context }: RecordingHistoryProps) {
  const [recordings, setRecordings] = useState<VoiceRecording[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showClearDialog, setShowClearDialog] = useState(false);

  const loadRecordings = () => {
    const allRecordings = getRecordings();
    
    // Filter by context if provided
    const filtered = context
      ? allRecordings.filter(r => r.context === context)
      : allRecordings;
    
    setRecordings(filtered);
  };

  useEffect(() => {
    loadRecordings();
  }, [context]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      loadRecordings();
      return;
    }

    const results = searchRecordings(query);
    const filtered = context
      ? results.filter(r => r.context === context)
      : results;
    
    setRecordings(filtered);
  };

  const handleDelete = (id: string) => {
    try {
      deleteRecording(id);
      loadRecordings();
      toast.success("Recording deleted");
    } catch (error) {
      toast.error("Failed to delete recording");
    }
  };

  const handleClearAll = () => {
    try {
      clearAllRecordings();
      loadRecordings();
      setShowClearDialog(false);
      toast.success("All recordings cleared");
    } catch (error) {
      toast.error("Failed to clear recordings");
    }
  };

  const handleUseRecording = (text: string) => {
    onSelectRecording(text);
    toast.success("Recording inserted");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Recording History ({recordings.length})
        </h4>
        {recordings.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowClearDialog(true)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search recordings..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-8"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSearch("")}
            className="absolute right-1 top-1 h-7 w-7 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Recording List */}
      {recordings.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
          {searchQuery ? "No recordings found" : "No recordings yet"}
        </div>
      ) : (
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-2">
            {recordings.map((recording) => (
              <div
                key={recording.id}
                className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {recording.preview}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatRecordingTimestamp(recording.timestamp)}
                      </span>
                      {recording.duration && (
                        <span>{formatDuration(recording.duration)}</span>
                      )}
                      {recording.context && (
                        <span className="px-1.5 py-0.5 bg-muted rounded text-xs">
                          {recording.context}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUseRecording(recording.text)}
                      className="h-7 px-2"
                    >
                      <Check className="w-3 h-3 mr-1" />
                      Use
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(recording.id)}
                      className="h-7 px-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                
                {/* Full text (expandable) */}
                {recording.text.length > 100 && (
                  <details className="mt-2">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                      Show full text
                    </summary>
                    <p className="text-xs mt-2 text-muted-foreground whitespace-pre-wrap">
                      {recording.text}
                    </p>
                  </details>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Clear All Confirmation Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Recordings?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {recordings.length} saved voice recordings.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
