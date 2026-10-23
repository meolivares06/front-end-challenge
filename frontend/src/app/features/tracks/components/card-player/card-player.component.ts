import {
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { IconComponent } from '@shared/icons/icon.component';
import { SpotifyEmbedComponent } from '../spotify-embed/spotify-embed.component';

type Phase = 'opening' | 'open' | 'closing';

/** Abaixo desta largura o card é horizontal e baixo: cabe o player compacto do Spotify. */
const NARROW = '(max-width: 639px)';

/**
 * Face "tocando" do card: a capa desfocada cobre o card num círculo que nasce no botão
 * que a pessoa tocou, e o player do Spotify entra quando o círculo termina.
 * O iframe nunca está dentro de uma animação de transformação: só é montado na fase `open`.
 */
@Component({
  selector: 'app-card-player',
  imports: [IconComponent, SpotifyEmbedComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './card-player.component.html',
  styleUrl: './card-player.component.scss',
  host: {
    role: 'region',
    '[attr.aria-label]': '"Player do Spotify: " + title()',
    '[class.is-closing]': 'phase() === "closing"',
    '[style.--origin-x.px]': 'origin().x',
    '[style.--origin-y.px]': 'origin().y',
    '(animationend)': 'onAnimationEnd($event)',
    '(keydown.escape)': 'close()',
  },
})
export class CardPlayerComponent {
  readonly url = input.required<string>();
  readonly title = input.required<string>();
  readonly coverUrl = input<string | null>(null);
  /** Centro do botão que abriu o player, relativo ao card: origem do círculo. */
  readonly origin = input<{ x: number; y: number }>({ x: 0, y: 0 });
  /** Emitido quando a animação de saída termina; quem usa fecha o player. */
  readonly closed = output<void>();

  protected readonly phase = signal<Phase>('opening');
  protected readonly embedHeight = computed(() =>
    typeof matchMedia !== 'undefined' && matchMedia(NARROW).matches ? 80 : 352,
  );
  protected readonly background = computed(() => {
    const cover = this.coverUrl();
    return cover ? `url("${cover}")` : null;
  });

  private readonly closeButton = viewChild.required<ElementRef<HTMLButtonElement>>('closeButton');

  close(): void {
    if (this.phase() !== 'closing') this.phase.set('closing');
  }

  protected onAnimationEnd(event: AnimationEvent): void {
    // Só a revelação do próprio host importa (o fade do iframe também borbulha até aqui).
    if (event.target !== event.currentTarget) return;
    if (this.phase() === 'opening') {
      this.phase.set('open');
      this.closeButton().nativeElement.focus();
    } else if (this.phase() === 'closing') {
      this.closed.emit();
    }
  }
}
