import { puter } from '@heyputer/puter.js';
import { useCallback, useEffect, useState } from 'react';
import Header from './components/Header.jsx';
import SearchBar from './components/SearchBar.jsx';
import PhotoUpload from './components/PhotoUpload.jsx';
import NutritionFactsPanel from './components/NutritionFactsPanel.jsx';
import DailySummary from './components/DailySummary.jsx';
import DailyLog from './components/DailyLog.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import Disclaimer from './components/Disclaimer.jsx';
import * as api from './api/client.js';

const EMPTY_TOTALS = {
  calories: 0,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
  fiber_g: 0,
  sugar_g: 0,
  sodium_mg: 0,
};

const DEFAULT_GOALS = {
  calories: 2000,
  protein_g: 150,
  carbs_g: 200,
  fat_g: 65,
};

// Common food/liquid signals. This is intentionally small and easy to extend.
const LIQUID_KEYWORDS = [
  'juice',
  'smoothie',
  'milkshake',
  'shake',
  'milk',
  'lassi',
  'buttermilk',
  'soup',
  'broth',
  'tea',
  'coffee',
  'latte',
  'cappuccino',
  'mocha',
  'drink',
  'beverage',
  'soda',
  'soft drink',
  'cola',
  'lemonade',
  'water',
  'sports drink',
  'energy drink',
  'protein shake',
  'hot chocolate',
];

const MIXED_LIQUID_KEYWORDS = [
  'fruit salad with yogurt',
  'yogurt bowl',
  'oatmeal',
  'porridge',
  'cereal with milk',
];

// Used only when the UI asks for mL. The existing API/log contract still uses grams.
// Unknown liquids intentionally fall back to water-like density instead of inventing a
// precise value.
const LIQUID_DENSITY_G_PER_ML = [
  { keywords: ['milkshake', 'protein shake', 'shake'], density: 1.05 },
  { keywords: ['smoothie', 'lassi'], density: 1.04 },
  { keywords: ['milk', 'buttermilk'], density: 1.03 },
  { keywords: ['soup', 'broth'], density: 1.02 },
  { keywords: ['juice', 'lemonade', 'soft drink', 'soda', 'cola'], density: 1.01 },
  { keywords: ['coffee', 'tea', 'water', 'beverage', 'drink'], density: 1.0 },
];

const RELATED_FOOD_GROUPS = [
  {
    match: ['fruit salad', 'fruit bowl', 'mixed fruit'],
    suggestions: ['Fresh Fruit Bowl', 'Yogurt Fruit Bowl', 'Apple Banana Fruit Salad'],
  },
  {
    match: ['juice'],
    suggestions: ['Fresh Orange Juice', 'Apple Juice', 'Mixed Fruit Juice'],
  },
  {
    match: ['smoothie'],
    suggestions: ['Banana Smoothie', 'Mango Smoothie', 'Berry Smoothie'],
  },
  {
    match: ['milkshake', 'shake'],
    suggestions: ['Chocolate Milkshake', 'Vanilla Milkshake', 'Banana Milkshake'],
  },
  {
    match: ['soup', 'broth'],
    suggestions: ['Tomato Soup', 'Vegetable Soup', 'Chicken Soup'],
  },
  {
    match: ['salad'],
    suggestions: ['Vegetable Salad', 'Green Salad', 'Sprout Salad'],
  },
  {
    match: ['rice'],
    suggestions: ['Steamed Rice', 'Jeera Rice', 'Vegetable Rice'],
  },
  {
    match: ['chicken'],
    suggestions: ['Grilled Chicken', 'Chicken Curry', 'Chicken Tikka'],
  },
  {
    match: ['sandwich'],
    suggestions: ['Vegetable Sandwich', 'Grilled Sandwich', 'Chicken Sandwich'],
  },
];

