import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { ToggleSelectorComponent } from './toggle-selector.component';

/** Data shape for building toggle item lists in parent components. */
export interface ToggleItem {
  value: string;
  label: string;
  disabled?: boolean;
}

const BASE =
  'flex items-center justify-center text-center rounded-lg border px-3 py-2 text-sm transition-colors';

@Component({
  selector: 'app-toggle-item',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: '<ng-content />',
  host: {
    role: 'button',
    '[class]': 'hostClass()',
    '[attr.aria-pressed]': 'isActive()',
    '[attr.aria-disabled]': 'disabled() || null',
    '[attr.tabindex]': 'disabled() ? "-1" : "0"',
    '[attr.data-testid]': '"toggle-" + value()',
    '(click)': 'onClick()',
    '(keydown)': 'onKeydown($event)',
  },
})
export class ToggleItemComponent {
  private readonly group = inject(ToggleSelectorComponent);

  readonly value = input.required<string>();
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly isActive = computed(
    () => this.group.currentValue() === this.value()
  );

  protected readonly hostClass = computed(() => {
    if (this.disabled()) {
      return `${BASE} opacity-60 cursor-not-allowed border-secondary bg-secondary txt-disabled`;
    }
    if (this.isActive()) {
      return `${BASE} bg-utility-brand-100 border-utility-brand-300 font-semibold txt-brand-secondary-700 cursor-pointer`;
    }
    return `${BASE} bg-secondary border-secondary txt-primary-900 cursor-pointer`;
  });

  onClick(): void {
    if (this.disabled()) return;
    this.group.select(this.value());
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onClick();
    }
  }
}
