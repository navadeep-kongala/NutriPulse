import { findBestMatch } from './foodDatabase.js';

// "a", "an", "one".."ten" so people can type "a banana" or "two eggs".
const NUMBER_WORDS = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

// Approximate conversions to grams. Volume units assume a water-like density,
// which is a simplification — flagged as "approximate" on the response.
const UNIT_TO_GRAMS = {
  g: 1, gram: 1, grams: 1,
  kg: 1000, kilogram: 1000, kilograms: 1000,
  oz: 28.3495, ounce: 28.3495, ounces: 28.3495,
  lb: 453.592, lbs: 453.592, pound: 453.592, pounds: 453.592,
  ml: 1, milliliter: 1, milliliters: 1,
  l: 1000, liter: 1000, liters: 1000,
  cup: 240, cups: 240,
  tbsp: 15, tablespoon: 15, tablespoons: 15,
  tsp: 5, teaspoon: 5, teaspoons: 5,
};

const VOLUME_UNITS = new Set(['ml', 'milliliter', 'milliliters', 'l', 'liter', 'liters', 'cup', 'cups', 'tbsp', 'tablespoon', 'tablespoons', 'tsp', 'teaspoon', 'teaspoons']);

const UNIT_ALTERNATION = Object.keys(UNIT_TO_GRAMS).sort((a, b) => b.length - a.length).join('|');
const UNIT_REGEX = new RegExp(`^([\\d.]+)\\s*(${UNIT_ALTERNATION})\\b\\.?\\s+(?:of\\s+)?(.+)$`, 'i');
const NUMBER_ONLY_REGEX = /^([\d.]+)\s+(?:of\s+)?(.+)$/;
const WORD_NUMBER_REGEX = new RegExp(`^(${Object.keys(NUMBER_WORDS).join('|')})\\s+(.+)$`, 'i');

// Parses free text like "150g grilled chicken breast", "2 eggs", or "a banana"
// into a resolved gram amount plus the best-matching database food.
export function parseQuery(rawQuery) {
  const text = (rawQuery || '').trim();
  if (!text) {
    return { ok: false, error: 'Please enter a food to analyze.' };
  }

  let quantity;
  let unit = null;
  let foodQuery;

  let match = text.match(UNIT_REGEX);
  if (match) {
    quantity = parseFloat(match[1]);
    unit = match[2].toLowerCase();
    foodQuery = match[3];
  } else if ((match = text.match(NUMBER_ONLY_REGEX))) {
    quantity = parseFloat(match[1]);
    foodQuery = match[2];
  } else if ((match = text.match(WORD_NUMBER_REGEX))) {
    quantity = NUMBER_WORDS[match[1].toLowerCase()];
    foodQuery = match[2];
  } else {
    quantity = 1;
    foodQuery = text;
  }

  foodQuery = foodQuery.trim();
  const matchedFood = findBestMatch(foodQuery);
  if (!matchedFood) {
    return {
      ok: false,
      error: `Couldn't find "${foodQuery}" in the nutrition database. Try a simpler or more common food name.`,
    };
  }

  let grams;
  let approximate = false;

  if (unit) {
    grams = quantity * UNIT_TO_GRAMS[unit];
    if (VOLUME_UNITS.has(unit)) approximate = true;
  } else if (matchedFood.commonServing) {
    grams = quantity * matchedFood.commonServing.grams;
  } else {
    grams = quantity * 100;
    approximate = true;
  }

  return {
    ok: true,
    quantity,
    unit,
    grams: Math.round(grams * 10) / 10,
    approximate,
    matchedFood,
    rawFoodQuery: foodQuery,
  };
}
