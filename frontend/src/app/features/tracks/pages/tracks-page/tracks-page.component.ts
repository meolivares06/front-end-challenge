import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { AlertComponent } from '@shared/components/alert/alert.component';
import { IconComponent } from '@shared/icons/icon.component';
import { withViewTransition } from '@shared/utils/view-transition';
import { TrackCardComponent } from '../../components/track-card/track-card.component';
import { TrackSkeletonComponent } from '../../components/track-skeleton/track-skeleton.component';
import { TracksStore } from '../../store/tracks.store';

/** Componente de apresentação: lê o estado do store e repassa as ações do usuário. */
@Component({
  selector: 'app-tracks-page',
  imports: [AlertComponent, IconComponent, TrackCardComponent, TrackSkeletonComponent],
  providers: [TracksStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tracks-page.component.html',
  styleUrl: './tracks-page.component.scss',
})
export class TracksPageComponent implements OnInit {
  protected readonly store = inject(TracksStore);

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
