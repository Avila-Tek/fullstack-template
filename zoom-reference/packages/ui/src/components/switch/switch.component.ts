import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  model,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import type { ClassValue } from 'clsx';
import { mergeClasses } from '../../utils/merge-classes';
import {
  switchVariants,
  type ZardSwitchSizeVariants,
  type ZardSwitchTypeVariants,
} from './switch.variants';

type OnTouchedType = () => void;
type OnChangeType = (value: boolean) => void;

// biome-ignore lint/suspicious/noEmptyBlockStatements: intentional noop
const noopFn = () => {};

@Component({
  selector: 'z-switch',
  standalone: true,
  template: `
    <button
      type="button"
      role="switch"
      [attr.data-state]="status()"
      [attr.aria-checked]="zChecked()"
      [class]="classes()"
      [disabled]="zDisabled() || formDisabled()"
      (click)="onSwitchChange()"
    >
      <span
        [attr.data-size]="zSize()"
        [attr.data-state]="status()"
        class="pointer-events-none inline-block size-5 rounded-full bg-surface shadow transition-transform data-[size=sm]:size-4 data-[size=lg]:size-6 data-[state=checked]:translate-x-5 data-[size=sm]:data-[state=checked]:translate-x-4 data-[size=lg]:data-[state=checked]:translate-x-6 data-[state=unchecked]:translate-x-0"
      ></span>
    </button>
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ZardSwitchComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  exportAs: 'zSwitch',
})
export class ZardSwitchComponent implements ControlValueAccessor {
  readonly class = input<ClassValue>('');
  readonly zChecked = model<boolean>(false);
  readonly zSize = input<ZardSwitchSizeVariants>('default');
  readonly zType = input<ZardSwitchTypeVariants>('default');
  readonly zDisabled = input(false, { transform: booleanAttribute });

  private onChange: OnChangeType = noopFn;
  private onTouched: OnTouchedType = noopFn;

  protected readonly status = computed(() =>
    this.zChecked() ? 'checked' : 'unchecked'
  );
  protected readonly classes = computed(() =>
    mergeClasses(
      switchVariants({
        zType: this.zType(),
        zSize: this.zSize(),
      }),
      this.class()
    )
  );

  protected readonly formDisabled = signal(false);

  writeValue(val: boolean): void {
    this.zChecked.set(val);
  }

  registerOnChange(fn: OnChangeType): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: OnTouchedType): void {
    this.onTouched = fn;
  }

  onSwitchChange(): void {
    if (this.zDisabled() || this.formDisabled()) {
      return;
    }

    this.zChecked.update((checked) => !checked);
    this.onTouched();
    this.onChange(this.zChecked());
  }

  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }
}
