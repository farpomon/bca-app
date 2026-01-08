import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { MapView } from "@/components/Map";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

export default function PortfolioMap() {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [infoWindow, setInfoWindow] = useState<google.maps.InfoWindow | null>(null);

  // Fetch all projects with coordinates
  const { data: projects, isLoading, error } = trpc.projects.getAllWithCoordinates.useQuery();

  // Initialize map
  const handleMapReady = (mapInstance: google.maps.Map) => {
    setMap(mapInstance);
    
    // Create a single info window to reuse
    const iw = new google.maps.InfoWindow();
    setInfoWindow(iw);
  };

  // Create markers when projects data is available
  useEffect(() => {
    if (!map || !projects || !infoWindow) return;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));

    // Filter projects with valid coordinates and convert string coordinates to numbers
    const validProjects: BuildingMarker[] = [];
    
    for (const p of projects) {
      // Convert lat/lng to numbers (they come as strings from decimal columns)
      const lat = typeof p.lat === 'string' ? parseFloat(p.lat) : p.lat;
      const lng = typeof p.lng === 'string' ? parseFloat(p.lng) : p.lng;
      const fci = typeof p.fci === 'string' ? parseFloat(p.fci) : p.fci;
      const crv = typeof p.crv === 'string' ? parseFloat(p.crv) : p.crv;
      
      // Skip if coordinates are null or invalid
      if (lat === null || lat === undefined || lng === null || lng === undefined) continue;
      if (isNaN(lat) || isNaN(lng)) continue;
      // Validate coordinate ranges
      if (lat < -90 || lat > 90) continue;
      if (lng < -180 || lng > 180) continue;
      
      validProjects.push({
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

    if (validProjects.length === 0) return;

    // Create bounds to fit all markers
    const bounds = new google.maps.LatLngBounds();

    // Create markers for each project
    const newMarkers: google.maps.Marker[] = [];
    
    validProjects.forEach(project => {
      try {
        const position = { lat: project.lat, lng: project.lng };
        
        // Determine marker color based on FCI (FCI is a decimal like 0.0252 = 2.52%)
        const fciPercent = project.fci * 100;
        let markerColor = '#22c55e'; // green (good)
        if (fciPercent > 30) markerColor = '#ef4444'; // red (critical)
        else if (fciPercent > 10) markerColor = '#f97316'; // orange (poor)
        else if (fciPercent > 5) markerColor = '#f59e0b'; // yellow (fair)

        // Create a simple colored marker using a data URL
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

        // Add click listener to show info window
        marker.addListener('click', () => {
          const content = `
            <div style="padding: 8px; min-width: 200px;">
              <h3 style="font-weight: 600; font-size: 16px; margin-bottom: 8px;">${project.name}</h3>
              <p style="color: #666; font-size: 14px; margin-bottom: 4px;">${project.address}</p>
              <p style="font-size: 14px; margin-bottom: 4px;">
                <strong>Type:</strong> ${project.propertyType || 'N/A'}
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

        bounds.extend(position);
        newMarkers.push(marker);
      } catch (error) {
        console.error(`Failed to create marker for project ${project.name}:`, error, project);
      }
    });

    setMarkers(newMarkers);

    // Fit map to show all markers
    if (validProjects.length === 1) {
      map.setCenter(bounds.getCenter());
      map.setZoom(15);
    } else {
      map.fitBounds(bounds);
    }
  }, [map, projects, infoWindow]);

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

  const validProjectsCount = projects?.filter(
    p => p.lat !== null && p.lng !== null
  ).length || 0;

  if (validProjectsCount === 0) {
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
        <p>Showing {validProjectsCount} building{validProjectsCount !== 1 ? 's' : ''} with location data</p>
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
      
      <MapView
        className="h-[600px] w-full rounded-lg border"
        onMapReady={handleMapReady}
      />
    </div>
  );
}
