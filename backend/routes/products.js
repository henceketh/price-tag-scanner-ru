import express from 'express';
import Product from '../models/Product.js';
import { auth, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Получить список продуктов
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Поиск по названию
 *       - in: query
 *         name: barcode
 *         schema:
 *           type: string
 *         description: Фильтр по штрих-коду
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *         description: Фильтр по бренду
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Минимальная цена
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Максимальная цена
 *       - in: query
 *         name: hasPromo
 *         schema:
 *           type: boolean
 *         description: Только с акциями
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Номер страницы
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Количество на странице
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: '-updatedAt'
 *         description: Сортировка
 *     responses:
 *       200:
 *         description: Список продуктов
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       500:
 *         description: Ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      search,
      barcode,
      brand,
      minPrice,
      maxPrice,
      hasPromo,
      page = 1,
      limit = 20,
      sort = '-updatedAt'
    } = req.query;

    const query = {};

    
    if (search) {
      query.$text = { $search: search };
    }

    
    if (barcode) {
      query.barcode = barcode;
    }

    
    if (brand) {
      query.brand = new RegExp(brand, 'i');
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let products = await Product.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    
    if (minPrice || maxPrice) {
      products = products.filter(p => {
        const current = p.getCurrentPrice();
        if (!current) return false;
        if (minPrice && current.price < parseFloat(minPrice)) return false;
        if (maxPrice && current.price > parseFloat(maxPrice)) return false;
        return true;
      });
    }

    
    if (hasPromo === 'true') {
      products = products.filter(p => {
        const current = p.getCurrentPrice();
        return current?.isPromo;
      });
    }

    const total = await Product.countDocuments(query);

    
    const enrichedProducts = products.map(p => {
      const obj = p.toObject();
      obj.currentPrice = p.getCurrentPrice();
      obj.minPrice = p.getMinPrice();
      obj.maxPrice = p.getMaxPrice();
      obj.avgPrice = p.getAvgPrice();
      obj.priceCount = p.priceHistory.length;
      return obj;
    });

    res.json({
      items: enrichedProducts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Products error:', error);
    res.status(500).json({ error: 'Ошибка получения продуктов' });
  }
});

/**
 * @swagger
 * /api/products/barcode/{barcode}:
 *   get:
 *     summary: Найти продукт по штрих-коду
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: barcode
 *         required: true
 *         schema:
 *           type: string
 *         description: Штрих-код продукта
 *     responses:
 *       200:
 *         description: Данные продукта
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Продукт не найден
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/barcode/:barcode', async (req, res) => {
  try {
    const product = await Product.findOne({ barcode: req.params.barcode });

    if (!product) {
      return res.status(404).json({ error: 'Продукт не найден' });
    }

    const obj = product.toObject();
    obj.currentPrice = product.getCurrentPrice();
    obj.minPrice = product.getMinPrice();
    obj.maxPrice = product.getMaxPrice();
    obj.avgPrice = product.getAvgPrice();
    obj.priceCount = product.priceHistory.length;

    res.json(obj);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Ошибка получения продукта' });
  }
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Получить продукт по ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID продукта
 *     responses:
 *       200:
 *         description: Данные продукта
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Продукт не найден
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ error: 'Продукт не найден' });
    }

    const obj = product.toObject();
    obj.currentPrice = product.getCurrentPrice();
    obj.minPrice = product.getMinPrice();
    obj.maxPrice = product.getMaxPrice();
    obj.avgPrice = product.getAvgPrice();
    obj.priceCount = product.priceHistory.length;

    res.json(obj);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Ошибка получения продукта' });
  }
});

/**
 * @swagger
 * /api/products/{id}/price-history:
 *   get:
 *     summary: Получить историю цен продукта
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID продукта
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Дата начала
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Дата окончания
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Максимум записей
 *     responses:
 *       200:
 *         description: История цен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 productId:
 *                   type: string
 *                 productName:
 *                   type: string
 *                 barcode:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date-time
 *                       price:
 *                         type: number
 *                       originalPrice:
 *                         type: number
 *                       isPromo:
 *                         type: boolean
 *                 stats:
 *                   type: object
 *                   properties:
 *                     min:
 *                       type: number
 *                     max:
 *                       type: number
 *                     avg:
 *                       type: number
 *                     count:
 *                       type: integer
 *       404:
 *         description: Продукт не найден
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id/price-history', async (req, res) => {
  try {
    const { startDate, endDate, limit = 100 } = req.query;

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ error: 'Продукт не найден' });
    }

    let history = product.priceHistory;

    
    if (startDate) {
      history = history.filter(h => h.scannedAt >= new Date(startDate));
    }
    if (endDate) {
      history = history.filter(h => h.scannedAt <= new Date(endDate));
    }

    
    history = history.slice(-parseInt(limit));

    
    const chartData = history.map(h => ({
      date: h.scannedAt,
      price: h.price,
      originalPrice: h.originalPrice,
      isPromo: h.isPromo,
      store: h.store
    }));

    res.json({
      productId: product._id,
      productName: product.name,
      barcode: product.barcode,
      data: chartData,
      stats: {
        min: product.getMinPrice(),
        max: product.getMaxPrice(),
        avg: product.getAvgPrice(),
        count: product.priceHistory.length
      }
    });
  } catch (error) {
    console.error('Price history error:', error);
    res.status(500).json({ error: 'Ошибка получения истории цен' });
  }
});

/**
 * @swagger
 * /api/products/compare:
 *   post:
 *     summary: Сравнить несколько продуктов
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Массив ID продуктов
 *               barcodes:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Массив штрих-кодов
 *     responses:
 *       200:
 *         description: Данные для сравнения
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   barcode:
 *                     type: string
 *                   brand:
 *                     type: string
 *                   currentPrice:
 *                     type: object
 *                   minPrice:
 *                     type: number
 *                   maxPrice:
 *                     type: number
 *                   avgPrice:
 *                     type: number
 *                   priceHistory:
 *                     type: array
 *       500:
 *         description: Ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/compare', async (req, res) => {
  try {
    const { productIds, barcodes } = req.body;

    let products = [];

    if (productIds?.length) {
      products = await Product.find({ _id: { $in: productIds } });
    } else if (barcodes?.length) {
      products = await Product.find({ barcode: { $in: barcodes } });
    }

    const comparison = products.map(p => ({
      id: p._id,
      name: p.name,
      barcode: p.barcode,
      brand: p.brand,
      currentPrice: p.getCurrentPrice(),
      minPrice: p.getMinPrice(),
      maxPrice: p.getMaxPrice(),
      avgPrice: p.getAvgPrice(),
      priceHistory: p.priceHistory.slice(-30) 
    }));

    res.json(comparison);
  } catch (error) {
    console.error('Compare error:', error);
    res.status(500).json({ error: 'Ошибка сравнения' });
  }
});

export default router;
