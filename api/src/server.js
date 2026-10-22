import { createApp } from './app.js';
import { config } from './config.js';
import { createSpotifyClient } from './spotify/spotify.client.js';
import { createTokenService } from './spotify/token.service.js';
import { createTrackService } from './tracks/track.service.js';

const tokenService = createTokenService(config.spotify);
const spotifyClient = createSpotifyClient(config.spotify, tokenService);
const app = createApp({ trackService: createTrackService(spotifyClient) });

app.listen(config.port, () => console.log(`API ouvindo em http://localhost:${config.port}`));
