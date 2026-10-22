export type ReleaseDatePrecision = 'year' | 'month' | 'day';

/** Contrato devolvido pela API (BFF) para cada ISRC. */
export interface Track {
  isrc: string;
  title: string;
  artists: string[];
  albumName: string;
  albumImageUrl: string | null;
  thumbnailUrl: string | null;
  releaseDate: string | null;
  releaseDatePrecision: ReleaseDatePrecision;
  durationMs: number;
  previewUrl: string | null;
  spotifyUrl: string | null;
  availableInBrazil: boolean;
}

export type SortDirection = 'asc' | 'desc';

export interface TracksResult {
  tracks: Track[];
  notFound: string[];
}
