import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  ViewEncapsulation,
} from '@angular/core';
import type { ClassValue } from 'clsx';

import { mergeClasses } from '../../utils/merge-classes';

import {
  statusPillDotVariants,
  statusPillVariants,
  type ZardStatusPillTypeVariants,
} from './status-pill.variants';

@Component({
  selector: 'z-status-pill',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <span [class]="classes()">
      <span [class]="dotClass()"></span>
      <ng-content />
    </span>
  `,
  exportAs: 'zStatusPill',
})
export class ZardStatusPillComponent {
  readonly class = input<ClassValue>('');
  readonly zType = input<ZardStatusPillTypeVariants>('neutral');

  protected readonly classes = computed(() =>
    mergeClasses(statusPillVariants({ zType: this.zType() }), this.class())
  );

  protected readonly dotClass = computed(() =>
    mergeClasses(statusPillDotVariants({ zType: this.zType() }))
  );
}
