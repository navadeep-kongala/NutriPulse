// Tiny JSON-file persistence layer. Good enough for a single-user local app;
// see README for notes on swapping in a real database later.
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// backend/src/services -> backend/runtime-data (kept separate from the static seed data in src/data)
const DATA_DIR = path.join(__dirname, '..', '..', 'runtime-data');

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function readJSON(filename, fallback) {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      await writeJSON(filename, fallback);
      return fallback;
    }
    throw err;
  }
}

export async function writeJSON(filename, data) {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  return data;
}
