import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import foodsRoutes from './routes/foods.routes.js';
import analyzeRoutes from './routes/analyze.routes.js';
import logsRoutes from './routes/logs.routes.js';
import goalsRoutes from './routes/goals.routes.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan(process.env.NODE_ENV === 'test' ? 'tiny' : 'dev'));

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'nutripulse-api', time: new Date().toISOString() });
  });

  app.use('/api/foods', foodsRoutes);
  app.use('/api/analyze', analyzeRoutes);
  app.use('/api/logs', logsRoutes);
  app.use('/api/goals', goalsRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
