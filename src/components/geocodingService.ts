import { GeocoderResponse } from './types'

// Geocoder service URL
const GEOCODER_SERVICE_URL = 'https://geocoder-service.atlas.kitchen/'

/**
 * Geocode a batch of addresses using the Atlas Geocoder API
 * 
 * @param addresses Array of address strings to geocode
 * @param apiKey API key for authentication
 * @returns Promise with geocoding results
 */
export const bulkGeocode = async (addresses: Array<string>, apiKey: string) => {
  try {
    const response = await fetch(GEOCODER_SERVICE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
      body: JSON.stringify(addresses)
    })

    if (!response.ok) {
      console.error('Geocoding error:', response.status, response.statusText)
      throw new Error('Failed to geocode addresses')
    }

    return await response.json()
  } catch (error) {
    console.error('Error geocoding addresses:', error)
    return { results: [] }
  }
}

/**
 * Process address data to create a complete address string
 * 
 * @param addressLine1 Primary address line
 * @param addressLine2 Secondary address line (optional)
 * @param postalCode Postal code
 * @returns Formatted address string
 */
export const formatAddress = (
  addressLine1: string = '',
  addressLine2: string = '',
  postalCode: string = ''
): string => {
  const parts = [
    addressLine1 || '',
    addressLine2 || '',
    postalCode ? `Singapore ${postalCode}` : ''
  ].filter(part => part.trim().length > 0);
  
  return parts.join(' ').trim();
}

/**
 * Enhance parsed data with geocoding results
 * 
 * @param parsedData Original parsed data
 * @param geocodingResults Geocoding results to merge
 * @returns Enhanced data with geocoding information
 */
export const enrichDataWithGeocoding = (
  parsedData: any[],
  geocodingResults: any[]
) => {
  return parsedData.map((item, index) => {
    const geocodingResult = (
      Array.isArray(geocodingResults) &&
      geocodingResults[index] !== null
        ? geocodingResults[index]
        : {}
    ) as GeocoderResponse;
    
    return {
      ...item,
      'Full address': geocodingResult.full_address || '',
      'Geocoded address': geocodingResult.address || '',
      'Postal code': geocodingResult.postal_code || '',
      'Country': geocodingResult.country || '',
      'Longitude': geocodingResult.longitude || null,
      'Latitude': geocodingResult.latitude || null
    };
  });
} 