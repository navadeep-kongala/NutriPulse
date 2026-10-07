import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Fuse from 'fuse.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const foodsPath = path.join(__dirname, '..', 'data', 'foods.json');

export const foods = JSON.parse(fs.readFileSync(foodsPath, 'utf-8'));

const foodsById = new Map(foods.map((f) => [f.id, f]));

export function getFoodById(id) {
  return foodsById.get(id) || null;
}

// Words that add noise without helping identify *which* food this is.
// Deliberately excludes words that distinguish specific entries in this
// database, e.g. "fried" (Fried rice) and "whole" (Whole wheat bread/pasta).
const FILLER_WORDS = new Set([
  'a', 'an', 'the', 'some', 'my', 'of', 'with', 'on',
  'bowl', 'glass', 'plate', 'cup', 'piece', 'slice', 'serving', 'portion',
  'grilled', 'steamed', 'roasted', 'baked', 'boiled', 'sauteed',
  'sliced', 'diced', 'chopped', 'scrambled', 'raw', 'cooked', 'fresh', 'plain',
]);

function normalize(text) {
  const words = text
    .toLowerCase()
    .replace(/[,.]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !FILLER_WORDS.has(w));
  return words.join(' ');
}

// Indexed as one row per name/alias (not concatenated) so a short query like
// "chicken" compares cleanly against single phrases instead of a noisy,
// repetitive blob of every alias joined together.
const indexRows = [];
for (const f of foods) {
  indexRows.push({ foodId: f.id, phrase: normalize(f.name) });
  for (const alias of f.aliases) {
    indexRows.push({ foodId: f.id, phrase: normalize(alias) });
  }
}

const fuse = new Fuse(indexRows, {
  keys: ['phrase'],
  threshold: 0.45,
  ignoreLocation: true,
  minMatchCharLength: 2,
  includeScore: true,
});

// Fuse's `threshold` tunes candidate generation, but doesn't strictly gate
// the final score — a query can still surface an unrelated food at a
// mediocre score. We enforce our own cutoff (0 = perfect, 1 = unrelated) so
// a weak match returns "not found" instead of a confidently-wrong food.
const MAX_ACCEPTABLE_SCORE = 0.42;

function getNutrientValue(foodNutrients, nutrientId) {
  const match = (foodNutrients || []).find((n) => Number(n.nutrientId) === Number(nutrientId));
  return Number(match?.value || 0);
}

function mapExternalFood(food) {
  const description = food?.description || 'Unknown food';
  return {
    id: `external:${food?.fdcId ?? description}`,
    name: description,
    category: 'external',
    aliases: [description],
    source: 'external',
    calories: getNutrientValue(food?.foodNutrients, 1008),
    protein: getNutrientValue(food?.foodNutrients, 1003),
    carbs: getNutrientValue(food?.foodNutrients, 1005),
    fat: getNutrientValue(food?.foodNutrients, 1004),
    fiber: getNutrientValue(food?.foodNutrients, 1079),
    sugar: getNutrientValue(food?.foodNutrients, 2000),
    sodium: getNutrientValue(food?.foodNutrients, 1093),
    commonServing: { grams: 100 },
  };
}

export function searchFoods(query, limit = 8) {
  if (!query || !query.trim()) return [];
  const cleaned = normalize(query) || query.trim().toLowerCase();

  const bestByFood = new Map();
  for (const r of fuse.search(cleaned, { limit: 40 })) {
    if (r.score > MAX_ACCEPTABLE_SCORE) continue;
    const existing = bestByFood.get(r.item.foodId);
    if (!existing || r.score < existing) bestByFood.set(r.item.foodId, r.score);
  }

  return [...bestByFood.entries()]
    .sort((a, b) => a[1] - b[1])
    .slice(0, limit)
    .map(([foodId, score]) => ({ ...getFoodById(foodId), score, source: 'local' }));
}

export async function searchExternalFoods(query, limit = 8) {
  const apiKey = process.env.FOOD_DATA_API_KEY || process.env.USDA_API_KEY;
  if (!apiKey || !query || !query.trim()) return [];

  const url = new URL('https://api.nal.usda.gov/fdc/v1/foods/search');
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('query', query.trim());
  url.searchParams.set('pageSize', String(Math.max(1, Number(limit) || 8)));
  url.searchParams.set('sortBy', 'dataType.keyword');
  url.searchParams.set('sortOrder', 'asc');

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    console.warn(`Food API search failed with status ${response.status}`);
    return [];
  }

  const data = await response.json();
  return (data.foods || []).slice(0, Number(limit) || 8).map(mapExternalFood);
}

export async function searchFoodsWithExternalFallback(query, limit = 8) {
  const requestedLimit = Math.max(1, Number(limit) || 8);
  const localResults = searchFoods(query, requestedLimit);
  if (localResults.length >= requestedLimit) return localResults;

  const externalResults = await searchExternalFoods(query, Math.max(1, requestedLimit - localResults.length));
  const seenIds = new Set(localResults.map((food) => food.id));

  for (const externalFood of externalResults) {
    if (!seenIds.has(externalFood.id)) {
      localResults.push(externalFood);
      seenIds.add(externalFood.id);
    }
    if (localResults.length >= requestedLimit) break;
  }

  return localResults.slice(0, requestedLimit);
}

export function findBestMatch(query) {
  return searchFoods(query, 1)[0] || null;
}

export function listByCategory(category) {
  if (!category) return foods;
  return foods.filter((f) => f.category === category);
}
