import ExifParser from 'exif-parser';

export interface GPSData {
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  timestamp: Date | null;
}

/**
 * Extract GPS EXIF data from image buffer
 * @param buffer - Image file buffer
 * @returns GPS coordinates and metadata
 */
export function extractGPSFromImage(buffer: Buffer): GPSData {
  try {
    const parser = ExifParser.create(buffer);
    const result = parser.parse();
    
    const gpsData: GPSData = {
      latitude: null,
      longitude: null,
      altitude: null,
      timestamp: null,
    };

    // Extract GPS coordinates
    if (result.tags?.GPSLatitude && result.tags?.GPSLongitude) {
      gpsData.latitude = result.tags.GPSLatitude;
      gpsData.longitude = result.tags.GPSLongitude;
    }

    // Extract altitude
    if (result.tags?.GPSAltitude) {
      gpsData.altitude = result.tags.GPSAltitude;
    }

    // Extract timestamp from GPS or EXIF
    if (result.tags?.GPSDateStamp || result.tags?.DateTimeOriginal) {
      const timestamp = result.tags.GPSDateStamp || result.tags.DateTimeOriginal;
      if (timestamp) {
        gpsData.timestamp = new Date(timestamp * 1000); // Convert Unix timestamp to Date
      }
    }

    return gpsData;
  } catch (error) {
    console.error('[GPS Extractor] Failed to extract GPS data:', error);
    return {
      latitude: null,
      longitude: null,
      altitude: null,
      timestamp: null,
    };
  }
}

/**
 * Check if image buffer contains GPS data
 * @param buffer - Image file buffer
 * @returns true if GPS data exists
 */
export function hasGPSData(buffer: Buffer): boolean {
  try {
    const parser = ExifParser.create(buffer);
    const result = parser.parse();
    return !!(result.tags?.GPSLatitude && result.tags?.GPSLongitude);
  } catch (error) {
    return false;
  }
}
