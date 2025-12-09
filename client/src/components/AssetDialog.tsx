import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import type { Asset } from "../../../drizzle/schema";

interface AssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  asset?: Asset;
  onSuccess: () => void;
}

export function AssetDialog({ open, onOpenChange, projectId, asset, onSuccess }: AssetDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [assetType, setAssetType] = useState("");
  const [address, setAddress] = useState("");
  const [yearBuilt, setYearBuilt] = useState("");
  const [grossFloorArea, setGrossFloorArea] = useState("");
  const [numberOfStories, setNumberOfStories] = useState("");
  const [constructionType, setConstructionType] = useState("");
  const [currentReplacementValue, setCurrentReplacementValue] = useState("");
  const [status, setStatus] = useState<"active" | "inactive" | "demolished">("active");

  const utils = trpc.useUtils();

  const createAsset = trpc.assets.create.useMutation({
    onSuccess: () => {
      toast.success("Asset created successfully");
      utils.assets.list.invalidate({ projectId });
      onSuccess();
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to create asset: ${error.message}`);
    },
  });

  const updateAsset = trpc.assets.update.useMutation({
    onSuccess: () => {
      toast.success("Asset updated successfully");
      utils.assets.list.invalidate({ projectId });
      onSuccess();
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to update asset: ${error.message}`);
    },
  });

  useEffect(() => {
    if (asset) {
      setName(asset.name);
      setDescription(asset.description || "");
      setAssetType(asset.assetType || "");
      setAddress(asset.address || "");
      setYearBuilt(asset.yearBuilt?.toString() || "");
      setGrossFloorArea(asset.grossFloorArea?.toString() || "");
      setNumberOfStories(asset.numberOfStories?.toString() || "");
      setConstructionType(asset.constructionType || "");
      setCurrentReplacementValue(asset.currentReplacementValue || "");
      setStatus(asset.status);
    } else {
      resetForm();
    }
  }, [asset, open]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setAssetType("");
    setAddress("");
    setYearBuilt("");
    setGrossFloorArea("");
    setNumberOfStories("");
    setConstructionType("");
    setCurrentReplacementValue("");
    setStatus("active");
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("Asset name is required");
      return;
    }

    const data = {
      projectId,
      name: name.trim(),
      description: description.trim() || undefined,
      assetType: assetType.trim() || undefined,
      address: address.trim() || undefined,
      yearBuilt: yearBuilt ? parseInt(yearBuilt) : undefined,
      grossFloorArea: grossFloorArea ? parseInt(grossFloorArea) : undefined,
      numberOfStories: numberOfStories ? parseInt(numberOfStories) : undefined,
      constructionType: constructionType.trim() || undefined,
      currentReplacementValue: currentReplacementValue.trim() || undefined,
      status,
    };

    if (asset) {
      updateAsset.mutate({ id: asset.id, ...data });
    } else {
      createAsset.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{asset ? "Edit Asset" : "Add New Asset"}</DialogTitle>
          <DialogDescription>
            {asset ? "Update the asset information below." : "Add a new building or facility to this project."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Asset Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Main Building, Parking Structure"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assetType">Asset Type</Label>
            <Input
              id="assetType"
              value={assetType}
              onChange={(e) => setAssetType(e.target.value)}
              placeholder="e.g., Office Building, Warehouse"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this asset"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Physical address of this asset"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="yearBuilt">Year Built</Label>
              <Input
                id="yearBuilt"
                type="number"
                value={yearBuilt}
                onChange={(e) => setYearBuilt(e.target.value)}
                placeholder="e.g., 2000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="grossFloorArea">Gross Floor Area (sq ft)</Label>
              <Input
                id="grossFloorArea"
                type="number"
                value={grossFloorArea}
                onChange={(e) => setGrossFloorArea(e.target.value)}
                placeholder="e.g., 50000"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numberOfStories">Number of Stories</Label>
              <Input
                id="numberOfStories"
                type="number"
                value={numberOfStories}
                onChange={(e) => setNumberOfStories(e.target.value)}
                placeholder="e.g., 3"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="constructionType">Construction Type</Label>
              <Input
                id="constructionType"
                value={constructionType}
                onChange={(e) => setConstructionType(e.target.value)}
                placeholder="e.g., Steel Frame"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentReplacementValue">Current Replacement Value</Label>
            <Input
              id="currentReplacementValue"
              value={currentReplacementValue}
              onChange={(e) => setCurrentReplacementValue(e.target.value)}
              placeholder="e.g., 5000000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(value: "active" | "inactive" | "demolished") => setStatus(value)}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="demolished">Demolished</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={createAsset.isPending || updateAsset.isPending}
          >
            {createAsset.isPending || updateAsset.isPending ? "Saving..." : asset ? "Update Asset" : "Create Asset"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
