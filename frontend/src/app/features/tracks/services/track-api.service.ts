import { HttpClient, type HttpErrorResponse, type HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, map, type Observable, of, throwError } from 'rxjs';
import type { Isrc } from '../models/isrc.value-object';
import type { DataSource, Track, TracksResult } from '../models/track.model';
import type { TracksRepository } from '../ports/tracks-repository.port';

/** Erro lançado quando o fornecedor de dados (Spotify, via API) não está disponível. */
export class IntegrationUnavailableError extends Error {
  constructor() {
    super('Integração com o Spotify indisponível');
    this.name = 'IntegrationUnavailableError';
  }
}

interface Lookup {
  isrc: Isrc;
  track: Track | null;
  source: DataSource;
}

/** A API informa a origem dos dados no cabeçalho X-Data-Source. */
const readSource = (headers: HttpHeaders): DataSource =>
  headers.get('X-Data-Source') === 'mock' ? 'mock' : 'spotify';

const EMPTY_RESULT: TracksResult = { tracks: [], notFound: [], source: null };

@Injectable({ providedIn: 'root' })
export class TrackApiService implements TracksRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/tracks';

  /**
   * Uma requisição por ISRC, em paralelo. Um ISRC inexistente (404) vira "não encontrado";
   * qualquer outra falha significa que a integração está fora e interrompe o carregamento
   * inteiro, porque o requisito é avisar quando a integração cai, não exibir uma lista parcial.
   *
   * A agregação fica aqui de propósito, para demonstrar a consulta por ISRC no cliente:
   * o BFF existe pelo segredo do Spotify. Com uma lista dinâmica ou grande, ela migra para
   * um endpoint em lote no BFF (ver docs/DECISOES.md, seção 3).
   */
  getTracks(isrcs: readonly Isrc[]): Observable<TracksResult> {
    // forkJoin([]) completa sem emitir: sem esta guarda, o store ficaria em 'loading' para sempre.
    if (isrcs.length === 0) {
      return of(EMPTY_RESULT);
    }
    return forkJoin(isrcs.map((isrc) => this.lookup(isrc))).pipe(
      map((lookups) => ({
        tracks: lookups.flatMap(({ track }) => (track ? [track] : [])),
        notFound: lookups.filter(({ track }) => !track).map(({ isrc }) => isrc),
        source: lookups.some(({ source }) => source === 'mock') ? 'mock' : 'spotify',
      })),
    );
  }

  private lookup(isrc: Isrc): Observable<Lookup> {
    return this.http
      .get<Track>(`${this.baseUrl}/${encodeURIComponent(isrc.value)}`, { observe: 'response' })
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
