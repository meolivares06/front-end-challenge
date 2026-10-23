import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';

/**
 * Player incorporado do Spotify para uma faixa. Recebe a URL já validada por
 * `spotifyEmbedUrl`, então pode marcá-la como confiável para o iframe.
 */
@Component({
  selector: 'app-spotify-embed',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <iframe
      [src]="safeUrl()"
      [title]="'Player do Spotify: ' + title()"
      width="100%"
      height="80"
      loading="lazy"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
    ></iframe>
  `,
  styles: `
    :host {
      display: block;
    }

    iframe {
      display: block;
      border: 0;
      border-radius: var(--radius-md);
    }
  `,
})
export class SpotifyEmbedComponent {
  private readonly sanitizer = inject(DomSanitizer);

  readonly url = input.required<string>();
  readonly title = input.required<string>();

  protected readonly safeUrl = computed<SafeResourceUrl>(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(this.url()),
  );
}
