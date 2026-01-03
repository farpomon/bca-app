/**
 * Shared Google Maps script loader
 * Used by both Map component and AddressAutocomplete component
 */

const API_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
const FORGE_BASE_URL =
  import.meta.env.VITE_FRONTEND_FORGE_API_URL ||
  "https://forge.butterfly-effect.dev";
const MAPS_PROXY_URL = `${FORGE_BASE_URL}/v1/maps/proxy`;

let mapScriptPromise: Promise<void> | null = null;

export function loadGoogleMapsScript(): Promise<void> {
  // If already loaded, return immediately
  if (window.google?.maps) {
    return Promise.resolve();
  }
  
  // If currently loading, return the existing promise
  if (mapScriptPromise) {
    return mapScriptPromise;
  }
  
  // Start loading
  mapScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${MAPS_PROXY_URL}/maps/api/js?key=${API_KEY}&v=weekly&libraries=marker,places,geocoding,geometry`;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      resolve();
    };
    script.onerror = () => {
      console.error("Failed to load Google Maps script");
      mapScriptPromise = null; // Reset on error so it can be retried
      reject(new Error("Failed to load Google Maps script"));
    };
    document.head.appendChild(script);
  });
  
  return mapScriptPromise;
}
