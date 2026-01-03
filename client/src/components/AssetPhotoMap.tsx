import { useRef, useState, useCallback, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { MapView } from "@/components/Map";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, MapPin, Image as ImageIcon, Download, ExternalLink, Calendar as CalendarIcon, Layers, Filter, Flame, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkerClusterer, SuperClusterAlgorithm } from "@googlemaps/markerclusterer";
import { format } from "date-fns";

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
  assessmentType?: string | null;
}

interface PhotoFilters {
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  componentCode: string;
  assessmentType: string;
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
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const heatmapRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);
  
  const [selectedPhoto, setSelectedPhoto] = useState<GeotaggedPhoto | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [clusteringEnabled, setClusteringEnabled] = useState(true);
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<PhotoFilters>({
    dateFrom: undefined,
    dateTo: undefined,
    componentCode: "all",
    assessmentType: "all",
  });
  
  const { data: photos, isLoading } = trpc.photos.byAsset.useQuery({ assetId, projectId });
  
  // Filter photos that have geolocation data
  const geotaggedPhotos = useMemo(() => {
    return photos?.filter(
      (photo): photo is GeotaggedPhoto => 
        photo.latitude !== null && 
        photo.longitude !== null &&
        photo.latitude !== undefined &&
        photo.longitude !== undefined
    ) || [];
  }, [photos]);

  // Get unique component codes and assessment types for filter dropdowns
  const uniqueComponentCodes = useMemo(() => {
    const codes = new Set<string>();
    geotaggedPhotos.forEach(p => {
      if (p.componentCode) codes.add(p.componentCode);
    });
    return Array.from(codes).sort();
  }, [geotaggedPhotos]);

  const uniqueAssessmentTypes = useMemo(() => {
    const types = new Set<string>();
    geotaggedPhotos.forEach(p => {
      if (p.assessmentType) types.add(p.assessmentType);
    });
    return Array.from(types).sort();
  }, [geotaggedPhotos]);

  // Apply filters to photos
  const filteredPhotos = useMemo(() => {
    return geotaggedPhotos.filter(photo => {
      // Date range filter
      if (filters.dateFrom) {
        const photoDate = new Date(photo.createdAt);
        if (photoDate < filters.dateFrom) return false;
      }
      if (filters.dateTo) {
        const photoDate = new Date(photo.createdAt);
        const endOfDay = new Date(filters.dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        if (photoDate > endOfDay) return false;
      }
      
      // Component code filter
      if (filters.componentCode !== "all" && photo.componentCode !== filters.componentCode) {
        return false;
      }
      
      // Assessment type filter
      if (filters.assessmentType !== "all" && photo.assessmentType !== filters.assessmentType) {
        return false;
      }
      
      return true;
    });
  }, [geotaggedPhotos, filters]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    if (filters.componentCode !== "all") count++;
    if (filters.assessmentType !== "all") count++;
    return count;
  }, [filters]);

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      dateFrom: undefined,
      dateTo: undefined,
      componentCode: "all",
      assessmentType: "all",
    });
  };

  // Calculate center and bounds for the map
  const getMapCenter = useCallback(() => {
    if (filteredPhotos.length === 0) {
      return { lat: 43.6532, lng: -79.3832 }; // Default to Toronto
    }
    
    const lats = filteredPhotos.map(p => parseFloat(p.latitude));
    const lngs = filteredPhotos.map(p => parseFloat(p.longitude));
    
    const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
    const avgLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
    
    return { lat: avgLat, lng: avgLng };
  }, [filteredPhotos]);

  // Create heatmap layer
  const updateHeatmap = useCallback((map: google.maps.Map) => {
    // Remove existing heatmap
    if (heatmapRef.current) {
      heatmapRef.current.setMap(null);
      heatmapRef.current = null;
    }

    if (!heatmapEnabled || filteredPhotos.length === 0) return;

    // Check if visualization library is loaded
    if (!google.maps.visualization) {
      console.warn("Google Maps visualization library not loaded");
      return;
    }

    const heatmapData = filteredPhotos.map(photo => ({
      location: new google.maps.LatLng(
        parseFloat(photo.latitude),
        parseFloat(photo.longitude)
      ),
      weight: 1
    }));

    heatmapRef.current = new google.maps.visualization.HeatmapLayer({
      data: heatmapData,
      map: map,
      radius: 30,
      opacity: 0.7,
      gradient: [
        'rgba(0, 255, 255, 0)',
        'rgba(0, 255, 255, 1)',
        'rgba(0, 191, 255, 1)',
        'rgba(0, 127, 255, 1)',
        'rgba(0, 63, 255, 1)',
        'rgba(0, 0, 255, 1)',
        'rgba(0, 0, 223, 1)',
        'rgba(0, 0, 191, 1)',
        'rgba(0, 0, 159, 1)',
        'rgba(0, 0, 127, 1)',
        'rgba(63, 0, 91, 1)',
        'rgba(127, 0, 63, 1)',
        'rgba(191, 0, 31, 1)',
        'rgba(255, 0, 0, 1)'
      ]
    });
  }, [heatmapEnabled, filteredPhotos]);

  // Create markers and optionally cluster them
  const updateMarkers = useCallback((map: google.maps.Map) => {
    // Clear existing markers and clusterer
    markersRef.current.forEach(marker => marker.map = null);
    markersRef.current = [];
    
    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
      clustererRef.current = null;
    }

    if (filteredPhotos.length === 0) return;

    // Create bounds to fit all markers
    const bounds = new google.maps.LatLngBounds();
    
    // Create markers for each filtered photo
    const markers: google.maps.marker.AdvancedMarkerElement[] = [];
    
    filteredPhotos.forEach((photo) => {
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
        position,
        content: markerContent,
        title: photo.caption || `Photo ${photo.id}`,
      });
      
      // Add click listener to show photo details
      marker.addListener('click', () => {
        setSelectedPhoto(photo);
      });
      
      markers.push(marker);
    });

    markersRef.current = markers;

    // Apply clustering if enabled
    if (clusteringEnabled && markers.length > 1) {
      clustererRef.current = new MarkerClusterer({
        map,
        markers,
        algorithm: new SuperClusterAlgorithm({
          maxZoom: 16,
          radius: 80,
        }),
        renderer: {
          render: ({ count, position }) => {
            // Create custom cluster marker
            const clusterContent = document.createElement('div');
            const size = Math.min(60, 30 + Math.log2(count) * 8);
            clusterContent.innerHTML = `
              <div style="
                width: ${size}px;
                height: ${size}px;
                border-radius: 50%;
                background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
                border: 3px solid white;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: ${Math.max(12, size / 3)}px;
                cursor: pointer;
                transition: transform 0.2s;
              ">
                ${count}
              </div>
            `;
            
            clusterContent.addEventListener('mouseenter', () => {
              const inner = clusterContent.querySelector('div') as HTMLElement;
              if (inner) inner.style.transform = 'scale(1.1)';
            });
            clusterContent.addEventListener('mouseleave', () => {
              const inner = clusterContent.querySelector('div') as HTMLElement;
              if (inner) inner.style.transform = 'scale(1)';
            });
            
            return new google.maps.marker.AdvancedMarkerElement({
              position,
              content: clusterContent,
            });
          }
        }
      });
    } else {
      // No clustering - add markers directly to map
      markers.forEach(marker => {
        marker.map = map;
      });
    }
    
    // Fit map to show all markers with padding
    if (filteredPhotos.length > 1) {
      map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
    } else if (filteredPhotos.length === 1) {
      map.setCenter(bounds.getCenter());
      map.setZoom(17);
    }
  }, [filteredPhotos, clusteringEnabled]);

  // Handle map ready
  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setMapReady(true);
    updateMarkers(map);
    updateHeatmap(map);
  }, [updateMarkers, updateHeatmap]);

  // Update markers when filters or clustering changes
  useEffect(() => {
    if (mapRef.current && mapReady) {
      updateMarkers(mapRef.current);
    }
  }, [filteredPhotos, clusteringEnabled, mapReady, updateMarkers]);

  // Update heatmap when toggle changes
  useEffect(() => {
    if (mapRef.current && mapReady) {
      updateHeatmap(mapRef.current);
    }
  }, [heatmapEnabled, filteredPhotos, mapReady, updateHeatmap]);

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
      {/* Controls bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-green-600" />
            <span className="font-medium text-foreground">{filteredPhotos.length}</span>
            {filteredPhotos.length !== geotaggedPhotos.length && (
              <span className="text-muted-foreground">of {geotaggedPhotos.length}</span>
            )}
            {' '}photo{filteredPhotos.length !== 1 ? 's' : ''}
          </span>
          {photos.length > geotaggedPhotos.length && (
            <span className="text-xs text-muted-foreground">
              ({photos.length - geotaggedPhotos.length} without location)
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Filter button */}
          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="relative">
                <Filter className="mr-2 h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Filter Photos</h4>
                  {activeFilterCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
                      Clear all
                    </Button>
                  )}
                </div>
                
                {/* Date range */}
                <div className="space-y-2">
                  <Label className="text-sm">Date Range</Label>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="flex-1 justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {filters.dateFrom ? format(filters.dateFrom, "MMM d, yyyy") : "From"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={filters.dateFrom}
                          onSelect={(date) => setFilters(f => ({ ...f, dateFrom: date }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="flex-1 justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {filters.dateTo ? format(filters.dateTo, "MMM d, yyyy") : "To"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={filters.dateTo}
                          onSelect={(date) => setFilters(f => ({ ...f, dateTo: date }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                
                {/* Component code filter */}
                {uniqueComponentCodes.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm">Component Code</Label>
                    <Select
                      value={filters.componentCode}
                      onValueChange={(value) => setFilters(f => ({ ...f, componentCode: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All components" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All components</SelectItem>
                        {uniqueComponentCodes.map(code => (
                          <SelectItem key={code} value={code}>{code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {/* Assessment type filter */}
                {uniqueAssessmentTypes.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm">Assessment Type</Label>
                    <Select
                      value={filters.assessmentType}
                      onValueChange={(value) => setFilters(f => ({ ...f, assessmentType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        {uniqueAssessmentTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Clustering toggle */}
          <div className="flex items-center gap-2 border rounded-md px-3 py-1.5">
            <Label htmlFor="clustering" className="text-sm cursor-pointer">Cluster</Label>
            <Switch
              id="clustering"
              checked={clusteringEnabled}
              onCheckedChange={setClusteringEnabled}
            />
          </div>
          
          {/* Heatmap toggle */}
          <div className="flex items-center gap-2 border rounded-md px-3 py-1.5">
            <Label htmlFor="heatmap" className="text-sm cursor-pointer flex items-center gap-1">
              <Flame className="h-4 w-4 text-orange-500" />
              Heatmap
            </Label>
            <Switch
              id="heatmap"
              checked={heatmapEnabled}
              onCheckedChange={setHeatmapEnabled}
            />
          </div>
          
          {/* Fit all button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (mapRef.current && filteredPhotos.length > 0) {
                const bounds = new google.maps.LatLngBounds();
                filteredPhotos.forEach(photo => {
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
      </div>

      {/* Active filters display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {filters.dateFrom && (
            <Badge variant="secondary" className="gap-1">
              From: {format(filters.dateFrom, "MMM d, yyyy")}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => setFilters(f => ({ ...f, dateFrom: undefined }))}
              />
            </Badge>
          )}
          {filters.dateTo && (
            <Badge variant="secondary" className="gap-1">
              To: {format(filters.dateTo, "MMM d, yyyy")}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => setFilters(f => ({ ...f, dateTo: undefined }))}
              />
            </Badge>
          )}
          {filters.componentCode !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Component: {filters.componentCode}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => setFilters(f => ({ ...f, componentCode: "all" }))}
              />
            </Badge>
          )}
          {filters.assessmentType !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Type: {filters.assessmentType}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => setFilters(f => ({ ...f, assessmentType: "all" }))}
              />
            </Badge>
          )}
        </div>
      )}

      {/* Map container */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <MapView
            className="h-[500px] w-full"
            initialCenter={getMapCenter()}
            initialZoom={filteredPhotos.length === 1 ? 17 : 15}
            onMapReady={handleMapReady}
          />
        </CardContent>
      </Card>

      {/* Photo thumbnails strip */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {filteredPhotos.map((photo) => (
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
                    <CalendarIcon className="h-4 w-4" />
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
                  {selectedPhoto.assessmentType && (
                    <p className="text-sm text-muted-foreground">
                      Assessment Type: {selectedPhoto.assessmentType}
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
