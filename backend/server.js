import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { Ollama } from 'ollama';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import sharp from 'sharp';
import swaggerUi from 'swagger-ui-express';

import { connectDB } from './db.js';
import { optionalAuth } from './middleware/auth.js';
import { parseOcrResult } from './utils/parser.js';
import authRoutes from './routes/auth.js';
import historyRoutes from './routes/history.js';
import productsRoutes from './routes/products.js';
import ScanHistory from './models/ScanHistory.js';
import Product from './models/Product.js';
import { swaggerSpec } from './swagger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

const ollama = new Ollama({
  host: process.env.OLLAMA_HOST
});

connectDB();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/products', productsRoutes);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

app.get('/api/models', async (req, res) => {
  try {
    const models = await ollama.list();
    const visionModelPatterns = [
      'qwen2.5vl',
      'qwen2-vl',
      'llava:34b',
      'llava-llama3',
      'minicpm-v',
      'internvl2'
    ];
    const visionModels = models.models.filter(m =>
      visionModelPatterns.some(pattern => m.name.includes(pattern))
    );
    res.json({ models: visionModels });
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

app.post('/api/scan', optionalAuth, upload.single('image'), async (req, res) => {
  const startTime = Date.now();

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    console.log('Request body:', req.body);
    const enhanceImage = req.body.enhanceImage === 'true' || req.body.enhanceImage === true;

    let processedBuffer = req.file.buffer;
    let enhancedImageBase64 = null;

    if (enhanceImage) {
      console.log('Enhancing image quality before OCR...');
      try {
        processedBuffer = await sharp(req.file.buffer)
          .normalize()
          .sharpen({ sigma: 1.5, m1: 1.5, m2: 0.7 })
          .median(3)
          .modulate({ brightness: 1.05, saturation: 1.1 })
          .gamma(1.1)
          .png({ quality: 100 })
          .toBuffer();
        enhancedImageBase64 = `data:image/png;base64,${processedBuffer.toString('base64')}`;
        console.log('Image enhancement complete');
      } catch (enhanceError) {
        console.log('Image enhancement failed, using original:', enhanceError.message);
        processedBuffer = req.file.buffer;
      }
    }

    const imageBase64 = processedBuffer.toString('base64');

    let thumbnailBase64 = null;
    try {
      const thumbnail = await sharp(req.file.buffer)
        .resize(200, 200, { fit: 'inside' })
        .jpeg({ quality: 70 })
        .toBuffer();
      thumbnailBase64 = thumbnail.toString('base64');
    } catch (e) {
      console.log('Thumbnail creation failed:', e.message);
    }

    console.log(`Image mimetype: ${req.file.mimetype}`);
    console.log(`Base64 length: ${imageBase64.length}`);
    console.log(`Image enhanced: ${enhanceImage}`);

    const model = 'qwen2.5vl:72b'

    const prompt = `Посмотри на предоставленное изображение ценника/этикетки товара. Ты — система оптического распознавания текста (OCR). Твоя задача — извлечь ВСЕ текстовые данные с этого ценника/этикетки товара.

Внимательно проанализируй изображение и извлеки:
1. Название товара/продукта
2. Цену (все цены, если их несколько: обычная, акционная, цена за единицу)
3. Единицы измерения (кг, шт, л и т.д.)
4. Штрих-код (если виден)
5. Производителя/бренд
6. Состав/ингредиенты (если указаны)
7. Срок годности (если указан)
8. Любую другую текстовую информацию

Формат ответа:
- Выведи данные структурированно
- Используй маркированный список
- Цены выдели отдельно
- Если какой-то текст не читается чётко, укажи это

Отвечай ТОЛЬКО на русском языке.`;

    console.log(`Processing image with model: ${model}`);
    console.log(`Image size: ${req.file.size} bytes`);

    const response = await ollama.generate({
      model: model,
      prompt: prompt,
      images: [imageBase64],
      options: {
        temperature: 0.1,
      }
    });

    const extractedText = response.response;
    const processingTime = Date.now() - startTime;

    console.log('Extraction complete');

    const parsedData = parseOcrResult(extractedText);

    let productName = 'Неизвестный товар';
    const nameMatch = extractedText.match(/(?:название|товар|продукт)[:\s]*([^\n]+)/i);
    if (nameMatch) {
      productName = nameMatch[1].trim();
    }

    let productId = null;
    if (parsedData.barcode) {
      let product = await Product.findOne({ barcode: parsedData.barcode });

      if (!product) {
        product = new Product({
          barcode: parsedData.barcode,
          name: productName,
          unit: parsedData.unit
        });
      }

      if (parsedData.price) {
        product.priceHistory.push({
          price: parsedData.price,
          originalPrice: parsedData.originalPrice,
          currency: parsedData.currency,
          isPromo: parsedData.isPromo,
          userId: req.user?._id,
          scannedAt: new Date()
        });
      }

      await product.save();
      productId = product._id;
    }

    const scanRecord = new ScanHistory({
      userId: req.user?._id,
      imageData: thumbnailBase64 ? `data:image/jpeg;base64,${thumbnailBase64}` : null,
      originalText: extractedText,
      extractedData: {
        productName,
        price: parsedData.price,
        originalPrice: parsedData.originalPrice,
        pricePerUnit: parsedData.pricePerUnit,
        unit: parsedData.unit,
        currency: parsedData.currency,
        barcode: parsedData.barcode,
        isPromo: parsedData.isPromo,
        promoType: parsedData.promoType,
        discountPercent: parsedData.discountPercent,
        rawText: extractedText
      },
      productId,
      model,
      processingTime
    });

    await scanRecord.save();

    res.json({
      id: scanRecord._id,
      text: extractedText,
      parsed: {
        ...parsedData,
        productName
      },
      productId,
      model,
      processingTime,
      imageEnhanced: enhanceImage,
      enhancedImageData: enhancedImageBase64,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Scan error:', error);

    if (error.message?.includes('model')) {
      return res.status(400).json({
        error: 'Vision model not found.'
      });
    }

    res.status(500).json({
      error: 'Failed to process image',
      details: error.message
    });
  }
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
