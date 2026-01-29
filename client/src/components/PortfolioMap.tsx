import { useEffect, useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { MapView } from "@/components/Map";
import { Loader2, Layers } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface BuildingMarker {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  propertyType: string;
  fci: number;
  crv: number;
  projectId: number;
  projectName: string;
}

// Cluster interface
interface Cluster {
  center: google.maps.LatLng;
  markers: BuildingMarker[];
  bounds: google.maps.LatLngBounds;
}

export default function PortfolioMap() {
  const [, setLocation] = useLocation();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [clusterMarkers, setClusterMarkers] = useState<google.maps.Marker[]>([]);
  const [infoWindow, setInfoWindow] = useState<google.maps.InfoWindow | null>(null);
  const [clusteringEnabled, setClusteringEnabled] = useState(true);
  const [validAssets, setValidAssets] = useState<BuildingMarker[]>([]);
  const [activeInfoWindow, setActiveInfoWindow] = useState<google.maps.InfoWindow | null>(null);

  // Fetch all assets with coordinates
  const { data: assets, isLoading, error } = trpc.assets.getAllAssetsWithCoordinates.useQuery();

  // Initialize map
  const handleMapReady = (mapInstance: google.maps.Map) => {
    setMap(mapInstance);
    
    // Create a single info window to reuse
    const iw = new google.maps.InfoWindow();
    setInfoWindow(iw);
  };

  // Get FCI-based color
  const getFciColor = (fci: number): string => {
    const fciPercent = fci * 100;
    if (fciPercent > 30) return '#ef4444'; // red (critical)
    if (fciPercent > 10) return '#f97316'; // orange (poor)
    if (fciPercent > 5) return '#f59e0b'; // yellow (fair)
    return '#22c55e'; // green (good)
  };

  // Create cluster icon
  const createClusterIcon = useCallback((count: number, avgFci: number): google.maps.Icon => {
    let size = 40;
    const color = getFciColor(avgFci);

    if (count >= 100) {
      size = 56;
    } else if (count >= 50) {
      size = 52;
    } else if (count >= 20) {
      size = 48;
    } else if (count >= 10) {
      size = 44;
    }

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="${color}" stroke="white" stroke-width="2"/>
        <text x="${size / 2}" y="${size / 2 + 5}" text-anchor="middle" fill="white" font-size="14" font-weight="bold">${count}</text>
      </svg>
    `;

    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new google.maps.Size(size, size),
      anchor: new google.maps.Point(size / 2, size / 2),
    };
  }, []);

  // Calculate pixel distance between two points
  const getPixelDistance = useCallback(
    (p1: google.maps.LatLng, p2: google.maps.LatLng, mapInstance: google.maps.Map): number => {
      const projection = mapInstance.getProjection();
      if (!projection) return Infinity;

      const scale = Math.pow(2, mapInstance.getZoom() || 0);
      const worldCoord1 = projection.fromLatLngToPoint(p1);
      const worldCoord2 = projection.fromLatLngToPoint(p2);

      if (!worldCoord1 || !worldCoord2) return Infinity;

      const pixelCoord1 = new google.maps.Point(
        worldCoord1.x * scale,
        worldCoord1.y * scale
      );
      const pixelCoord2 = new google.maps.Point(
        worldCoord2.x * scale,
        worldCoord2.y * scale
      );

      return Math.sqrt(
        Math.pow(pixelCoord1.x - pixelCoord2.x, 2) +
          Math.pow(pixelCoord1.y - pixelCoord2.y, 2)
      );
    },
    []
  );

  // Create clusters from markers
  const createClusters = useCallback(
    (assetMarkers: BuildingMarker[], mapInstance: google.maps.Map, gridSize: number = 60): Cluster[] => {
      const clusters: Cluster[] = [];
      const processed = new Set<number>();

      assetMarkers.forEach((marker) => {
        if (processed.has(marker.id)) return;

        const markerLatLng = new google.maps.LatLng(marker.lat, marker.lng);
        let addedToCluster = false;

        for (const cluster of clusters) {
          const distance = getPixelDistance(markerLatLng, cluster.center, mapInstance);
          if (distance < gridSize) {
            cluster.markers.push(marker);
            cluster.bounds.extend(markerLatLng);
            cluster.center = cluster.bounds.getCenter();
            processed.add(marker.id);
            addedToCluster = true;
            break;
          }
        }

        if (!addedToCluster) {
          const bounds = new google.maps.LatLngBounds();
          bounds.extend(markerLatLng);
          clusters.push({
            center: markerLatLng,
            markers: [marker],
            bounds,
          });
          processed.add(marker.id);
        }
      });

      return clusters;
    },
    [getPixelDistance]
  );

  // Render markers (with or without clustering)
  const renderMarkers = useCallback(() => {
    if (!map || !infoWindow || validAssets.length === 0) return;

    // Clear existing markers
    markers.forEach((m) => m.setMap(null));
    clusterMarkers.forEach((m) => m.setMap(null));

    const newMarkers: google.maps.Marker[] = [];
    const newClusterMarkers: google.maps.Marker[] = [];

    const zoom = map.getZoom() || 0;
    const maxZoom = 15;
    const minClusterSize = 2;

    // If clustering disabled or zoomed in past maxZoom, show all individual markers
    if (!clusteringEnabled || zoom >= maxZoom) {
      validAssets.forEach((asset) => {
        const position = { lat: asset.lat, lng: asset.lng };
        const markerColor = getFciColor(asset.fci);

        const svgMarker = {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" fill="${markerColor}" stroke="white" stroke-width="2"/>
            </svg>
          `)}`,
          scaledSize: new google.maps.Size(24, 24),
          anchor: new google.maps.Point(12, 12),
        };

        const marker = new google.maps.Marker({
          position,
          map,
          title: asset.name,
          icon: svgMarker,
        });

        marker.addListener("click", () => {
          const fciPercent = asset.fci * 100;
          const content = `
            <div style="padding: 8px; min-width: 200px;">
              <h3 style="font-weight: 600; font-size: 16px; margin-bottom: 8px;">${asset.name}</h3>
              <p style="color: #666; font-size: 14px; margin-bottom: 4px;">${asset.address}</p>
              <p style="font-size: 14px; margin-bottom: 4px;">
                <strong>Project:</strong> ${asset.projectName}
              </p>
              <p style="font-size: 14px; margin-bottom: 4px;">
                <strong>Type:</strong> ${asset.propertyType || "N/A"}
              </p>
              <p style="font-size: 14px; margin-bottom: 4px;">
                <strong>CRV:</strong> $${asset.crv.toLocaleString()}
              </p>
              <p style="font-size: 14px; margin-bottom: 8px;">
                <strong>FCI:</strong> <span style="color: ${markerColor}; font-weight: 600;">${fciPercent.toFixed(1)}%</span>
              </p>
              <a 
                href="/projects/${asset.projectId}/assets/${asset.id}" 
                style="color: #3b82f6; text-decoration: underline; font-size: 14px;"
              >
                View Details →
              </a>
            </div>
          `;
          infoWindow.setContent(content);
          infoWindow.open(map, marker);
        });

        newMarkers.push(marker);
      });

      setMarkers(newMarkers);
      setClusterMarkers([]);
      return;
    }

    // Create clusters
    const clusters = createClusters(validAssets, map);

    clusters.forEach((cluster) => {
      if (cluster.markers.length >= minClusterSize) {
        // Calculate average FCI for cluster color
        const avgFci =
          cluster.markers.reduce((sum, m) => sum + m.fci, 0) / cluster.markers.length;

        const clusterMarker = new google.maps.Marker({
          position: cluster.center,
          map,
          icon: createClusterIcon(cluster.markers.length, avgFci),
          title: `${cluster.markers.length} buildings`,
          zIndex: cluster.markers.length,
        });

        // Create info window content with asset list
        const infoContent = `
          <div style="max-width: 300px; max-height: 400px; overflow-y: auto;">
            <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">
              ${cluster.markers.length} Buildings in this area
            </h3>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${cluster.markers.map(asset => `
                <div style="padding: 8px; border: 1px solid #e5e7eb; border-radius: 6px; cursor: pointer;"
                     onclick="window.location.href='/projects/${asset.projectId}/assets/${asset.id}'">
                  <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${asset.name}</div>
                  <div style="font-size: 12px; color: #6b7280;">${asset.address || 'No address'}</div>
                  <div style="font-size: 12px; margin-top: 4px;">
                    <span style="padding: 2px 6px; border-radius: 4px; background: ${getFciColor(asset.fci)}20; color: ${getFciColor(asset.fci)};">
                      FCI: ${(asset.fci * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;

        const infoWindow = new google.maps.InfoWindow({
          content: infoContent,
        });

        clusterMarker.addListener("click", () => {
          // Close any open info windows
          setActiveInfoWindow((prev) => {
            if (prev) prev.close();
            return infoWindow;
          });
          // Open new info window
          infoWindow.open(map, clusterMarker);
          
          // Also zoom in to show more detail
          map.fitBounds(cluster.bounds);
          const newZoom = map.getZoom();
          if (newZoom && newZoom < maxZoom) {
            map.setZoom(Math.min(newZoom + 2, maxZoom));
          }
        });

        newClusterMarkers.push(clusterMarker);
      } else {
        // Show individual markers for small clusters
        cluster.markers.forEach((asset) => {
          const position = { lat: asset.lat, lng: asset.lng };
          const markerColor = getFciColor(asset.fci);

          const svgMarker = {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="${markerColor}" stroke="white" stroke-width="2"/>
              </svg>
            `)}`,
            scaledSize: new google.maps.Size(24, 24),
            anchor: new google.maps.Point(12, 12),
          };

          const marker = new google.maps.Marker({
            position,
            map,
            title: asset.name,
            icon: svgMarker,
          });

          marker.addListener("click", () => {
            const fciPercent = asset.fci * 100;
            const content = `
              <div style="padding: 8px; min-width: 200px;">
                <h3 style="font-weight: 600; font-size: 16px; margin-bottom: 8px;">${asset.name}</h3>
                <p style="color: #666; font-size: 14px; margin-bottom: 4px;">${asset.address}</p>
                <p style="font-size: 14px; margin-bottom: 4px;">
                  <strong>Project:</strong> ${asset.projectName}
                </p>
                <p style="font-size: 14px; margin-bottom: 4px;">
                  <strong>Type:</strong> ${asset.propertyType || "N/A"}
                </p>
                <p style="font-size: 14px; margin-bottom: 4px;">
                  <strong>CRV:</strong> $${asset.crv.toLocaleString()}
                </p>
                <p style="font-size: 14px; margin-bottom: 8px;">
                  <strong>FCI:</strong> <span style="color: ${markerColor}; font-weight: 600;">${fciPercent.toFixed(1)}%</span>
                </p>
                <a 
                  href="/projects/${asset.projectId}/assets/${asset.id}" 
                  style="color: #3b82f6; text-decoration: underline; font-size: 14px;"
                >
                  View Details →
                </a>
              </div>
            `;
            infoWindow.setContent(content);
            infoWindow.open(map, marker);
          });

          newMarkers.push(marker);
        });
      }
    });

    setMarkers(newMarkers);
    setClusterMarkers(newClusterMarkers);
  }, [map, infoWindow, validAssets, clusteringEnabled, createClusters, createClusterIcon, getFciColor]);

  // Process assets data
  useEffect(() => {
    if (!assets) return;

    const processed: BuildingMarker[] = [];

    for (const a of assets) {
      const lat = typeof a.lat === "string" ? parseFloat(a.lat) : a.lat;
      const lng = typeof a.lng === "string" ? parseFloat(a.lng) : a.lng;
      const fci = typeof a.fci === "string" ? parseFloat(a.fci) : a.fci;
      const crv = typeof a.crv === "string" ? parseFloat(a.crv) : a.crv;

      if (lat === null || lat === undefined || lng === null || lng === undefined) continue;
      if (isNaN(lat) || isNaN(lng)) continue;
      if (lat < -90 || lat > 90) continue;
      if (lng < -180 || lng > 180) continue;

      processed.push({
        id: a.id,
        name: a.name,
        address: a.address,
        lat,
        lng,
        propertyType: a.propertyType,
        fci: fci || 0,
        crv: crv || 0,
        projectId: a.projectId,
        projectName: a.projectName,
      });
    }

    setValidAssets(processed);
  }, [assets]);

  // Render markers when data or settings change
  useEffect(() => {
    renderMarkers();
  }, [renderMarkers]);

  // Fit bounds to show all assets
  useEffect(() => {
    if (map && validAssets.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      validAssets.forEach((asset) => {
        bounds.extend({ lat: asset.lat, lng: asset.lng });
      });
      map.fitBounds(bounds);
    }
  }, [map, validAssets]);

  // Re-render markers on zoom change
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener("zoom_changed", () => {
      renderMarkers();
    });
    return () => google.maps.event.removeListener(listener);
  }, [map, renderMarkers]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load building locations. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  if (!assets || assets.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          No buildings with location data found in your portfolio.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Map Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Portfolio Map</h2>
          <p className="text-muted-foreground text-sm">
            Showing {validAssets.length} building{validAssets.length !== 1 ? 's' : ''} with location data
          </p>
        </div>
        <Button
          variant={clusteringEnabled ? "default" : "outline"}
          size="sm"
          onClick={() => setClusteringEnabled(!clusteringEnabled)}
        >
          <Layers className="h-4 w-4 mr-2" />
          {clusteringEnabled ? "Clustering On" : "Clustering Off"}
        </Button>
      </div>

      {/* Map */}
      <div className="border rounded-lg overflow-hidden">
        <MapView
          onMapReady={handleMapReady}
          initialCenter={{ lat: 43.65, lng: -79.38 }}
          initialZoom={10}
          style={{ height: "600px", width: "100%" }}
        />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-[#22c55e] border-2 border-white" />
          <span>FCI ≤ 5%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-[#f59e0b] border-2 border-white" />
          <span>FCI 5-10%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-[#f97316] border-2 border-white" />
          <span>FCI 10-30%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-[#ef4444] border-2 border-white" />
          <span>FCI &gt; 30%</span>
        </div>
      </div>
    </div>
  );
}
