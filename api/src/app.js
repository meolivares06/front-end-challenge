import express from 'express';
import { createTrackRouter } from './tracks/track.routes.js';

export function createApp({ trackService }) {
  const app = express();
  app.disable('x-powered-by');
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/tracks', createTrackRouter(trackService));
  return app;
}
