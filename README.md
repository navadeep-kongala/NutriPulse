# NutriPulse

A full-stack nutrition analyzer. Search a food in plain English, snap a photo of a meal, and see an
instant nutrition breakdown — then log it against your daily goals.

**Stack:** React 19 + Vite + Tailwind CSS v4 (frontend) · Node.js + Express 5 (backend) · Claude API for
photo recognition (optional).

## Features

- **Natural-language search** — type things like `150g grilled chicken breast`, `2 eggs`, or `a banana`
  and get an instant, correctly-scaled nutrition breakdown. Backed by a local database of 115 common
  foods, matched with fuzzy search (typo-tolerant, understands plurals and casual phrasing).
- **Photo analysis** — upload or snap a photo of a meal. The backend sends it to the Claude API, which
  identifies each food item and estimates its portion size; results are cross-checked against the local
  database where possible, and AI-estimated where not (clearly labeled either way).
- **Works without any API key** — photo analysis runs in a "demo mode" with realistic sample data out of
  the box, so the app is fully functional immediately. Add an `ANTHROPIC_API_KEY` any time to switch to
  real analysis.
- **Daily log** — add any analyzed food to today's log, see running totals against configurable daily
  goals (calories, protein, carbs, fat), and look back at any previous day.
- **Light/dark theme**, keyboard-accessible UI, responsive layout.

## Quick start

Requires **Node.js 18+**.

```bash
# from the project root
npm run install:all   # installs both backend/ and frontend/ dependencies
npm run dev            # runs both dev servers together
```

Then open **http://localhost:5173**. The frontend dev server proxies `/api/*` to the backend
automatically — no extra configuration needed.

If you'd rather run them separately (two terminals):

```bash
cd backend && npm install && npm run dev    # http://localhost:4000
cd frontend && npm install && npm run dev   # http://localhost:5173
```

### Enabling real photo analysis

Without any setup, the camera/photo feature returns realistic sample data so you can try the full flow
immediately. To make it analyze real photos:

1. Get an API key at [platform.claude.com](https://platform.claude.com/settings/keys).
2. `cp backend/.env.example backend/.env` and set `ANTHROPIC_API_KEY=sk-ant-...`.
3. Restart the backend. You'll see a confirmation in its startup log.

## Project structure

```
NutriPulse/
├── backend/
│   ├── server.js                 # entry point
│   ├── src/
│   │   ├── app.js                # Express app, middleware, route mounting
│   │   ├── data/foods.json       # the 115-item nutrition database (seed data)
│   │   ├── routes/               # foods, analyze, logs, goals
│   │   ├── services/
│   │   │   ├── foodDatabase.js      # fuzzy search over foods.json
│   │   │   ├── nutritionParser.js   # parses "150g chicken breast" -> grams + food
│   │   │   ├── nutritionCalculator.js
│   │   │   ├── visionService.js     # Claude API call + demo-mode fallback
│   │   │   └── storage.js           # tiny JSON-file persistence
│   │   └── middleware/errorHandler.js
│   └── runtime-data/             # logs.json / goals.json, created on first run
└── frontend/
    └── src/
        ├── App.jsx                # page layout & state
        ├── api/client.js          # fetch wrappers for every endpoint
        ├── context/ThemeContext.jsx
        └── components/            # SearchBar, PhotoUpload, NutritionFactsPanel, …
```

## API reference

All routes are mounted under `/api`.

| Method | Route               | Description                                             |
| ------ | ------------------- | --------------------------------------------------------- |
| GET    | `/foods`             | List foods, optional `?category=`                         |
| GET    | `/foods/search`      | Fuzzy search, `?q=&limit=` — powers the search-as-you-type suggestions |
| POST   | `/analyze/text`       | `{ "query": "150g chicken breast" }` → parsed nutrition  |
| POST   | `/analyze/image`      | multipart, field `image` → identified items + nutrition |
| GET    | `/logs`               | `?date=YYYY-MM-DD` (defaults to today)                   |
| POST   | `/logs`               | Add a log entry                                            |
| DELETE | `/logs/:id`           | Remove a log entry                                         |
| GET    | `/logs/summary`       | Totals for a date                                           |
| GET/PUT| `/goals`              | Read or update daily targets                                |

## Design notes & known limitations

- **Persistence** is a flat JSON file (`backend/runtime-data/`) — intentionally simple for local/single-user
  use. For multi-user or production use, swap `services/storage.js` for a real database (Postgres,
  SQLite, etc.); every route already goes through that one module.
- **The nutrition database** covers ~115 common foods and dishes with approximate, general-reference
  values — not lab-verified figures. Unusual dishes or very specific phrasing may not match; the app is
  designed to fail gracefully (a clear "couldn't find that" message for text search, or an AI-estimated
  fallback for photos) rather than return a wrong food.
- **Portion estimates** (from photos, or from countable items without a specified weight) are
  approximate. For precision, specify a gram weight directly (`"200g salmon"`).
- Not medical advice — see the in-app disclaimer.

## Next steps, if you want to extend it

- Swap JSON-file storage for a real database and add user accounts.
- Expand `src/data/foods.json` or wire in a third-party nutrition API (e.g. USDA FoodData Central) for
  broader coverage.
- Add a weekly/monthly trends view on top of the existing `/logs` history.
