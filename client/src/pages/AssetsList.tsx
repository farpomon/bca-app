import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Building2, Plus, Edit, Trash2, Loader2, ClipboardCheck, Sparkles, Search, BarChart3 } from "lucide-react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";
import { useState, useMemo, useCallback } from "react";
import { useFilterPersistence } from "@/hooks/useFilterPersistence";
import { AssetDialog } from "@/components/AssetDialog";
import { AIImportAssetDialog } from "@/components/AIImportAssetDialog";
import type { Asset } from "../../../drizzle/schema";
import { BackButton } from "@/components/BackButton";
import { Input } from "@/components/ui/input";
import { FormattedMeasurement } from "@/components/FormattedMeasurement";
import { useAuth } from "@/_core/hooks/useAuth";
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

export default function AssetsList() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const projectId = parseInt(id!);

  const { user, loading: authLoading } = useAuth();
  const { data: project, isLoading: projectLoading } = trpc.projects.get.useQuery(
    { id: projectId },
    { enabled: !!user && !isNaN(projectId) }
  );
  const { data: assets, isLoading: assetsLoading, refetch: refetchAssets } = trpc.assets.list.useQuery(
    { projectId },
    { enabled: !!user && !isNaN(projectId) }
  );

  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<Asset | undefined>(undefined);
  const [aiImportDialogOpen, setAiImportDialogOpen] = useState(false);
  
  // Filter state with URL persistence
  const { filters, setFilter, clearFilters } = useFilterPersistence({
    search: "",
  });
  const searchQuery = filters.search;
  const setSearchQuery = useCallback((value: string) => setFilter("search", value), [setFilter]);

  const deleteAsset = trpc.assets.delete.useMutation({
    onSuccess: () => {
      toast.success("Asset deleted successfully");
      refetchAssets();
      setDeleteDialogOpen(false);
      setAssetToDelete(undefined);
    },
    onError: (error) => {
      toast.error(`Failed to delete asset: ${error.message}`);
    },
  });

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setAssetDialogOpen(true);
  };

  const handleDelete = (asset: Asset) => {
    setAssetToDelete(asset);
    setDeleteDialogOpen(true);
  };

  const handleDialogClose = () => {
    setAssetDialogOpen(false);
    setEditingAsset(undefined);
  };

  // Filter assets based on search query
  const filteredAssets = useMemo(() => {
    if (!assets) return [];
    if (!searchQuery) return assets;
    
    const query = searchQuery.toLowerCase();
    return assets.filter((asset) => 
      asset.name?.toLowerCase().includes(query) ||
      asset.assetType?.toLowerCase().includes(query) ||
      asset.address?.toLowerCase().includes(query) ||
      asset.uniqueId?.toLowerCase().includes(query)
    );
  }, [assets, searchQuery]);

  if (authLoading || projectLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Project not found</h2>
          <BackButton to="/" label="Back to Projects" />
        </div>
      </DashboardLayout>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default">Active</Badge>;
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>;
      case "demolished":
        return <Badge variant="destructive">Demolished</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <BackButton to="dashboard" label="Back to Projects" preserveFilters={true} />
            <h1 className="text-3xl font-bold tracking-tight">Assets</h1>
            <p className="text-muted-foreground">{project.name}</p>
          </div>
          <div className="flex gap-2">
            {assets && assets.length > 1 && (
              <Button variant="outline" onClick={() => setLocation(`/projects/${projectId}/analytics`)}>
                <BarChart3 className="mr-2 h-4 w-4" />
                Analytics
              </Button>
            )}
            <Button variant="outline" onClick={() => setAiImportDialogOpen(true)}>
              <Sparkles className="mr-2 h-4 w-4" />
              AI Import
            </Button>
            <Button onClick={() => setAssetDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Asset
            </Button>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, type, address, or unique ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        </div>

        {/* Assets Grid */}
        {assetsLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredAssets && filteredAssets.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredAssets.map((asset) => (
              <Card 
                key={asset.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setLocation(`/projects/${projectId}/assets/${asset.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">{asset.name}</CardTitle>
                    </div>
                    {getStatusBadge(asset.status)}
                  </div>
                  {asset.assetType && (
                    <CardDescription>{asset.assetType}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {asset.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {asset.description}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {asset.yearBuilt && (
                      <div>
                        <span className="text-muted-foreground">Year Built:</span>
                        <p className="font-medium">{asset.yearBuilt}</p>
                      </div>
                    )}
                    {asset.grossFloorArea && (
                      <div>
                        <span className="text-muted-foreground">Floor Area:</span>
                        <p className="font-medium"><FormattedMeasurement value={Number(asset.grossFloorArea)} type="area" /></p>
                      </div>
                    )}
                    {asset.numberOfStories && (
                      <div>
                        <span className="text-muted-foreground">Stories:</span>
                        <p className="font-medium">{asset.numberOfStories}</p>
                      </div>
                    )}
                    {asset.constructionType && (
                      <div>
                        <span className="text-muted-foreground">Construction:</span>
                        <p className="font-medium">{asset.constructionType}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocation(`/projects/${projectId}/assets/${asset.id}/assess`);
                      }}
                    >
                      <ClipboardCheck className="mr-2 h-4 w-4" />
                      Assess
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(asset);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(asset);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              {searchQuery ? (
                <>
                  <h3 className="text-lg font-semibold mb-2">No assets found</h3>
                  <p className="text-muted-foreground mb-4">Try adjusting your search query</p>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold mb-2">No assets yet</h3>
                  <p className="text-muted-foreground mb-4">Get started by adding your first asset</p>
                  <Button onClick={() => setAssetDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Asset
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Asset Dialog */}
      <AssetDialog
        open={assetDialogOpen}
        onOpenChange={handleDialogClose}
        projectId={projectId}
        asset={editingAsset}
        onSuccess={refetchAssets}
      />

      {/* AI Import Dialog */}
      <AIImportAssetDialog
        open={aiImportDialogOpen}
        onOpenChange={setAiImportDialogOpen}
        projectId={projectId}
        onSuccess={refetchAssets}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Asset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{assetToDelete?.name}"? This will also delete all assessments associated with this asset. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => assetToDelete && deleteAsset.mutate({ id: assetToDelete.id, projectId })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
