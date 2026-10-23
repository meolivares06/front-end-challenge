import { TestBed } from '@angular/core/testing';
import { buildTrack } from '@testing/track.fixture';
import { type Observable, of, Subject, throwError } from 'rxjs';
import type { TracksResult } from '../models/track.model';
import { TRACKS_REPOSITORY } from '../ports/tracks-repository.port';
import { TRACKS_STORE, type TracksStorePort } from '../ports/tracks-store.port';
import { IntegrationUnavailableError } from '../services/track-api.service';
import { provideTracksFeature } from '../tracks.providers';

describe('TracksSignalStore (via porta TRACKS_STORE)', () => {
  let getTracks: ReturnType<typeof vi.fn<(isrcs: readonly string[]) => Observable<TracksResult>>>;
  let store: TracksStorePort;

  beforeEach(() => {
    getTracks = vi.fn();
    TestBed.configureTestingModule({
      // A mesma composição da app; só a porta de dados é trocada por um dublê.
      providers: [provideTracksFeature(), { provide: TRACKS_REPOSITORY, useValue: { getTracks } }],
    });
    store = TestBed.inject(TRACKS_STORE);
  });

  it('expõe as faixas ordenadas e os contadores após carregar', () => {
    getTracks.mockReturnValue(
      of({
        tracks: [
          buildTrack({ isrc: 'B', title: 'Zebra', availableInBrazil: false }),
          buildTrack({ isrc: 'A', title: 'Água' }),
        ],
        notFound: ['X'],
        source: 'mock',
      }),
    );

    store.load();

    expect(store.status()).toBe('ready');
    expect(store.tracks().map((t) => t.title)).toEqual(['Água', 'Zebra']);
    expect(store.availableInBrazil()).toBe(1);
    expect(store.notFound()).toEqual(['X']);
    expect(store.hasNoPreviews()).toBe(true);
    expect(store.source()).toBe('mock');
  });

  it('fica em loading enquanto a requisição não termina', () => {
    getTracks.mockReturnValue(new Subject<TracksResult>());

    store.load();

    expect(store.status()).toBe('loading');
  });

  it('vai para error quando a integração está indisponível', () => {
    getTracks.mockReturnValue(throwError(() => new IntegrationUnavailableError()));

    store.load();

    expect(store.status()).toBe('error');
    expect(store.tracks()).toEqual([]);
  });

  it('inverte a ordenação', () => {
    getTracks.mockReturnValue(
      of({
        tracks: [
          buildTrack({ isrc: 'A', title: 'Água' }),
          buildTrack({ isrc: 'B', title: 'Zebra' }),
        ],
        notFound: [],
        source: 'spotify',
      }),
    );
    store.load();

    store.toggleDirection();

    expect(store.direction()).toBe('desc');
    expect(store.tracks()[0]?.title).toBe('Zebra');

    store.toggleDirection();
    expect(store.direction()).toBe('asc');
  });

  it('um novo load cancela a requisição anterior (switchMap)', () => {
    const first = new Subject<TracksResult>();
    getTracks
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(
        of({ tracks: [buildTrack({ title: 'Nova' })], notFound: [], source: 'spotify' }),
      );

    store.load();
    store.load();
    first.next({ tracks: [buildTrack({ title: 'Antiga' })], notFound: [], source: 'spotify' });

    expect(store.tracks().map((t) => t.title)).toEqual(['Nova']);
    expect(first.observed).toBe(false);
  });
});
