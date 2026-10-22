import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconComponent } from '@shared/icons/icon.component';
import { DurationPipe } from '@shared/pipes/duration.pipe';
import type { Track } from '../../models/track.model';
import { formatReleaseDate } from '../../utils/format-release-date';
import { AudioPreviewComponent } from '../audio-preview/audio-preview.component';

@Component({
  selector: 'app-track-card',
  imports: [AudioPreviewComponent, DurationPipe, IconComponent, NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './track-card.component.html',
  styleUrl: './track-card.component.scss',
  host: { class: 'card' },
})
export class TrackCardComponent {
  readonly track = input.required<Track>();

  protected readonly releaseDate = computed(() =>
    formatReleaseDate(this.track().releaseDate, this.track().releaseDatePrecision),
  );
  protected readonly artists = computed(() => this.track().artists.join(', '));
}
