import { transform } from "lodash";

/**
 * Generate the sheet configuration for the importer
 * 
 * @param itemColumns Optional columns for line items
 * @returns Sheet configuration for the importer
 */
export const getImporterSheets = (itemColumns: any[] = []) => {
  const sheets = [
    {
      id: 'logistics_manifest',
      label: 'Logistics Manifest',
      columns: [
        {
          label: 'Fulfilment type',
          suggestedMappingKeywords: ['fulfilment type'],
          id: 'fulfilment_type',
          type: 'enum' as const,
          typeArguments: {
            values: [
              { label: 'Delivery', value: 'delivery' },
              { label: 'Pickup', value: 'pickup' }
            ]
          },
          validators: [{ validate: 'required' }]
        },
        {
          label: 'Sender name',
          suggestedMappingKeywords: ['sender'],
          id: 'sender_name',
          type: 'string' as const,
          transformers: [{ transformer: 'strip' }],
          validators: [{ validate: 'required' }]
        },
        {
          label: 'Recipient company',
          suggestedMappingKeywords: ['company'],
          id: 'recipient_company',
          type: 'string' as const,
          transformers: [{ transformer: 'strip' }]
        },
        {
          label: 'Recipient name',
          suggestedMappingKeywords: ['recipient', 'name'],
          id: 'recipient_name',
          type: 'string' as const,
          transformers: [{ transformer: 'strip' }],
          validators: [{ validate: 'required' }]
        },
        {
          label: 'Recipient email',
          suggestedMappingKeywords: ['recipient', 'email'],
          id: 'recipient_email',
          type: 'string' as const,
          transformers: [{ transformer: 'strip' }],
          validators: [
            {
              validate: 'regex_matches',
              regex:
                /^$|^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
              error: 'This email is not valid'
            }
          ]
        },
        {
          label: 'Recipient contact number',
          suggestedMappingKeywords: ['recipient contact number'],
          id: 'recipient_contact_number',
          type: 'string' as const,
          transformers: [
            // If phone number is 8 digits, add "65" prefix
            {
              transformer: 'custom',
              key: 'phoneNumberTransformer',
              transformFn: (value: any) =>
                value && value.length === 8 ? `65${value}` : value
            },
            // Custom transformer to remove all non-digit characters globally
            {
              transformer: 'custom',
              key: 'phoneNumberStripper',
              transformFn: (value: any) => value.replace(/\D/g, '')
            }
          ],
          validators: [
            { validate: 'required' },
            {
              validate: 'regex_matches',
              regex:
                // Singapore phone number (10 characters including "65" prefix, without "+"). First 2 characters are "65", followed by 8 digits
                /^65\d{8}$/,
              error: 'This contact number is not valid'
            }
          ]
        },
        {
          label: 'Delivery date',
          suggestedMappingKeywords: ['delivery date'],
          id: 'serving_date',
          type: 'string' as const,
          validators: [
            { validate: 'required' },
            {
              validate: 'regex_matches',
              regex: /^\d{4}-\d{2}-\d{2}$/,
              error: 'Please use the format YYYY-MM-DD'
            }
          ]
        },
        {
          label: 'Delivery timeslot',
          suggestedMappingKeywords: ['timeslot'],
          id: 'delivery_timeslot',
          type: 'enum' as const,
          typeArguments: {
            values: [
              { label: 'Morning', value: 'morning' },
              { label: 'Afternoon', value: 'afternoon' }
            ]
          },
          validators: [{ validate: 'required' }]
        },
        {
          label: 'Delivery address line1',
          suggestedMappingKeywords: ['delivery address line1'],
          id: 'address_line1',
          type: 'string' as const,
          transformers: [{ transformer: 'strip' }],
          validators: [{ validate: 'required' }]
        },
        {
          label: 'Delivery address line2',
          suggestedMappingKeywords: ['delivery address line2'],
          id: 'address_line2',
          type: 'string' as const
        },
        {
          label: 'Delivery postal code',
          suggestedMappingKeywords: ['delivery postal code'],
          id: 'postal_code',
          type: 'string' as const,
          transformers: [
            {
              transformer: 'custom',
              key: 'postalCodeTransformer',
              transformFn: (value: any) =>
                value ? value.toString().padStart(6, '0') : ''
            },
            { transformer: 'strip' }
          ],
          validators: [
            { validate: 'required' },
            {
              validate: 'regex_matches',
              regex: /^\d{6}$/,
              error: 'This postal code is not valid'
            }
          ]
        },
        {
          label: 'Notes',
          suggestedMappingKeywords: ['notes'],
          id: 'notes',
          type: 'string' as const
        }
      ]
    }
  ];

  // Add line item columns if provided
  if (itemColumns.length > 0) {
    const safeItemColumns = itemColumns.map((column) => ({
      ...column,
      // Further ensure label and suggestedMappingKeywords are strings
      label: String(column.label || ''),
      suggestedMappingKeywords: Array.isArray(
        column.suggestedMappingKeywords
      )
        ? column.suggestedMappingKeywords.map((keyword: any) =>
            String(keyword || '')
          )
        : [String(column.id || '')],
      type: 'number' as const,
      validators: [
        {
          validate: 'is_integer',
          error: 'Please enter a valid number'
        }
      ],
      transformers: [
        { transformer: 'strip' },
        { transformer: 'custom',
          key: 'defaultToZero',
          transformFn: (value: any) => {
            if (typeof value === 'string' && value.trim() === '') {
              return 0;
            }
            return value;
          }
        },
        {
          transformer: 'custom',
          key: 'transformToNumber',
          transformFn: (value: any) => {
            if (typeof value === 'number') {
              return value;
            }
            if (typeof value === 'string') {
              return parseInt(value);
            }
            return value;
          }
        }
      ]
    }));
    
    sheets[0].columns.push(...safeItemColumns);
  }

  return sheets;
}; 