import type { Isrc } from './isrc.value-object';

export type ReleaseDatePrecision = 'year' | 'month' | 'day';

/** Contrato devolvido pela API (BFF) para cada ISRC. */
export interface Track {
  readonly isrc: string;
  readonly title: string;
  readonly artists: readonly string[];
  readonly albumName: string;
  readonly albumImageUrl: string | null;
  readonly thumbnailUrl: string | null;
  readonly releaseDate: string | null;
  readonly releaseDatePrecision: ReleaseDatePrecision;
  readonly durationMs: number;
  readonly previewUrl: string | null;
  readonly spotifyUrl: string | null;
  readonly availableInBrazil: boolean;
}

export type SortDirection = 'asc' | 'desc';

/** Ciclo de vida do carregamento das faixas. */
export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

/** De onde a API tirou os dados: Spotify real ou catálogo fictício (modo mock). */
export type DataSource = 'spotify' | 'mock';

export interface TracksResult {
  readonly tracks: readonly Track[];
  readonly notFound: readonly Isrc[];
  readonly source: DataSource;
}
