import { toTrackDto } from './track.mapper.js';

const BRAZIL = 'BR';

/**
 * Busca a faixa no mercado BR. Se não vier, tenta sem mercado:
 * a faixa existe, mas não está disponível no Brasil.
 */
export function createTrackService(spotifyClient) {
  return {
    async getByIsrc(isrc) {
      const inBrazil = await spotifyClient.findTrackByIsrc(isrc, BRAZIL);
      if (inBrazil) return toTrackDto(isrc, inBrazil, inBrazil.is_playable !== false);

      const anywhere = await spotifyClient.findTrackByIsrc(isrc);
      return anywhere ? toTrackDto(isrc, anywhere, false) : null;
    },
  };
}
