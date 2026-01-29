/**
 * GOOGLE MAPS FRONTEND INTEGRATION - ESSENTIAL GUIDE
 *
 * USAGE FROM PARENT COMPONENT:
 * ======
 *
 * const mapRef = useRef<google.maps.Map | null>(null);
 *
 * <MapView
 *   initialCenter={{ lat: 40.7128, lng: -74.0060 }}
 *   initialZoom={15}
 *   onMapReady={(map) => {
 *     mapRef.current = map; // Store to control map from parent anytime, google map itself is in charge of the re-rendering, not react state.
 * </MapView>
 *
 * ======
 * Available Libraries and Core Features:
 * -------------------------------
 * 📍 MARKER (from `marker` library)
 * - Attaches to map using { map, position }
 * new google.maps.marker.AdvancedMarkerElement({
 *   map,
 *   position: { lat: 37.7749, lng: -122.4194 },
 *   title: "San Francisco",
 * });
 *
 * -------------------------------
 * 🏢 PLACES (from `places` library)
 * - Does not attach directly to map; use data with your map manually.
 * const place = new google.maps.places.Place({ id: PLACE_ID });
 * await place.fetchFields({ fields: ["displayName", "location"] });
 * map.setCenter(place.location);
 * new google.maps.marker.AdvancedMarkerElement({ map, position: place.location });
 *
 * -------------------------------
 * 🧭 GEOCODER (from `geocoding` library)
 * - Standalone service; manually apply results to map.
 * const geocoder = new google.maps.Geocoder();
 * geocoder.geocode({ address: "New York" }, (results, status) => {
 *   if (status === "OK" && results[0]) {
 *     map.setCenter(results[0].geometry.location);
 *     new google.maps.marker.AdvancedMarkerElement({
 *       map,
 *       position: results[0].geometry.location,
 *     });
 *   }
 * });
 *
 * -------------------------------
 * 📐 GEOMETRY (from `geometry` library)
 * - Pure utility functions; not attached to map.
 * const dist = google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
 *
 * -------------------------------
 * 🛣️ ROUTES (from `routes` library)
 * - Combines DirectionsService (standalone) + DirectionsRenderer (map-attached)
 * const directionsService = new google.maps.DirectionsService();
 * const directionsRenderer = new google.maps.DirectionsRenderer({ map });
 * directionsService.route(
 *   { origin, destination, travelMode: "DRIVING" },
 *   (res, status) => status === "OK" && directionsRenderer.setDirections(res)
 * );
 *
 * -------------------------------
 * 🌦️ MAP LAYERS (attach directly to map)
 * - new google.maps.TrafficLayer().setMap(map);
 * - new google.maps.TransitLayer().setMap(map);
 * - new google.maps.BicyclingLayer().setMap(map);
 *
 * -------------------------------
 * ✅ SUMMARY
 * - “map-attached” → AdvancedMarkerElement, DirectionsRenderer, Layers.
 * - “standalone” → Geocoder, DirectionsService, DistanceMatrixService, ElevationService.
 * - “data-only” → Place, Geometry utilities.
 */

/// <reference types="@types/google.maps" />

import { useEffect, useRef, useState } from "react";
import { usePersistFn } from "@/hooks/usePersistFn";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    google?: typeof google;
  }
}

const API_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
const FORGE_BASE_URL =
  import.meta.env.VITE_FRONTEND_FORGE_API_URL ||
  "https://forge.butterfly-effect.dev";
const MAPS_PROXY_URL = `${FORGE_BASE_URL}/v1/maps/proxy`;

let mapScriptPromise: Promise<null> | null = null;

