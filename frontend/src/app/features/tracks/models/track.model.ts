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

export interface TracksResult {
  readonly tracks: readonly Track[];
  readonly notFound: readonly string[];
}
