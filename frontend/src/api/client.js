const BASE = import.meta.env.VITE_API_BASE_URL || '/api';

async function request(path, options = {}) {
  const isForm = options.body instanceof FormData;
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: isForm ? options.headers : { 'Content-Type': 'application/json', ...options.headers },
  });

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : null;

  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

export function searchFoods(query, limit = 6) {
  if (!query?.trim()) return Promise.resolve({ results: [] });
  return request(`/foods/search?q=${encodeURIComponent(query)}&limit=${limit}`);
}

export function analyzeText(query) {
  return request('/analyze/text', { method: 'POST', body: JSON.stringify({ query }) });
}

export function analyzeImage(file) {
  const form = new FormData();
  form.append('image', file);
  return request('/analyze/image', { method: 'POST', body: form });
}

export function getLogs(date) {
  return request(`/logs${date ? `?date=${date}` : ''}`);
}

export function getSummary(date) {
  return request(`/logs/summary${date ? `?date=${date}` : ''}`);
}

export function addLogEntry(entry) {
  return request('/logs', { method: 'POST', body: JSON.stringify(entry) });
}

export function deleteLogEntry(id) {
  return request(`/logs/${id}`, { method: 'DELETE' });
}

export function getGoals() {
  return request('/goals');
}

export function updateGoals(goals) {
  return request('/goals', { method: 'PUT', body: JSON.stringify(goals) });
}
