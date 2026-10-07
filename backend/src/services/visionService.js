import Anthropic from '@anthropic-ai/sdk';
import { findBestMatch } from './foodDatabase.js';
import { scaleNutrition } from './nutritionCalculator.js';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

let cachedClient;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!cachedClient) cachedClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return cachedClient;
}

const SYSTEM_PROMPT = `You are a nutrition vision assistant embedded in an app called NutriPulse.
Look at the photo of food and identify each visually distinct food item.
For each item, estimate its portion size in grams as plated, and estimate its nutrition.
Respond with ONLY a JSON array (no markdown, no code fences, no commentary before or after) where each
element has exactly this shape:
{"name": string, "estimated_grams": number, "confidence": number from 0 to 1, "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number}
List at most 6 items, largest/most prominent first. If no food is visible, respond with [].`;

// Used automatically whenever ANTHROPIC_API_KEY isn't configured, so the
// photo-analysis flow still works end to end for local development and demos.
const DEMO_RESPONSES = [
  [
    { name: 'Grilled chicken breast', estimated_grams: 150, confidence: 0.91, calories: 248, protein_g: 46.5, carbs_g: 0, fat_g: 5.4 },
    { name: 'Steamed broccoli', estimated_grams: 90, confidence: 0.86, calories: 32, protein_g: 2.2, carbs_g: 6.5, fat_g: 0.4 },
    { name: 'Brown rice', estimated_grams: 120, confidence: 0.83, calories: 134, protein_g: 2.8, carbs_g: 28.2, fat_g: 1 },
  ],
  [{ name: 'Cheese pizza slice', estimated_grams: 120, confidence: 0.88, calories: 319, protein_g: 13.2, carbs_g: 39.6, fat_g: 12 }],
  [
    { name: 'Sliced avocado', estimated_grams: 100, confidence: 0.82, calories: 160, protein_g: 2, carbs_g: 8.5, fat_g: 14.7 },
    { name: 'Scrambled eggs', estimated_grams: 100, confidence: 0.8, calories: 155, protein_g: 13, carbs_g: 1.1, fat_g: 11 },
    { name: 'Whole wheat toast', estimated_grams: 30, confidence: 0.75, calories: 74, protein_g: 3.9, carbs_g: 12.3, fat_g: 1 },
  ],
  [
    { name: 'Mixed berry bowl', estimated_grams: 150, confidence: 0.83, calories: 80, protein_g: 1.1, carbs_g: 19, fat_g: 0.5 },
    { name: 'Greek yogurt', estimated_grams: 120, confidence: 0.8, calories: 71, protein_g: 12.2, carbs_g: 4.3, fat_g: 0.5 },
  ],
];

function pickDemoResponse() {
  return DEMO_RESPONSES[Math.floor(Math.random() * DEMO_RESPONSES.length)];
}

function stripCodeFences(text) {
  return text.replace(/```json\s*|```\s*/gi, '').trim();
}

// Cross-references each detected item against the local database so numbers
// stay consistent where possible; falls back to the model's own estimate
// for dishes the database doesn't have. `source` tells the UI which is which.
function enrichWithDatabase(rawItems) {
  return rawItems.slice(0, 6).map((item) => {
    const grams = Math.max(1, Number(item.estimated_grams) || 100);
    const dbMatch = findBestMatch(item.name);

    if (dbMatch) {
      return {
        name: dbMatch.name,
        detectedAs: item.name,
        grams,
        confidence: item.confidence ?? null,
        source: 'database',
        matchedFoodId: dbMatch.id,
        ...scaleNutrition(dbMatch.per100g, grams),
      };
    }

    return {
      name: item.name,
      detectedAs: item.name,
      grams,
      confidence: item.confidence ?? null,
      source: 'estimated',
      matchedFoodId: null,
      calories: Math.round(Number(item.calories) || 0),
      protein_g: Number(item.protein_g) || 0,
      carbs_g: Number(item.carbs_g) || 0,
      fat_g: Number(item.fat_g) || 0,
      fiber_g: 0,
      sugar_g: 0,
      sodium_mg: 0,
    };
  });
}

export async function analyzeImage(base64Data, mediaType) {
  const anthropic = getClient();

  if (!anthropic) {
    return { items: enrichWithDatabase(pickDemoResponse()), demoMode: true };
  }

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } },
          { type: 'text', text: 'Identify the food in this photo and estimate nutrition as instructed.' },
        ],
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock) {
    const err = new Error('The vision model did not return a text response.');
    err.status = 502;
    throw err;
  }

  let parsed;
  try {
    parsed = JSON.parse(stripCodeFences(textBlock.text));
  } catch {
    const err = new Error('Could not parse the vision model response. Please try again.');
    err.status = 502;
    throw err;
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return { items: [], demoMode: false };
  }

  return { items: enrichWithDatabase(parsed), demoMode: false };
}
