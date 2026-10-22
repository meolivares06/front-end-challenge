import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, throwError } from 'rxjs';
import type { Track, TracksResult } from '../models/track.model';

/** Erro lançado quando o fornecedor de dados (Spotify, via API) não está disponível. */
export class IntegrationUnavailableError extends Error {
  constructor() {
    super('Integração com o Spotify indisponível');
    this.name = 'IntegrationUnavailableError';
  }
}

type Lookup = { isrc: string; track: Track | null };

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
      })),
    );
  }

  private lookup(isrc: string): Observable<Lookup> {
    return this.http.get<Track>(`${this.baseUrl}/${encodeURIComponent(isrc)}`).pipe(
      map((track) => ({ isrc, track })),
      catchError((error: HttpErrorResponse) =>
        error.status === 404
          ? of({ isrc, track: null })
          : throwError(() => new IntegrationUnavailableError()),
      ),
    );
  }
}
