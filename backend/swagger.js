import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Price Tag Scanner API',
      version: '1.0.0',
      description: 'API для распознавания ценников с использованием OCR и отслеживания цен',
      contact: {
        name: 'API Support'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            login: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        ParsedData: {
          type: 'object',
          properties: {
            price: { type: 'number' },
            originalPrice: { type: 'number' },
            currency: { type: 'string' },
            currencySymbol: { type: 'string' },
            isPromo: { type: 'boolean' },
            promoType: { type: 'string' },
            discountPercent: { type: 'number' },
            barcode: { type: 'string' },
            unit: { type: 'string' },
            productName: { type: 'string' }
          }
        },
        ScanResult: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            user: { type: 'string' },
            imageUrl: { type: 'string' },
            thumbnailUrl: { type: 'string' },
            ocrText: { type: 'string' },
            parsedData: { $ref: '#/components/schemas/ParsedData' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Product: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            barcode: { type: 'string' },
            name: { type: 'string' },
            priceHistory: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  price: { type: 'number' },
                  originalPrice: { type: 'number' },
                  currency: { type: 'string' },
                  isPromo: { type: 'boolean' },
                  scannedAt: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  },
  apis: ['./routes/*.js', './server.js']
};

export const swaggerSpec = swaggerJsdoc(options);
