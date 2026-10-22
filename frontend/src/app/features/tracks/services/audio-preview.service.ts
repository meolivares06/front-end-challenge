import { DestroyRef, inject, Injectable, signal } from '@angular/core';

/**
 * Um único <audio> para a página inteira: tocar uma prévia pausa a anterior,
 * como em qualquer app de música.
 */
@Injectable({ providedIn: 'root' })
export class AudioPreviewService {
  private readonly audio = typeof Audio !== 'undefined' ? new Audio() : null;

  readonly currentIsrc = signal<string | null>(null);
  readonly progress = signal(0);

  constructor() {
    if (!this.audio) return;
    const audio = this.audio;
    audio.preload = 'none';
    audio.addEventListener('timeupdate', () =>
      this.progress.set(audio.duration ? audio.currentTime / audio.duration : 0),
    );
    audio.addEventListener('ended', () => this.reset());
    audio.addEventListener('error', () => this.reset());
    inject(DestroyRef).onDestroy(() => audio.pause());
  }

  toggle(isrc: string, url: string): void {
    if (!this.audio) return;
    if (this.currentIsrc() === isrc) {
      this.audio.pause();
      this.reset();
      return;
    }
    this.audio.src = url;
    this.progress.set(0);
    this.currentIsrc.set(isrc);
    this.audio.play().catch(() => this.reset());
  }

  private reset(): void {
    this.currentIsrc.set(null);
    this.progress.set(0);
  }
}
