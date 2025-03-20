// Define a type for parsed data items
export interface ParsedDataItem {
  [key: string]: string | number | boolean | null | undefined
}

// Interface for geocoder service response
export interface GeocoderResponse {
  full_address: string
  address: string
  postal_code: string
  country: string
  longitude: number | null
  latitude: number | null
  [key: string]: string | number | boolean | null | undefined // Add index signature for SerializableObject compatibility
}

// Validation error interface
export interface ValidationError {
  sheetId: string
  rowIndex: number
  columnId: string
  message: string
}

// Column mapping interface
export interface ColumnMapping {
  csvColumnName: string
  sheetId: string
  sheetColumnId: string
} 