import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { TracksPage } from './tracks.page';

const collator = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });

test.describe('Faixas do contrato (API em modo mock)', () => {
  let tracks: TracksPage;

  test.beforeEach(async ({ page }) => {
    tracks = new TracksPage(page);
    await tracks.open();
    await tracks.waitForTracks();
  });

  test('lista as faixas, sinaliza o modo demonstração e o ISRC não encontrado sem caixas de aviso', async ({
    page,
  }) => {
    // Nada de caixas quando tudo vai bem: contexto em chip, ausência na própria grade.
    await expect(page.locator('app-alert')).toHaveCount(0);

    const demo = tracks.chip('Demonstração');
    await expect(demo).toHaveAttribute('aria-expanded', 'false');
    await demo.click();
    await expect(page.getByRole('note', { name: 'Dados fictícios' })).toContainText(
      'conta Premium',
    );
    await page.keyboard.press('Escape');
    await expect(demo).toHaveAttribute('aria-expanded', 'false');

    await expect(tracks.notFoundCards()).toHaveCount(1);
    await expect(tracks.notFoundCards()).toContainText('QZ-NJX-20-78148');
    await expect(page.locator('.summary')).toContainText('9 de 10 encontradas');
    await expect(tracks.cards).toHaveCount(9);
  });

  test('ordena por título em ordem alfabética e inverte com o botão', async () => {
    const asc = await tracks.titleTexts();
    expect(asc).toEqual([...asc].sort(collator.compare));

    await tracks.sortButton.click();
    await expect(tracks.sortButton).toHaveText(/Z–A/);
    expect(await tracks.titleTexts()).toEqual([...asc].reverse());
  });

  test('mostra os dados exigidos de cada faixa', async () => {
    const card = tracks.card('Golden Hour Drive');

    await expect(card.getByRole('img', { name: /Capa do álbum Night Shift/ })).toBeVisible();
    await expect(card).toContainText('Mara Keyes');
    await expect(card).toContainText('04 de out de 2019');
    await expect(card).toContainText('03:25');
    await expect(card).toContainText('BX-KZM-19-00338'); // ISRC na forma de leitura (Value Object)
    await expect(card.getByRole('link', { name: /Spotify/ })).toHaveAttribute('target', '_blank');

    for (const text of await tracks.cards.allInnerTexts()) {
      expect(text).toMatch(/\b\d{2}:\d{2}\b/); // duração mm:ss em todas
    }
  });

  test('sinaliza a disponibilidade no Brasil nos três cenários', async () => {
    await expect(tracks.card('Golden Hour Drive')).toContainText('Disponível no BR');
    await expect(tracks.card('Céu de Fevereiro')).toContainText('Indisponível no BR'); // is_playable: false
    await expect(tracks.card('Nordlys over Fjorden')).toContainText('Indisponível no BR'); // ausente no mercado BR
    await expect(tracks.card('Maré de Março')).toContainText('2006'); // data com precisão de ano
  });

  test('toca e pausa a prévia de áudio', async () => {
    const card = tracks.card('Golden Hour Drive');
    const play = card.getByRole('button', { name: /prévia/ });

    await card.hover();
    await play.click();
    await expect(play).toHaveAttribute('aria-pressed', 'true');
    await expect(card.getByRole('progressbar')).toBeVisible();
    // Prova que o áudio de fato toca: o progresso vem do evento timeupdate do <audio>.
    await expect
      .poll(async () => Number(await card.getByRole('progressbar').getAttribute('aria-valuenow')))
      .toBeGreaterThan(0);

    await play.click();
    await expect(play).toHaveAttribute('aria-pressed', 'false');
    await expect(card.getByRole('progressbar')).toHaveCount(0);
  });

  test('desabilita a prévia quando a faixa não tem áudio', async () => {
    const button = tracks.card('Zero Gravity').getByRole('button', { name: /não fornecida/ });

    await expect(button).toBeDisabled();
  });

  test('não tem violações de acessibilidade (WCAG 2.1 AA)', async ({ page }) => {
    await tracks.waitForAnimations(); // medir contraste no meio do fade-in daria falso positivo
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('não gera rolagem horizontal', async ({ page }) => {
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );

    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe('Integração indisponível', () => {
  test('alerta o usuário e recupera ao tentar de novo', async ({ page }) => {
    const tracks = new TracksPage(page);
    // Único ponto simulado no navegador: a API respondendo 503, como faria com o Spotify fora.
    await page.route('**/api/tracks/**', (route) => route.fulfill({ status: 503, body: '{}' }));

    await tracks.open();
    const alert = tracks.alert('Não foi possível falar com o Spotify agora');
    await expect(alert).toBeVisible();
    await expect(tracks.cards).toHaveCount(0);

    await page.unroute('**/api/tracks/**');
    await alert.getByRole('button', { name: 'Tentar de novo' }).click();
    await tracks.waitForTracks();
    await expect(alert).toHaveCount(0);
  });
});
