import { Router } from 'express';
import { searchFoodsWithExternalFallback, listByCategory } from '../services/foodDatabase.js';

const router = Router();

// GET /api/foods?category=fruit
router.get('/', (req, res) => {
  res.json({ foods: listByCategory(req.query.category) });
});

// GET /api/foods/search?q=chick&limit=6  (used for search-as-you-type suggestions)
router.get('/search', async (req, res) => {
  const { q, limit } = req.query;
  const results = await searchFoodsWithExternalFallback(q, limit ? Number(limit) : 8);
  res.json({ results });
});

export default router;
