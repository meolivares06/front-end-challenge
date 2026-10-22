import { HttpClient, type HttpErrorResponse, type HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, map, type Observable, of, throwError } from 'rxjs';
import type { DataSource, Track, TracksResult } from '../models/track.model';

/** Erro lançado quando o fornecedor de dados (Spotify, via API) não está disponível. */
export class IntegrationUnavailableError extends Error {
  constructor() {
    super('Integração com o Spotify indisponível');
    this.name = 'IntegrationUnavailableError';
  }
}

interface Lookup {
  isrc: string;
  track: Track | null;
  source: DataSource;
}

/** A API informa a origem dos dados no cabeçalho X-Data-Source. */
const readSource = (headers: HttpHeaders): DataSource =>
  headers.get('X-Data-Source') === 'mock' ? 'mock' : 'spotify';

@Injectable({ providedIn: 'root' })
export class TrackApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/tracks';

  /**
   * Busca todos os ISRCs em paralelo. Um ISRC inexistente (404) vira "não encontrado";
   * qualquer outra falha significa que a integração está fora e interrompe o carregamento.
   */
  getTracks(isrcs: readonly string[]): Observable<TracksResult> {
    return forkJoin(isrcs.map((isrc) => this.lookup(isrc))).pipe(
      map((lookups) => ({
        tracks: lookups.flatMap(({ track }) => (track ? [track] : [])),
        notFound: lookups.filter(({ track }) => !track).map(({ isrc }) => isrc),
        source: lookups.some(({ source }) => source === 'mock') ? 'mock' : 'spotify',
      })),
    );
  }

  private lookup(isrc: string): Observable<Lookup> {
    return this.http
      .get<Track>(`${this.baseUrl}/${encodeURIComponent(isrc)}`, { observe: 'response' })
      .pipe(
        map((response) => ({ isrc, track: response.body, source: readSource(response.headers) })),
        catchError((error: HttpErrorResponse) =>
          error.status === 404
            ? of({ isrc, track: null, source: readSource(error.headers) })
            : throwError(() => new IntegrationUnavailableError()),
        ),
      );
  }
}
