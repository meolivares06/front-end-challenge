import { ChangeDetectionStrategy, Component, computed, inject, type OnInit } from '@angular/core';
import { AlertComponent } from '@shared/components/alert/alert.component';
import { IconComponent } from '@shared/icons/icon.component';
import { withViewTransition } from '@shared/utils/view-transition';
import { TrackCardComponent } from '../../components/track-card/track-card.component';
import { TrackSkeletonComponent } from '../../components/track-skeleton/track-skeleton.component';
import { TRACKS_STORE } from '../../ports/tracks-store.port';
import { provideTracksFeature } from '../../tracks.providers';

/** Componente de apresentação: lê o estado do store e repassa as ações do usuário. */
@Component({
  selector: 'app-tracks-page',
  imports: [AlertComponent, IconComponent, TrackCardComponent, TrackSkeletonComponent],
  providers: [provideTracksFeature()],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tracks-page.component.html',
  styleUrl: './tracks-page.component.scss',
})
export class TracksPageComponent implements OnInit {
  /** Depende da porta, não da implementação (DIP). */
  protected readonly store = inject(TRACKS_STORE);

  protected readonly notFoundLabel = computed(() =>
    this.store
      .notFound()
      .map((isrc) => isrc.format())
      .join(', '),
  );

  ngOnInit(): void {
    this.store.load();
  }

  protected retry(): void {
    this.store.load();
  }

  protected toggleDirection(): void {
    withViewTransition(() => this.store.toggleDirection());
  }
}
