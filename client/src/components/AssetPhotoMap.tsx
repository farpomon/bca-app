import { useRef, useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { MapView } from "@/components/Map";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, MapPin, Image as ImageIcon, Download, ExternalLink, Calendar, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface AssetPhotoMapProps {
  assetId: number;
  projectId: number;
}

interface GeotaggedPhoto {
  id: number;
  url: string;
  caption: string | null;
  latitude: string;
  longitude: string;
  altitude: string | null;
  locationAccuracy: string | null;
  createdAt: string;
  componentCode: string | null;
}

// Helper function to format coordinates
function formatCoordinates(lat: string | number, lng: string | number): string {
  const latNum = typeof lat === 'string' ? parseFloat(lat) : lat;
  const lngNum = typeof lng === 'string' ? parseFloat(lng) : lng;
  
  const latDir = latNum >= 0 ? 'N' : 'S';
  const lngDir = lngNum >= 0 ? 'E' : 'W';
  return `${Math.abs(latNum).toFixed(6)}° ${latDir}, ${Math.abs(lngNum).toFixed(6)}° ${lngDir}`;
}

// Helper function to create Google Maps URL
function getGoogleMapsUrl(lat: string | number, lng: string | number): string {
  const latNum = typeof lat === 'string' ? parseFloat(lat) : lat;
  const lngNum = typeof lng === 'string' ? parseFloat(lng) : lng;
  return `https://www.google.com/maps?q=${latNum},${lngNum}`;
}

export default function AssetPhotoMap({ assetId, projectId }: AssetPhotoMapProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<GeotaggedPhoto | null>(null);
  const [mapReady, setMapReady] = useState(false);
  
  const { data: photos, isLoading } = trpc.photos.byAsset.useQuery({ assetId, projectId });
  
  // Filter photos that have geolocation data
  const geotaggedPhotos = photos?.filter(
    (photo): photo is GeotaggedPhoto => 
      photo.latitude !== null && 
      photo.longitude !== null &&
      photo.latitude !== undefined &&
      photo.longitude !== undefined
  ) || [];

  // Calculate center and bounds for the map
  const getMapCenter = useCallback(() => {
    if (geotaggedPhotos.length === 0) {
      return { lat: 43.6532, lng: -79.3832 }; // Default to Toronto
    }
    
    const lats = geotaggedPhotos.map(p => parseFloat(p.latitude));
    const lngs = geotaggedPhotos.map(p => parseFloat(p.longitude));
    
    const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
    const avgLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
    
    return { lat: avgLat, lng: avgLng };
  }, [geotaggedPhotos]);

  // Create markers when map is ready
  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setMapReady(true);
    
    // Clear existing markers
    markersRef.current.forEach(marker => marker.map = null);
    markersRef.current = [];
    
    if (geotaggedPhotos.length === 0) return;
    
    // Create bounds to fit all markers
    const bounds = new google.maps.LatLngBounds();
    
    // Create markers for each geotagged photo
    geotaggedPhotos.forEach((photo) => {
      const position = {
        lat: parseFloat(photo.latitude),
        lng: parseFloat(photo.longitude)
      };
      
      bounds.extend(position);
      
      // Create custom marker content with photo thumbnail
      const markerContent = document.createElement('div');
      markerContent.className = 'photo-marker';
      markerContent.innerHTML = `
        <div style="
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: 3px solid #16a34a;
          overflow: hidden;
          background: white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: pointer;
          transition: transform 0.2s;
        ">
          <img 
            src="${photo.url}" 
            alt="${photo.caption || 'Photo'}"
            style="width: 100%; height: 100%; object-fit: cover;"
          />
        </div>
        <div style="
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 8px solid transparent;
          border-right: 8px solid transparent;
          border-top: 8px solid #16a34a;
        "></div>
      `;
      
      // Add hover effect
      markerContent.addEventListener('mouseenter', () => {
        const inner = markerContent.querySelector('div') as HTMLElement;
        if (inner) inner.style.transform = 'scale(1.1)';
      });
      markerContent.addEventListener('mouseleave', () => {
        const inner = markerContent.querySelector('div') as HTMLElement;
        if (inner) inner.style.transform = 'scale(1)';
      });
      
      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position,
        content: markerContent,
        title: photo.caption || `Photo ${photo.id}`,
      });
      
      // Add click listener to show photo details
      marker.addListener('click', () => {
        setSelectedPhoto(photo);
      });
      
      markersRef.current.push(marker);
    });
    
    // Fit map to show all markers with padding
    if (geotaggedPhotos.length > 1) {
      map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
    } else if (geotaggedPhotos.length === 1) {
      map.setZoom(17);
    }
  }, [geotaggedPhotos]);

  // Update markers when photos change
  const updateMarkers = useCallback(() => {
    if (!mapRef.current || !mapReady) return;
    handleMapReady(mapRef.current);
  }, [handleMapReady, mapReady]);

  // Effect to update markers when geotaggedPhotos changes
  if (mapReady && mapRef.current && geotaggedPhotos.length > 0 && markersRef.current.length !== geotaggedPhotos.length) {
    updateMarkers();
  }

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!photos || photos.length === 0) {
    return (
      <div className="text-center py-12">
        <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground">
          No photos uploaded yet. Upload photos with location data to see them on the map.
        </p>
      </div>
    );
  }

  if (geotaggedPhotos.length === 0) {
    return (
      <div className="text-center py-12">
        <MapPin className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground mb-2">
          No geotagged photos found for this asset.
        </p>
        <p className="text-xs text-muted-foreground">
          {photos.length} photo{photos.length !== 1 ? 's' : ''} uploaded, but none have location data.
          <br />
          Enable location services when taking photos to see them on the map.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="h-4 w-4 text-green-600" />
            <span className="font-medium text-foreground">{geotaggedPhotos.length}</span> geotagged photo{geotaggedPhotos.length !== 1 ? 's' : ''}
          </span>
          {photos.length > geotaggedPhotos.length && (
            <span className="text-muted-foreground">
              ({photos.length - geotaggedPhotos.length} without location)
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (mapRef.current && geotaggedPhotos.length > 0) {
              const bounds = new google.maps.LatLngBounds();
              geotaggedPhotos.forEach(photo => {
                bounds.extend({
                  lat: parseFloat(photo.latitude),
                  lng: parseFloat(photo.longitude)
                });
              });
              mapRef.current.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
            }
          }}
        >
          <Layers className="mr-2 h-4 w-4" />
          Fit All
        </Button>
      </div>

      {/* Map container */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <MapView
            className="h-[500px] w-full"
            initialCenter={getMapCenter()}
            initialZoom={geotaggedPhotos.length === 1 ? 17 : 15}
            onMapReady={handleMapReady}
          />
        </CardContent>
      </Card>

      {/* Photo thumbnails strip */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {geotaggedPhotos.map((photo) => (
          <button
            key={photo.id}
            onClick={() => {
              setSelectedPhoto(photo);
              // Pan map to photo location
              if (mapRef.current) {
                mapRef.current.panTo({
                  lat: parseFloat(photo.latitude),
                  lng: parseFloat(photo.longitude)
                });
                mapRef.current.setZoom(18);
              }
            }}
            className={cn(
              "flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all hover:scale-105",
              selectedPhoto?.id === photo.id ? "border-primary ring-2 ring-primary/30" : "border-transparent"
            )}
          >
            <img
              src={photo.url}
              alt={photo.caption || 'Photo'}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>

      {/* Photo Detail Dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-green-600" />
              {selectedPhoto?.caption || 'Geotagged Photo'}
            </DialogTitle>
          </DialogHeader>
          {selectedPhoto && (
            <div className="space-y-4">
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.caption || 'Photo'}
                className="w-full max-h-[50vh] object-contain rounded-lg bg-muted"
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Location Info */}
                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-green-600" />
                    Location
                  </h4>
                  <p className="text-sm font-mono">
                    {formatCoordinates(selectedPhoto.latitude, selectedPhoto.longitude)}
                  </p>
                  {selectedPhoto.altitude && (
                    <p className="text-sm text-muted-foreground">
                      Altitude: {parseFloat(selectedPhoto.altitude).toFixed(1)}m
                    </p>
                  )}
                  {selectedPhoto.locationAccuracy && (
                    <p className="text-sm text-muted-foreground">
                      Accuracy: ±{parseFloat(selectedPhoto.locationAccuracy).toFixed(0)}m
                    </p>
                  )}
                  <a
                    href={getGoogleMapsUrl(selectedPhoto.latitude, selectedPhoto.longitude)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open in Google Maps
                  </a>
                </div>
                
                {/* Photo Info */}
                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Details
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Uploaded: {new Date(selectedPhoto.createdAt).toLocaleString()}
                  </p>
                  {selectedPhoto.componentCode && (
                    <p className="text-sm text-muted-foreground">
                      Component: {selectedPhoto.componentCode}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (mapRef.current) {
                      mapRef.current.panTo({
                        lat: parseFloat(selectedPhoto.latitude),
                        lng: parseFloat(selectedPhoto.longitude)
                      });
                      mapRef.current.setZoom(18);
                      setSelectedPhoto(null);
                    }
                  }}
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  Show on Map
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDownload(selectedPhoto.url, `photo-${selectedPhoto.id}.jpg`)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
