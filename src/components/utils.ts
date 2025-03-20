import { ParsedDataItem } from './types';

/**
 * Truncate a string to a specific length and add ellipsis if needed
 * 
 * @param str String to truncate
 * @param length Maximum length
 * @param ellipsis Ellipsis string to append
 * @returns Truncated string
 */
export const truncate = (str: string, length: number, ellipsis = '...'): string => {
  if (!str || typeof str !== 'string') return '';
  
  // Check if the string is longer than the specified length
  if (str.length > length) {
    // Truncate the string and append the ellipsis
    return str.slice(0, length - ellipsis.length) + ellipsis;
  }
  
  return str; // Return the original string if no truncation is needed
};

/**
 * Sanitize and normalize data from imported file
 * 
 * @param item Raw data item
 * @returns Sanitized data item
 */
export const sanitizeDataItem = (item: any): ParsedDataItem => {
  const result: ParsedDataItem = {};
  
  for (const [key, value] of Object.entries(item)) {
    // Convert any non-string values that should be strings to strings
    if (
      typeof value !== 'string' &&
      (key.includes('address') ||
        key === 'postal_code' ||
        key === 'notes' ||
        key === 'sender_name' ||
        key === 'recipient_name' ||
        key === 'recipient_email' ||
        key === 'recipient_contact_number' ||
        key === 'recipient_company' ||
        key === 'serving_date' ||
        key === 'delivery_timeslot')
    ) {
      result[key] = value != null ? String(value) : '';
    } else if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null ||
      value === undefined
    ) {
      result[key] = value;
    } else {
      // Handle other types by converting to string
      result[key] = String(value);
    }
  }
  
  return result;
}; 