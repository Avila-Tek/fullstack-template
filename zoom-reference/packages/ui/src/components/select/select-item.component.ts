import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  contentChild,
  ElementRef,
  inject,
  input,
  signal,
  TemplateRef,
  ViewEncapsulation,
} from '@angular/core';

@Component({
  selector: 'z-select-item',
  standalone: true,
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display:none' },
})
export class ZardSelectItemComponent {
  private readonly el = inject(ElementRef<HTMLElement>);

  readonly customTpl = contentChild(TemplateRef);
  readonly zValue = input.required<string>();
  readonly zLabel = input('');
  readonly zDisabled = input(false, { transform: booleanAttribute });
  readonly label = signal('');

  constructor() {
    afterNextRender(() => {
      this.label.set(
        this.zLabel() || (this.el.nativeElement.textContent?.trim() ?? '')
      );
    });
  }
}
