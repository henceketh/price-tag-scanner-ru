import express from 'express';
import ScanHistory from '../models/ScanHistory.js';
import { auth, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/history:
 *   get:
 *     summary: Получить историю сканирований
 *     tags: [History]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Поиск по тексту
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Дата начала фильтра
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Дата окончания фильтра
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
 *         name: isPromo
 *         schema:
 *           type: boolean
 *         description: Только акционные товары
 *       - in: query
 *         name: barcode
 *         schema:
 *           type: string
 *         description: Фильтр по штрих-коду
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
 *         description: Количество записей на странице
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: '-createdAt'
 *         description: Сортировка
 *     responses:
 *       200:
 *         description: Список сканирований
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ScanResult'
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
      startDate,
      endDate,
      minPrice,
      maxPrice,
      isPromo,
      barcode,
      page = 1,
      limit = 20,
      sort = '-createdAt'
    } = req.query;

    const query = {};

    
    if (req.user) {
      query.userId = req.user._id;
    } else {
      
      query.userId = { $exists: false };
    }

    
    if (search) {
      query.$text = { $search: search };
    }

    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    
    if (minPrice || maxPrice) {
      query['extractedData.price'] = {};
      if (minPrice) query['extractedData.price'].$gte = parseFloat(minPrice);
      if (maxPrice) query['extractedData.price'].$lte = parseFloat(maxPrice);
    }

    
    if (isPromo === 'true') {
      query['extractedData.isPromo'] = true;
    }

    
    if (barcode) {
      query['extractedData.barcode'] = barcode;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [items, total] = await Promise.all([
      ScanHistory.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('productId', 'name barcode priceHistory'),
      ScanHistory.countDocuments(query)
    ]);

    res.json({
      items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Ошибка получения истории' });
  }
});

/**
 * @swagger
 * /api/history/{id}:
 *   get:
 *     summary: Получить сканирование по ID
 *     tags: [History]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID сканирования
 *     responses:
 *       200:
 *         description: Данные сканирования
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ScanResult'
 *       404:
 *         description: Запись не найдена
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Нет доступа
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
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const scan = await ScanHistory.findById(req.params.id)
      .populate('productId');

    if (!scan) {
      return res.status(404).json({ error: 'Запись не найдена' });
    }

    
    if (scan.userId && (!req.user || !scan.userId.equals(req.user._id))) {
      return res.status(403).json({ error: 'Нет доступа' });
    }

    res.json(scan);
  } catch (error) {
    console.error('Get scan error:', error);
    res.status(500).json({ error: 'Ошибка получения записи' });
  }
});

/**
 * @swagger
 * /api/history/{id}:
 *   delete:
 *     summary: Удалить сканирование
 *     tags: [History]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID сканирования
 *     responses:
 *       200:
 *         description: Запись удалена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Запись не найдена
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Не авторизован
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
router.delete('/:id', auth, async (req, res) => {
  try {
    const scan = await ScanHistory.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!scan) {
      return res.status(404).json({ error: 'Запись не найдена' });
    }

    res.json({ message: 'Запись удалена' });
  } catch (error) {
    console.error('Delete scan error:', error);
    res.status(500).json({ error: 'Ошибка удаления' });
  }
});

/**
 * @swagger
 * /api/history/stats/summary:
 *   get:
 *     summary: Получить сводную статистику
 *     tags: [History]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Статистика сканирований
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalScans:
 *                   type: integer
 *                 avgPrice:
 *                   type: number
 *                 promoCount:
 *                   type: integer
 *                 uniqueProducts:
 *                   type: integer
 *       500:
 *         description: Ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/stats/summary', optionalAuth, async (req, res) => {
  try {
    const query = req.user ? { userId: req.user._id } : { userId: { $exists: false } };

    const stats = await ScanHistory.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalScans: { $sum: 1 },
          avgPrice: { $avg: '$extractedData.price' },
          promoCount: {
            $sum: { $cond: ['$extractedData.isPromo', 1, 0] }
          },
          uniqueBarcodes: { $addToSet: '$extractedData.barcode' }
        }
      }
    ]);

    const result = stats[0] || {
      totalScans: 0,
      avgPrice: 0,
      promoCount: 0,
      uniqueBarcodes: []
    };

    result.uniqueProducts = result.uniqueBarcodes?.filter(b => b).length || 0;
    delete result.uniqueBarcodes;

    res.json(result);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Ошибка статистики' });
  }
});

export default router;
