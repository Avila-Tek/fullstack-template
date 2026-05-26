import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import type { AbstractControl } from '@angular/forms';
import { of, startWith, switchMap } from 'rxjs';

@Component({
  selector: 'z-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="flex flex-col gap-1.5">
      @if (zLabel()) {
        <div class="flex items-center gap-0.5">
          <label
            [attr.for]="zFor() || null"
            class="text-sm font-medium txt-secondary-700"
          >{{ zLabel() }}</label>
          @if (zRequired()) {
            <span class="text-sm text-brand-600" aria-hidden="true">*</span>
          }
        </div>
      }
      <ng-content />
      @if (showError()) {
        <p class="text-xs txt-error-primary-600">{{ errorText() }}</p>
      }
    </div>
  `,
})
export class ZardFieldComponent {
  readonly zLabel = input('');
  readonly zFor = input('');
  readonly zRequired = input(false, { transform: booleanAttribute });
  readonly zControl = input<AbstractControl | null>(null);
  readonly zErrorMsg = input('');

  private readonly controlEvents = toSignal(
    toObservable(this.zControl).pipe(
      switchMap((ctrl) => (ctrl ? ctrl.events.pipe(startWith(null)) : of(null)))
    ),
    { initialValue: null }
  );

  protected readonly showError = computed(() => {
    this.controlEvents();
    const ctrl = this.zControl();
    return !!ctrl && ctrl.invalid && ctrl.touched;
  });

  protected readonly errorText = computed(() => {
    this.controlEvents();
    const ctrl = this.zControl();
    if (!ctrl) return this.zErrorMsg();
    const zodMsg = ctrl.errors?.['zod'] as string | undefined;
    return zodMsg ?? this.zErrorMsg();
  });
}
