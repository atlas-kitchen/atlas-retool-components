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
  console.log(`bulkGeocode called with ${addresses.length} addresses and API key: ${apiKey ? 'provided' : 'missing'}`)
  
  if (!addresses.length) {
    console.warn('No addresses provided to bulkGeocode')
    return { results: [] }
  }
  
  if (!apiKey) {
    console.error('API key is required for geocoding')
    return { results: [] }
  }
  
  try {
    console.log(`Sending request to ${GEOCODER_SERVICE_URL}`)
    console.log('Request body:', JSON.stringify(addresses))
    
    const response = await fetch(GEOCODER_SERVICE_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'X-API-KEY': apiKey 
      },
      body: JSON.stringify(addresses)
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Failed to read error response')
      console.error('Geocoding API error:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      })
      throw new Error(`Failed to geocode addresses: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('Geocoding API response:', data)
    return data
  } catch (error) {
    console.error('Error geocoding addresses:', error)
    if (error instanceof Error) {
      console.error('Error details:', error.message)
      if (error.stack) console.error('Error stack:', error.stack)
    }
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
  postalCode: string = ''
): string => {
  const parts = [
    addressLine1 || '',
    postalCode ? `Singapore ${postalCode}` : ''
  ].filter(part => part.trim().length > 0);
  
  return parts.join(' ').trim();
}

/**
 * Enhance parsed data with geocoding results
 * 
 * @param sheetData Sheet data
 * @param geocodingResults Geocoding results to merge
 * @returns Enhanced data with geocoding information
 */
export const enrichDataWithGeocoding = (
  sheetData: any[],
  geocodingResults: any[]
) => {
  console.log('enrichDataWithGeocoding called with:', {
    sheetDataLength: sheetData?.length || 0,
    geocodingResultsLength: geocodingResults?.length || 0,
    geocodingResultsValid: Array.isArray(geocodingResults)
  })
  
  if (!Array.isArray(sheetData) || sheetData.length === 0) {
    console.warn('No sheet data provided for enrichment')
    return []
  }
  
  if (!Array.isArray(geocodingResults) || geocodingResults.length === 0) {
    console.warn('No geocoding results provided, returning original data')
    return sheetData.map(item => ({ ...item }))
  }
  
  return sheetData.map((item, index) => {
    // Safely access geocoding result (if available)
    const geocodingResult = index < geocodingResults.length ? geocodingResults[index] : null;
    
    if (!geocodingResult) {
      console.log(`No geocoding result for item ${index}`)
      return { ...item }
    }
    
    console.log(`Enriching item ${index} with geocoding data:`, geocodingResult)
    
    return {
      ...item,
      'Full address': geocodingResult?.full_address || '',
      'Geocoded address': geocodingResult?.address || '',
      'Postal code': geocodingResult?.postal_code || '',
      'Country': geocodingResult?.country || '',
      'Longitude': geocodingResult?.longitude || null,
      'Latitude': geocodingResult?.latitude || null
    };
  });
} 