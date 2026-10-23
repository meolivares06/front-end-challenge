import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { IconComponent } from '@shared/icons/icon.component';
import { DurationPipe } from '@shared/pipes/duration.pipe';
import { Isrc } from '../../models/isrc.value-object';
import type { Track } from '../../models/track.model';
import { formatReleaseDate } from '../../utils/format-release-date';
import { AudioPreviewService } from '../../services/audio-preview.service';
import { spotifyEmbedUrl } from '../../utils/spotify-embed-url';
import { AudioPreviewComponent } from '../audio-preview/audio-preview.component';
import { SpotifyEmbedComponent } from '../spotify-embed/spotify-embed.component';

@Component({
  selector: 'app-track-card',
  imports: [
    AudioPreviewComponent,
    DurationPipe,
    IconComponent,
    NgOptimizedImage,
    SpotifyEmbedComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './track-card.component.html',
  styleUrl: './track-card.component.scss',
  host: { class: 'card' },
})
export class TrackCardComponent {
  private readonly player = inject(AudioPreviewService);

  readonly track = input.required<Track>();

  /** O player do Spotify só entra quando o Spotify não forneceu a prévia. */
  protected readonly embedUrl = computed(() =>
    this.track().previewUrl ? null : spotifyEmbedUrl(this.track().spotifyId),
  );
  protected readonly isEmbedOpen = computed(() => this.player.embedIsrc() === this.track().isrc);

  protected readonly releaseDate = computed(() =>
    formatReleaseDate(this.track().releaseDate, this.track().releaseDatePrecision),
  );
  protected readonly isrcLabel = computed(() => Isrc.create(this.track().isrc).format());
  protected readonly artists = computed(() => this.track().artists.join(', '));
}