function loadMapScript() {
  // If already loaded, return immediately
  if (window.google?.maps) {
    return Promise.resolve(null);
  }
  
  // If currently loading, return the existing promise
  if (mapScriptPromise) {
    return mapScriptPromise;
  }
  
  // Start loading
  mapScriptPromise = new Promise((resolve, reject) => {
    // Validate required environment variables
    if (!API_KEY) {
      console.error("[Maps] VITE_FRONTEND_FORGE_API_KEY is not configured");
      mapScriptPromise = null;
      reject(new Error("Maps API key not configured"));
      return;
    }
    
    if (!FORGE_BASE_URL) {
      console.error("[Maps] VITE_FRONTEND_FORGE_API_URL is not configured");
      mapScriptPromise = null;
      reject(new Error("Maps proxy URL not configured"));
      return;
    }
    
    const scriptUrl = `${MAPS_PROXY_URL}/maps/api/js?key=${API_KEY}&v=weekly&libraries=marker,places,geocoding,geometry,visualization`;
    console.log("[Maps] Loading Google Maps script from:", MAPS_PROXY_URL);
    
    const script = document.createElement("script");
    script.src = scriptUrl;
    script.async = true;
    script.crossOrigin = "anonymous";
    
    script.onload = () => {
      console.log("[Maps] Google Maps script loaded successfully");
      if (window.google?.maps) {
        console.log("[Maps] Google Maps API is available");
        resolve(null);
      } else {
        console.error("[Maps] Script loaded but google.maps is not available");
        mapScriptPromise = null;
        reject(new Error("Google Maps API not available after script load"));
      }
    };
    
    script.onerror = (error) => {
      console.error("[Maps] Failed to load Google Maps script:", error);
      console.error("[Maps] Script URL:", scriptUrl);
      console.error("[Maps] Check if the proxy URL is accessible and API key is valid");
      mapScriptPromise = null; // Reset on error so it can be retried
      reject(new Error("Failed to load Google Maps script"));
    };
    
    document.head.appendChild(script);
  });
  
  return mapScriptPromise;
}

interface MapViewProps {
  className?: string;
  style?: React.CSSProperties;
  initialCenter?: google.maps.LatLngLiteral;
  initialZoom?: number;
  onMapReady?: (map: google.maps.Map) => void;
  /** Delay initialization to wait for container to be visible (useful in tabs) */
  delayInit?: boolean;
}

export function MapView({
  className,
  style,
  initialCenter = { lat: 37.7749, lng: -122.4194 },
  initialZoom = 12,
  onMapReady,
  delayInit = false,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(!delayInit);
  const initAttempted = useRef(false);

  const init = usePersistFn(async () => {
    // Prevent multiple init attempts
    if (initAttempted.current && map.current) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      await loadMapScript();
      
      if (!mapContainer.current) {
        throw new Error("Map container not found");
      }
      
      // Wait for container to have dimensions - extended retry for tab visibility
      const checkDimensions = () => {
        const rect = mapContainer.current?.getBoundingClientRect();
        return rect && rect.width > 0 && rect.height > 0;
      };
      
      // Retry up to 30 times with 100ms delay (3 seconds total)
      for (let i = 0; i < 30; i++) {
        if (checkDimensions()) {
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (!checkDimensions()) {
        throw new Error("Map container has zero dimensions");
      }
      
      initAttempted.current = true;
      
      map.current = new window.google.maps.Map(mapContainer.current, {
        mapId: "DEMO_MAP_ID",
        zoom: initialZoom,
        center: initialCenter,
        mapTypeControl: true,
        fullscreenControl: true,
        zoomControl: true,
        streetViewControl: true,
      });
      
      setLoading(false);
      
      if (onMapReady) {
        onMapReady(map.current);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load map";
      console.error("[Maps] Initialization error:", err);
      setError(errorMessage);
      setLoading(false);
    }
  });

  // Use IntersectionObserver to detect when container becomes visible
  useEffect(() => {
    if (!mapContainer.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isVisible) {
            setIsVisible(true);
          }
        });
      },
      { threshold: 0.1 }
    );
    
    observer.observe(mapContainer.current);
    
    return () => observer.disconnect();
  }, [isVisible]);

  // Initialize map when visible
  useEffect(() => {
    if (isVisible && !initAttempted.current) {
      init();
    }
  }, [init, isVisible]);

  return (
    <div className="relative" style={{ minHeight: '500px' }}>
      {/* Map container - always rendered to ensure IntersectionObserver works */}
      <div 
        ref={mapContainer} 
        className={cn("w-full", className)} 
        style={{ ...style, minHeight: '500px', height: style?.height || '500px' }} 
      />
      
      {/* Loading overlay */}
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <div className="text-sm text-muted-foreground">Loading map...</div>
          </div>
        </div>
      )}
      
      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/20 border border-destructive/20 rounded-lg z-10">
          <div className="text-center p-6 max-w-md">
            <div className="text-destructive mb-2 font-semibold">Failed to Load Map</div>
            <div className="text-sm text-muted-foreground mb-4">{error}</div>
            <button
              onClick={() => {
                setError(null);
                initAttempted.current = false;
                setIsVisible(true);
                // Small delay to ensure state is updated
                setTimeout(() => init(), 100);
              }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
