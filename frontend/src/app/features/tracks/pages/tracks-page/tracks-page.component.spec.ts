import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { buildTrack } from '@testing/track.fixture';
import { CONTRACT_ISRCS } from '../../utils/contract-isrcs';
import { TracksPageComponent } from './tracks-page.component';

/** Integração: página + componentes filhos + serviço HTTP real, só o backend é simulado. */
describe('TracksPageComponent (integração)', () => {
  let fixture: ComponentFixture<TracksPageComponent>;
  let http: HttpTestingController;
  let el: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [TracksPageComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    fixture = TestBed.createComponent(TracksPageComponent);
    http = TestBed.inject(HttpTestingController);
    el = fixture.nativeElement;
    await fixture.whenStable();
  });

  const respondAll = (respond: (isrc: string, index: number) => void) =>
    CONTRACT_ISRCS.forEach((isrc, i) => respond(isrc, i));

  it('exibe as faixas ordenadas por título com duração mm:ss e selo BR', async () => {
    const titles = ['Zebra', 'Água', 'Bloco'];
    respondAll((isrc, i) => {
      const req = http.expectOne(`/api/tracks/${isrc}`);
      if (i < titles.length)
        req.flush(buildTrack({ isrc, title: titles[i], availableInBrazil: i !== 0 }));
      else req.flush({}, { status: 404, statusText: 'Not Found' });
    });
    await fixture.whenStable();

    const rendered = [...el.querySelectorAll('.card__title')].map((h) => h.textContent?.trim());
    expect(rendered).toEqual(['Água', 'Bloco', 'Zebra']);
    expect(el.textContent).toContain('03:35');
    expect(el.textContent).toContain('Indisponível no BR');
    expect(el.textContent).toContain('7 ISRC não encontrado');
  });

  it('alerta o usuário quando a integração está indisponível e permite tentar de novo', async () => {
    // Basta uma falha: o forkJoin cancela as demais requisições.
    http
      .expectOne(`/api/tracks/${CONTRACT_ISRCS[0]}`)
      .flush({}, { status: 503, statusText: 'Unavailable' });
    await fixture.whenStable();

    const alert = el.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Não foi possível falar com o Spotify');

    (alert?.querySelector('button') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(http.match(() => true).filter((r) => !r.cancelled).length).toBe(CONTRACT_ISRCS.length);
  });
});
