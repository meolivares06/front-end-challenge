import type { TracksResult } from '../models/track.model';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { buildTrack } from '@testing/track.fixture';
import { IntegrationUnavailableError, TrackApiService } from './track-api.service';

describe('TrackApiService', () => {
  let service: TrackApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TrackApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('separa faixas encontradas dos ISRCs inexistentes (404)', () => {
    let result: unknown;
    service.getTracks(['AAAAA0000001', 'AAAAA0000002']).subscribe((r) => (result = r));

    http.expectOne('/api/tracks/AAAAA0000001').flush(buildTrack({ isrc: 'AAAAA0000001' }));
    http.expectOne('/api/tracks/AAAAA0000002').flush({}, { status: 404, statusText: 'Not Found' });

    expect(result).toEqual({
      tracks: [buildTrack({ isrc: 'AAAAA0000001' })],
      notFound: ['AAAAA0000002'],
      source: 'spotify',
    });
  });

  it('sinaliza integração indisponível em qualquer outro erro', () => {
    let error: unknown;
    service.getTracks(['AAAAA0000001']).subscribe({ error: (e) => (error = e) });

    http
      .expectOne('/api/tracks/AAAAA0000001')
      .flush({}, { status: 503, statusText: 'Unavailable' });

    expect(error).toBeInstanceOf(IntegrationUnavailableError);
  });

  it('identifica o modo mock pelo cabeçalho X-Data-Source', () => {
    let result: TracksResult | undefined;
    service.getTracks(['AAAAA0000001']).subscribe((r) => (result = r));

    http
      .expectOne('/api/tracks/AAAAA0000001')
      .flush(buildTrack({ isrc: 'AAAAA0000001' }), { headers: { 'X-Data-Source': 'mock' } });

    expect(result?.source).toBe('mock');
  });
});
