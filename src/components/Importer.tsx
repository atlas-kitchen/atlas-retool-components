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
          (item): item is { item_id: string | number; name: string } =>
            !!item &&
            typeof item === 'object' &&
            'item_id' in item &&
            'name' in item &&
            typeof item.name === 'string'
        )
        .map((item) => {
          // Create a safe string for the label
          const safeId =
            typeof item.item_id === 'undefined' ? '' : String(item.item_id)
          const safeName =
            typeof item.name === 'string' ? item.name : String(item.name || '')
          const label = `[#${safeId}] ${safeName}`

          return {
            label: truncate(label, 30),
            suggestedMappingKeywords: [truncate(label, 30)], // Simplified keywords
            id: String(item.item_id),
            type: 'number' as const,
            validators: [
              { validate: 'is_integer' as const },
              {
                validate: 'custom' as const,
                key: `quantityValidator_${safeId}`,
                validateFn: (value: number) =>
                  typeof value === 'number' ? value >= 0 : true
              }
            ]
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
      // Extract address strings from parsed data
      const addresses = parsedData
        .map((item: ParsedDataItem) =>
          formatAddress(
            item?.['Delivery address line1'] as string,
            item?.['Delivery address line2'] as string,
            item?.['Delivery postal code'] as string
          )
        )
        .filter((address: string) => address.length > 0)

      if (addresses.length === 0) return []

      // Start geocoding process
      onProgress(50)
      console.log(`Starting geocoding for ${addresses.length} addresses...`)

      // Process in smaller batches if there are many addresses
      const batchSize = 100
      const totalBatches = Math.ceil(addresses.length / batchSize)
      let processedBatches = 0

      for (let i = 0; i < addresses.length; i += batchSize) {
        const batch = addresses.slice(i, i + batchSize)
        const batchResults = await bulkGeocode(batch, apiKey).then(
          (data) => data.results
        )

        if (Array.isArray(batchResults)) {
          allResults.push(...batchResults)
        } else {
          console.error('Unexpected geocoding response format:', batchResults)
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
        `Geocoding complete: processed ${allResults.length} addresses`
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
          // Parse and sanitize the imported data
          const parsedData = Array.isArray(data?.parsedFile?.data)
            ? data.parsedFile.data.map(sanitizeDataItem)
            : []

          const transformedData = data?.sheetData?.[0]?.rows
          console.log('Transformed data:', transformedData)

          const combinedData = parsedData.map(
            (item: ParsedDataItem, index: number) => {
              const transformedItem = { ...item }

              if (transformedData) {
                transformedItem['Recipient contact number'] =
                  transformedData[index]?.recipient_contact_number
                transformedItem['Delivery postal code'] =
                  transformedData[index]?.postal_code
              }

              return transformedItem
            }
          )
          console.log('Combined data:', combinedData)

          // Process geocoding if API key is provided
          let geocodingData: GeocoderResponse[] = []
          if (apiKey && combinedData.length > 0) {
            geocodingData = await processGeocoding(
              parsedData,
              apiKey,
              onProgress
            )
            setGeocodingResults(geocodingData as any[])
          }

          // Enrich parsed data with geocoding results
          const enrichedData = enrichDataWithGeocoding(
            combinedData,
            geocodingData
          )

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
