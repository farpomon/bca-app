import { useCallback, useRef, useState } from "react";

interface GeocodingResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

interface UseGeocodingReturn {
  geocode: (address: string) => Promise<GeocodingResult | null>;
  isGeocoding: boolean;
  error: string | null;
}

/**
 * Hook for geocoding addresses using Google Maps Geocoder
 * Must be used after Google Maps script is loaded
 */
export function useGeocoding(): UseGeocodingReturn {
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  const geocode = useCallback(async (address: string): Promise<GeocodingResult | null> => {
    if (!address.trim()) {
      return null;
    }

    // Initialize geocoder if not already done
    if (!geocoderRef.current && window.google?.maps) {
      geocoderRef.current = new google.maps.Geocoder();
    }

    if (!geocoderRef.current) {
      setError("Geocoder not available. Please wait for map to load.");
      return null;
    }

    setIsGeocoding(true);
    setError(null);

    try {
      const result = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
        geocoderRef.current!.geocode({ address }, (results, status) => {
          if (status === "OK" && results && results.length > 0) {
            resolve(results);
          } else if (status === "ZERO_RESULTS") {
            reject(new Error("No results found for this address"));
          } else {
            reject(new Error(`Geocoding failed: ${status}`));
          }
        });
      });

      const location = result[0].geometry.location;
      return {
        lat: location.lat(),
        lng: location.lng(),
        formattedAddress: result[0].formatted_address,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Geocoding failed";
      setError(errorMessage);
      return null;
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  return { geocode, isGeocoding, error };
}

/**
 * Build a full address string from components
 */
export function buildFullAddress(components: {
  streetNumber?: string;
  streetAddress?: string;
  unitNumber?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
}): string {
  const parts: string[] = [];

  // Street address
  if (components.streetNumber || components.streetAddress) {
    const street = [components.streetNumber, components.streetAddress]
      .filter(Boolean)
      .join(" ");
    if (street) parts.push(street);
  }

  // Unit
  if (components.unitNumber) {
    parts.push(components.unitNumber);
  }

  // City
  if (components.city) {
    parts.push(components.city);
  }

  // Province
  if (components.province) {
    parts.push(components.province);
  }

  // Postal code
  if (components.postalCode) {
    parts.push(components.postalCode);
  }

  // Country
  if (components.country) {
    parts.push(components.country);
  } else {
    parts.push("Canada"); // Default
  }

  return parts.join(", ");
}
