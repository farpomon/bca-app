import { useEffect, useRef, useState, useCallback } from "react";
import { MapView } from "@/components/Map";
import { trpc } from "@/lib/trpc";
import { Loader2, Route, Layers, X } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { RoutePlanningPanel } from "@/components/RoutePlanningPanel";
import { useMarkerClusterer } from "@/components/MarkerClusterer";
import { cn } from "@/lib/utils";

interface ProjectAssetsMapProps {
  projectId: number;
}

interface Asset {
  id: number;
  name: string;
  streetNumber: string | null;
  streetAddress: string | null;
  unitNumber: string | null;
  city: string | null;
  postalCode: string | null;
  province: string | null;
  latitude: string | null;
  longitude: string | null;
  address: string | null;
}

export function ProjectAssetsMap({ projectId }: ProjectAssetsMapProps) {
  const [, setLocation] = useLocation();
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [showRoutePlanning, setShowRoutePlanning] = useState(false);
  const [clusteringEnabled, setClusteringEnabled] = useState(true);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const { data: assets, isLoading } = trpc.assets.list.useQuery({ projectId });
  
  const updateAssetCoordinates = trpc.assets.update.useMutation({
    onError: (error) => {
      console.error("Failed to update asset coordinates:", error);
    },
  });

  // Prepare markers for clustering
  const clusterMarkers = assets
    ?.filter((a) => a.latitude && a.longitude)
    .map((asset) => ({
      id: asset.id,
      lat: parseFloat(asset.latitude!),
      lng: parseFloat(asset.longitude!),
      title: asset.name,
      color: "#3b82f6",
      onClick: () => setLocation(`/project/${projectId}/asset/${asset.id}`),
      infoContent: `
        <div style="padding: 8px; min-width: 180px;">
          <h3 style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${asset.name}</h3>
          <p style="color: #666; font-size: 12px; margin-bottom: 8px;">
            ${asset.address || asset.streetAddress || "No address"}
          </p>
          <a href="/project/${projectId}/asset/${asset.id}" 
             style="color: #3b82f6; text-decoration: underline; font-size: 12px;">
            View Details →
          </a>
        </div>
      `,
    })) || [];

  // Use marker clusterer when enabled
  const { refreshMarkers } = useMarkerClusterer({
    map: clusteringEnabled ? map : null,
    markers: clusterMarkers,
    gridSize: 60,
    maxZoom: 15,
    minClusterSize: 2,
    onMarkerClick: (marker) => {
      setLocation(`/project/${projectId}/asset/${marker.id}`);
    },
  });

  const buildFullAddress = (asset: Asset): string | null => {
    // If we have structured address, build it
    if (asset.streetAddress || asset.postalCode || asset.city) {
      const parts = [
        asset.streetNumber,
        asset.streetAddress,
        asset.unitNumber,
        asset.city,
        asset.postalCode,
        asset.province,
        "Canada",
      ].filter(Boolean);
      
      return parts.length > 0 ? parts.join(", ") : null;
    }
    
    // Fall back to legacy address field
    return asset.address || null;
  };

  const geocodeAsset = async (asset: Asset): Promise<{ lat: number; lng: number } | null> => {
    if (!geocoderRef.current) return null;

    const fullAddress = buildFullAddress(asset);
    if (!fullAddress) return null;

    try {
      const result = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
        geocoderRef.current!.geocode({ address: fullAddress }, (results, status) => {
          if (status === "OK" && results) {
            resolve(results);
          } else {
            reject(new Error(`Geocoding failed: ${status}`));
          }
        });
      });

      if (result && result[0]) {
        const location = result[0].geometry.location;
        return {
          lat: location.lat(),
          lng: location.lng(),
        };
      }
    } catch (error) {
      console.error(`Failed to geocode asset ${asset.name}:`, error);
    }

    return null;
  };

  // Create individual markers (when clustering is disabled)
  const createIndividualMarkers = useCallback(async () => {
    if (!map || !assets || clusteringEnabled) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    if (!infoWindowRef.current) {
      infoWindowRef.current = new google.maps.InfoWindow();
    }

    const bounds = new google.maps.LatLngBounds();
    let hasValidCoordinates = false;

    for (const asset of assets) {
      let lat: number | null = null;
      let lng: number | null = null;

      if (asset.latitude && asset.longitude) {
        lat = parseFloat(asset.latitude);
        lng = parseFloat(asset.longitude);
      }

      if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
        const position = { lat, lng };
        
        const marker = new google.maps.Marker({
          position,
          map,
          title: asset.name,
          label: {
            text: asset.name.substring(0, 1).toUpperCase(),
            color: "white",
            fontSize: "14px",
            fontWeight: "bold",
          },
        });

        marker.addListener("click", () => {
          const content = `
            <div style="padding: 8px; min-width: 180px;">
              <h3 style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${asset.name}</h3>
              <p style="color: #666; font-size: 12px; margin-bottom: 8px;">
                ${asset.address || asset.streetAddress || "No address"}
              </p>
              <a href="/project/${projectId}/asset/${asset.id}" 
                 style="color: #3b82f6; text-decoration: underline; font-size: 12px;">
                View Details →
              </a>
            </div>
          `;
          infoWindowRef.current?.setContent(content);
          infoWindowRef.current?.open(map, marker);
        });

        markersRef.current.push(marker);
        bounds.extend(position);
        hasValidCoordinates = true;
      }
    }

    if (hasValidCoordinates) {
      map.fitBounds(bounds);
      if (markersRef.current.length === 1) {
        map.setZoom(15);
      }
    }
  }, [map, assets, clusteringEnabled, projectId]);

  // Handle clustering toggle
  useEffect(() => {
    if (!clusteringEnabled) {
      createIndividualMarkers();
    } else {
      // Clear individual markers when switching to clustering
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
    }
  }, [clusteringEnabled, createIndividualMarkers]);

  const handleMapReady = async (mapInstance: google.maps.Map) => {
    setMap(mapInstance);
    geocoderRef.current = new google.maps.Geocoder();

    if (!assets || assets.length === 0) {
      return;
    }

    setIsGeocoding(true);

    // Geocode assets that don't have coordinates
    for (const asset of assets) {
      if (!asset.latitude || !asset.longitude) {
        const coords = await geocodeAsset(asset);
        if (coords) {
          updateAssetCoordinates.mutate({
            id: asset.id,
            projectId,
            latitude: coords.lat.toString(),
            longitude: coords.lng.toString(),
          });
        }
      }
    }

    // Fit bounds to all markers
    const validAssets = assets.filter((a) => a.latitude && a.longitude);
    if (validAssets.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      validAssets.forEach((asset) => {
        bounds.extend({
          lat: parseFloat(asset.latitude!),
          lng: parseFloat(asset.longitude!),
        });
      });
      mapInstance.fitBounds(bounds);
      if (validAssets.length === 1) {
        mapInstance.setZoom(15);
      }
    }

    setIsGeocoding(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!assets || assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] text-muted-foreground">
        <p className="text-lg font-medium">No assets found</p>
        <p className="text-sm">Add assets with addresses to see them on the map</p>
      </div>
    );
  }

  const validAssetsCount = assets.filter((a) => a.latitude && a.longitude).length;

  return (
    <div className="space-y-4">
      {/* Map Controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {validAssetsCount} of {assets.length} asset{assets.length !== 1 ? "s" : ""} with location data
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={clusteringEnabled ? "default" : "outline"}
            size="sm"
            onClick={() => setClusteringEnabled(!clusteringEnabled)}
            className="flex items-center gap-2"
          >
            <Layers className="h-4 w-4" />
            {clusteringEnabled ? "Clustering On" : "Clustering Off"}
          </Button>
          <Button
            variant={showRoutePlanning ? "default" : "outline"}
            size="sm"
            onClick={() => setShowRoutePlanning(!showRoutePlanning)}
            className="flex items-center gap-2"
          >
            <Route className="h-4 w-4" />
            Route Planning
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Map */}
        <div className={cn(
          "relative transition-all duration-300",
          showRoutePlanning ? "w-2/3" : "w-full"
        )}>
          <div className="h-[600px] w-full">
            {isGeocoding && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-background border rounded-lg shadow-lg px-4 py-2 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading asset locations...</span>
              </div>
            )}
            
            <MapView
              onMapReady={handleMapReady}
              className="w-full h-full rounded-lg"
              initialCenter={{ lat: 43.6532, lng: -79.3832 }}
              initialZoom={10}
            />
          </div>
        </div>

        {/* Route Planning Panel */}
        {showRoutePlanning && (
          <div className="w-1/3">
            <RoutePlanningPanel
              assets={assets.map((a) => ({
                id: a.id,
                name: a.name,
                address: a.address || buildFullAddress(a),
                latitude: a.latitude,
                longitude: a.longitude,
              }))}
              map={map}
              onClose={() => setShowRoutePlanning(false)}
            />
          </div>
        )}
      </div>

      {/* Legend */}
      {clusteringEnabled && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="font-medium">Cluster Colors:</span>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span>&lt; 10</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>10-19</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span>20-49</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span>50-99</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>100+</span>
          </div>
        </div>
      )}
    </div>
  );
}
