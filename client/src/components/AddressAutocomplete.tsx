import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin } from "lucide-react";
import { loadGoogleMapsScript } from "@/lib/googleMapsLoader";

interface AddressComponents {
  streetNumber: string;
  streetAddress: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
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
 * AddressAutocomplete component using Google Places Autocomplete API
 * Provides address suggestions as users type and auto-fills structured address fields
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
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Use refs to store latest callbacks without triggering re-initialization
  const onChangeRef = useRef(onChange);
  const onPlaceSelectedRef = useRef(onPlaceSelected);
  
  // Keep refs updated with latest callbacks
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  
  useEffect(() => {
    onPlaceSelectedRef.current = onPlaceSelected;
  }, [onPlaceSelected]);

  useEffect(() => {
    // Load Google Maps script
    loadGoogleMapsScript()
      .then(() => {
        setIsLoaded(true);
      })
      .catch((error) => {
        console.error("Failed to load Google Maps:", error);
      });
  }, []);

  useEffect(() => {
    if (!isLoaded || !inputRef.current) return;

    // Initialize autocomplete
    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "ca" }, // Restrict to Canada
      fields: ["address_components", "formatted_address", "geometry"],
      types: ["address"],
    });

    // Handle place selection
    const listener = autocompleteRef.current.addListener("place_changed", () => {
      console.log("[AddressAutocomplete] place_changed event fired");
      const place = autocompleteRef.current?.getPlace();
      console.log("[AddressAutocomplete] Place object:", place);
      
      if (!place?.address_components) {
        console.warn("[AddressAutocomplete] No address components found");
        return;
      }

      // Parse address components
      const components: AddressComponents = {
        streetNumber: "",
        streetAddress: "",
        city: "",
        province: "",
        postalCode: "",
        country: "",
      };

      place.address_components.forEach((component) => {
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
        onChangeRef.current(place.formatted_address);
      }

      // Call parent callback with structured components
      console.log("[AddressAutocomplete] Calling onPlaceSelected with components:", components);
      onPlaceSelectedRef.current(components);
    });

    return () => {
      if (listener) {
        google.maps.event.removeListener(listener);
      }
    };
  }, [isLoaded]); // Only depend on isLoaded, not the callbacks

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <Label htmlFor="address-autocomplete" className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      <Input
        ref={inputRef}
        id="address-autocomplete"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full"
        autoComplete="new-password"
        onKeyDown={(e) => {
          // Prevent form submission on Enter when selecting from dropdown
          if (e.key === 'Enter' && autocompleteRef.current) {
            const predictions = document.querySelector('.pac-container');
            if (predictions && predictions.children.length > 0) {
              e.preventDefault();
            }
          }
        }}
      />
      {!isLoaded && (
        <p className="text-xs text-muted-foreground">Loading address autocomplete...</p>
      )}
    </div>
  );
}
