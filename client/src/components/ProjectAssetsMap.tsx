import { useEffect, useRef, useState } from "react";
import { MapView } from "@/components/Map";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

interface ProjectAssetsMapProps {
  projectId: number;
}

interface Asset {
  id: number;
  name: string;
  streetNumber: string | null;
  streetAddress: string | null;
  unitNumber: string | null;
  postalCode: string | null;
  province: string | null;
  latitude: string | null;
  longitude: string | null;
  address: string | null;
}

export function ProjectAssetsMap({ projectId }: ProjectAssetsMapProps) {
  const [, setLocation] = useLocation();
  const [isGeocoding, setIsGeocoding] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  const { data: assets, isLoading } = trpc.assets.list.useQuery({ projectId });
  
  const updateAssetCoordinates = trpc.assets.update.useMutation({
    onError: (error) => {
      console.error("Failed to update asset coordinates:", error);
    },
  });

  const buildFullAddress = (asset: Asset): string | null => {
    // If we have structured address, build it
    if (asset.streetAddress || asset.postalCode) {
      const parts = [
        asset.streetNumber,
        asset.streetAddress,
        asset.unitNumber,
        asset.postalCode,
        asset.province,
        "Canada", // Default to Canada
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

  const handleMapReady = async (map: google.maps.Map) => {
    mapRef.current = map;
    geocoderRef.current = new google.maps.Geocoder();

    if (!assets || assets.length === 0) {
      return;
    }

    setIsGeocoding(true);

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    let hasValidCoordinates = false;

    // Process each asset
    for (const asset of assets) {
      let lat: number | null = null;
      let lng: number | null = null;

      // Check if we already have coordinates
      if (asset.latitude && asset.longitude) {
        lat = parseFloat(asset.latitude);
        lng = parseFloat(asset.longitude);
      } else {
        // Geocode the address
        const coords = await geocodeAsset(asset);
        if (coords) {
          lat = coords.lat;
          lng = coords.lng;

          // Save coordinates to database
          updateAssetCoordinates.mutate({
            id: asset.id,
            projectId,
            latitude: lat.toString(),
            longitude: lng.toString(),
          });
        }
      }

      // Create marker if we have coordinates
      if (lat !== null && lng !== null) {
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

        // Add click listener to navigate to asset
        marker.addListener("click", () => {
          setLocation(`/project/${projectId}/asset/${asset.id}`);
        });

        markersRef.current.push(marker);
        bounds.extend(position);
        hasValidCoordinates = true;
      }
    }

    // Fit map to show all markers
    if (hasValidCoordinates) {
      map.fitBounds(bounds);
      
      // Adjust zoom if only one marker
      if (markersRef.current.length === 1) {
        map.setZoom(15);
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

  return (
    <div className="relative h-[600px] w-full">
      {isGeocoding && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-background border rounded-lg shadow-lg px-4 py-2 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading asset locations...</span>
        </div>
      )}
      
      <MapView
        onMapReady={handleMapReady}
        className="w-full h-full rounded-lg"
        initialCenter={{ lat: 43.6532, lng: -79.3832 }} // Toronto default
        initialZoom={10}
      />
    </div>
  );
}
