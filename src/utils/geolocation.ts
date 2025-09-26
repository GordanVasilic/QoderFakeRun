/**
 * Geolocation utility service for detecting user's country
 * Uses ipapi.co for IP-based geolocation
 */

export interface GeolocationData {
  country_code: string;
  country_name: string;
  city?: string;
  region?: string;
}

export interface CountryDetectionResult {
  countryCode: string;
  countryName: string;
  success: boolean;
  error?: string;
}

// Cache for geolocation data to avoid repeated API calls
let cachedGeolocation: CountryDetectionResult | null = null;
let geolocationPromise: Promise<CountryDetectionResult> | null = null;

/**
 * Detects user's country based on their IP address
 * Uses ipapi.co free tier (1000 requests/month)
 */
export async function detectUserCountry(): Promise<CountryDetectionResult> {
  // Return cached result if available
  if (cachedGeolocation) {
    return cachedGeolocation;
  }

  // Return existing promise if already in progress
  if (geolocationPromise) {
    return geolocationPromise;
  }

  geolocationPromise = performGeolocationDetection();
  const result = await geolocationPromise;
  
  // Cache successful results
  if (result.success) {
    cachedGeolocation = result;
  }
  
  geolocationPromise = null;
  return result;
}

async function performGeolocationDetection(): Promise<CountryDetectionResult> {
  // List of geolocation APIs to try in order
  const geoApis = [
    {
      name: 'ipapi.co',
      url: 'https://ipapi.co/json',
      parser: (data: any) => ({
        countryCode: data.country_code?.toUpperCase(),
        countryName: data.country_name || data.country_code,
      })
    },
    {
      name: 'ip-api.com',
      url: 'https://ip-api.com/json/?fields=status,country,countryCode',
      parser: (data: any) => ({
        countryCode: data.countryCode?.toUpperCase(),
        countryName: data.country || data.countryCode,
      })
    },
    {
      name: 'ipinfo.io',
      url: 'https://ipinfo.io/json',
      parser: (data: any) => ({
        countryCode: data.country?.toUpperCase(),
        countryName: data.country,
      })
    }
  ];

  // Try each API in sequence
  for (const api of geoApis) {
    try {
      console.log(`Trying geolocation API: ${api.name}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(api.url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const parsed = api.parser(data);

      if (!parsed.countryCode) {
        throw new Error('No country code in response');
      }

      console.log(`Successfully detected country using ${api.name}:`, parsed.countryCode);
      return {
        countryCode: parsed.countryCode,
        countryName: parsed.countryName || parsed.countryCode,
        success: true,
      };
    } catch (error) {
      console.warn(`Failed to detect country using ${api.name}:`, error);
      // Continue to next API
    }
  }

  // If all APIs fail, try browser geolocation as last resort
  try {
    const browserResult = await tryBrowserGeolocation();
    if (browserResult) {
      return browserResult;
    }
  } catch (error) {
    console.warn('Browser geolocation also failed:', error);
  }

  // All methods failed, fallback to US
  console.warn('All geolocation methods failed, using default (US)');
  return {
    countryCode: 'US',
    countryName: 'United States',
    success: false,
    error: 'All geolocation services failed',
  };
}

/**
 * Try to use browser's geolocation API to get approximate country
 * This is less accurate but works offline
 */
async function tryBrowserGeolocation(): Promise<CountryDetectionResult | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    const timeout = setTimeout(() => {
      resolve(null);
    }, 3000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeout);
        // This is a very rough approximation based on coordinates
        const country = approximateCountryFromCoords(
          position.coords.latitude,
          position.coords.longitude
        );
        resolve(country);
      },
      () => {
        clearTimeout(timeout);
        resolve(null);
      },
      { timeout: 3000, enableHighAccuracy: false }
    );
  });
}

/**
 * Very rough country approximation based on coordinates
 * This is not accurate but provides a basic fallback
 */
function approximateCountryFromCoords(lat: number, lng: number): CountryDetectionResult {
  // Very basic geographic regions - this is just a fallback
  if (lat >= 49 && lat <= 83 && lng >= -141 && lng <= -52) {
    return { countryCode: 'CA', countryName: 'Canada', success: true };
  }
  if (lat >= 25 && lat <= 49 && lng >= -125 && lng <= -66) {
    return { countryCode: 'US', countryName: 'United States', success: true };
  }
  if (lat >= 50 && lat <= 60 && lng >= -8 && lng <= 2) {
    return { countryCode: 'GB', countryName: 'United Kingdom', success: true };
  }
  if (lat >= 47 && lat <= 55 && lng >= 6 && lng <= 15) {
    return { countryCode: 'DE', countryName: 'Germany', success: true };
  }
  
  // Default fallback
  return { countryCode: 'US', countryName: 'United States', success: false };
}

/**
 * Validates if a country code is supported in the payment system
 */
export function isCountrySupported(countryCode: string, supportedCountries: Array<{code: string, name: string}>): boolean {
  return supportedCountries.some(country => country.code === countryCode.toUpperCase());
}

/**
 * Gets the best matching country from supported list
 * Falls back to US if detected country is not supported
 */
export function getBestMatchingCountry(
  detectedCountryCode: string, 
  supportedCountries: Array<{code: string, name: string}>
): string {
  const upperCode = detectedCountryCode.toUpperCase();
  
  if (isCountrySupported(upperCode, supportedCountries)) {
    return upperCode;
  }
  
  // Fallback to US if detected country is not supported
  return 'US';
}

/**
 * Clears the cached geolocation data
 * Useful for testing or when user wants to refresh location
 */
export function clearGeolocationCache(): void {
  cachedGeolocation = null;
  geolocationPromise = null;
}