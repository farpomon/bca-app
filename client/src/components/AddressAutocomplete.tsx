import { useEffect, useRef, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2 } from "lucide-react";
import { loadGoogleMapsScript } from "@/lib/googleMapsLoader";

interface AddressComponents {
  streetNumber: string;
  streetAddress: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
}

interface Prediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelected: (components: AddressComponents) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

/**
 * AddressAutocomplete component using Google Places Autocomplete Service
 * Uses custom dropdown UI for better control over selection behavior
 */
export function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelected,
  label = "Search Address",
  placeholder = "Start typing an address...",
  required = false,
  className = "",
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoadingPredictions, setIsLoadingPredictions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load Google Maps script
  useEffect(() => {
    loadGoogleMapsScript()
      .then(() => {
        setIsLoaded(true);
      })
      .catch((error) => {
        console.error("Failed to load Google Maps:", error);
      });
  }, []);

  // Initialize services when loaded
  useEffect(() => {
    if (!isLoaded) return;

    // Initialize AutocompleteService for predictions
    autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
    
    // Create a dummy div for PlacesService (required by API)
    const dummyDiv = document.createElement("div");
    placesServiceRef.current = new google.maps.places.PlacesService(dummyDiv);
  }, [isLoaded]);

  // Fetch predictions when input changes
  const fetchPredictions = useCallback((input: string) => {
    if (!autocompleteServiceRef.current || input.length < 3) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    setIsLoadingPredictions(true);
    
    autocompleteServiceRef.current.getPlacePredictions(
      {
        input,
        componentRestrictions: { country: "ca" },
        types: ["address"],
      },
      (results, status) => {
        setIsLoadingPredictions(false);
        
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          const formattedPredictions: Prediction[] = results.map((result) => ({
            placeId: result.place_id,
            description: result.description,
            mainText: result.structured_formatting.main_text,
            secondaryText: result.structured_formatting.secondary_text || "",
          }));
          setPredictions(formattedPredictions);
          setShowDropdown(true);
          setSelectedIndex(-1);
        } else {
          setPredictions([]);
          setShowDropdown(false);
        }
      }
    );
  }, []);

  // Debounce input changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (value) {
        fetchPredictions(value);
      } else {
        setPredictions([]);
        setShowDropdown(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [value, fetchPredictions]);

  // Handle place selection
  const handleSelectPlace = useCallback((prediction: Prediction) => {
    if (!placesServiceRef.current) return;

    console.log("[AddressAutocomplete] Selecting place:", prediction.description);

    placesServiceRef.current.getDetails(
      {
        placeId: prediction.placeId,
        fields: ["address_components", "formatted_address", "geometry"],
      },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          console.log("[AddressAutocomplete] Place details received:", place);

          // Parse address components
          const components: AddressComponents = {
            streetNumber: "",
            streetAddress: "",
            city: "",
            province: "",
            postalCode: "",
            country: "",
          };

          place.address_components?.forEach((component) => {
            const types = component.types;

            if (types.includes("street_number")) {
              components.streetNumber = component.long_name;
            }
            if (types.includes("route")) {
              components.streetAddress = component.long_name;
            }
            if (types.includes("locality")) {
              components.city = component.long_name;
            }
            if (types.includes("administrative_area_level_1")) {
              components.province = component.short_name;
            }
            if (types.includes("postal_code")) {
              components.postalCode = component.long_name;
            }
            if (types.includes("country")) {
              components.country = component.short_name;
            }
          });

          // Update input value with formatted address
          if (place.formatted_address) {
            console.log("[AddressAutocomplete] Setting formatted address:", place.formatted_address);
            onChange(place.formatted_address);
          }

          // Call parent callback with structured components
          console.log("[AddressAutocomplete] Calling onPlaceSelected with components:", components);
          onPlaceSelected(components);
        }

        // Close dropdown
        setShowDropdown(false);
        setPredictions([]);
      }
    );
  }, [onChange, onPlaceSelected]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || predictions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < predictions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && predictions[selectedIndex]) {
          handleSelectPlace(predictions[selectedIndex]);
        }
        break;
      case "Escape":
        setShowDropdown(false);
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`space-y-2 relative ${className}`}>
      {label && (
        <Label htmlFor="address-autocomplete" className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      <div className="relative">
        <Input
          ref={inputRef}
          id="address-autocomplete"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (predictions.length > 0) {
              setShowDropdown(true);
            }
          }}
          placeholder={placeholder}
          className="w-full"
          autoComplete="off"
        />
        {isLoadingPredictions && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
      
      {/* Custom dropdown for predictions */}
      {showDropdown && predictions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto"
          style={{ top: "100%" }}
        >
          {predictions.map((prediction, index) => (
            <button
              key={prediction.placeId}
              type="button"
              className={`w-full px-3 py-2 text-left hover:bg-accent transition-colors ${
                index === selectedIndex ? "bg-accent" : ""
              }`}
              onClick={() => handleSelectPlace(prediction)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="font-medium text-sm text-foreground">
                {prediction.mainText}
              </div>
              <div className="text-xs text-muted-foreground">
                {prediction.secondaryText}
              </div>
            </button>
          ))}
        </div>
      )}
      
      {!isLoaded && (
        <p className="text-xs text-muted-foreground">Loading address autocomplete...</p>
      )}
    </div>
  );
}
