import { TestBed } from '@angular/core/testing';
import { buildTrack } from '@testing/track.fixture';
import { type Observable, of, Subject, throwError } from 'rxjs';
import type { TracksResult } from '../models/track.model';
import { IntegrationUnavailableError, TrackApiService } from '../services/track-api.service';
import { TracksStore } from './tracks.store';

describe('TracksStore', () => {
  let getTracks: ReturnType<typeof vi.fn<(isrcs: readonly string[]) => Observable<TracksResult>>>;
  let store: TracksStore;

  beforeEach(() => {
    getTracks = vi.fn();
    TestBed.configureTestingModule({
      providers: [TracksStore, { provide: TrackApiService, useValue: { getTracks } }],
    });
    store = TestBed.inject(TracksStore);
  });

  it('expõe as faixas ordenadas e os contadores após carregar', () => {
    getTracks.mockReturnValue(
      of({
        tracks: [
          buildTrack({ isrc: 'B', title: 'Zebra', availableInBrazil: false }),
          buildTrack({ isrc: 'A', title: 'Água' }),
        ],
        notFound: ['X'],
      }),
    );

    store.load();

    expect(store.state()).toBe('ready');
    expect(store.tracks().map((t) => t.title)).toEqual(['Água', 'Zebra']);
    expect(store.availableInBrazil()).toBe(1);
    expect(store.notFound()).toEqual(['X']);
    expect(store.hasNoPreviews()).toBe(true);
  });

  it('fica em loading enquanto a requisição não termina', () => {
    getTracks.mockReturnValue(new Subject<TracksResult>());

    store.load();

    expect(store.state()).toBe('loading');
  });

  it('vai para error quando a integração está indisponível', () => {
    getTracks.mockReturnValue(throwError(() => new IntegrationUnavailableError()));

    store.load();

    expect(store.state()).toBe('error');
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
      }),
    );
    store.load();

    store.toggleDirection();

    expect(store.direction()).toBe('desc');
    expect(store.tracks()[0]?.title).toBe('Zebra');
  });
});
