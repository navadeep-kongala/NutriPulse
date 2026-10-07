import { Router } from 'express';
import crypto from 'crypto';
import { readJSON, writeJSON } from '../services/storage.js';
import { sumNutrition } from '../services/nutritionCalculator.js';

const LOGS_FILE = 'logs.json';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const router = Router();

// GET /api/logs?date=YYYY-MM-DD  (defaults to today)
router.get('/', async (req, res, next) => {
  try {
    const date = req.query.date || todayStr();
    const logs = await readJSON(LOGS_FILE, []);
    res.json({ date, entries: logs.filter((e) => e.date === date) });
  } catch (err) {
    next(err);
  }
});

// GET /api/logs/summary?date=YYYY-MM-DD
router.get('/summary', async (req, res, next) => {
  try {
    const date = req.query.date || todayStr();
    const logs = await readJSON(LOGS_FILE, []);
    const entries = logs.filter((e) => e.date === date);
    res.json({ date, totals: sumNutrition(entries.map((e) => e.nutrition)), entryCount: entries.length });
  } catch (err) {
    next(err);
  }
});

// POST /api/logs  { name, grams, nutrition, source, date? }
router.post('/', async (req, res, next) => {
  try {
    const { name, grams, nutrition, source, date } = req.body || {};
    if (!name || !nutrition) {
      return res.status(422).json({ error: 'A food name and nutrition data are required.' });
    }
    const logs = await readJSON(LOGS_FILE, []);
    const entry = {
      id: crypto.randomUUID(),
      date: date || todayStr(),
      name,
      grams: grams ?? null,
      source: source || 'manual',
      nutrition,
      loggedAt: new Date().toISOString(),
    };
    logs.push(entry);
    await writeJSON(LOGS_FILE, logs);
    res.status(201).json({ entry });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/logs/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const logs = await readJSON(LOGS_FILE, []);
    const filtered = logs.filter((e) => e.id !== req.params.id);
    if (filtered.length === logs.length) {
      return res.status(404).json({ error: 'Log entry not found.' });
    }
    await writeJSON(LOGS_FILE, filtered);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
