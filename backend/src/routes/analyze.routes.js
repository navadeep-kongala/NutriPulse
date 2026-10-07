import { Router } from 'express';
import multer from 'multer';
import { parseQuery } from '../services/nutritionParser.js';
import { scaleNutrition } from '../services/nutritionCalculator.js';
import { analyzeImage } from '../services/visionService.js';

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ACCEPTED_TYPES.has(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG, or WebP images are supported.'));
  },
});

const router = Router();

// POST /api/analyze/text  { "query": "150g grilled chicken breast" }
router.post('/text', (req, res, next) => {
  try {
    const parsed = parseQuery(req.body?.query);
    if (!parsed.ok) {
      return res.status(422).json({ error: parsed.error });
    }
    res.json({
      query: parsed.rawFoodQuery,
      matchedFood: {
        id: parsed.matchedFood.id,
        name: parsed.matchedFood.name,
        category: parsed.matchedFood.category,
      },
      grams: parsed.grams,
      approximate: parsed.approximate,
      nutrition: scaleNutrition(parsed.matchedFood.per100g, parsed.grams),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/analyze/image  (multipart/form-data, field name "image")
router.post('/image', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(422).json({ error: 'Please attach an image file.' });
    }
    const base64Data = req.file.buffer.toString('base64');
    const result = await analyzeImage(base64Data, req.file.mimetype);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
