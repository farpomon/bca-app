import { useEffect, useRef, useCallback } from "react";

interface ClusterMarker {
  id: number | string;
  lat: number;
  lng: number;
  title?: string;
  color?: string;
  onClick?: () => void;
  infoContent?: string;
}

interface MarkerClustererProps {
  map: google.maps.Map | null;
  markers: ClusterMarker[];
  gridSize?: number;
  maxZoom?: number;
  minClusterSize?: number;
  onMarkerClick?: (marker: ClusterMarker) => void;
}

interface Cluster {
  center: google.maps.LatLng;
  markers: ClusterMarker[];
  bounds: google.maps.LatLngBounds;
}

/**
 * Custom marker clustering implementation for Google Maps
 * Groups nearby markers into clusters that expand on click
 */
export function useMarkerClusterer({
  map,
  markers,
  gridSize = 60,
  maxZoom = 15,
  minClusterSize = 2,
  onMarkerClick,
}: MarkerClustererProps) {
  const markersRef = useRef<google.maps.Marker[]>([]);
  const clusterMarkersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  // Clear all markers
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    clusterMarkersRef.current.forEach((m) => m.setMap(null));
    clusterMarkersRef.current = [];
  }, []);

  // Calculate distance between two points in pixels
  const getPixelDistance = useCallback(
    (p1: google.maps.LatLng, p2: google.maps.LatLng, map: google.maps.Map): number => {
      const projection = map.getProjection();
      if (!projection) return Infinity;

      const scale = Math.pow(2, map.getZoom() || 0);
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
    (markers: ClusterMarker[], map: google.maps.Map): Cluster[] => {
      const clusters: Cluster[] = [];
      const processed = new Set<number | string>();

      markers.forEach((marker) => {
        if (processed.has(marker.id)) return;

        const markerLatLng = new google.maps.LatLng(marker.lat, marker.lng);
        let addedToCluster = false;

        // Try to add to existing cluster
        for (const cluster of clusters) {
          const distance = getPixelDistance(markerLatLng, cluster.center, map);
          if (distance < gridSize) {
            cluster.markers.push(marker);
            cluster.bounds.extend(markerLatLng);
            // Update cluster center
            cluster.center = cluster.bounds.getCenter();
            processed.add(marker.id);
            addedToCluster = true;
            break;
          }
        }

        // Create new cluster
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
    [getPixelDistance, gridSize]
  );

  // Create cluster marker icon
  const createClusterIcon = useCallback((count: number): google.maps.Icon => {
    let size = 40;
    let color = "#3b82f6"; // blue

    if (count >= 100) {
      size = 56;
      color = "#ef4444"; // red
    } else if (count >= 50) {
      size = 52;
      color = "#f97316"; // orange
    } else if (count >= 20) {
      size = 48;
      color = "#f59e0b"; // amber
    } else if (count >= 10) {
      size = 44;
      color = "#22c55e"; // green
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

  // Create individual marker icon
  const createMarkerIcon = useCallback((color: string = "#3b82f6"): google.maps.Icon => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
        <path fill="${color}" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    `;

    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new google.maps.Size(32, 32),
      anchor: new google.maps.Point(16, 32),
    };
  }, []);

  // Render markers and clusters
  const renderMarkers = useCallback(() => {
    if (!map) return;

    clearMarkers();

    const zoom = map.getZoom() || 0;

    // If zoomed in past maxZoom, show all individual markers
    if (zoom >= maxZoom) {
      markers.forEach((marker) => {
        const gMarker = new google.maps.Marker({
          position: { lat: marker.lat, lng: marker.lng },
          map,
          title: marker.title,
          icon: createMarkerIcon(marker.color),
        });

        gMarker.addListener("click", () => {
          if (marker.infoContent && infoWindowRef.current) {
            infoWindowRef.current.setContent(marker.infoContent);
            infoWindowRef.current.open(map, gMarker);
          }
          marker.onClick?.();
          onMarkerClick?.(marker);
        });

        markersRef.current.push(gMarker);
      });
      return;
    }

    // Create clusters
    const clusters = createClusters(markers, map);

    clusters.forEach((cluster) => {
      if (cluster.markers.length >= minClusterSize) {
        // Create cluster marker
        const clusterMarker = new google.maps.Marker({
          position: cluster.center,
          map,
          icon: createClusterIcon(cluster.markers.length),
          title: `${cluster.markers.length} assets`,
          zIndex: cluster.markers.length,
        });

        clusterMarker.addListener("click", () => {
          // Zoom to cluster bounds
          map.fitBounds(cluster.bounds);
          const newZoom = map.getZoom();
          if (newZoom && newZoom < maxZoom) {
            map.setZoom(Math.min(newZoom + 2, maxZoom));
          }
        });

        clusterMarkersRef.current.push(clusterMarker);
      } else {
        // Show individual markers for small clusters
        cluster.markers.forEach((marker) => {
          const gMarker = new google.maps.Marker({
            position: { lat: marker.lat, lng: marker.lng },
            map,
            title: marker.title,
            icon: createMarkerIcon(marker.color),
          });

          gMarker.addListener("click", () => {
            if (marker.infoContent && infoWindowRef.current) {
              infoWindowRef.current.setContent(marker.infoContent);
              infoWindowRef.current.open(map, gMarker);
            }
            marker.onClick?.();
            onMarkerClick?.(marker);
          });

          markersRef.current.push(gMarker);
        });
      }
    });
  }, [
    map,
    markers,
    maxZoom,
    minClusterSize,
    clearMarkers,
    createClusters,
    createClusterIcon,
    createMarkerIcon,
    onMarkerClick,
  ]);

  // Initialize info window
  useEffect(() => {
    if (map && !infoWindowRef.current) {
      infoWindowRef.current = new google.maps.InfoWindow();
    }
  }, [map]);

  // Render markers when map or markers change
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearMarkers();
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
      }
    };
  }, [clearMarkers]);

  return {
    clearMarkers,
    refreshMarkers: renderMarkers,
  };
}

export default useMarkerClusterer;
