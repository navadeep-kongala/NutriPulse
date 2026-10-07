import { Router } from 'express';
import { readJSON, writeJSON } from '../services/storage.js';

const GOALS_FILE = 'goals.json';
const DEFAULT_GOALS = { calories: 2000, protein_g: 150, carbs_g: 200, fat_g: 65 };

const router = Router();

// GET /api/goals
router.get('/', async (req, res, next) => {
  try {
    res.json({ goals: await readJSON(GOALS_FILE, DEFAULT_GOALS) });
  } catch (err) {
    next(err);
  }
});

// PUT /api/goals  { calories, protein_g, carbs_g, fat_g }
router.put('/', async (req, res, next) => {
  try {
    const b = req.body || {};
    const goals = {
      calories: Number(b.calories) || DEFAULT_GOALS.calories,
      protein_g: Number(b.protein_g) || DEFAULT_GOALS.protein_g,
      carbs_g: Number(b.carbs_g) || DEFAULT_GOALS.carbs_g,
      fat_g: Number(b.fat_g) || DEFAULT_GOALS.fat_g,
    };
    await writeJSON(GOALS_FILE, goals);
    res.json({ goals });
  } catch (err) {
    next(err);
  }
});

export default router;
