import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { config } from './config.js';
import { createMockAssetsRouter } from './mock/mock-assets.routes.js';
import { createMockSpotifyClient } from './mock/mock-spotify.client.js';
import { createSpotifyClient } from './spotify/spotify.client.js';
import { createTokenService } from './spotify/token.service.js';
import { createTrackService } from './tracks/track.service.js';

/** Composição: o único lugar que decide entre o Spotify real e o simulado. */
function createDataSource() {
  if (config.mode === 'mock') {
    return {
      name: 'mock',
      client: createMockSpotifyClient({ ...config.mock, assetsBaseUrl: '/api/mock' }),
      routers: { '/api/mock': createMockAssetsRouter() },
    };
  }
  return {
    name: 'spotify',
    client: createSpotifyClient(config.spotify, createTokenService(config.spotify)),
    routers: {},
  };
}

/**
 * Em produção a API também serve o build do Angular (um processo, mesma origem).
 * STATIC_DIR sobrescreve; por padrão usa frontend/dist quando o build existe.
 */
function resolveStaticDir() {
  const dir = process.env.STATIC_DIR ?? fileURLToPath(new URL('../../frontend/dist/frontend/browser', import.meta.url));
  return existsSync(dir) ? dir : null;
}

const source = createDataSource();
const staticDir = resolveStaticDir();
const app = createApp({
  trackService: createTrackService(source.client),
  dataSource: source.name,
  routers: source.routers,
  staticDir,
});

app.listen(config.port, () => {
  console.log(`API ouvindo em http://localhost:${config.port}`);
  if (staticDir) console.log(`Servindo o frontend de ${staticDir}`);
  if (source.name === 'mock') {
    console.warn(
      `⚠ Modo MOCK: dados fictícios (cenário: ${config.mock.scenario}). ` +
        'Para o Spotify real, defina SPOTIFY_MODE=live e as credenciais.',
    );
  }
});
