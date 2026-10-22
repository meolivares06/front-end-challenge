import express from 'express';
import { createTrackRouter } from './tracks/track.routes.js';

/**
 * @param {object} deps
 * @param {object} deps.trackService
 * @param {'spotify' | 'mock'} [deps.dataSource] informado ao frontend no cabeçalho X-Data-Source.
 * @param {Record<string, import('express').Router>} [deps.routers] rotas extras (ex.: arquivos do mock).
 */
export function createApp({ trackService, dataSource = 'spotify', routers = {} }) {
  const app = express();
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.set('X-Data-Source', dataSource);
    next();
  });
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', dataSource }));
  app.use('/api/tracks', createTrackRouter(trackService));
  for (const [path, router] of Object.entries(routers)) app.use(path, router);
  return app;
}