function todayStr() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function numberOrZero(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function cleanFoodName(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeKeywordText(value) {
  return cleanFoodName(value).toLowerCase();
}

function includesAny(text, keywords) {
  const value = normalizeKeywordText(text);
  return keywords.some((keyword) => value.includes(keyword));
}

function getFoodType(foodName, explicitType = '') {
  const type = normalizeKeywordText(explicitType);

  if (type === 'liquid' || type === 'beverage' || type === 'drink') {
    return 'liquid';
  }

  if (type === 'mixed') {
    return 'mixed';
  }

  const name = normalizeKeywordText(foodName);

  if (includesAny(name, MIXED_LIQUID_KEYWORDS)) {
    return 'mixed';
  }

  if (includesAny(name, LIQUID_KEYWORDS)) {
    return 'liquid';
  }

  return 'solid';
}

function isLiquidFood(foodName, explicitType = '') {
  return getFoodType(foodName, explicitType) === 'liquid';
}

function getLiquidDensity(foodName) {
  const name = normalizeKeywordText(foodName);
  const rule = LIQUID_DENSITY_G_PER_ML.find(({ keywords }) =>
    keywords.some((keyword) => name.includes(keyword))
  );

  return rule?.density || 1;
}

function displayAmountFromGrams(grams, foodName, foodType) {
  const value = numberOrZero(grams);

  if (foodType !== 'liquid') return value;

  return value / getLiquidDensity(foodName);
}

function amountToGrams(amount, foodName, unit) {
  const value = Number(amount);

  if (!Number.isFinite(value) || value <= 0) return 0;
  if (unit !== 'ml') return value;

  return value * getLiquidDensity(foodName);
}

function getMeasurement(foodName, foodType) {
  return isLiquidFood(foodName, foodType) ? 'ml' : 'g';
}

function roundAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return Number(n.toFixed(1));
}

function uniqueStrings(values, max = 5) {
  const seen = new Set();
  const result = [];

  for (const value of Array.isArray(values) ? values : []) {
    const clean = cleanFoodName(value);
    const key = clean.toLowerCase();

    if (!clean || seen.has(key)) continue;

    seen.add(key);
    result.push(clean);

    if (result.length >= max) break;
  }

  return result;
}

function getRelatedFoodSuggestions(foodName, foodType, aiRelatedItems = []) {
  const name = normalizeKeywordText(foodName);
  const aiSuggestions = uniqueStrings(aiRelatedItems, 5);

  const matchingGroup = RELATED_FOOD_GROUPS.find(({ match }) =>
    match.some((keyword) => name.includes(keyword))
  );

  const localSuggestions = matchingGroup?.suggestions || [];

  if (aiSuggestions.length) {
    return uniqueStrings([...aiSuggestions, ...localSuggestions], 5);
  }

  if (foodType === 'liquid') {
    return uniqueStrings(
      [...localSuggestions, 'Water', 'Fresh Juice', 'Smoothie'],
      5
    );
  }

  return uniqueStrings(localSuggestions, 5);
}

function extractAiText(response) {
  if (typeof response === 'string') return response;

  const content = response?.message?.content ?? response?.content;

  if (typeof content === 'string') return content;

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        return part?.text || part?.content || '';
      })
      .join('');
  }

  if (typeof response?.text === 'string') return response.text;
  if (typeof response?.output === 'string') return response.output;

  return '';
}

function extractJsonObject(value) {
  const text = String(value || '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');

    if (start < 0 || end <= start) {
      throw new Error('AI returned invalid food data. Please try another image.');
    }

    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      throw new Error('AI returned invalid food data. Please try another image.');
    }
  }
}

function scaleNutrition(nutrition, multiplier) {
  return {
    calories: numberOrZero(nutrition?.calories) * multiplier,
    protein_g: numberOrZero(nutrition?.protein_g) * multiplier,
    carbs_g: numberOrZero(nutrition?.carbs_g) * multiplier,
    fat_g: numberOrZero(nutrition?.fat_g) * multiplier,
    fiber_g: numberOrZero(nutrition?.fiber_g) * multiplier,
    sugar_g: numberOrZero(nutrition?.sugar_g) * multiplier,
    sodium_mg: numberOrZero(nutrition?.sodium_mg) * multiplier,
  };
}

