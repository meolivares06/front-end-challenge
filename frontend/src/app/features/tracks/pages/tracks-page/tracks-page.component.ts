import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AlertComponent } from '@shared/components/alert/alert.component';
import { IconComponent } from '@shared/icons/icon.component';
import { withViewTransition } from '@shared/utils/view-transition';
import { TrackCardComponent } from '../../components/track-card/track-card.component';
import { TrackSkeletonComponent } from '../../components/track-skeleton/track-skeleton.component';
import { SortDirection, Track } from '../../models/track.model';
import { TrackApiService } from '../../services/track-api.service';
import { CONTRACT_ISRCS } from '../../utils/contract-isrcs';
import { sortTracksByTitle } from '../../utils/sort-tracks';

type LoadState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-tracks-page',
  imports: [AlertComponent, IconComponent, TrackCardComponent, TrackSkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tracks-page.component.html',
  styleUrl: './tracks-page.component.scss',
})
export class TracksPageComponent implements OnInit {
  private readonly api = inject(TrackApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isrcs = CONTRACT_ISRCS;
  protected readonly state = signal<LoadState>('loading');
  protected readonly tracks = signal<Track[]>([]);
  protected readonly notFound = signal<string[]>([]);
  protected readonly direction = signal<SortDirection>('asc');

  protected readonly sortedTracks = computed(() =>
    sortTracksByTitle(this.tracks(), this.direction()),
  );
  protected readonly availableInBrazil = computed(
    () => this.tracks().filter((t) => t.availableInBrazil).length,
  );
  protected readonly hasNoPreviews = computed(
    () => this.tracks().length > 0 && this.tracks().every((t) => !t.previewUrl),
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.state.set('loading');
    this.api
      .getTracks(this.isrcs)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ tracks, notFound }) => {
          this.tracks.set(tracks);
          this.notFound.set(notFound);
          this.state.set('ready');
        },
        error: () => this.state.set('error'),
      });
  }

  toggleDirection(): void {
    withViewTransition(() => this.direction.update((d) => (d === 'asc' ? 'desc' : 'asc')));
  }
}
