import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Download, Trash2, FileText, Search, Filter } from "lucide-react";
import { toast } from "sonner";

interface AssetDocumentListProps {
  assetId: number;
  category?: 'maintenance' | 'deficiency' | 'general';
}

export default function AssetDocumentList({ assetId, category }: AssetDocumentListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [selectedDocument, setSelectedDocument] = useState<any | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const { data: documents, isLoading } = trpc.assetDocuments.list.useQuery({ assetId });
  const utils = trpc.useUtils();
  
  const deleteDocumentMutation = trpc.assetDocuments.delete.useMutation({
    onSuccess: () => {
      toast.success('Document deleted successfully');
      utils.assetDocuments.list.invalidate({ assetId });
      setIsDeleteDialogOpen(false);
      setSelectedDocument(null);
    },
    onError: (error) => {
      toast.error(`Failed to delete document: ${error.message}`);
    }
  });

  const handleDelete = () => {
    if (selectedDocument) {
      deleteDocumentMutation.mutate({ documentId: selectedDocument.id });
    }
  };

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    link.click();
  };

  // Filter documents
  const filteredDocuments = documents?.filter(doc => {
    const matchesSearch = doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (doc.description?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = filterCategory === 'all' || doc.category === filterCategory;
    const matchesType = !category || doc.category === category;
    return matchesSearch && matchesCategory && matchesType;
  }) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      {/* Search and Filter */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="report">Reports</SelectItem>
            <SelectItem value="plan">Plans</SelectItem>
            <SelectItem value="permit">Permits</SelectItem>
            <SelectItem value="inspection">Inspections</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="warranty">Warranties</SelectItem>
            <SelectItem value="manual">Manuals</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Documents List */}
      {filteredDocuments.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">
            {searchQuery || filterCategory !== 'all' 
              ? 'No documents match your search criteria'
              : 'No documents uploaded yet. Use the upload section above to add documents.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredDocuments.map((doc) => (
            <div 
              key={doc.id} 
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{doc.fileName}</p>
                  {doc.description && (
                    <p className="text-sm text-muted-foreground truncate">{doc.description}</p>
                  )}
                  <div className="flex gap-2 mt-1">
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                      {doc.category}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </span>
                    {doc.fileSize && (
                      <span className="text-xs text-muted-foreground">
                        {(doc.fileSize / 1024).toFixed(2)} KB
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(doc.url, doc.fileName)}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setSelectedDocument(doc);
                    setIsDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete "{selectedDocument?.fileName}"? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={deleteDocumentMutation.isPending}
            >
              {deleteDocumentMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
