import 'dotenv/config';
import { createApp } from './src/app.js';

const PORT = process.env.PORT || 4000;
const app = createApp();

app.listen(PORT, () => {
  console.log(`NutriPulse API listening on http://localhost:${PORT}`);
  console.log(
    process.env.FOOD_DATA_API_KEY || process.env.USDA_API_KEY
      ? 'FOOD_DATA_API_KEY detected — food search can use the external USDA API as a fallback.'
      : 'FOOD_DATA_API_KEY not set — food search will use the built-in local database only.'
  );
  console.log(
    process.env.ANTHROPIC_API_KEY
      ? 'ANTHROPIC_API_KEY detected — photo analysis will call the real Claude API.'
      : 'ANTHROPIC_API_KEY not set — photo analysis will run in demo mode (see .env.example).'
  );
});
