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

const source = createDataSource();
const app = createApp({
  trackService: createTrackService(source.client),
  dataSource: source.name,
  routers: source.routers,
});

app.listen(config.port, () => {
  console.log(`API ouvindo em http://localhost:${config.port}`);
  if (source.name === 'mock') {
    console.warn(
      `⚠ Modo MOCK: dados fictícios (cenário: ${config.mock.scenario}). ` +
        'Para o Spotify real, defina SPOTIFY_MODE=live e as credenciais.',
    );
  }
});
