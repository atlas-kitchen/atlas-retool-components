import { renderImporter } from 'react-importer/peer'
import 'react-importer/peer/index.css'
import { type FC, useEffect, useRef } from 'react'
import { Retool } from '@tryretool/custom-component-support'

// Import from extracted modules
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
          setResult(JSON.parse(JSON.stringify(sheetData)))
          onProgress(100)
          uploadSuccessful()
        }
      })
    }
  }, [containerRef.current, itemColumns, uploadSuccessful])

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
