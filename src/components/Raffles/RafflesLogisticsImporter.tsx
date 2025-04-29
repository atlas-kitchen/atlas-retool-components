import { renderImporter, type SheetState } from 'react-importer/peer'
import 'react-importer/peer/index.css'
import '../../index.css'
import { type FC, useEffect, useRef } from 'react'
import { Retool } from '@tryretool/custom-component-support'

// Import from extracted modules
import { sanitizeDataItem } from './utils'
import { getImporterSheets } from './importerConfig'

interface MappedData {
  rows: Record<string, string | number>[]
  [key: string]: any
}

/**
 * RafflesLogisticsImporter Component
 *
 * This component is responsible for rendering the logistics importer.
 * It uses the Retool state hooks to manage line items and results.
 *
 * @returns {JSX.Element} The rendered importer component
 */
export const RafflesLogisticsImporter: FC = () => {
  // Initialize component and set default settings
  const containerRef = useRef<HTMLDivElement>(null)
  Retool.useComponentSettings({ defaultHeight: 300, defaultWidth: 200 })

  // Retool state hooks
  const [lineItems] = Retool.useStateArray({
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

  // Function to generate item columns for the importer
  const generateItemColumns = (items: any[]) => {
    return items
      .filter(
        (item): item is { id: string | number; name: string } =>
          !!item &&
          typeof item === 'object' &&
          'id' in item &&
          'name' in item &&
          typeof item.name === 'string'
      )
      .map((item) => {
        const safeId = typeof item.id === 'undefined' ? '' : String(item.id)
        const safeName =
          typeof item.name === 'string' ? item.name : String(item.name || '')
        const label = `[#${safeId}] ${safeName}`

        return {
          label: label,
          suggestedMappingKeywords: [label],
          id: String(item.id),
          type: 'number' as const,
          validators: [{ validate: 'is_integer' as const }]
        }
      })
  }

  // Generate item columns for the importer
  const itemColumns = Array.isArray(lineItems)
    ? generateItemColumns(lineItems)
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

        onDataColumnsMapped: (data: SheetState[]) => {
          // Filter out rows where none of the itemColumns have non-zero values
          return data.map((sheet) => ({
            ...sheet,
            rows: sheet.rows.filter((row) => {
              // Check if any itemColumn has a non-zero value
              return itemColumns.some((col) => {
                const value = Number(row[col.id])
                return !isNaN(value) && value !== 0
              })
            })
          }))
        },

        onComplete: async (data, onProgress) => {
          // Filter the sheet data to remove rows with no non-zero values
          const sheetData = Array.isArray(data?.sheetData?.[0]?.rows)
            ? data?.sheetData?.[0]?.rows.map(sanitizeDataItem).filter((row) =>
                itemColumns.some((col) => {
                  const value = Number(row[col.id])
                  return !isNaN(value) && value !== 0
                })
              )
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
    <div ref={containerRef} className="importer-container">
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
