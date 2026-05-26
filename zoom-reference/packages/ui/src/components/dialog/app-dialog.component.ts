import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  effect,
  input,
  output,
  ViewEncapsulation,
  viewChild,
} from '@angular/core';
import {
  ZardButtonComponent,
  type ZardButtonTypeVariants,
} from '../button/index';

@Component({
  selector: 'app-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [ZardButtonComponent],
  styles: [
    `
    /* ── Shared backdrop ── */
    @keyframes backdrop-in {
      from { background-color: transparent; }
      to   { background-color: rgb(0 0 0 / 0.5); }
    }
    dialog[open]::backdrop {
      animation: backdrop-in 300ms ease both;
    }

    /* ── Desktop: centered modal, slide up + fade in ── */
    @keyframes dialog-in {
      from { opacity: 0; transform: translateY(1.25rem); }
      to   { opacity: 1; transform: none; }
    }
    dialog[open] {
      animation: dialog-in 350ms cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    /* ── Mobile: bottom sheet, slides up from edge ── */
    @media (max-width: 767px) {
      dialog {
        margin: auto 0 0;
        max-width: 100%;
        border-radius: 1rem 1rem 0 0;
        max-height: 90dvh;
        overflow-y: auto;
      }
      .dialog-panel {
        padding-top: 2rem;
        position: relative;
      }
      .dialog-panel::before {
        content: '';
        position: absolute;
        top: 0.75rem;
        left: 50%;
        transform: translateX(-50%);
        width: 2.5rem;
        height: 0.25rem;
        border-radius: 9999px;
        background: rgb(0 0 0 / 0.15);
      }
      @keyframes sheet-in {
        from { transform: translateY(100%); }
        to   { transform: translateY(0); }
      }
      dialog[open] {
        animation: sheet-in 400ms cubic-bezier(0.16, 1, 0.3, 1) both;
      }
    }
  `,
  ],
  template: `
    <dialog
      #dialogRef
      class="m-auto w-full max-w-xl rounded-xl border-0 p-0 shadow-xl"
      (cancel)="onCancel($event)"
      (click)="onBackdropClick($event)"
      (close)="onNativeClose()"
    >
      <div
        class="dialog-panel flex flex-col gap-6 p-6"
        (click)="$event.stopPropagation()"
      >
        @if (title() || description()) {
          <div class="flex flex-col items-start gap-2">
            @if (title()) {
              <h2 class="text-lg md:text-xl font-medium text-gray-light-700">
                {{ title() }}
              </h2>
            }
            @if (description()) {
              <p class="text-base font-light txt-quaternary-500">
                {{ description() }}
              </p>
            }
          </div>
        }
        @if (cancelLabel() || confirmLabel()) {
          <div class="flex flex-col-reverse md:flex-row md:justify-end gap-2">
            @if (cancelLabel()) {
              <button
                z-button
                zType="ghost"
                type="button"
                (click)="onCancel()"
              >
                {{ cancelLabel() }}
              </button>
            }
            @if (confirmLabel()) {
              <button
                z-button
                [zType]="confirmButtonType()"
                type="button"
                (click)="onConfirm()"
              >
                {{ confirmLabel() }}
              </button>
            }
          </div>
        } @else {
          <ng-content />
        }
      </div>
    </dialog>
  `,
})
export class AppDialogComponent {
  readonly title = input('');
  readonly description = input<string | null>(null);
  readonly closeable = input(true);
  readonly open = input(false);
  readonly cancelLabel = input<string | null>(null);
  readonly confirmLabel = input<string | null>(null);
  readonly variant = input<'default' | 'danger'>('default');

  readonly sheet = input(false);
  readonly closed = output<void>();
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  protected readonly confirmButtonType = computed<ZardButtonTypeVariants>(() =>
    this.variant() === 'danger' ? 'destructive' : 'default'
  );

  private readonly dialogRef =
    viewChild<ElementRef<HTMLDialogElement>>('dialogRef');

  constructor() {
    effect(() => {
      const dialog = this.dialogRef()?.nativeElement;
      if (!dialog) return;

      if (this.open()) {
        if (!dialog.open) {
          dialog.showModal();
        }
      } else {
        if (dialog.open) {
          dialog.close();
        }
      }
    });
  }

  protected onCancel(event?: Event): void {
    if (event && !this.closeable()) {
      event.preventDefault();
      return;
    }
    this.cancelled.emit();
    this.closed.emit();
  }

  protected onConfirm(): void {
    this.confirmed.emit();
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (!this.closeable()) return;
    const dialog = this.dialogRef()?.nativeElement;
    if (dialog) {
      dialog.close();
    }
    this.closed.emit();
  }

  protected onNativeClose(): void {
    this.closed.emit();
  }
}
