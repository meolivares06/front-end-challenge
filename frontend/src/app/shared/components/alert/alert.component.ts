import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from '../../icons/icon.component';

@Component({
  selector: 'app-alert',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './alert.component.html',
  styleUrl: './alert.component.scss',
  host: { role: 'alert', '[class]': '"alert alert--" + tone()' },
})
export class AlertComponent {
  readonly tone = input<'danger' | 'info'>('danger');
  readonly heading = input.required<string>();
  readonly actionLabel = input<string | null>(null);
  readonly action = output<void>();
}
