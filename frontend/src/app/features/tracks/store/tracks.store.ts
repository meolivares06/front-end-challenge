import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import type { SortDirection, Track } from '../models/track.model';
import { TrackApiService } from '../services/track-api.service';
import { CONTRACT_ISRCS } from '../utils/contract-isrcs';
import { sortTracksByTitle } from '../utils/sort-tracks';

export type LoadState = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Fonte única de verdade da feature de faixas.
 * Os componentes leem o estado e disparam ações por aqui; só o store fala com o TrackApiService.
 */
@Injectable()
export class TracksStore {
  private readonly api = inject(TrackApiService);
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;

  private readonly _state = signal<LoadState>('idle');
  private readonly _tracks = signal<Track[]>([]);
  private readonly _notFound = signal<string[]>([]);
  private readonly _direction = signal<SortDirection>('asc');

  readonly isrcs = CONTRACT_ISRCS;
  readonly state = this._state.asReadonly();
  readonly notFound = this._notFound.asReadonly();
  readonly direction = this._direction.asReadonly();

  readonly tracks = computed(() => sortTracksByTitle(this._tracks(), this._direction()));
  readonly total = computed(() => this._tracks().length);
  readonly availableInBrazil = computed(
    () => this._tracks().filter((t) => t.availableInBrazil).length,
  );
  readonly hasNoPreviews = computed(
    () => this.total() > 0 && this._tracks().every((t) => !t.previewUrl),
  );

  load(): void {
    this.request?.unsubscribe();
    this._state.set('loading');
    this.request = this.api
      .getTracks(this.isrcs)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ tracks, notFound }) => {
          this._tracks.set(tracks);
          this._notFound.set(notFound);
          this._state.set('ready');
        },
        error: () => {
          this._tracks.set([]);
          this._notFound.set([]);
          this._state.set('error');
        },
      });
  }

  toggleDirection(): void {
    this._direction.update((d) => (d === 'asc' ? 'desc' : 'asc'));
  }
}
