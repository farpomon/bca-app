import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Route, 
  MapPin, 
  Clock, 
  Navigation, 
  GripVertical,
  X,
  RotateCcw,
  Car,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Asset {
  id: number;
  name: string;
  address: string | null;
  latitude: string | null;
  longitude: string | null;
}

interface RoutePlanningPanelProps {
  assets: Asset[];
  map: google.maps.Map | null;
  onClose?: () => void;
}

interface RouteStop {
  asset: Asset;
  order: number;
}

interface RouteInfo {
  totalDistance: string;
  totalDuration: string;
  legs: Array<{
    distance: string;
    duration: string;
    startAddress: string;
    endAddress: string;
  }>;
}

export function RoutePlanningPanel({ assets, map, onClose }: RoutePlanningPanelProps) {
  const [selectedAssets, setSelectedAssets] = useState<Set<number>>(new Set());
  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);

  // Filter assets with valid coordinates
  const validAssets = assets.filter(
    (a) => a.latitude && a.longitude && !isNaN(parseFloat(a.latitude)) && !isNaN(parseFloat(a.longitude))
  );

  // Initialize directions service and renderer
  useEffect(() => {
    if (!map || !window.google?.maps) return;

    directionsServiceRef.current = new google.maps.DirectionsService();
    directionsRendererRef.current = new google.maps.DirectionsRenderer({
      map,
      suppressMarkers: false,
      polylineOptions: {
        strokeColor: "#3b82f6",
        strokeWeight: 5,
        strokeOpacity: 0.8,
      },
    });

    return () => {
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }
    };
  }, [map]);

  // Update route stops when selection changes
  useEffect(() => {
    const newStops = Array.from(selectedAssets)
      .map((id) => validAssets.find((a) => a.id === id))
      .filter((a): a is Asset => a !== undefined)
      .map((asset, index) => ({ asset, order: index }));
    
    setRouteStops(newStops);
    setRouteInfo(null);
    
    // Clear existing route when selection changes
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setDirections({ routes: [] } as google.maps.DirectionsResult);
    }
  }, [selectedAssets, validAssets]);

  const toggleAssetSelection = (assetId: number) => {
    setSelectedAssets((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(assetId)) {
        newSet.delete(assetId);
      } else {
        newSet.add(assetId);
      }
      return newSet;
    });
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newStops = [...routeStops];
    const [draggedItem] = newStops.splice(draggedIndex, 1);
    newStops.splice(index, 0, draggedItem);
    
    // Update order
    newStops.forEach((stop, i) => {
      stop.order = i;
    });

    setRouteStops(newStops);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const removeStop = (assetId: number) => {
    setSelectedAssets((prev) => {
      const newSet = new Set(prev);
      newSet.delete(assetId);
      return newSet;
    });
  };

  const calculateRoute = async () => {
    if (!directionsServiceRef.current || !directionsRendererRef.current || routeStops.length < 2) {
      setError("Please select at least 2 assets with valid coordinates");
      return;
    }

    setIsCalculating(true);
    setError(null);

    try {
      const waypoints = routeStops.slice(1, -1).map((stop) => ({
        location: new google.maps.LatLng(
          parseFloat(stop.asset.latitude!),
          parseFloat(stop.asset.longitude!)
        ),
        stopover: true,
      }));

      const origin = new google.maps.LatLng(
        parseFloat(routeStops[0].asset.latitude!),
        parseFloat(routeStops[0].asset.longitude!)
      );

      const destination = new google.maps.LatLng(
        parseFloat(routeStops[routeStops.length - 1].asset.latitude!),
        parseFloat(routeStops[routeStops.length - 1].asset.longitude!)
      );

      const request: google.maps.DirectionsRequest = {
        origin,
        destination,
        waypoints,
        travelMode: google.maps.TravelMode.DRIVING,
        optimizeWaypoints: false, // Keep user-defined order
      };

      const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
        directionsServiceRef.current!.route(request, (response, status) => {
          if (status === "OK" && response) {
            resolve(response);
          } else {
            reject(new Error(`Directions request failed: ${status}`));
          }
        });
      });

      directionsRendererRef.current.setDirections(result);

      // Extract route info
      const route = result.routes[0];
      if (route) {
        let totalDistance = 0;
        let totalDuration = 0;
        const legs = route.legs.map((leg) => {
          totalDistance += leg.distance?.value || 0;
          totalDuration += leg.duration?.value || 0;
          return {
            distance: leg.distance?.text || "N/A",
            duration: leg.duration?.text || "N/A",
            startAddress: leg.start_address || "Unknown",
            endAddress: leg.end_address || "Unknown",
          };
        });

        setRouteInfo({
          totalDistance: `${(totalDistance / 1000).toFixed(1)} km`,
          totalDuration: formatDuration(totalDuration),
          legs,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to calculate route";
      setError(errorMessage);
    } finally {
      setIsCalculating(false);
    }
  };

  const clearRoute = () => {
    setSelectedAssets(new Set());
    setRouteStops([]);
    setRouteInfo(null);
    setError(null);
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setDirections({ routes: [] } as google.maps.DirectionsResult);
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} min`;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Route className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Route Planning</CardTitle>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CardDescription>
          Select assets to plan an inspection route
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Asset Selection */}
        <div>
          <h4 className="text-sm font-medium mb-2">Available Assets ({validAssets.length})</h4>
          <ScrollArea className="h-[200px] border rounded-md p-2">
            {validAssets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No assets with valid coordinates
              </p>
            ) : (
              <div className="space-y-2">
                {validAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer",
                      selectedAssets.has(asset.id) && "bg-primary/10"
                    )}
                    onClick={() => toggleAssetSelection(asset.id)}
                  >
                    <Checkbox
                      checked={selectedAssets.has(asset.id)}
                      onCheckedChange={() => toggleAssetSelection(asset.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{asset.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {asset.address || "No address"}
                      </p>
                    </div>
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <Separator />

        {/* Route Stops (Reorderable) */}
        {routeStops.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">
              Route Stops ({routeStops.length})
              <span className="text-xs text-muted-foreground ml-2">
                Drag to reorder
              </span>
            </h4>
            <div className="space-y-1">
              {routeStops.map((stop, index) => (
                <div
                  key={stop.asset.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md border bg-background",
                    draggedIndex === index && "opacity-50"
                  )}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center">
                    {index + 1}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{stop.asset.name}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => removeStop(stop.asset.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Route Info */}
        {routeInfo && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Route Summary</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Distance</p>
                  <p className="text-sm font-medium">{routeInfo.totalDistance}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Est. Duration</p>
                  <p className="text-sm font-medium">{routeInfo.totalDuration}</p>
                </div>
              </div>
            </div>

            {/* Leg Details */}
            <div className="space-y-2 pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground">Route Segments</p>
              {routeInfo.legs.map((leg, index) => (
                <div key={index} className="text-xs space-y-1 pl-2 border-l-2 border-primary/30">
                  <p className="font-medium">
                    Stop {index + 1} → Stop {index + 2}
                  </p>
                  <p className="text-muted-foreground">
                    {leg.distance} • {leg.duration}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={calculateRoute}
            disabled={routeStops.length < 2 || isCalculating}
            className="flex-1"
          >
            {isCalculating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <Route className="h-4 w-4 mr-2" />
                Calculate Route
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={clearRoute}
            disabled={selectedAssets.size === 0}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
