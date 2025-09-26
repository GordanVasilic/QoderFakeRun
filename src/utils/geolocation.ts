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
  try {
    // Use ipapi.co free service for geolocation
    const response = await fetch('https://ipapi.co/json/', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: GeolocationData = await response.json();

    if (!data.country_code) {
      throw new Error('No country code in response');
    }

    return {
      countryCode: data.country_code.toUpperCase(),
      countryName: data.country_name || data.country_code,
      success: true,
    };
  } catch (error) {
    console.warn('Failed to detect user country:', error);
    
    // Fallback to US as default
    return {
      countryCode: 'US',
      countryName: 'United States',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
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