export default function App() {
  const [analysisResult, setAnalysisResult] = useState(null);

  const [textLoading, setTextLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [nutritionLoading, setNutritionLoading] = useState(false);

  const [error, setError] = useState(null);

  const [imageUrl, setImageUrl] = useState('');
  const [imagePreviewError, setImagePreviewError] = useState(false);

  // One manual amount field. Solid foods use grams; liquids use mL.
  const [foodAmount, setFoodAmount] = useState('');
  const [showManualWeight, setShowManualWeight] = useState(false);

  const [logDate, setLogDate] = useState(todayStr());
  const [entries, setEntries] = useState([]);
  const [logLoading, setLogLoading] = useState(true);
  const [summary, setSummary] = useState(EMPTY_TOTALS);

  const [goals, setGoals] = useState(DEFAULT_GOALS);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const refreshLog = useCallback(async (date) => {
    setLogLoading(true);

    try {
      const [logsRes, summaryRes] = await Promise.all([
        api.getLogs(date),
        api.getSummary(date),
      ]);

      setEntries(logsRes.entries);
      setSummary(summaryRes.totals);
    } catch {
      // Keep existing data on screen if there is a temporary error.
    } finally {
      setLogLoading(false);
    }
  }, []);

  useEffect(() => {
    api
      .getGoals()
      .then((r) => setGoals(r.goals))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshLog(logDate);
  }, [logDate, refreshLog]);

  // --------------------------------------------------
  // TEXT FOOD ANALYSIS
  // --------------------------------------------------

  async function handleTextAnalyze(query) {
    if (textLoading) return;

    const cleanQuery = cleanFoodName(query);

    if (!cleanQuery) {
      setError('Enter a food or drink name first.');
      return;
    }

    setError(null);
    setTextLoading(true);
    setShowManualWeight(false);

    try {
      const r = await api.analyzeText(cleanQuery);
      const matchedName = cleanFoodName(r?.matchedFood?.name || cleanQuery);

      if (!matchedName || !r?.nutrition) {
        throw new Error(`Nutrition data for "${cleanQuery}" was not found.`);
      }

      const foodType = getFoodType(matchedName, r?.matchedFood?.type);
      const unit = getMeasurement(matchedName, foodType);
      const baselineGrams = Number(r.grams);

      if (!Number.isFinite(baselineGrams) || baselineGrams <= 0) {
        throw new Error(`Serving information for "${matchedName}" is invalid.`);
      }

      const displayAmount = roundAmount(
        displayAmountFromGrams(baselineGrams, matchedName, foodType)
      );

      setAnalysisResult({
        key: Date.now(),
        approximate: Boolean(r.approximate),
        demoMode: false,
        relatedItems: getRelatedFoodSuggestions(
          matchedName,
          foodType,
          r?.relatedItems
        ),
        items: [
          {
            name: matchedName,
            grams: baselineGrams,
            displayAmount,
            unit,
            foodType,
            density_g_per_ml: foodType === 'liquid'
              ? getLiquidDensity(matchedName)
              : null,
            nutrition: r.nutrition,
            source: 'database',
            requiresWeight: false,
          },
        ],
      });

      setFoodAmount(String(displayAmount));
    } catch (err) {
      setError(err?.message || 'Unable to analyze this food.');
    } finally {
      setTextLoading(false);
    }
  }

  // --------------------------------------------------
  // IMAGE INPUT HELPERS
  // --------------------------------------------------

  function getImageDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        if (typeof reader.result !== 'string') {
          reject(new Error('Unable to read the image.'));
          return;
        }

        resolve(reader.result);
      };

      reader.onerror = () => {
        reject(new Error('Unable to read the selected image.'));
      };

      reader.readAsDataURL(file);
    });
  }

  function validateImageUrl(value) {
    const url = String(value || '').trim();

    if (!url) {
      throw new Error('Please paste an image URL or image address.');
    }

    if (/^data:image\//i.test(url)) {
      return url;
    }

    let parsed;

    try {
      parsed = new URL(url);
    } catch {
      throw new Error(
        'Please enter a valid image URL beginning with http:// or https://.'
      );
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Only http:// and https:// image URLs are supported.');
    }

    return parsed.toString();
  }

  // --------------------------------------------------
  // PHOTO / IMAGE URL FOOD IDENTIFICATION
  // --------------------------------------------------

  async function analyzeImageSource(mediaSource) {
    setError(null);
    setPhotoLoading(true);
    setFoodAmount('');
    setShowManualWeight(false);

    try {
      let media = mediaSource;

      if (mediaSource instanceof File) {
        if (!mediaSource.type.startsWith('image/')) {
          throw new Error('Please select a valid image file.');
        }

        // Do not pass blob: URLs to Puter. A data URL is much more reliable here.
        media = await getImageDataUrl(mediaSource);
      } else {
        media = validateImageUrl(mediaSource);
      }

      const response = await puter.ai.chat(
        `Identify the main food or beverage in this image.

Return ONLY valid JSON.

Use exactly this shape:
{
  "name": "food or beverage name",
  "type": "solid | liquid | mixed | unknown",
  "relatedItems": ["similar food 1", "similar food 2"]
}

Rules:
- Identify the main edible item visible in the image.
- Support both solid foods and liquids/beverages such as juice, milkshake, soup, tea, coffee, soft drinks, smoothies, etc.
- Use "liquid" when the item is primarily a beverage or pourable food.
- Use "solid" for ordinary solid foods.
- Use "mixed" when the meal contains substantial solid and liquid components together.
- Do NOT estimate weight.
- Do NOT estimate calories.
- Do NOT estimate nutrition.
- relatedItems should contain 0 to 3 genuinely similar foods or beverages when useful.
- Do not invent unrelated items.
- If this is not food or a beverage, return:
{
  "name": "",
  "type": "unknown",
  "relatedItems": []
}`,
        media,
        {
          model: 'openai/gpt-5.4-nano',
        }
      );

      const rawResponse = extractAiText(response);

      if (!rawResponse) {
        throw new Error('AI returned an empty response.');
      }

      const parsed = extractJsonObject(rawResponse);
      const detectedFood = cleanFoodName(parsed?.name);

      if (!detectedFood) {
        throw new Error(
          'Could not identify a food or beverage in this image. Please use a clearer image.'
        );
      }

      const foodType = getFoodType(detectedFood, parsed?.type);
      const unit = getMeasurement(detectedFood, foodType);
      const relatedItems = getRelatedFoodSuggestions(
        detectedFood,
        foodType,
        parsed?.relatedItems
      );

      setAnalysisResult({
        key: Date.now(),
        approximate: true,
        demoMode: false,
        relatedItems,
        items: [
          {
            name: detectedFood,
            grams: 0,
            displayAmount: '',
            unit,
            foodType,
            density_g_per_ml: foodType === 'liquid'
              ? getLiquidDensity(detectedFood)
              : null,
            nutrition: EMPTY_TOTALS,
            source: 'puter',
            requiresWeight: true,
          },
        ],
      });

      // Image recognition cannot know the user's actual portion size.
      setShowManualWeight(true);
    } catch (err) {
      console.error('Photo/image analysis error:', err);
      setError(err?.message || 'Unable to analyze the image.');
    } finally {
      setPhotoLoading(false);
    }
  }

  async function handlePhotoAnalyze(file) {
    if (photoLoading) return;
    await analyzeImageSource(file);
  }

  async function handleImageUrlAnalyze() {
    if (photoLoading) return;

    try {
      const validUrl = validateImageUrl(imageUrl);
      setImagePreviewError(false);
      await analyzeImageSource(validUrl);
    } catch (err) {
      console.error('Image URL analysis error:', err);
      setError(err?.message || 'Unable to analyze this image URL.');
    }
  }

  // --------------------------------------------------
  // MANUAL WEIGHT / AMOUNT
  // --------------------------------------------------

  function handleAmountChange(value) {
    setFoodAmount(value);
    setError(null);
  }

  async function handleApplyWeight() {
    setError(null);

    if (!analysisResult?.items?.length) {
      setError('Analyze a food or beverage first.');
      return;
    }

    const currentItem = analysisResult.items[0];
    const amount = Number(foodAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError(
        `Please enter a valid amount greater than 0 ${currentItem.unit}.`
      );
      return;
    }

    // The API/log contract remains grams. For liquids, the UI accepts mL and
    // converts the amount to grams before nutrition scaling/logging.
    const targetGrams = amountToGrams(
      amount,
      currentItem.name,
      currentItem.unit
    );

    if (!Number.isFinite(targetGrams) || targetGrams <= 0) {
      setError('The entered amount could not be converted to a valid weight.');
      return;
    }

    // Existing database result: use the returned serving nutrition and scale it.
    if (currentItem.source === 'database' && currentItem.nutrition) {
      const originalGrams = Number(currentItem.grams);

      if (!Number.isFinite(originalGrams) || originalGrams <= 0) {
        setError(
          'The original serving weight is invalid. Please analyze the food again.'
        );
        return;
      }

      const multiplier = targetGrams / originalGrams;
      const scaledNutrition = scaleNutrition(
        currentItem.nutrition,
        multiplier
      );

      setAnalysisResult((prev) => ({
        ...prev,
        items: [
          {
            ...prev.items[0],
            grams: targetGrams,
            displayAmount: amount,
            nutrition: scaledNutrition,
            requiresWeight: false,
          },
        ],
      }));

      setShowManualWeight(false);
      return;
    }

    // Photo/image result: find the matching nutrition record, then scale it.
    if (currentItem.requiresWeight) {
      setNutritionLoading(true);

      try {
        const r = await api.analyzeText(currentItem.name);
        const databaseGrams = Number(r?.grams);
        const matchedName = cleanFoodName(r?.matchedFood?.name || currentItem.name);
        const resolvedType = getFoodType(
          matchedName,
          r?.matchedFood?.type || currentItem.foodType
        );
        const resolvedUnit = getMeasurement(matchedName, resolvedType);

        if (!r?.matchedFood || !r?.nutrition) {
          throw new Error(
            `Nutrition data for "${currentItem.name}" was not found.`
          );
        }

        if (!Number.isFinite(databaseGrams) || databaseGrams <= 0) {
          throw new Error(
            `Nutrition serving weight for "${matchedName}" is invalid.`
          );
        }

        // If the API returns a canonical food type that differs from image AI,
        // recalculate the target weight using that resolved measurement unit.
        const finalTargetGrams = amountToGrams(
          amount,
          matchedName,
          resolvedUnit
        );
        const multiplier = finalTargetGrams / databaseGrams;
        const scaledNutrition = scaleNutrition(r.nutrition, multiplier);

        setAnalysisResult((prev) => ({
          ...prev,
          relatedItems: getRelatedFoodSuggestions(
            matchedName,
            resolvedType,
            prev.relatedItems
          ),
          items: [
            {
              ...prev.items[0],
              name: matchedName,
              grams: finalTargetGrams,
              displayAmount: amount,
              unit: resolvedUnit,
              foodType: resolvedType,
              density_g_per_ml: resolvedType === 'liquid'
                ? getLiquidDensity(matchedName)
                : null,
              nutrition: scaledNutrition,
              source: 'database',
              requiresWeight: false,
            },
          ],
        }));

        setFoodAmount(String(roundAmount(amount)));
        setShowManualWeight(false);
      } catch (err) {
        setError(
          err?.message ||
            'Could not find nutrition information for this food or beverage.'
        );
      } finally {
        setNutritionLoading(false);
      }
    }
  }

  // --------------------------------------------------
  // ADD TO DAILY LOG
  // --------------------------------------------------

  async function handleAddToLog(item) {
    try {
      const grams = Number(item.grams);

      if (!Number.isFinite(grams) || grams <= 0 || item.requiresWeight) {
        setError(
          `Enter the ${item.unit === 'ml' ? 'volume' : 'weight'} first and calculate nutrition before adding it to your log.`
        );
        setShowManualWeight(true);
        return;
      }

      await api.addLogEntry({
        name: item.name,
        grams,
        nutrition: item.nutrition,
        source: item.source,
        date: logDate,
      });

      await refreshLog(logDate);

      setAnalysisResult(null);
      setFoodAmount('');
      setShowManualWeight(false);
    } catch (err) {
      setError(err?.message || 'Could not add this item to your daily log.');
    }
  }

  // --------------------------------------------------
  // DELETE LOG
  // --------------------------------------------------

  async function handleDeleteLog(id) {
    try {
      await api.deleteLogEntry(id);
      await refreshLog(logDate);
    } catch (err) {
      setError(err?.message || 'Could not delete this entry.');
    }
  }

  // --------------------------------------------------
  // SAVE GOALS
  // --------------------------------------------------

  async function handleSaveGoals(newGoals) {
    try {
      const r = await api.updateGoals(newGoals);
      setGoals(r.goals);
    } catch (err) {
      setError(err?.message || 'Could not save goals.');
    }
  }

  function handleRelatedFoodAnalyze(foodName) {
    if (!foodName || textLoading || photoLoading || nutritionLoading) return;
    handleTextAnalyze(foodName);
  }

  const currentItem = analysisResult?.items?.[0];
  const currentUnit = currentItem?.unit || 'g';
  const hasRelatedItems = analysisResult?.relatedItems?.length > 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Header onOpenSettings={() => setSettingsOpen(true)} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-5 py-8 grid lg:grid-cols-[1fr_360px] gap-8">
        <section className="space-y-5 min-w-0">
          <div className="grid sm:grid-cols-2 gap-3 items-stretch">
            <SearchBar onAnalyze={handleTextAnalyze} loading={textLoading} />

            <PhotoUpload
              onAnalyze={handlePhotoAnalyze}
              loading={photoLoading}
            />
          </div>

          {error && (
            <div className="text-sm text-tomato bg-tomato/10 border border-tomato/20 rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {analysisResult?.demoMode && (
            <div className="text-xs text-citrus bg-citrus/10 rounded-lg px-4 py-2.5">
              Demo mode: no image analysis provider is configured.
            </div>
          )}

          {/* IMAGE URL / IMAGE ADDRESS */}
          <div className="rounded-xl border border-black/10 bg-white p-4">
            <div className="flex items-center justify-between gap-3 mb-2">
              <label htmlFor="image-url" className="block text-sm font-medium">
                Use image URL / image address
              </label>

              {imageUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setImageUrl('');
                    setImagePreviewError(false);
                  }}
                  className="text-xs opacity-60 hover:opacity-100"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="image-url"
                type="url"
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setImagePreviewError(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleImageUrlAnalyze();
                }}
                aria-label="Image URL or image address"
                className="flex-1 rounded-lg border border-black/20 px-4 py-3 outline-none focus:border-black"
                disabled={photoLoading}
              />

              <button
                type="button"
                onClick={handleImageUrlAnalyze}
                disabled={photoLoading || !imageUrl.trim()}
                className="rounded-lg bg-black text-white px-5 py-3 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {photoLoading ? 'Analyzing...' : 'Analyze URL'}
              </button>
            </div>

            {imageUrl.trim() &&
              /^https?:\/\//i.test(imageUrl.trim()) &&
              !imagePreviewError && (
                <div className="mt-3">
                  <img
                    src={imageUrl.trim()}
                    alt="Food image preview"
                    className="w-full max-h-64 object-contain rounded-lg border border-black/10 bg-black/5"
                    onError={() => setImagePreviewError(true)}
                  />
                </div>
              )}

            <p className="text-xs opacity-60 mt-2">
              Paste a direct public image link. Right-click the image in your browser and choose <strong>Copy image address</strong>.
            </p>
          </div>

          {/* ONE MANUAL AMOUNT CONTROL — no scrolling/dropdown weight selector */}
          {currentItem && (
            <div className="rounded-xl border border-black/10 bg-white p-4">
              <button
                type="button"
                onClick={() => setShowManualWeight((value) => !value)}
                className="w-full rounded-lg border border-black/20 px-4 py-3 text-sm font-medium hover:bg-black/5 transition"
              >
                {showManualWeight
                  ? 'Hide Manual Amount'
                  : 'Enter Weight Manually'}
              </button>

              {showManualWeight && (
                <div className="mt-4">
                  <label
                    htmlFor="food-amount"
                    className="block text-sm font-medium mb-2"
                  >
                    Actual portion amount ({currentUnit})
                  </label>

                  <div className="flex gap-2 items-center">
                    <input
                      id="food-amount"
                      type="number"
                      inputMode="decimal"
                      min="0.1"
                      step="0.1"
                      value={foodAmount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleApplyWeight();
                      }}
                      placeholder="Enter amount"
                      className="flex-1 rounded-lg border border-black/20 px-4 py-3 outline-none focus:border-black"
                      disabled={nutritionLoading}
                    />

                    <span className="text-sm font-medium whitespace-nowrap">
                      {currentUnit}
                    </span>
                  </div>

                  <p className="text-xs opacity-60 mt-2">
                    {currentUnit === 'ml'
                      ? 'Liquid amount is converted to an estimated weight for the existing nutrition/log system.'
                      : 'Enter the actual weight of the portion you are eating.'}
                  </p>

                  <button
                    type="button"
                    onClick={handleApplyWeight}
                    disabled={nutritionLoading}
                    className="w-full mt-3 rounded-lg bg-black text-white px-4 py-3 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {nutritionLoading
                      ? 'Finding Nutrition...'
                      : 'Apply Amount & Calculate Nutrition'}
                  </button>
                </div>
              )}
            </div>
          )}

          <NutritionFactsPanel
            result={analysisResult}
            onAddToLog={handleAddToLog}
          />

          {hasRelatedItems && (
            <div className="rounded-xl border border-black/10 bg-white p-4">
              <div className="mb-3">
                <h3 className="text-sm font-semibold">Similar items</h3>
                <p className="text-xs opacity-60 mt-1">
                  These are related foods or beverages you can analyze separately.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {analysisResult.relatedItems.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleRelatedFoodAnalyze(item)}
                    disabled={textLoading || photoLoading || nutritionLoading}
                    className="rounded-full border border-black/15 px-3 py-2 text-xs hover:bg-black/5 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-5">
          <DailySummary totals={summary} goals={goals} />

          <DailyLog
            date={logDate}
            onDateChange={setLogDate}
            entries={entries}
            onDelete={handleDeleteLog}
            loading={logLoading}
          />
        </aside>
      </main>

      <footer className="max-w-5xl w-full mx-auto px-5 pb-10">
        <Disclaimer />
      </footer>

      {settingsOpen && (
        <SettingsModal
          goals={goals}
          onSave={handleSaveGoals}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
