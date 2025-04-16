import { renderImporter } from 'react-importer/peer'
import 'react-importer/peer/index.css'
import { type FC, useEffect, useRef } from 'react'
import { Retool } from '@tryretool/custom-component-support'

// Import from extracted modules
import { ParsedDataItem, GeocoderResponse } from './types'
import {
  bulkGeocode,
  formatAddress,
  enrichDataWithGeocoding
} from './geocodingService'
import { truncate, sanitizeDataItem } from './utils'
import { getImporterSheets } from './importerConfig'

export const ImporterComponent: FC = () => {
  // Initialize component and set default settings
  const containerRef = useRef<HTMLDivElement>(null)
  Retool.useComponentSettings({ defaultHeight: 300, defaultWidth: 150 })

  // Retool state hooks
  const [lineItems, setlineItems] = Retool.useStateArray({
    name: 'lineItems',
    description: 'Line items for validation',
    inspector: 'text'
  })

  const [result, setResult] = Retool.useStateArray({
    name: 'result',
    description: 'Parsed data from the import',
    inspector: 'hidden'
  })

  const [parsedData, setParsedData] = Retool.useStateArray({
    name: 'parsedData',
    description: 'Parsed data from the import',
    inspector: 'hidden'
  })

  const [sheetData, setSheetData] = Retool.useStateArray({
    name: 'sheetData',
    description: 'Data from the sheet',
    inspector: 'hidden'
  })

  const [validationErrors, setValidationErrors] = Retool.useStateArray({
    name: 'validationErrors',
    description: 'Current validation errors',
    inspector: 'hidden'
  })

  const [columnMappings, setColumnMappings] = Retool.useStateArray({
    name: 'columnMappings',
    description: 'Current column mappings',
    inspector: 'hidden'
  })

  const [importMode, setImportMode] = Retool.useStateString({
    name: 'mode',
    description: 'Current import mode',
    inspector: 'hidden'
  })

  const [geocodingResults, setGeocodingResults] = Retool.useStateArray({
    name: 'geocodingResults',
    description: 'Results from address geocoding',
    inspector: 'hidden'
  })

  const [apiKey, setApiKey] = Retool.useStateString({
    name: 'apiKey',
    description: 'API key for Atlas Geocoder Service',
    inspector: 'text'
  })

  // Event callbacks
  const uploadSuccessful = Retool.useEventCallback({
    name: 'Upload successful'
  })

  // Generate item columns for the importer
  const itemColumns = Array.isArray(lineItems)
    ? lineItems
        .filter(
          (item): item is { id: string | number; name: string } =>
            !!item &&
            typeof item === 'object' &&
            'id' in item &&
            'name' in item &&
            typeof item.name === 'string'
        )
        .map((item) => {
          // Create a safe string for the label
          const safeId = typeof item.id === 'undefined' ? '' : String(item.id)
          const safeName =
            typeof item.name === 'string' ? item.name : String(item.name || '')
          const label = `[#${safeId}] ${safeName}`

          return {
            label: truncate(label, 31),
            suggestedMappingKeywords: [`[#${safeId}]`],
            id: String(item.id),
            type: 'number' as const,
            validators: [{ validate: 'is_integer' as const }]
          }
        })
    : []

  /**
   * Process geocoding for the addresses in parsed data
   *
   * @param parsedData Data with address information
   * @param apiKey API key for geocoding service
   * @param onProgress Progress callback
   * @returns Array of geocoding results
   */
  const processGeocoding = async (
    parsedData: ParsedDataItem[],
    apiKey: string,
    onProgress: (percent: number) => void
  ): Promise<GeocoderResponse[]> => {
    const allResults: GeocoderResponse[] = []

    try {
      console.log('processGeocoding called with:', {
        dataLength: parsedData.length,
        apiKeyProvided: !!apiKey,
        apiKeyLength: apiKey?.length
      })

      // Extract address strings from parsed data
      const addresses = parsedData
        .map((item: ParsedDataItem) => {
          const line1 = item?.address_line1 as string
          const postalCode = item?.postal_code as string

          console.log('Formatting address with:', { line1, postalCode })

          const formattedAddress = formatAddress(line1, postalCode)
          console.log('Formatted address:', formattedAddress)
          return formattedAddress
        })
        .filter((address: string) => address.length > 0)

      console.log('Extracted addresses:', addresses)
      if (addresses.length === 0) {
        console.warn('No valid addresses found in parsed data')
        return []
      }

      // Start geocoding process
      onProgress(50)
      console.log(`Starting geocoding for ${addresses.length} addresses...`)

      // Process in smaller batches if there are many addresses
      const batchSize = 100
      const totalBatches = Math.ceil(addresses.length / batchSize)
      let processedBatches = 0

      for (let i = 0; i < addresses.length; i += batchSize) {
        const batch = addresses.slice(i, i + batchSize)
        console.log(
          `Sending batch ${processedBatches + 1} for geocoding:`,
          batch
        )

        try {
          const response = await bulkGeocode(batch, apiKey)
          console.log('Geocoding response:', response)

          const batchResults = response.results

          if (Array.isArray(batchResults)) {
            console.log(`Received ${batchResults.length} results for batch`)
            allResults.push(...batchResults)
          } else {
            console.error('Unexpected geocoding response format:', batchResults)
          }
        } catch (batchError) {
          console.error(
            `Error geocoding batch ${processedBatches + 1}:`,
            batchError
          )
        }

        // Update progress proportionally
        processedBatches++
        const progressPercent =
          50 + Math.floor((processedBatches / totalBatches) * 45)
        onProgress(progressPercent)
        console.log(
          `Geocoded batch ${processedBatches}/${totalBatches} (${progressPercent}%)`
        )
      }

      console.log(
        `Geocoding complete: processed ${allResults.length} addresses, results:`,
        allResults
      )
    } catch (error) {
      console.error('Error during geocoding process:', error)
    }

    return allResults
  }

  // Initialize the importer component
  useEffect(() => {
    if (containerRef.current) {
      // Configure the importer with our sheets
      const sheets = getImporterSheets(itemColumns)

      renderImporter(containerRef.current, {
        preventUploadOnValidationErrors: true,
        allowManualDataEntry: true,
        sheets: sheets as any, // Type assertion to bypass complex type errors

        onComplete: async (data, onProgress) => {
          // const parsedData = data?.parsedFile?.data || []
          // setParsedData(parsedData)

          const sheetData = Array.isArray(data?.sheetData?.[0]?.rows)
            ? data?.sheetData?.[0]?.rows.map(sanitizeDataItem)
            : []
          setSheetData(JSON.parse(JSON.stringify(sheetData)))

          console.log('Sheet data:', sheetData)

          // Process geocoding if API key is provided
          let geocodingData: GeocoderResponse[] = []
          console.log('Before geocoding - API key status:', {
            apiKey: apiKey || '[not set]',
            length: apiKey?.length,
            sheetDataLength: sheetData.length
          })

          if (apiKey && sheetData.length > 0) {
            console.log(
              'Starting geocoding process with valid API key and sheet data'
            )
            try {
              geocodingData = await processGeocoding(
                sheetData,
                apiKey,
                onProgress
              )
              console.log(
                'Geocoding process completed with results:',
                geocodingData
              )
              setGeocodingResults(geocodingData as any[])
            } catch (geocodeError) {
              console.error('Error during processGeocoding call:', geocodeError)
            }
          } else {
            console.warn(
              'Skipping geocoding - missing API key or empty sheet data'
            )
          }

          // Enrich parsed data with geocoding results
          console.log('Before enriching - sheetData:', sheetData)
          console.log('Before enriching - geocodingData:', geocodingData)

          let enrichedData
          try {
            enrichedData = enrichDataWithGeocoding(sheetData, geocodingData)
          } catch (error) {
            console.error('Error in enrichDataWithGeocoding:', error)
            // Fallback to original data if enrichment fails
            enrichedData = sheetData.map((item) => ({ ...item }))
          }

          console.log('After enriching - enrichedData:', enrichedData)

          console.log('Enriched data:', enrichedData)

          setResult(enrichedData)

          // Store validation errors and column mappings
          setValidationErrors(
            (data?.validationErrors || []).map((error) => ({
              sheetId: error.sheetId || '',
              rowIndex: error.rowIndex || 0,
              columnId: error.columnId || '',
              message: error.message || ''
            }))
          )

          setColumnMappings(
            (data?.columnMappings || []).map((mapping) => ({
              csvColumnName: mapping.csvColumnName || '',
              sheetId: mapping.sheetId || '',
              sheetColumnId: mapping.sheetColumnId || ''
            }))
          )

          setImportMode(data?.mode || '')
          uploadSuccessful()
          onProgress(100)
        }
      })
    }
  }, [containerRef.current, itemColumns, apiKey, uploadSuccessful])

  // Render the importer container
  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        overflow: 'auto',
        backgroundColor: '#ffffff',
        fontFamily: 'Poppins, sans-serif',
        fontSize: '12px'
      }}
    >
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap"
        rel="stylesheet"
      />
    </div>
  )
}
