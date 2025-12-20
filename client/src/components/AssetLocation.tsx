import { useEffect, useState, useCallback } from "react";
import { MapView } from "./Map";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { MapPin, Navigation, Satellite, Eye, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface AssetLocationProps {
  assetId: number;
  projectId: number;
  streetAddress?: string | null;
  streetNumber?: string | null;
  aptUnit?: string | null;
  city?: string | null;
  postalCode?: string | null;
  province?: string | null;
}

export function AssetLocation({
  assetId,
  projectId,
  streetAddress,
  streetNumber,
  aptUnit,
  city,
  postalCode,
  province,
}: AssetLocationProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [mapType, setMapType] = useState<"roadmap" | "satellite">("roadmap");

  // Get current asset details
  const { data: currentAsset } = trpc.assets.get.useQuery(
    { id: assetId, projectId },
    { enabled: !!projectId }
  );

  // Get all assets from the same project for multi-marker display
  const { data: projectAssets } = trpc.assets.list.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  // Build full address string
  const fullAddress = [
    streetNumber,
    streetAddress,
    aptUnit ? `Unit ${aptUnit}` : null,
    city,
    province,
    postalCode,
  ]
    .filter(Boolean)
    .join(", ");

  // Geocode address to coordinates
  const geocodeAddress = useCallback(async () => {
    if (!geocoder || !fullAddress) return;

    setIsGeocoding(true);
    setGeocodeError(null);

    try {
      const result = await geocoder.geocode({ address: fullAddress });
      if (result.results && result.results[0]) {
        const location = result.results[0].geometry.location;
        setCoordinates({
          lat: location.lat(),
          lng: location.lng(),
        });
      } else {
        setGeocodeError("Address not found. Please check the address details.");
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      setGeocodeError("Failed to geocode address. Please try again.");
    } finally {
      setIsGeocoding(false);
    }
  }, [geocoder, fullAddress]);

  // Initialize map and geocoder
  const handleMapReady = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
    setGeocoder(new google.maps.Geocoder());
  }, []);

  // Geocode when geocoder is ready
  useEffect(() => {
    if (geocoder && fullAddress) {
      geocodeAddress();
    }
  }, [geocoder, fullAddress, geocodeAddress]);

  // Update map center and markers when coordinates change
  useEffect(() => {
    if (!map || !coordinates) return;

    // Clear existing markers
    markers.forEach((marker) => marker.setMap(null));
    const newMarkers: google.maps.Marker[] = [];

    // Center map on current asset
    map.setCenter(coordinates);
    map.setZoom(15);

    // Add marker for current asset (red)
    const currentMarker = new google.maps.Marker({
      position: coordinates,
      map,
      title: currentAsset?.assetName || "Current Asset",
      icon: {
        url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
      },
    });

    const currentInfoWindow = new google.maps.InfoWindow({
      content: `
        <div style="padding: 8px;">
          <h3 style="margin: 0 0 4px 0; font-weight: 600;">${currentAsset?.assetName || "Asset"}</h3>
          <p style="margin: 0; font-size: 13px; color: #666;">${fullAddress}</p>
        </div>
      `,
    });

    currentMarker.addListener("click", () => {
      currentInfoWindow.open(map, currentMarker);
    });

    newMarkers.push(currentMarker);

    // Add markers for other assets in the same project (blue)
    if (projectAssets) {
      projectAssets.forEach((asset) => {
        if (asset.id === assetId) return; // Skip current asset

        const assetAddress = [
          asset.streetNumber,
          asset.streetAddress,
          asset.aptUnit ? `Unit ${asset.aptUnit}` : null,
          asset.city,
          asset.province,
          asset.postalCode,
        ]
          .filter(Boolean)
          .join(", ");

        if (!assetAddress) return;

        // Geocode other assets
        geocoder?.geocode({ address: assetAddress }, (results, status) => {
          if (status === "OK" && results && results[0]) {
            const location = results[0].geometry.location;
            const marker = new google.maps.Marker({
              position: location,
              map,
              title: asset.assetName || "Asset",
              icon: {
                url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
              },
            });

            const infoWindow = new google.maps.InfoWindow({
              content: `
                <div style="padding: 8px;">
                  <h3 style="margin: 0 0 4px 0; font-weight: 600;">${asset.assetName || "Asset"}</h3>
                  <p style="margin: 0; font-size: 13px; color: #666;">${assetAddress}</p>
                  <a href="/assets/${asset.id}" style="font-size: 13px; color: #0066cc; text-decoration: none;">View Details →</a>
                </div>
              `,
            });

            marker.addListener("click", () => {
              infoWindow.open(map, marker);
            });

            newMarkers.push(marker);
          }
        });
      });
    }

    setMarkers(newMarkers);
  }, [map, coordinates, assetId, currentAsset, projectAssets, fullAddress, geocoder]);

  // Toggle map type
  const toggleMapType = () => {
    if (!map) return;
    const newType = mapType === "roadmap" ? "satellite" : "roadmap";
    setMapType(newType);
    map.setMapTypeId(newType);
  };

  // Open Google Maps directions
  const openDirections = () => {
    if (!coordinates) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${coordinates.lat},${coordinates.lng}`;
    window.open(url, "_blank");
  };

  // Open Street View
  const openStreetView = () => {
    if (!coordinates) return;
    const url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${coordinates.lat},${coordinates.lng}`;
    window.open(url, "_blank");
  };

  if (!fullAddress) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location
          </CardTitle>
          <CardDescription>
            No address information available for this asset.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Address and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location
          </CardTitle>
          <CardDescription>{fullAddress}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {coordinates && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">
                {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
              </Badge>
            </div>
          )}

          {geocodeError && (
            <div className="text-sm text-destructive">{geocodeError}</div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleMapType}
              disabled={!map || isGeocoding}
            >
              <Satellite className="h-4 w-4 mr-2" />
              {mapType === "roadmap" ? "Satellite View" : "Map View"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={openStreetView}
              disabled={!coordinates || isGeocoding}
            >
              <Eye className="h-4 w-4 mr-2" />
              Street View
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={openDirections}
              disabled={!coordinates || isGeocoding}
            >
              <Navigation className="h-4 w-4 mr-2" />
              Get Directions
            </Button>
          </div>

          {projectAssets && projectAssets.length > 1 && (
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="secondary">
                <MapPin className="h-3 w-3 mr-1" />
                Red
              </Badge>
              <span className="text-muted-foreground">Current Asset</span>
              <Badge variant="secondary" className="ml-4">
                <MapPin className="h-3 w-3 mr-1" />
                Blue
              </Badge>
              <span className="text-muted-foreground">Other Assets ({projectAssets.length - 1})</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Map */}
      <Card>
        <CardContent className="p-0">
          <div className="h-[500px] w-full rounded-lg overflow-hidden relative">
            <MapView 
              className="h-full w-full" 
              initialCenter={coordinates || undefined}
              initialZoom={coordinates ? 15 : 12}
              onMapReady={handleMapReady} 
            />
            {isGeocoding && (
              <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                <div className="text-center space-y-2">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Geocoding address...</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
