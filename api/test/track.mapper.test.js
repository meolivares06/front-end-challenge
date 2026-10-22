import { describe, expect, it } from 'vitest';
import { toTrackDto } from '../src/tracks/track.mapper.js';
import { spotifyTrack } from './fixtures.js';

describe('toTrackDto', () => {
  it('usa a imagem média (300px) como thumb e a maior como capa', () => {
    const dto = toTrackDto('BR1SP1200071', spotifyTrack, true);

    expect(dto).toMatchObject({ albumImageUrl: 'https://i.scdn.co/640', thumbnailUrl: 'https://i.scdn.co/300' });
  });

  it('cai para a única imagem disponível', () => {
    const track = { ...spotifyTrack, album: { ...spotifyTrack.album, images: [{ url: 'https://i.scdn.co/only' }] } };

    expect(toTrackDto('X', track, true).thumbnailUrl).toBe('https://i.scdn.co/only');
  });

  it('tolera faixa sem álbum, prévia ou link', () => {
    const { album, preview_url, external_urls, ...bare } = spotifyTrack;

    expect(toTrackDto('X', bare, false)).toMatchObject({
      albumName: '',
      albumImageUrl: null,
      thumbnailUrl: null,
      releaseDate: null,
      releaseDatePrecision: 'day',
      previewUrl: null,
      spotifyUrl: null,
      availableInBrazil: false,
    });
  });
});
