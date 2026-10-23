import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { buildTrack } from '@testing/track.fixture';
import type { Track } from '../../models/track.model';
import { TrackCardComponent } from './track-card.component';

/** O botão de áudio do card tem três modos: prévia própria, player do Spotify ou nada a tocar. */
describe('TrackCardComponent (áudio)', () => {
  const render = async (track: Track) => {
    TestBed.configureTestingModule({
      imports: [TrackCardComponent],
      providers: [provideZonelessChangeDetection()],
    });
    const fixture = TestBed.createComponent(TrackCardComponent);
    fixture.componentRef.setInput('track', track);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    return { fixture, el, button: el.querySelector('button.preview') as HTMLButtonElement };
  };

  it('sem prévia, abre e fecha o player do Spotify da faixa', async () => {
    const { fixture, el, button } = await render(buildTrack({ title: 'Louca', previewUrl: null }));

    expect(button.disabled).toBe(false);
    expect(button.getAttribute('aria-label')).toBe('Ouvir "Louca" no player do Spotify');
    expect(el.querySelector('iframe')).toBeNull();

    button.click();
    await fixture.whenStable();
    const iframe = el.querySelector('iframe');
    expect(iframe?.getAttribute('src')).toBe(
      'https://open.spotify.com/embed/track/4s71Bub5KzXBSMyE8nlH4E?theme=0',
    );
    expect(iframe?.getAttribute('title')).toBe('Player do Spotify: Louca');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    // Aberto não é "tocando": o botão vira fechar; o play é o do próprio player do Spotify.
    expect(button.getAttribute('aria-label')).toBe('Fechar o player do Spotify de "Louca"');
    expect(iframe?.getAttribute('height')).toBe('152');

    button.click();
    await fixture.whenStable();
    expect(el.querySelector('iframe')).toBeNull();
  });

  it('com prévia, usa o player próprio e não o do Spotify', async () => {
    const { button } = await render(buildTrack({ title: 'Faixa', previewUrl: '/p.wav' }));

    expect(button.getAttribute('aria-label')).toBe('Ouvir prévia de "Faixa"');
  });

  it('sem prévia e sem ID válido, desabilita o botão', async () => {
    const { el, button } = await render(buildTrack({ previewUrl: null, spotifyId: null }));

    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-label')).toContain('não fornecida pelo Spotify');
    expect(el.querySelector('iframe')).toBeNull();
  });
});
