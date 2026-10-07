import test from 'node:test';
import assert from 'node:assert/strict';

import { searchFoodsWithExternalFallback } from '../src/services/foodDatabase.js';

test('searchFoodsWithExternalFallback falls back to external API data', async () => {
  const originalFetch = global.fetch;

  try {
    process.env.FOOD_DATA_API_KEY = 'demo-key';
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        foods: [
          {
            fdcId: 999,
            description: 'Banana',
            foodNutrients: [
              { nutrientId: 1008, value: 89 },
              { nutrientId: 1003, value: 1.1 },
              { nutrientId: 1005, value: 23 },
              { nutrientId: 1004, value: 0.3 },
            ],
          },
        ],
      }),
    });

    const results = await searchFoodsWithExternalFallback('mango delight mix', 1);

    assert.equal(results.length, 1);
    assert.equal(results[0].name, 'Banana');
    assert.equal(results[0].source, 'external');
    assert.equal(results[0].calories, 89);
  } finally {
    global.fetch = originalFetch;
    delete process.env.FOOD_DATA_API_KEY;
  }
});
