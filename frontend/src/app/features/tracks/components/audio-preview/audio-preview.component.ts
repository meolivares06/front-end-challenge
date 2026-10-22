import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { IconComponent } from '@shared/icons/icon.component';
import { AudioPreviewService } from '../../services/audio-preview.service';

@Component({
  selector: 'app-audio-preview',
  imports: [IconComponent, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './audio-preview.component.html',
  styleUrl: './audio-preview.component.scss',
  host: { '[class.is-playing]': 'isPlaying()' },
})
export class AudioPreviewComponent {
  private readonly player = inject(AudioPreviewService);

  readonly isrc = input.required<string>();
  readonly title = input.required<string>();
  readonly previewUrl = input<string | null>(null);

  protected readonly isPlaying = computed(() => this.player.currentIsrc() === this.isrc());
  protected readonly progress = computed(() => (this.isPlaying() ? this.player.progress() : 0));
  protected readonly label = computed(() => {
    if (!this.previewUrl()) return `Prévia de "${this.title()}" não fornecida pelo Spotify`;
    return this.isPlaying()
      ? `Pausar prévia de "${this.title()}"`
      : `Ouvir prévia de "${this.title()}"`;
  });

  protected toggle(): void {
    const url = this.previewUrl();
    if (url) this.player.toggle(this.isrc(), url);
  }
}
