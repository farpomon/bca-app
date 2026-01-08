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
  const [validProjects, setValidProjects] = useState<BuildingMarker[]>([]);

  // Fetch all projects with coordinates
  const { data: projects, isLoading, error } = trpc.projects.getAllWithCoordinates.useQuery();

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
    (projectMarkers: BuildingMarker[], mapInstance: google.maps.Map, gridSize: number = 60): Cluster[] => {
      const clusters: Cluster[] = [];
      const processed = new Set<number>();

      projectMarkers.forEach((marker) => {
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
    if (!map || !infoWindow || validProjects.length === 0) return;

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
      validProjects.forEach((project) => {
        const position = { lat: project.lat, lng: project.lng };
        const markerColor = getFciColor(project.fci);

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
          title: project.name,
          icon: svgMarker,
        });

        marker.addListener("click", () => {
          const fciPercent = project.fci * 100;
          const content = `
            <div style="padding: 8px; min-width: 200px;">
              <h3 style="font-weight: 600; font-size: 16px; margin-bottom: 8px;">${project.name}</h3>
              <p style="color: #666; font-size: 14px; margin-bottom: 4px;">${project.address}</p>
              <p style="font-size: 14px; margin-bottom: 4px;">
                <strong>Type:</strong> ${project.propertyType || "N/A"}
              </p>
              <p style="font-size: 14px; margin-bottom: 4px;">
                <strong>CRV:</strong> $${project.crv.toLocaleString()}
              </p>
              <p style="font-size: 14px; margin-bottom: 8px;">
                <strong>FCI:</strong> <span style="color: ${markerColor}; font-weight: 600;">${fciPercent.toFixed(1)}%</span>
              </p>
              <a 
                href="/projects/${project.id}" 
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
    const clusters = createClusters(validProjects, map);

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

        clusterMarker.addListener("click", () => {
          map.fitBounds(cluster.bounds);
          const newZoom = map.getZoom();
          if (newZoom && newZoom < maxZoom) {
            map.setZoom(Math.min(newZoom + 2, maxZoom));
          }
        });

        newClusterMarkers.push(clusterMarker);
      } else {
        // Show individual markers for small clusters
        cluster.markers.forEach((project) => {
          const position = { lat: project.lat, lng: project.lng };
          const markerColor = getFciColor(project.fci);

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
            title: project.name,
            icon: svgMarker,
          });

          marker.addListener("click", () => {
            const fciPercent = project.fci * 100;
            const content = `
              <div style="padding: 8px; min-width: 200px;">
                <h3 style="font-weight: 600; font-size: 16px; margin-bottom: 8px;">${project.name}</h3>
                <p style="color: #666; font-size: 14px; margin-bottom: 4px;">${project.address}</p>
                <p style="font-size: 14px; margin-bottom: 4px;">
                  <strong>Type:</strong> ${project.propertyType || "N/A"}
                </p>
                <p style="font-size: 14px; margin-bottom: 4px;">
                  <strong>CRV:</strong> $${project.crv.toLocaleString()}
                </p>
                <p style="font-size: 14px; margin-bottom: 8px;">
                  <strong>FCI:</strong> <span style="color: ${markerColor}; font-weight: 600;">${fciPercent.toFixed(1)}%</span>
                </p>
                <a 
                  href="/projects/${project.id}" 
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
  }, [map, infoWindow, validProjects, clusteringEnabled, createClusters, createClusterIcon]);

  // Process projects data
  useEffect(() => {
    if (!projects) return;

    const processed: BuildingMarker[] = [];

    for (const p of projects) {
      const lat = typeof p.lat === "string" ? parseFloat(p.lat) : p.lat;
      const lng = typeof p.lng === "string" ? parseFloat(p.lng) : p.lng;
      const fci = typeof p.fci === "string" ? parseFloat(p.fci) : p.fci;
      const crv = typeof p.crv === "string" ? parseFloat(p.crv) : p.crv;

      if (lat === null || lat === undefined || lng === null || lng === undefined) continue;
      if (isNaN(lat) || isNaN(lng)) continue;
      if (lat < -90 || lat > 90) continue;
      if (lng < -180 || lng > 180) continue;

      processed.push({
        id: p.id,
        name: p.name,
        address: p.address,
        lat,
        lng,
        propertyType: p.propertyType,
        fci: fci || 0,
        crv: crv || 0,
      });
    }

    setValidProjects(processed);
  }, [projects]);

  // Render markers when data or settings change
  useEffect(() => {
    renderMarkers();
  }, [renderMarkers]);

  // Re-render on zoom change
  useEffect(() => {
    if (!map) return;

    const listener = map.addListener("zoom_changed", () => {
      renderMarkers();
    });

    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [map, renderMarkers]);

  // Fit bounds when projects load
  useEffect(() => {
    if (!map || validProjects.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    validProjects.forEach((p) => {
      bounds.extend({ lat: p.lat, lng: p.lng });
    });

    if (validProjects.length === 1) {
      map.setCenter(bounds.getCenter());
      map.setZoom(15);
    } else {
      map.fitBounds(bounds);
    }
  }, [map, validProjects]);

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
          Failed to load portfolio map data. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  if (validProjects.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          No buildings with location data available. Add addresses to your projects to see them on the map.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>
          Showing {validProjects.length} building{validProjects.length !== 1 ? "s" : ""} with location data
        </p>
        <div className="flex items-center gap-4">
          <Button
            variant={clusteringEnabled ? "default" : "outline"}
            size="sm"
            onClick={() => setClusteringEnabled(!clusteringEnabled)}
            className="flex items-center gap-2"
          >
            <Layers className="h-4 w-4" />
            {clusteringEnabled ? "Clustering On" : "Clustering Off"}
          </Button>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>FCI ≤ 5%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span>FCI 5-10%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span>FCI 10-30%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>FCI &gt; 30%</span>
            </div>
          </div>
        </div>
      </div>

      <MapView className="h-[600px] w-full rounded-lg border" onMapReady={handleMapReady} />
    </div>
  );
}
